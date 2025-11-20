import { NextResponse } from 'next/server';
import ical from 'ical-generator';
import { 
  getCachedGroupData, 
  setCachedGroupData, 
  trackGroupRequest,
  pruneCache
} from './cache.js';
import { checkScheduleChanges, sendPushNotification } from '../notifications/notifier.js';


// ==========================================
// 1. CONFIGURATION VIA ENV
// ==========================================
const getEnvArray = (key, def) => {
  try { return process.env[key] ? JSON.parse(process.env[key]) : def; } 
  catch { return def; }
};

const getEnvObject = (key, def) => {
  try { return process.env[key] ? JSON.parse(process.env[key]) : def; } 
  catch { return def; }
};

const CONFIG = {
  celcatUrl: process.env.CELCAT_URL || 'https://celcat.u-bordeaux.fr/Calendar/Home/GetCalendarData',
  timezone: 'Europe/Paris',
  blacklist: getEnvArray('CELCAT_BLACKLIST', ['DSPEG', 'Cours DSPEG']),
  replacements: getEnvObject('CELCAT_REPLACEMENTS', { 'Test': '💻' }),
  
  MAX_RETRIES: 3,
  INITIAL_BACKOFF: 500,
  TIMEOUT: parseInt(process.env.API_TIMEOUT || '6000'),
  CACHE_TTL: parseInt(process.env.CACHE_TTL || '3600'), // 1 heure
GROUP_REGEX: /^[a-zA-Z0-9\s\-\_\.\(\)\,]+$/
};

export const dynamic = 'force-dynamic';

// Export function to clear in-flight requests (for testing)
export function clearInFlightRequests() {
  IN_FLIGHT_REQUESTS.clear();
}

// ==========================================
// 2. MONITORING SIMPLE
// ==========================================

const logger = {
  info: (msg, meta = {}) => {
    if (process.env.LOG_LEVEL !== 'error') console.log(JSON.stringify({ level: 'info', msg, ...meta }));
  },
  warn: (msg, meta = {}) => console.warn(JSON.stringify({ level: 'warn', msg, ...meta })),
  error: (msg, error) => console.error(JSON.stringify({ level: 'error', msg, error: error?.message || error }))
};

const IN_FLIGHT_REQUESTS = new Map();

// ==========================================
// 3. RÉSEAU & ROBUSTESSE
// ==========================================

function normalizeCelcatResponse(data, groupName) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.d)) return data.d; 
  if (data && Array.isArray(data.events)) return data.events;
  logger.warn("Format de réponse Celcat inattendu", { group: groupName, type: typeof data });
  return [];
}

async function fetchWithRetry(url, options, retries = CONFIG.MAX_RETRIES) {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      if (!res.ok) {
        if (res.status < 500 && res.status !== 429) throw new Error(`HTTP Error ${res.status}`);
        throw new Error(`Server Error ${res.status}`);
      }
      clearTimeout(timeoutId);
      return await res.json();
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
      if (i === retries || (error.message.includes('HTTP Error'))) throw error;
      const delay = CONFIG.INITIAL_BACKOFF * Math.pow(2, i);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}

async function getEventsForSingleGroup(groupName) {
  // 1. Validation
  if (!groupName || !CONFIG.GROUP_REGEX.test(groupName)) {
    logger.warn("Groupe invalide bloqué", { group: groupName });
    return [];
  }

  // 2. Track request for analytics
  trackGroupRequest(groupName);

  // 3. Check application-level cache first
  const cachedData = getCachedGroupData(groupName);
  if (cachedData) {
    logger.info("Cache hit", { group: groupName });
    // Send a notification for cache hit (non-blocking)
    sendPushNotification({
      groupName,
      eventCount: cachedData.length,
      type: 'refresh'
    }).catch(err =>
      logger.error("Failed to send notification", err)
    );
    return cachedData;
  }

  // 4. Request Coalescing (Protection mémoire locale)
  const cacheKey = `req-${groupName}`;
  if (IN_FLIGHT_REQUESTS.has(cacheKey)) {
    return IN_FLIGHT_REQUESTS.get(cacheKey);
  }

  const fetchPromise = (async () => {
    try {
      const { start, end } = getFullAcademicYear();

      const formData = new URLSearchParams();
      formData.append('start', start);
      formData.append('end', end);
      formData.append('resType', '103');
      formData.append('calView', 'month');
      formData.append('colourScheme', '3');
      formData.append('federationIds[]', groupName);

      const rawData = await fetchWithRetry(CONFIG.celcatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'Mozilla/5.0 (Compatible; UniversityCalendarBot/2.0)'
        },
        body: formData,
        
        next: { 
          revalidate: CONFIG.CACHE_TTL,
          tags: [`celcat-${groupName}`]
        }
      });

      const safeEvents = normalizeCelcatResponse(rawData, groupName);
      
      if (safeEvents.length === 0) {
        logger.info("Groupe vide", { group: groupName });
      } else {
        // Check for schedule changes and send notification if needed
        const changeStatus = checkScheduleChanges(groupName, safeEvents);
        if (changeStatus.changed) {
          logger.info("Schedule changed", { group: groupName, previous: changeStatus.previousHash, new: changeStatus.newHash });
          // Send notification asynchronously (don't wait for it)
          await sendPushNotification({
            ...changeStatus,
            type: 'schedule_change'
          }).catch(err => 
            logger.error("Failed to send notification", err)
          );
        } else {
          // Send refresh notification even if no change
          await sendPushNotification({
            groupName,
            eventCount: safeEvents.length,
            type: 'refresh'
          }).catch(err => 
            logger.error("Failed to send notification", err)
          );
        }
        
        // Store in application cache for popular groups
        setCachedGroupData(groupName, safeEvents);
      }

      return safeEvents;
    } catch (error) {
      logger.error(`Erreur fetch groupe ${groupName}`, error);
      return []; 
    } finally {
      IN_FLIGHT_REQUESTS.delete(cacheKey);
    }
  })();

  IN_FLIGHT_REQUESTS.set(cacheKey, fetchPromise);
  return fetchPromise;
}

// ==========================================
// 4. LOGIQUE MÉTIER (Helpers)
// ==========================================

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function getFullAcademicYear() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); 
  const startYear = currentMonth < 6 ? currentYear - 1 : currentYear;
  return {
    start: `${startYear}-08-01`,
    end: `${startYear + 1}-08-31`
  };
}

function cleanDescriptionText(text) {
  if (!text) return "";
  let txt = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');

  return txt.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0).join('\n');
}

function processEvent(event, { showHolidays }) {
  if (!event || typeof event !== 'object' || !event.start) return null;

  const cleanDescription = cleanDescriptionText(event.description || "");
  if (CONFIG.blacklist.some(keyword => cleanDescription.includes(keyword))) return null;

  const fullTextScan = ((event.eventCategory || "") + " " + cleanDescription).toUpperCase();
  const sitesText = (event.sites ? event.sites.join(', ') : '').toUpperCase();

  // Extract course name and professor from description
  const descriptionLines = cleanDescription.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let summary = "";
  let professorName = "";
  
  // Look for full course name in description
  // Full course name is typically a descriptive line (not a code)
  // Avoid lines that look like module codes (e.g., "4TYG503U Com Pro")
  for (const line of descriptionLines) {
    // Skip lines that look like module codes (start with digits and letters followed by text)
    if (/^\d[A-Z0-9]+\s+/i.test(line)) {
      continue;
    }
    
    // Skip common header/category words including event types
    if (/^(Cours|TD|TP|CM|Examen|Examens|Contrôle Continu)$/i.test(line)) {
      continue;
    }
    
    // Skip lines that are clearly not course names
    if (line.toLowerCase().includes('salle') || 
        line.toLowerCase().includes('amphi') ||
        line.toLowerCase().includes('bât') ||
        (line.includes('/') && !line.includes('-'))) {  // Allow hyphens but not room separators
      continue;
    }
    
    const wordCount = line.split(' ').length;
    const hasLowercase = /[a-zàâäçèéêëîïôöùûü]/.test(line);
    
    // Skip if it looks like a typical professor name pattern
    // Professor names: "LASTNAME Firstname" or "LASTNAME-LASTNAME Firstname"
    const words = line.split(/\s+/);
    const firstWord = words[0] || "";
    const secondWord = words[1] || "";
    const isProfessorPattern = words.length === 2 && 
                                /^[A-ZÀÂÄÇÈÉÊËÎÏÔÖÙÛÜ][A-ZÀÂÄÇÈÉÊËÎÏÔÖÙÛÜ-]+$/.test(firstWord) &&
                                /^[A-ZÀÂÄÇÈÉÊËÎÏÔÖÙÛÜ][a-zàâäçèéêëîïôöùûü]+$/.test(secondWord);
    
    if (isProfessorPattern) {
      continue;  // This looks like "LASTNAME Firstname", skip it
    }
    
    // Check if this could be a course name
    if (line.length >= 18 || wordCount >= 3) {
      // Longer names: prefer those with lowercase letters over mostly-uppercase (likely professor names)
      const uppercaseWords = words.filter(word => word.length > 1 && word === word.toUpperCase());
      const mostlyUppercase = uppercaseWords.length > words.length / 2;
      
      if (hasLowercase && !mostlyUppercase) {
        summary = line;
        break;
      }
    } else if (wordCount <= 2 && hasLowercase) {
      // Shorter names (1-2 words like "Finance" or "Base données")
      // Must have lowercase to distinguish from professor names
      const hasLowercaseInWords = words.some(word => /[a-zàâäçèéêëîïôöùûü]/.test(word.substring(1)));
      
      if (hasLowercaseInWords || wordCount === 1) {
        // Single word or has lowercase within words - likely a course name
        summary = line;
        break;
      }
    }
  }
  
  // If no good summary from description, fall back to module name
  // But strip the module code prefix (e.g., "5CYG501U Finance" -> "Finance")
  if (!summary) {
    if (event.modules && event.modules.length > 0) {
      const moduleName = event.modules[0];
      // Remove module code prefix (pattern: digits + letters + space)
      summary = moduleName.replace(/^\d[A-Z0-9]+\s+/i, '').trim();
      // If nothing left after stripping, use the original
      if (!summary) summary = moduleName;
    }
    else if (event.eventCategory) summary = event.eventCategory;
    else summary = descriptionLines[0] || "Cours";
  }
  
  // Look for professor name in description
  // Professor names are typically all uppercase or capitalized (e.g., "LOURME Alexandre" or "POURTIE R Frederic")
  // Also handle names with hyphens like "BENOIS-PINEAU Jenny"
  for (const line of descriptionLines) {
    // Skip the line we used for summary
    if (line === summary) continue;
    
    // Skip event type lines including machine variants
    if (/^(TD|TP|CM|Cours|Examen|Examens|Contrôle Continu|TD Machine|TP Machine)$/i.test(line)) {
      continue;
    }
    
    // Look for lines that might be professor names
    if (line.length > 3 && line.length < 60 && 
        !line.toLowerCase().includes('salle') && 
        !line.toLowerCase().includes('amphi') &&
        !line.toLowerCase().includes('bât') &&
        !line.toLowerCase().includes('cremi') &&
        !line.match(/^\d/) &&
        !line.includes('/')) {
      
      const words = line.split(/\s+/);
      // Professor names usually have 2-4 words (e.g., "LOURME Alexandre", "POURTIE R Frederic", "BENOIS-PINEAU Jenny")
      if (words.length >= 2 && words.length <= 4) {
        // Check if it's mostly alphabetic (allowing for single letter middle names and hyphens)
        const isName = words.every(word => 
          /^[A-ZÀÂÄÇÈÉÊËÎÏÔÖÙÛÜ][a-zàâäçèéêëîïôöùûü-]*$/i.test(word) || 
          /^[A-ZÀÂÄÇÈÉÊËÎÏÔÖÙÛÜ]$/i.test(word) // Single letter (middle initial)
        );
        
        if (isName) {
          professorName = line;
          break;
        }
      }
    }
  }
  
  summary = cleanDescriptionText(summary);

  const isHoliday = (event.eventCategory && event.eventCategory.includes('Vacances')) || 
                    summary.toLowerCase().includes('vacances');

  let startDate = new Date(event.start);
  let endDate = event.end ? new Date(event.end) : new Date(event.start);

  if (isHoliday) {
    const now = new Date();
    const currentYear = now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear();
    const academicStart = new Date(currentYear, 7, 1);
    const academicEnd = new Date(currentYear + 1, 7, 31);

    if (startDate < academicStart || startDate > academicEnd) return null;
    if (!showHolidays) return null;

    return {
      id: event.id,
      start: startDate,
      end: endDate,
      summary: summary,
      description: null,
      location: null,
      isHoliday: true,
      allDay: true
    };
  }
  
  if (summary.length < 3 && (!event.modules || event.modules.length === 0)) return null;

  for (const [key, replacement] of Object.entries(CONFIG.replacements)) {
    if (summary.includes(key)) summary = replacement;
  }

  let prefix = "";
  let isMachine = fullTextScan.includes("MACHINE") || fullTextScan.includes("PC") || sitesText.includes("CREMI");

  if (/\bTD\b/.test(fullTextScan) || fullTextScan.includes("TD")) prefix = isMachine ? "TD Machine" : "TD";
  else if (/\bTP\b/.test(fullTextScan) || fullTextScan.includes("TP")) prefix = isMachine ? "TP Machine" : "TP";
  else if (fullTextScan.includes("CM") || fullTextScan.includes("COURS")) prefix = "CM"; 
  else if (fullTextScan.includes("EXAM") || fullTextScan.includes("EVALUATION")) prefix = "📝 EXAM";

  if (prefix) {
    const summaryUpper = summary.toUpperCase();
    if (!summaryUpper.startsWith(prefix.toUpperCase()) && !summaryUpper.startsWith("TD") && !summaryUpper.startsWith("TP")) {
      summary = `${prefix} - ${summary}`;
    } else if (isMachine && !summaryUpper.includes("MACHINE")) {
      summary = `${prefix} - ${summary.replace(/^(TD|TP)\s*-?\s*/i, '')}`;
    }
  }
  
  // Append professor name if found
  if (professorName) {
    summary = `${summary} - ${professorName}`;
  }

  let finalLocation = cleanDescriptionText(event.sites ? event.sites.join(', ') : '');
  const roomRegex = /(?:salle\s+\w+|amphi(?:théâtre)?\s+\w+|bât\.|a\d{2}\/|cremi)/i;
  const specificRoomLine = descriptionLines.find(line => roomRegex.test(line));

  if (specificRoomLine) {
    const cleanRoom = specificRoomLine.trim();
    if (finalLocation) {
      finalLocation = (cleanRoom.includes(finalLocation) || cleanRoom.includes("CREMI")) 
        ? cleanRoom 
        : `${finalLocation} - ${cleanRoom}`;
    } else {
      finalLocation = cleanRoom;
    }
  }
  
  // Clean up duplicate building names in location
  // Examples:
  // - "Bâtiment A29 - A29/ Salle 105" -> "Bâtiment A29/ Salle 105"
  // - "Bâtiment A9 - A9.a / Amphithéâtre 1" -> "Bâtiment A9.a / Amphithéâtre 1"
  if (finalLocation) {
    // Pattern to match "Bâtiment XYZ - XYZ/" and replace with "Bâtiment XYZ/"
    finalLocation = finalLocation.replace(/Bâtiment\s+([A-Z]\d+)\s*-\s*\1\//gi, 'Bâtiment $1/');
    
    // Pattern to match "Bâtiment XYZ - XYZ.abc" and replace with "Bâtiment XYZ.abc"
    finalLocation = finalLocation.replace(/Bâtiment\s+([A-Z]\d+)\s*-\s*\1(\.[a-z]+)/gi, 'Bâtiment $1$2');
    
    // More general pattern for building names without "Bâtiment" prefix
    finalLocation = finalLocation.replace(/([A-Z]\d+)\s*-\s*\1\//gi, '$1/');
    finalLocation = finalLocation.replace(/([A-Z]\d+)\s*-\s*\1(\.[a-z]+)/gi, '$1$2');
  }

  if (event.allDay && !event.end) {
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
  }

  return {
    id: event.id || `evt-${startDate.getTime()}`,
    start: startDate,
    end: endDate,
    summary: summary,
    description: cleanDescription,
    location: finalLocation,
    isHoliday: false,
    allDay: event.allDay || false
  };
}

// ==========================================
// 5. HANDLER PRINCIPAL
// ==========================================

export async function GET(request) {
  const startTime = Date.now();
  
  try {
    // Periodic cache cleanup
    if (Math.random() < 0.1) { // 10% of requests trigger cleanup
      pruneCache();
    }

    const { searchParams } = new URL(request.url);
    const groupParam = searchParams.get('group');
    const showHolidays = searchParams.get('holidays') === 'true';

    if (!groupParam) {
      return NextResponse.json({ error: "Paramètre 'group' manquant" }, { status: 400 });
    }

    const groups = groupParam.split(',')
      .map(g => g.trim())
      .filter(g => g.length > 0)
      .slice(0, 10);

    if (groups.length === 0) {
        return NextResponse.json({ error: "Groupe invalide" }, { status: 400 });
    }

    // Exécution parallèle (Chaque fetch sera dédoublonné et caché par Vercel/Next.js)
    const results = await Promise.all(groups.map(group => getEventsForSingleGroup(group)));
    const allRawEvents = results.flat();

    if (allRawEvents.length === 0) {
      logger.info("Aucun événement trouvé", { groups });
      return NextResponse.json({ error: "Aucun cours trouvé ou erreur source" }, { status: 404 });
    }

    const calendar = ical({
      name: `EDT - ${groups.join('+')}`,
      timezone: CONFIG.timezone,
      ttl: CONFIG.CACHE_TTL
    });

    let realCourseCount = 0;
    const processedEventIds = new Set();

    allRawEvents.forEach(rawEvent => {
      if (!rawEvent || !rawEvent.id) return;
      if (processedEventIds.has(rawEvent.id)) return;
      
      const event = processEvent(rawEvent, { showHolidays });
      
      if (!event) return;
      if (!event.isHoliday) realCourseCount++;

      calendar.createEvent({
        id: event.id,
        start: event.start,
        end: event.end,
        summary: event.summary,
        description: event.description,
        location: event.location,
        timezone: CONFIG.timezone,
        allDay: event.allDay
      });

      processedEventIds.add(rawEvent.id);
    });

    if (realCourseCount === 0 && !showHolidays) {
      return NextResponse.json({ error: "Aucun cours trouvé" }, { status: 404 });
    }

    const safeFilename = `edt-${groups.join('_').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;
    const executionTime = Date.now() - startTime;

    logger.info("Génération OK", { groups, events: realCourseCount, ms: executionTime });

    // Send download notification for each group
    await Promise.all(groups.map(group => 
      sendPushNotification({
        groupName: group,
        eventCount: realCourseCount,
        type: 'download'
      }).catch(err => 
        logger.error("Failed to send download notification", err)
      )
    ));

    return new NextResponse(calendar.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        // Headers de cache pour le navigateur/client
        'Cache-Control': `public, max-age=${CONFIG.CACHE_TTL}, s-maxage=${CONFIG.CACHE_TTL}, stale-while-revalidate=${CONFIG.CACHE_TTL}`,
        'X-Response-Time': `${executionTime}ms`,
      },
    });

  } catch (error) {
    logger.error("Erreur fatale", error);
    return NextResponse.json({ error: 'Service indisponible' }, { status: 500 });
  }
}
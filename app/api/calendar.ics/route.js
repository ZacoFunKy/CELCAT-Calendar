import { NextResponse } from 'next/server';
import ical from 'ical-generator';

// ==========================================
// 1. CONFIGURATION PROD
// ==========================================
const CONFIG = {
  celcatUrl: 'https://celcat.u-bordeaux.fr/Calendar/Home/GetCalendarData',
  timezone: 'Europe/Paris',
  SHOW_HOLIDAYS: false, 
  blacklist: ['DSPEG', 'Cours DSPEG'],
  replacements: {
    'Test': '💻',
  }
};

export const revalidate = 3600; 

// ==========================================
// 2. UTILITAIRES
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

function getOptimizedDateRange() {
  const now = new Date();
  const start = new Date(now);
  start.setMonth(now.getMonth() - 1);
  const end = new Date(now);
  end.setMonth(now.getMonth() + 6);
  return {
    start: formatDate(start),
    end: formatDate(end)
  };
}

function cleanDescriptionText(text) {
  if (!text) return "";
  
  let txt = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');

  return txt
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}
function processEvent(event) {
  const cleanDescription = cleanDescriptionText(event.description || "");
  if (CONFIG.blacklist.some(keyword => cleanDescription.includes(keyword))) return null;

  // --- 1. ANALYSE GLOBALE DU TEXTE ---
  const fullTextScan = (event.eventCategory + " " + cleanDescription).toUpperCase();
  const sitesText = (event.sites ? event.sites.join(', ') : '').toUpperCase();

  // --- 2. TITRE DE BASE ---
  let summary = "";
  if (event.modules && event.modules.length > 0) summary = event.modules[0];
  else if (event.eventCategory) summary = event.eventCategory;
  else summary = cleanDescription.split('\n')[0];
  
  summary = cleanDescriptionText(summary);

  // --- 3. GESTION DES VACANCES ---
  const isHoliday = (event.eventCategory && event.eventCategory.includes('Vacances')) || 
                    summary.toLowerCase().includes('vacances');

  if (isHoliday && !CONFIG.SHOW_HOLIDAYS) return null;
  if (!isHoliday && summary.length < 3 && (!event.modules || event.modules.length === 0)) return null;

  // --- 4. REMPLACEMENTS ---
  for (const [key, replacement] of Object.entries(CONFIG.replacements)) {
    if (summary.includes(key)) summary = replacement;
  }

  let prefix = "";
  let isMachine = false;

  if (fullTextScan.includes("MACHINE") || fullTextScan.includes("PC") || sitesText.includes("CREMI") || fullTextScan.includes("CREMI")) {
    isMachine = true;
  }

  if (/\bTD\b/.test(fullTextScan) || fullTextScan.includes("TD")) {
    prefix = isMachine ? "TD Machine" : "TD";
  }
  else if (/\bTP\b/.test(fullTextScan) || fullTextScan.includes("TP")) {
    prefix = isMachine ? "TP Machine" : "TP";
  }
  else if (fullTextScan.includes("CM") || fullTextScan.includes("COURS") || fullTextScan.includes("MAGISTRAL")) {
    prefix = "CM"; 
  }
  else if (fullTextScan.includes("EXAM") || fullTextScan.includes("EVALUATION") || fullTextScan.includes("PARTIEL")) {
    prefix = "📝 EXAM";
  }

  if (prefix) {
    const summaryUpper = summary.toUpperCase();
    if (!summaryUpper.startsWith(prefix.toUpperCase()) && !summaryUpper.startsWith("TD") && !summaryUpper.startsWith("TP")) {
      summary = `${prefix} - ${summary}`;
    } else if (isMachine && !summaryUpper.includes("MACHINE")) {
      summary = `${prefix} - ${summary.replace(/^(TD|TP)\s*-?\s*/i, '')}`;
    }
  }

  // --- 6. GESTION AVANCÉE DU LIEU ---
  let finalLocation = cleanDescriptionText(event.sites ? event.sites.join(', ') : '');

  const descriptionLines = cleanDescription.split('\n');
  
  const roomRegex = /(?:salle\s+\w+|amphi(?:théâtre)?\s+\w+|bât\.|a\d{2}\/|cremi)/i;
  
  const specificRoomLine = descriptionLines.find(line => roomRegex.test(line));

  if (specificRoomLine) {
    const cleanRoom = specificRoomLine.trim();
    
    if (finalLocation) {
      if (cleanRoom.includes(finalLocation) || cleanRoom.includes("CREMI") || cleanRoom.includes("/")) {
         finalLocation = cleanRoom;
      } else {
         finalLocation = `${finalLocation} - ${cleanRoom}`;
      }
    } else {
      finalLocation = cleanRoom;
    }
  }

  return {
    id: event.id,
    start: new Date(event.start),
    end: new Date(event.end),
    summary: summary,
    description: cleanDescription,
    location: finalLocation,
    isHoliday: isHoliday
  };
}
// --- RÉSEAU ---

async function fetchCelcatData(start, end, groupName, timeoutMs) {
  const formData = new URLSearchParams();
  formData.append('start', start);
  formData.append('end', end);
  formData.append('resType', '103');
  formData.append('calView', 'month');
  formData.append('colourScheme', '3');
  formData.append('federationIds[]', groupName);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(CONFIG.celcatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0'
      },
      body: formData,
      signal: controller.signal
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getEventsForSingleGroup(groupName) {
    try {
        const { start, end } = getFullAcademicYear();
        return await fetchCelcatData(start, end, groupName, 4500);
    } catch (error) {
        try {
            const { start, end } = getOptimizedDateRange();
            return await fetchCelcatData(start, end, groupName, 5000);
        } catch (finalError) {
            return []; 
        }
    }
}

// ==========================================
// 3. HANDLER PRINCIPAL
// ==========================================

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const groupParam = searchParams.get('group');

    if (!groupParam) return NextResponse.json({ error: "Groupe manquant" }, { status: 400 });

    const groups = groupParam.split(',').map(g => g.trim()).filter(g => g.length > 0);
    if (groups.length === 0) return NextResponse.json({ error: "Groupe invalide" }, { status: 400 });

    const results = await Promise.all(groups.map(group => getEventsForSingleGroup(group)));
    const allRawEvents = results.flat();

    if (allRawEvents.length === 0) {
      return NextResponse.json({ error: "Aucune donnée trouvée" }, { status: 404 });
    }

    const calendar = ical({
      name: `EDT - ${groups.join('+')}`,
      timezone: CONFIG.timezone,
      ttl: 43200 // TTL 12h pour aider Google
    });

    let realCourseCount = 0;
    const processedEventIds = new Set();

    allRawEvents.forEach(rawEvent => {
      if (processedEventIds.has(rawEvent.id)) return;
      const event = processEvent(rawEvent);
      if (!event) return;
      if (!event.isHoliday) realCourseCount++;

      calendar.createEvent({
        id: event.id,
        start: event.start,
        end: event.end,
        summary: event.summary,
        description: event.description,
        location: event.location,
        timezone: CONFIG.timezone
      });

      processedEventIds.add(rawEvent.id);
    });

    if (realCourseCount === 0) {
      return NextResponse.json({ error: `Aucun cours trouvé` }, { status: 404 });
    }

    // Nom de fichier propre basé sur les groupes
    const safeFilename = `edt-${groups.join('_').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;

    return new NextResponse(calendar.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Cache-Control': 'public, max-age=43200, s-maxage=43200, stale-while-revalidate=3600',
      },
    });

  } catch (error) {
    console.error("Erreur serveur:", error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import ical from 'ical-generator';
import {
  getCachedGroupData,
  setCachedGroupData,
  trackGroupRequest,
  pruneCache
} from './cache.js';
import { checkScheduleChanges, sendPushNotification } from '../notifications/notifier.js';
import dbConnect from '../../../lib/db';
import User from '../../../models/User';
import UserPreference from '../../../models/UserPreference';
import { CONFIG, getFullAcademicYear, processEvent, applyCustomizations } from './utils.js';

const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'info');
const logger = {
  info: (msg, data) => {
    if (LOG_LEVEL === 'info' || LOG_LEVEL === 'debug') {
      console.log(`[INFO] ${msg}`, data ? JSON.stringify(data) : '');
    }
  },
  error: (msg, err) => console.error(`[ERROR] ${msg}`, err)
};

function normalizeGroupValue(groupValue) {
  if (!groupValue) return { id: '', label: '' };
  if (typeof groupValue === 'object' && (groupValue.id || groupValue.label || groupValue.text)) {
    const id = String(groupValue.id || groupValue.label || groupValue.text || '');
    const label = String(groupValue.label || groupValue.text || groupValue.id || '');
    return { id, label };
  }
  const raw = String(groupValue);
  if (raw.includes('::')) {
    const [idPart, ...rest] = raw.split('::');
    const label = rest.join('::') || idPart;
    return { id: idPart, label };
  }
  return { id: raw, label: raw };
}

// --- Helper Functions ---

async function fetchGroupData(groupValue) {
  const { id, label } = normalizeGroupValue(groupValue);
  const groupId = id || label;
  if (!groupId) return [];

  const { start, end } = getFullAcademicYear();
  const formData = new URLSearchParams();
  formData.append('start', start);
  formData.append('end', end);
  formData.append('resType', '103');
  formData.append('calView', 'agendaDay');
  formData.append('federationIds[]', groupId);
  formData.append('colourScheme', '3');

  let attempt = 0;
  while (attempt < CONFIG.MAX_RETRIES) {
    try {
      const response = await fetch(CONFIG.celcatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
        signal: AbortSignal.timeout(CONFIG.TIMEOUT)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      attempt++;
      if (attempt === CONFIG.MAX_RETRIES) throw error;
      await new Promise(r => setTimeout(r, CONFIG.INITIAL_BACKOFF * Math.pow(2, attempt - 1)));
    }
  }
}

// In-flight requests deduplication
const inFlightRequests = new Map();

export function clearInFlightRequests() {
  inFlightRequests.clear();
}

async function getEventsForSingleGroup(groupValue) {
  const { id, label } = normalizeGroupValue(groupValue);
  const groupKey = id || label;
  const displayName = label || id;

  if (!groupKey) return [];

  trackGroupRequest(displayName);

  // Basic safety check: reject obvious injection attempts only
  if (groupKey.includes('<') || groupKey.includes('>') || groupKey.includes('\0')) {
    logger.error(`Rejected suspicious group value: ${groupKey}`);
    return [];
  }

  // 1. Check cache first
  const cached = getCachedGroupData(groupKey);
  if (cached) return cached;

  // 2. Check in-flight requests (deduplication)
  if (inFlightRequests.has(groupKey)) {
    logger.info(`Joining in-flight request for group: ${displayName}`);
    return inFlightRequests.get(groupKey);
  }

  // 3. Fetch new data
  const fetchPromise = (async () => {
    try {
      const events = await fetchGroupData(groupKey);
      setCachedGroupData(groupKey, events);

      // Notify if schedule changed (sync, returns object not promise)
      try {
        checkScheduleChanges(displayName, events);
      } catch (err) {
        logger.error("Failed to check schedule changes", err);
      }

      return events;
    } catch (error) {
      logger.error(`Failed to fetch group ${displayName}`, error);
      return [];
    } finally {
      inFlightRequests.delete(groupKey);
    }
  })();

  inFlightRequests.set(groupKey, fetchPromise);
  return fetchPromise;
}

export async function GET(request) {
  const startTime = Date.now();
  let requestHiddenRules = [];
  let requestRenamingRules = new Map();
  let tokenUserFound = false;

  try {
    // Periodic cache cleanup
    if (Math.random() < 0.1) { // 10% of requests trigger cleanup
      pruneCache();
    }

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const format = searchParams.get('format'); // 'ics' (default) or 'json'

    let groupValues = [];
    let normalizedGroups = [];
    let groupLabels = [];
    let showHolidays = searchParams.get('holidays') === 'true';
    let hiddenEvents = [];
    let customNames = new Map();
    let colorMap = new Map();
    let prefs = null;

    // 1. Authentication & Preferences via Token
    if (token) {
      try {
        await dbConnect();
        const user = await User.findOne({ calendarToken: token });

        if (user) {
          tokenUserFound = true;
          prefs = await UserPreference.findOne({ userId: user._id });
          if (prefs) {
            groupValues = prefs.groups || [];
            if (prefs.colorMap) {
              colorMap = prefs.colorMap instanceof Map ? prefs.colorMap : new Map(Object.entries(prefs.colorMap));
            }
            // Use preferences for holidays if set, otherwise fallback to query param
            if (prefs.settings && prefs.settings.showHolidays !== undefined) {
              showHolidays = prefs.settings.showHolidays;
            }
            hiddenEvents = prefs.hiddenEvents || [];
            if (prefs.settings && prefs.settings.customNames) {
              customNames = prefs.settings.customNames;
            }
            // Load advanced rules
            if (prefs.settings && prefs.settings.hiddenRules) {
              requestHiddenRules = prefs.settings.hiddenRules;
            }
            if (prefs.settings && prefs.settings.renamingRules) {
              requestRenamingRules = prefs.settings.renamingRules;
            }
          }
        }
      } catch (e) {
        logger.error("Erreur auth token", e);
        // Fallback to standard behavior on error
      }
    }

    // 2. Fallback to 'group' param if no valid token/groups found
    if (groupValues.length === 0 && tokenUserFound) {
      // Token is valid but user has no groups configured yet; return empty list instead of 400
      return NextResponse.json({ events: [] });
    }

    if (groupValues.length === 0) {
      const groupParam = searchParams.get('group');
      if (!groupParam) {
        return NextResponse.json({ error: "Paramètre 'group' manquant ou token invalide" }, { status: 400 });
      }
      groupValues = groupParam.split(',')
        .map(g => g.trim())
        .filter(g => g.length > 0)
        .slice(0, 10);
    }

    normalizedGroups = groupValues
      .map(normalizeGroupValue)
      .filter(({ id, label }) => {
        const name = label || id;
        if (!name) return false;
        // Basic safety: reject obvious injection attempts
        if (name.includes('<') || name.includes('>') || name.includes('\0')) {
          logger.error(`Rejected suspicious group: ${name}`);
          return false;
        }
        return true;
      });

    groupLabels = normalizedGroups.map(g => g.label || g.id);

    if (normalizedGroups.length === 0) {
      return NextResponse.json({ error: "Groupe invalide" }, { status: 400 });
    }

    // Exécution parallèle (Chaque fetch sera dédoublonné et caché par Vercel/Next.js)
    const results = await Promise.all(normalizedGroups.map(group => getEventsForSingleGroup(group)));
    const allRawEvents = results.flat();

    if (allRawEvents.length === 0) {
      logger.info("Aucun événement trouvé", { groups: groupLabels });
      return NextResponse.json({ error: "Aucun cours trouvé ou erreur source" }, { status: 404 });
    }

    // Return JSON if requested
    if (format === 'json') {
      const events = [];
      const processedEventIds = new Set();

      allRawEvents.forEach(rawEvent => {
        if (!rawEvent || !rawEvent.id) return;
        if (processedEventIds.has(rawEvent.id)) return;

        // Personalization: Skip hidden events (ID based)
        if (hiddenEvents.includes(rawEvent.id)) return;

        const event = processEvent(rawEvent, { showHolidays });

        if (!event) return;

        // Personalization: Skip hidden events (Rule based)
        if (requestHiddenRules && Array.isArray(requestHiddenRules)) {
          const shouldHide = requestHiddenRules.some(rule => {
            if (rule.ruleType === 'name' && event.summary === rule.value) return true;
            if (rule.ruleType === 'professor' && event.summary.includes(rule.value)) return true; // Simple check for now
            return false;
          });
          if (shouldHide) return;
        }

        // Personalization: Apply custom names
        // 1. Check specific ID rename
        let customName = customNames instanceof Map ? customNames.get(rawEvent.id) : customNames[rawEvent.id];

        // 2. If no specific rename, check global renaming rules
        if (!customName && requestRenamingRules) {
          const renamingRules = requestRenamingRules instanceof Map ? requestRenamingRules : new Map(Object.entries(requestRenamingRules));
          if (renamingRules.has(event.summary)) {
            customName = renamingRules.get(event.summary);
          }
        }

        // 3. Apply type mappings
        if (prefs && prefs.settings && prefs.settings.typeMappings) {
          const typeMappings = prefs.settings.typeMappings instanceof Map
            ? prefs.settings.typeMappings
            : new Map(Object.entries(prefs.settings.typeMappings));

          const prefixMatch = event.summary.match(/^([A-Z]+(?:\s+[A-Z]+)?)\s*-\s*(.+)/);
          if (prefixMatch) {
            const prefix = prefixMatch[1];
            const rest = prefixMatch[2];
            if (typeMappings.has(prefix)) {
              const newPrefix = typeMappings.get(prefix);
              // User requested to keep the hyphen
              event.summary = newPrefix ? `${newPrefix} - ${rest}` : rest;
            }
          }
        }

        if (customName) {
          event.summary = customName;
        }

        if (!event.isHoliday) {
          // Include in JSON response
        }

        events.push(event);
        processedEventIds.add(rawEvent.id);
      });

      return NextResponse.json({ events });
    }

    const calendar = ical({
      name: `EDT - ${groupLabels.join('+')}`,
      timezone: CONFIG.timezone,
      ttl: CONFIG.CACHE_TTL
    });

    let realCourseCount = 0;
    const processedEventIds = new Set();

    allRawEvents.forEach(rawEvent => {
      if (!rawEvent || !rawEvent.id) return;
      if (processedEventIds.has(rawEvent.id)) return;

      // Personalization: Skip hidden events (ID based)
      if (hiddenEvents.includes(rawEvent.id)) return;

      const event = processEvent(rawEvent, { showHolidays });

      if (!event) return;

      // Personalization: Apply all customizations (Hidden, Renaming, Type Mappings)
      const customizedEvent = applyCustomizations(event, {
        customNames,
        typeMappings: prefs?.settings?.typeMappings,
        renamingRules: requestRenamingRules,
        hiddenRules: requestHiddenRules
      });

      if (!customizedEvent) return; // Hidden by rule

      if (!event.isHoliday) realCourseCount++;

      const eventType = event.eventType || 'Other';
      const color = colorMap.get(eventType);

      const icalEvent = calendar.createEvent({
        id: event.id,
        start: event.start,
        end: event.end,
        summary: event.summary,
        description: event.description,
        location: event.location,
        timezone: CONFIG.timezone,
        allDay: event.allDay
      });

      // Add categories for coloring (standard way)
      if (eventType) {
        icalEvent.categories([eventType]);
      }

      // Add custom color property if available (best effort for some clients)
      if (color) {
        icalEvent.x('X-COLOR', color);
        icalEvent.x('X-APPLE-CALENDAR-COLOR', color);
      }

      processedEventIds.add(rawEvent.id);
    });

    if (realCourseCount === 0 && !showHolidays) {
      return NextResponse.json({ error: "Aucun cours trouvé" }, { status: 404 });
    }

    const safeFilename = `edt-${groupLabels.join('_').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;
    const executionTime = Date.now() - startTime;

    logger.info("Génération OK", { groups: groupLabels, events: realCourseCount, ms: executionTime });

    // Send download notification for each group
    await Promise.all(groupLabels.map(group =>
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

import { NextResponse } from 'next/server';
import { pruneCache, getCacheStats } from './cache.js';
import { sendPushNotification } from '../notifications/notifier.js';
import { loadUserPreferences } from './handlers/auth.js';
import { getEventsForGroup, clearInFlightRequests, normalizeGroupValue } from './handlers/fetcher.js';
import { generateICS, generateJSON } from './handlers/generator.js';
import { createLogger } from '../../../lib/logger.js';

const logger = createLogger('CalendarICS');

// Re-export for backward compatibility with tests
export { clearInFlightRequests };

export async function GET(request) {
  const startTime = Date.now();

  const { searchParams } = new URL(request.url);
  
  // Stats endpoint for monitoring
  if (searchParams.get('stats') === 'true') {
    const stats = getCacheStats();
    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'no-cache, no-store' }
    });
  }

  try {
    // Periodic cache cleanup (10% of requests)
    if (Math.random() < 0.1) {
      pruneCache();
    }

    const token = searchParams.get('token');
    const format = searchParams.get('format'); // 'ics' (default) or 'json'
    let showHolidays = searchParams.get('holidays') === 'true';

    // 1. Load user preferences if token provided
    const userPrefs = token ? await loadUserPreferences(token) : null;
    
    let groupValues = userPrefs?.groups || [];
    let hiddenEvents = userPrefs?.hiddenEvents || [];
    let customNames = userPrefs?.customNames || new Map();
    let colorMap = userPrefs?.colorMap || new Map();
    let hiddenRules = userPrefs?.hiddenRules || [];
    let renamingRules = userPrefs?.renamingRules || new Map();

    // Override holidays setting from preferences if available
    if (userPrefs?.showHolidays !== undefined) {
      showHolidays = userPrefs.showHolidays;
    }

    // 2. Fallback to 'group' param if no groups from token
    if (groupValues.length === 0 && userPrefs) {
      // Valid token but no groups configured
      return NextResponse.json({ events: [] });
    }

    if (groupValues.length === 0) {
      const groupParam = searchParams.get('group');
      if (!groupParam) {
        return NextResponse.json({ 
          error: "Paramètre 'group' manquant ou token invalide" 
        }, { status: 400 });
      }
      groupValues = groupParam.split(',')
        .map(g => g.trim())
        .filter(g => g.length > 0)
        .slice(0, 10);
    }

    // 3. Normalize and validate groups
    const normalizedGroups = groupValues
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

    const groupLabels = normalizedGroups.map(g => g.label || g.id);

    if (normalizedGroups.length === 0) {
      return NextResponse.json({ error: "Groupe invalide" }, { status: 400 });
    }

    // 4. Fetch events for all groups in parallel
    const results = await Promise.all(
      normalizedGroups.map(group => getEventsForGroup(group))
    );
    const allRawEvents = results.flat().filter(e => e !== null && e !== undefined);

    logger.info("Fetched events", { 
      groupLabels, 
      groupCount: results.length,
      eventCount: allRawEvents.length,
      format,
      authenticated: !!userPrefs
    });

    // 5. Handle empty results
    if (allRawEvents.length === 0) {
      if (format === 'json') {
        return NextResponse.json({ events: [] });
      }
      return NextResponse.json({ 
        error: "Aucun cours trouvé ou erreur source" 
      }, { status: 404 });
    }

    // 6. Generate response in requested format
    const options = {
      showHolidays,
      hiddenEvents,
      customNames,
      colorMap,
      hiddenRules,
      renamingRules,
    };

    if (format === 'json') {
      const events = generateJSON(allRawEvents, options);
      return NextResponse.json({ events });
    }

    // Generate ICS calendar
    const { icsContent, eventCount } = generateICS(allRawEvents, groupLabels, options);
    
    // Return 404 if no events remain after filtering
    if (eventCount === 0 && !showHolidays) {
      return NextResponse.json({ error: "Aucun cours trouvé" }, { status: 404 });
    }
    
    const safeFilename = `edt-${groupLabels.join('_').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;
    const executionTime = Date.now() - startTime;

    logger.info("Generated calendar", { 
      groups: groupLabels, 
      events: eventCount, 
      ms: executionTime 
    });

    // Send download notification for each group
    await Promise.all(groupLabels.map(group =>
      sendPushNotification({
        groupName: group,
        eventCount: eventCount,
        type: 'download'
      }).catch(err =>
        logger.error("Failed to send download notification", err)
      )
    ));

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Cache-Control': `public, max-age=1800, s-maxage=3600, stale-while-revalidate=7200`,
        'X-Response-Time': `${executionTime}ms`,
      },
    });

  } catch (error) {
    logger.error("Service error", { error: error.message, stack: error.stack });
    return NextResponse.json({ 
      error: 'Service indisponible',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

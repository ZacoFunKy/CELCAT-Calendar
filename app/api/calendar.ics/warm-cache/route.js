/**
 * Cache warming endpoint for Vercel Cron Jobs
 * Preloads popular groups to reduce cold starts
 */

import { NextResponse } from 'next/server';
import { getGroupsNeedingWarmup, setCachedGroupData } from '../cache.js';
import { getFullAcademicYear, CONFIG } from '../utils.js';

// Verify cron secret for security
const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';

export async function GET(request) {
  // Verify authorization for cron job
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const results = {
    warmed: [],
    failed: [],
    timestamp: new Date().toISOString()
  };

  try {
    // Get groups that need warming (popular groups)
    const groupsToWarm = getGroupsNeedingWarmup(3); // Min 3 requests

    console.log(`[Cron] Warming ${groupsToWarm.length} groups`);

    // Warm cache for each group
    for (const { name } of groupsToWarm.slice(0, 10)) { // Max 10 groups per run
      try {
        const { start, end } = getFullAcademicYear();
        const formData = new URLSearchParams();
        formData.append('start', start);
        formData.append('end', end);
        formData.append('resType', '103');
        formData.append('calView', 'agendaWeek');
        formData.append('federationIds[]', name);

        const response = await fetch('https://celcat-amu.univ-amu.fr/calendar2/Home/GetCalendarData', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'AMU-Calendar/2.0',
          },
          body: formData.toString(),
          signal: AbortSignal.timeout(CONFIG.TIMEOUT),
        });

        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data)) {
            await setCachedGroupData(name, data);
            results.warmed.push(name);
            console.log(`[Cron] Warmed cache for ${name}: ${data.length} events`);
          }
        } else {
          results.failed.push({ name, reason: `HTTP ${response.status}` });
        }
      } catch (error) {
        results.failed.push({ name, reason: error.message });
        console.error(`[Cron] Failed to warm ${name}:`, error.message);
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const duration = Date.now() - startTime;
    console.log(`[Cron] Cache warming complete in ${duration}ms`);

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      ...results
    });

  } catch (error) {
    console.error('[Cron] Cache warming failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      duration: `${Date.now() - startTime}ms`,
      ...results
    }, { status: 500 });
  }
}

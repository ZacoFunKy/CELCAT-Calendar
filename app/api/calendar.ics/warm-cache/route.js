/**
 * Cache warming endpoint for Vercel Cron Jobs
 * Preloads popular groups to reduce cold starts
 */

import { NextResponse } from 'next/server';
import { getGroupsNeedingWarmup, setCachedGroupData } from '../cache.js';
import { getFullAcademicYear } from '../utils.js';
import { CELCAT_CONFIG } from '../../../../lib/config.js';
import { createLogger } from '../../../../lib/logger.js';

const logger = createLogger('CacheWarming');

// Verify cron secret for security
const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret';

export async function GET(request) {
  // Verify authorization for cron job
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    logger.warn('Unauthorized cache warming attempt');
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

    logger.info('Starting cache warming', { count: groupsToWarm.length });

    // Warm cache for each group
    for (const { name } of groupsToWarm.slice(0, 10)) { // Max 10 groups per run
      try {
        const { start, end } = getFullAcademicYear();
        const formData = new URLSearchParams();
        formData.append('start', start);
        formData.append('end', end);
        formData.append('resType', '103');
        formData.append('calView', 'month');
        formData.append('federationIds[]', name);
        formData.append('colourScheme', '3');

        const response = await fetch(CELCAT_CONFIG.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
          signal: AbortSignal.timeout(CELCAT_CONFIG.timeout),
        });

        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data)) {
            await setCachedGroupData(name, data);
            results.warmed.push(name);
            logger.info('Warmed cache for group', { name, count: data.length });
          }
        } else {
          results.failed.push({ name, reason: `HTTP ${response.status}` });
        }
      } catch (error) {
        results.failed.push({ name, reason: error.message });
        logger.warn('Failed to warm cache for group', { name, error: error.message });
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const duration = Date.now() - startTime;
    logger.info('Cache warming complete', { duration, warmed: results.warmed.length, failed: results.failed.length });

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      ...results
    });

  } catch (error) {
    logger.error('Cache warming failed', { error: error.message });
    return NextResponse.json({
      success: false,
      error: error.message,
      duration: `${Date.now() - startTime}ms`,
      ...results
    }, { status: 500 });
  }
}

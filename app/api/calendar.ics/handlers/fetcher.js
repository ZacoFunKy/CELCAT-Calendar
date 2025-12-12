/**
 * @fileoverview CELCAT API fetcher
 * Handles fetching events from CELCAT with caching and deduplication
 */

import {
  getCachedGroupData,
  setCachedGroupData,
  trackGroupRequest,
} from '../cache.js';
import { getFullAcademicYear } from '../utils.js';
import { createLogger } from '../../../../lib/logger.js';
import { CELCAT_CONFIG } from '../../../../lib/config.js';
import { ExternalAPIError } from '../../../../lib/errors.js';
import { checkScheduleChanges } from '../../notifications/notifier.js';

const logger = createLogger('CELCATFetcher');

// In-flight requests deduplication
const inFlightRequests = new Map();

/**
 * Normalize group value to {id, label} format
 * @param {string|Object} groupValue - Group identifier
 * @returns {{id: string, label: string}}
 */
export function normalizeGroupValue(groupValue) {
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

/**
 * Validate group name for security
 * @param {string} groupName - Group name to validate
 * @returns {boolean} True if valid
 */
export function isValidGroupName(groupName) {
  if (!groupName) return false;
  
  // Reject obvious XSS/injection attempts
  if (groupName.includes('<script') || 
      groupName.includes('javascript:') || 
      groupName.includes('\0')) {
    logger.error('Rejected suspicious group', { groupName });
    return false;
  }
  
  return true;
}

/**
 * Fetch events from CELCAT API
 * @param {string} groupKey - Group identifier
 * @param {string} start - Start date (YYYY-MM-DD)
 * @param {string} end - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of events
 */
async function fetchFromCELCAT(groupKey, start, end) {
  logger.info('Fetching from CELCAT', { groupKey, start, end });
  
  const formData = new URLSearchParams();
  formData.append('start', start);
  formData.append('end', end);
  formData.append('resType', '103');
  formData.append('calView', 'month');
  formData.append('federationIds[]', groupKey);
  formData.append('colourScheme', '3');

  const response = await fetch(CELCAT_CONFIG.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
    signal: AbortSignal.timeout(CELCAT_CONFIG.timeout)
  });

  if (!response.ok) {
    throw new ExternalAPIError('CELCAT API error', { status: response.status });
  }

  const events = await response.json();
  const validEvents = Array.isArray(events) 
    ? events.filter(e => e !== null && e !== undefined) 
    : [];
  
  logger.info('Fetched events from CELCAT', { groupKey, count: validEvents.length });
  
  return validEvents;
}

/**
 * Fetch and cache group events
 * @param {string} groupKey - Group identifier
 * @param {string} displayName - Display name for notifications
 * @returns {Promise<Array>} Array of events
 */
async function fetchAndCacheGroup(groupKey, displayName) {
  try {
    const { start, end } = getFullAcademicYear();
    const events = await fetchFromCELCAT(groupKey, start, end);
    
    setCachedGroupData(groupKey, events);

    // Notify if schedule changed (fire and forget)
    try {
      checkScheduleChanges(displayName || groupKey, events);
    } catch (err) {
      logger.warn('Schedule change notification failed', { error: err.message });
    }

    return events;
  } catch (error) {
    logger.error('Failed to fetch group', { groupKey, error: error.message });
    return [];
  } finally {
    inFlightRequests.delete(groupKey);
  }
}

/**
 * Get events for a single group with caching and deduplication
 * @param {string|Object} groupValue - Group identifier
 * @param {Object} [options]
 * @param {boolean} [options.forceRefresh=false] - Skip caches and refetch from CELCAT
 * @returns {Promise<Array>} Array of events
 */
export async function getEventsForGroup(groupValue, { forceRefresh = false } = {}) {
  const { id, label } = normalizeGroupValue(groupValue);
  const groupKey = id || label;
  const displayName = label || id;

  if (!groupKey) {
    logger.warn('Empty group key provided');
    return [];
  }

  // Validate group name
  if (!isValidGroupName(groupKey)) {
    return [];
  }

  trackGroupRequest(displayName);
  logger.debug('Getting events for group', { groupKey, displayName });

  // 1. Check cache with stale support (unless forceRefresh)
  if (!forceRefresh) {
    const cacheResult = await getCachedGroupData(groupKey);
    if (cacheResult) {
      const { data, stale } = cacheResult;
      
      if (data && data.length > 0) {
        if (!stale) {
          logger.debug('Fresh cache hit', { groupKey, count: data.length });
          return data;
        } else {
          logger.info('Stale cache hit - revalidating in background', { 
            groupKey, 
            count: data.length 
          });
          
          // Background revalidation (fire and forget)
          fetchAndCacheGroup(groupKey, displayName)
            .catch(err => logger.warn('Background revalidation failed', { 
              error: err.message 
            }));
          
          return data;
        }
      }
    }
  }

  // 2. Check in-flight requests (deduplication) unless forcing refresh
  if (!forceRefresh && inFlightRequests.has(groupKey)) {
    logger.debug('Joining in-flight request', { groupKey });
    return inFlightRequests.get(groupKey);
  }

  // 3. Fetch new data
  const fetchPromise = fetchAndCacheGroup(groupKey, displayName);
  if (!forceRefresh) {
    inFlightRequests.set(groupKey, fetchPromise);
  }
  return fetchPromise;
}

/**
 * Clear all in-flight requests (for testing)
 */
export function clearInFlightRequests() {
  inFlightRequests.clear();
}

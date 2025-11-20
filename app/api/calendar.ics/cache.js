/**
 * Cache management and preloading utilities for the Calendar API
 * Implements intelligent caching and preloading for frequently requested groups
 */

// In-memory cache for popular groups
const popularGroupsCache = new Map();
const requestStats = new Map(); // Track request frequency

// Configuration
const CACHE_CONFIG = {
  MAX_CACHE_SIZE: 50, // Maximum number of cached groups
  PRELOAD_THRESHOLD: 5, // Number of requests before considering a group "popular"
  CACHE_TTL: 3600000, // 1 hour in milliseconds
  STATS_WINDOW: 86400000, // 24 hours for stats tracking
};

/**
 * Get cached data for a group if available and not expired
 */
export function getCachedGroupData(groupName) {
  const cached = popularGroupsCache.get(groupName);
  
  if (!cached) {
    return null;
  }
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_CONFIG.CACHE_TTL) {
    popularGroupsCache.delete(groupName);
    return null;
  }
  
  return cached.data;
}

/**
 * Store data in cache for a group
 */
export function setCachedGroupData(groupName, data) {
  // Implement LRU cache eviction if needed
  if (popularGroupsCache.size >= CACHE_CONFIG.MAX_CACHE_SIZE) {
    // Remove oldest entry
    const oldestKey = Array.from(popularGroupsCache.keys())[0];
    popularGroupsCache.delete(oldestKey);
  }
  
  popularGroupsCache.set(groupName, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Track request for a group and update statistics
 */
export function trackGroupRequest(groupName) {
  const now = Date.now();
  let stats = requestStats.get(groupName);
  
  if (!stats) {
    stats = {
      count: 0,
      lastRequest: now,
      firstRequest: now,
    };
  }
  
  stats.count++;
  stats.lastRequest = now;
  
  // Clean up old stats (older than stats window)
  if (now - stats.firstRequest > CACHE_CONFIG.STATS_WINDOW) {
    stats.count = 1;
    stats.firstRequest = now;
  }
  
  requestStats.set(groupName, stats);
}

/**
 * Get popular groups based on request frequency
 */
export function getPopularGroups(limit = 10) {
  const groups = Array.from(requestStats.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
  
  return groups;
}

/**
 * Check if a group should be preloaded
 */
export function shouldPreload(groupName) {
  const stats = requestStats.get(groupName);
  if (!stats) {
    return false;
  }
  
  return stats.count >= CACHE_CONFIG.PRELOAD_THRESHOLD;
}

/**
 * Get usage statistics for all groups
 */
export function getUsageStatistics() {
  const stats = {};
  
  for (const [groupName, data] of requestStats.entries()) {
    stats[groupName] = {
      requestCount: data.count,
      lastRequest: new Date(data.lastRequest).toISOString(),
      firstRequest: new Date(data.firstRequest).toISOString(),
    };
  }
  
  return stats;
}

/**
 * Clear expired cache entries
 */
export function pruneCache() {
  const now = Date.now();
  
  for (const [key, value] of popularGroupsCache.entries()) {
    if (now - value.timestamp > CACHE_CONFIG.CACHE_TTL) {
      popularGroupsCache.delete(key);
    }
  }
  
  // Also prune old statistics
  for (const [key, stats] of requestStats.entries()) {
    if (now - stats.lastRequest > CACHE_CONFIG.STATS_WINDOW) {
      requestStats.delete(key);
    }
  }
}

/**
 * Clear all caches (for testing or admin purposes)
 */
export function clearAllCaches() {
  popularGroupsCache.clear();
  requestStats.clear();
}

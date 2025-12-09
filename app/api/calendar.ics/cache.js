/**
 * Cache management and preloading utilities for the Calendar API
 * Optimized for Vercel serverless deployment with Edge caching support
 * Implements hybrid caching (Redis + In-Memory + Edge) for optimal performance
 */

import Redis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';
import { createLogger } from '../../../lib/logger.js';
import { CACHE_CONFIG } from '../../../lib/config.js';

const logger = createLogger('Cache');

// Initialize Redis with Vercel optimizations
let redis = null;
let isHttpRedis = false;
let redisHealthy = true;
let lastHealthCheck = 0;

// Vercel-optimized Redis connection
const connectionString = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

if (connectionString && CACHE_CONFIG.redis.enabled) {
  try {
    // Prefer Upstash HTTP for Vercel serverless (no connection pooling issues)
    if (connectionString.startsWith('http')) {
      isHttpRedis = true;
      redis = new UpstashRedis({
        url: connectionString,
        token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_PASSWORD || '',
        automaticDeserialization: true,
        retry: {
          retries: 2,
          backoff: (retryCount) => Math.min(retryCount * 100, 1000)
        }
      });
      logger.info('Redis initialized (Upstash HTTP)');
    } else {
      // Standard Redis with connection pooling for Vercel
      let url = connectionString;
      if (!url.startsWith('redis://') && !url.startsWith('rediss://')) {
        if (url.includes(':')) {
          url = `redis://${url}`;
        }
      }

      redis = new Redis(url, {
        lazyConnect: true,
        enableReadyCheck: false,
        maxRetriesPerRequest: CACHE_CONFIG.redis.maxRetriesPerRequest,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 100, 1000);
        },
        keepAlive: 30000,
        connectTimeout: CACHE_CONFIG.redis.connectTimeout,
        commandTimeout: CACHE_CONFIG.redis.commandTimeout,
        password: process.env.REDIS_PASSWORD || process.env.UPSTASH_REDIS_REST_TOKEN,
        enableOfflineQueue: false,
      });

      redis.on('error', (err) => handleRedisError(err));
      redis.on('connect', () => {
        redisHealthy = true;
        lastHealthCheck = Date.now();
        logger.info('Redis connected');
      });
      
      logger.info('Redis initialized (Standard)');
    }
  } catch (e) {
    logger.warn('Redis init failed', { error: e.message });
    redis = null;
    isHttpRedis = false;
    redisHealthy = false;
  }
} else {
  logger.info('Redis disabled - using memory cache only');
}

// Circuit breaker with auto-recovery
let redisDisabled = false;
let redisFailCount = 0;

function handleRedisError(err) {
  redisFailCount++;
  logger.warn('Redis error', { failCount: redisFailCount, error: err.message });
  
  if (redisFailCount >= CACHE_CONFIG.redis.circuitBreaker.failureThreshold && !redisDisabled) {
    logger.error('Redis circuit breaker opened', { failCount: redisFailCount });
    redisDisabled = true;
    redisHealthy = false;
    
    // Auto-recovery
    setTimeout(() => {
      logger.info('Attempting Redis recovery');
      redisDisabled = false;
      redisFailCount = 0;
    }, CACHE_CONFIG.redis.circuitBreaker.resetTimeout);
  }
}

// Health check for Redis
function checkRedisHealth() {
  const now = Date.now();
  if (now - lastHealthCheck < 30000) {
    return redisHealthy;
  }
  
  lastHealthCheck = now;
  if (!redis || redisDisabled) {
    redisHealthy = false;
    return false;
  }
  
  return redisHealthy;
}

// L1 In-memory cache (optimized for Vercel serverless cold starts)
const memoryCache = new Map();
const requestStats = new Map();
let cacheHits = 0;
let cacheMisses = 0;

// Memory cache size management for serverless
function pruneMemoryCacheIfNeeded() {
  if (memoryCache.size > CACHE_CONFIG.memory.pruneThreshold) {
    // Remove oldest 25% of entries
    const entriesToRemove = Math.floor(CACHE_CONFIG.memory.maxEntries * 0.25);
    const entries = Array.from(memoryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    for (let i = 0; i < entriesToRemove; i++) {
      memoryCache.delete(entries[i][0]);
    }
    
    logger.debug('Memory cache pruned', { removed: entriesToRemove, remaining: memoryCache.size });
  }
}

/**
 * Get cached data for a group with stale-while-revalidate support
 * Strategy: Check L1 Memory -> Check L2 Redis (fresh + stale) -> Return null
 */
export async function getCachedGroupData(groupName) {
  // 1. Check L1 Memory Cache (fastest)
  const memCached = memoryCache.get(groupName);
  if (memCached && Date.now() - memCached.timestamp < CACHE_CONFIG.ttl.memory) {
    cacheHits++;
    logger.debug('Memory cache hit', { groupName });
    return { data: memCached.data, stale: false };
  }

  // 2. Check L2 Redis Cache with stale support
  if (redis && checkRedisHealth() && !redisDisabled) {
    try {
      const cached = isHttpRedis 
        ? await redis.get(`group:${groupName}`)
        : await redis.get(`group:${groupName}`).then(r => r ? JSON.parse(r) : null);

      if (cached) {
        const age = Date.now() - (cached.timestamp || 0);
        const isStale = age > CACHE_CONFIG.ttl.fresh * 1000;
        
        // Populate L1 cache
        memoryCache.set(groupName, {
          data: cached.data,
          timestamp: Date.now()
        });
        pruneMemoryCacheIfNeeded();
        
        cacheHits++;
        logger.debug('Redis cache hit', { groupName, stale: isStale });
        return { data: cached.data, stale: isStale };
      }
    } catch (error) {
      logger.warn('Redis get failed', { groupName, error: error.message });
      handleRedisError(error);
    }
  }

  cacheMisses++;
  return null;
}

/**
 * Store data in cache with stale-while-revalidate pattern
 * Strategy: Write to L1 Memory -> Write to L2 Redis
 */
export async function setCachedGroupData(groupName, data) {
  if (!data || !Array.isArray(data)) {
    logger.warn('Invalid cache data', { groupName });
    return;
  }

  // 1. Write to L1 Memory Cache immediately
  const cacheValue = {
    data,
    timestamp: Date.now()
  };
  
  memoryCache.set(groupName, cacheValue);
  pruneMemoryCacheIfNeeded();

  // 2. Write to L2 Redis Cache
  if (redis && checkRedisHealth() && !redisDisabled) {
    try {
      const serialized = isHttpRedis ? cacheValue : JSON.stringify(cacheValue);
      await redis.setex(`group:${groupName}`, CACHE_CONFIG.ttl.stale, serialized);
      logger.debug('Cached data saved', { groupName, count: data.length });
      
      // Reset fail count on success
      redisFailCount = 0;
    } catch (err) {
      logger.warn('Redis set failed', { groupName, error: err.message });
      handleRedisError(err);
    }
  }
}

/**
 * Track request for a group and update statistics
 */
export function trackGroupRequest(groupName) {
  if (!CACHE_CONFIG.tracking.enabled) return;
  
  const now = Date.now();
  let stats = requestStats.get(groupName);

  if (!stats) {
    stats = { count: 0, lastRequest: now, firstRequest: now };
  }

  stats.count++;
  stats.lastRequest = now;

  // Reset stats window
  if (now - stats.firstRequest > CACHE_CONFIG.ttl.stats * 1000) {
    stats.count = 1;
    stats.firstRequest = now;
  }

  requestStats.set(groupName, stats);
}

/**
 * Clear expired L1 cache entries
 */
export function pruneCache() {
  pruneMemoryCacheIfNeeded();
  
  // Clean old stats
  const now = Date.now();
  for (const [key, entry] of requestStats.entries()) {
    if (now - entry.timestamp > CACHE_CONFIG.ttl.stats * 1000) {
      requestStats.delete(key);
    }
  }
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
 * Clear all caches
 */
export async function clearAllCaches() {
  memoryCache.clear();
  
  if (redis && checkRedisHealth() && !redisDisabled) {
    try {
      const keys = isHttpRedis
        ? await redis.keys('group:*')
        : await redis.keys('group:*');
      
      if (keys && keys.length > 0) {
        await Promise.all(keys.map(k => redis.del(k)));
      }
      
      logger.info('All caches cleared', { keysDeleted: keys?.length || 0 });
    } catch (err) {
      logger.error('Cache clear failed', err);
      throw new Error('Failed to clear cache');
    }
  }
}

/**
 * Get cache performance statistics
 */
export function getCacheStats() {
  const totalRequests = cacheHits + cacheMisses;
  const hitRate = totalRequests > 0 
    ? ((cacheHits / totalRequests) * 100).toFixed(2) 
    : '0.00';

  return {
    redis: {
      enabled: !!redis && !redisDisabled,
      healthy: redisHealthy,
      hits: cacheHits,
      misses: cacheMisses,
      hitRate: `${hitRate}%`,
    },
    memory: {
      entries: memoryCache.size,
      maxSize: CACHE_CONFIG.memory.maxEntries,
    },
    requests: {
      byGroup: Object.fromEntries(requestStats),
    }
  };
}

/**
 * Warm up cache for popular groups (can be called via cron)
 */
export function getGroupsNeedingWarmup(minRequests = 5) {
  return Array.from(requestStats.entries())
    .filter(([, stats]) => stats.count >= minRequests)
    .map(([name, stats]) => ({
      name,
      requests: stats.count,
      lastRequest: new Date(stats.lastRequest).toISOString()
    }))
    .sort((a, b) => b.requests - a.requests);
}

/**
 * Check if Redis is connected
 * @returns {Promise<boolean>}
 */
export async function isRedisConnected() {
  if (!redis || redisDisabled) return false;
  
  try {
    if (isHttpRedis) {
      await redis.ping();
    } else {
      await redis.ping();
    }
    return true;
  } catch {
    return false;
  }
}

export default {
  getCachedGroupData,
  setCachedGroupData,
  trackGroupRequest,
  clearAllCaches,
  pruneCache,
  getCacheStats,
  isRedisConnected,
};
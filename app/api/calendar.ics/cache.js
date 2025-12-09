/**
 * Cache management and preloading utilities for the Calendar API
 * Optimized for Vercel serverless deployment with Edge caching support
 * Implements hybrid caching (Redis + In-Memory + Edge) for optimal performance
 */

import Redis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';

// Initialize Redis with Vercel optimizations
let redis = null;
let isHttpRedis = false;
let redisHealthy = true;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

// Vercel-optimized Redis connection
const connectionString = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

if (connectionString) {
  try {
    // Prefer Upstash HTTP for Vercel serverless (no connection pooling issues)
    if (connectionString.startsWith('http')) {
      isHttpRedis = true;
      redis = new UpstashRedis({
        url: connectionString,
        token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_PASSWORD || '',
        // Vercel Edge optimizations
        automaticDeserialization: true,
        retry: {
          retries: 2,
          backoff: (retryCount) => Math.min(retryCount * 100, 1000)
        }
      });
    } else {
      // Standard Redis with connection pooling for Vercel
      let url = connectionString;
      if (!url.startsWith('redis://') && !url.startsWith('rediss://')) {
        if (url.includes(':')) {
          url = `redis://${url}`;
        }
      }

      redis = new Redis(url, {
        // Vercel serverless optimizations
        lazyConnect: true, // Don't connect immediately
        enableReadyCheck: false, // Skip ready check for faster cold starts
        maxRetriesPerRequest: 2,
        retryStrategy: (times) => {
          if (times > 3) return null; // Give up after 3 retries
          return Math.min(times * 100, 1000);
        },
        // Connection pooling
        keepAlive: 30000,
        connectTimeout: 5000,
        commandTimeout: 3000,
        password: process.env.REDIS_PASSWORD || process.env.UPSTASH_REDIS_REST_TOKEN,
        // Prevent connection leaks in serverless
        enableOfflineQueue: false,
      });

      redis.on('error', (err) => handleRedisError(err));
      redis.on('connect', () => {
        redisHealthy = true;
        lastHealthCheck = Date.now();
      });
    }
  } catch (e) {
    console.warn('[Cache] Redis init failed:', e.message);
    redis = null;
    isHttpRedis = false;
    redisHealthy = false;
  }
}

// Circuit breaker with auto-recovery
let redisDisabled = false;
let redisFailCount = 0;
const MAX_FAIL_BEFORE_DISABLE = 3;

function handleRedisError(err) {
  redisFailCount++;
  
  if (redisFailCount >= MAX_FAIL_BEFORE_DISABLE && !redisDisabled) {
    console.warn('[Cache] Redis circuit breaker opened after', redisFailCount, 'failures');
    redisDisabled = true;
    redisHealthy = false;
    
    // Try to recover after 5 minutes
    setTimeout(() => {
      console.log('[Cache] Attempting Redis recovery...');
      redisDisabled = false;
      redisFailCount = 0;
    }, 300000);
  }
}

// Health check for Redis
function checkRedisHealth() {
  const now = Date.now();
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
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

// Vercel-optimized cache configuration
const CACHE_CONFIG = {
  // Redis L2 Cache
  REDIS_TTL: 7200, // 2 hours (longer for fewer CELCAT calls)
  REDIS_STALE_TTL: 86400, // 24 hours stale-while-revalidate
  
  // Memory L1 Cache (survives during function execution)
  MEMORY_TTL: 300000, // 5 minutes (longer for Vercel functions)
  MEMORY_MAX_SIZE: 50, // Max entries to prevent memory bloat
  
  // Stats
  STATS_WINDOW: 86400000, // 24 hours
  
  // Vercel Edge Cache
  EDGE_CACHE_TTL: 3600, // 1 hour for edge
  EDGE_STALE_REVALIDATE: 7200, // 2 hours stale-while-revalidate
};

// Memory cache size management for serverless
function pruneMemoryCacheIfNeeded() {
  if (memoryCache.size > CACHE_CONFIG.MEMORY_MAX_SIZE) {
    // Remove oldest 25% of entries
    const entriesToRemove = Math.floor(CACHE_CONFIG.MEMORY_MAX_SIZE * 0.25);
    const entries = Array.from(memoryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    for (let i = 0; i < entriesToRemove; i++) {
      memoryCache.delete(entries[i][0]);
    }
  }
}

/**
 * Get cached data for a group with stale-while-revalidate support
 * Strategy: Check L1 Memory -> Check L2 Redis (fresh + stale) -> Return null
 */
export async function getCachedGroupData(groupName) {
  // 1. Check L1 Memory Cache (fastest)
  const memCached = memoryCache.get(groupName);
  if (memCached && Date.now() - memCached.timestamp < CACHE_CONFIG.MEMORY_TTL) {
    cacheHits++;
    return { data: memCached.data, stale: false };
  }

  // 2. Check L2 Redis Cache with stale support
  if (redis && checkRedisHealth()) {
    try {
      const [freshData, staleData] = await Promise.all([
        redis.get(`group:${groupName}`),
        redis.get(`group:${groupName}:stale`)
      ]);

      let result = null;
      let isStale = false;

      if (freshData) {
        // Fresh data available
        result = typeof freshData === 'string' ? JSON.parse(freshData) : freshData;
        isStale = false;
      } else if (staleData) {
        // Return stale data, caller should revalidate
        result = typeof staleData === 'string' ? JSON.parse(staleData) : staleData;
        isStale = true;
      }

      if (result) {
        // Populate L1 cache
        memoryCache.set(groupName, {
          data: result,
          timestamp: Date.now()
        });
        pruneMemoryCacheIfNeeded();
        
        cacheHits++;
        return { data: result, stale: isStale };
      }
    } catch (error) {
      handleRedisError(error);
      // Fallback: try to get stale data even if fresh fetch failed
      try {
        const staleData = await redis.get(`group:${groupName}:stale`);
        if (staleData) {
          const result = typeof staleData === 'string' ? JSON.parse(staleData) : staleData;
          return { data: result, stale: true };
        }
      } catch (_) { /* ignore */ }
    }
  }

  cacheMisses++;
  return null;
}

/**
 * Store data in cache with stale-while-revalidate pattern
 * Strategy: Write to L1 Memory -> Write to L2 Redis (fresh + stale)
 */
export async function setCachedGroupData(groupName, data) {
  if (!data) return;

  // 1. Write to L1 Memory Cache immediately
  memoryCache.set(groupName, {
    data,
    timestamp: Date.now()
  });
  pruneMemoryCacheIfNeeded();

  // 2. Write to L2 Redis Cache with dual TTL for stale-while-revalidate
  if (redis && checkRedisHealth()) {
    try {
      const stringData = JSON.stringify(data);
      
      if (isHttpRedis) {
        // Upstash: Use pipeline for atomic operations
        await Promise.allSettled([
          // Fresh cache (2 hours)
          redis.set(`group:${groupName}`, data, { ex: CACHE_CONFIG.REDIS_TTL }),
          // Stale cache (24 hours) - fallback for when fresh expires
          redis.set(`group:${groupName}:stale`, data, { ex: CACHE_CONFIG.REDIS_STALE_TTL })
        ]);
      } else {
        // Standard Redis: Use pipeline for better performance
        const pipeline = redis.pipeline();
        pipeline.set(`group:${groupName}`, stringData, 'EX', CACHE_CONFIG.REDIS_TTL);
        pipeline.set(`group:${groupName}:stale`, stringData, 'EX', CACHE_CONFIG.REDIS_STALE_TTL);
        await pipeline.exec().catch(err => handleRedisError(err));
      }
      
      // Reset fail count on success
      redisFailCount = 0;
    } catch (err) {
      handleRedisError(err);
    }
  }
}

/**
 * Track request for a group and update statistics
 */
export function trackGroupRequest(groupName) {
  const now = Date.now();
  let stats = requestStats.get(groupName);

  if (!stats) {
    stats = { count: 0, lastRequest: now, firstRequest: now };
  }

  stats.count++;
  stats.lastRequest = now;

  // Reset stats window
  if (now - stats.firstRequest > CACHE_CONFIG.STATS_WINDOW) {
    stats.count = 1;
    stats.firstRequest = now;
  }

  requestStats.set(groupName, stats);
}

/**
 * Clear expired L1 cache entries
 */
export function pruneCache() {
  const now = Date.now();
  for (const [key, value] of memoryCache.entries()) {
    if (now - value.timestamp > CACHE_CONFIG.MEMORY_TTL) {
      memoryCache.delete(key);
    }
  }
  // Note: Redis handles its own TTL eviction
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
 * Clear all caches (for testing purposes)
 */
export function clearAllCaches() {
  memoryCache.clear();
  requestStats.clear();
  redisDisabled = false;
  redisFailCount = 0;
  cacheHits = 0;
  cacheMisses = 0;
}

/**
 * Get cache performance statistics
 */
export function getCacheStats() {
  const hitRate = cacheHits + cacheMisses > 0 
    ? (cacheHits / (cacheHits + cacheMisses) * 100).toFixed(2)
    : 0;

  return {
    memory: {
      size: memoryCache.size,
      maxSize: CACHE_CONFIG.MEMORY_MAX_SIZE,
      utilization: ((memoryCache.size / CACHE_CONFIG.MEMORY_MAX_SIZE) * 100).toFixed(2) + '%'
    },
    redis: {
      healthy: redisHealthy,
      disabled: redisDisabled,
      failCount: redisFailCount,
      type: isHttpRedis ? 'Upstash HTTP' : 'Standard TCP'
    },
    performance: {
      hits: cacheHits,
      misses: cacheMisses,
      hitRate: hitRate + '%'
    },
    config: {
      memoryTTL: CACHE_CONFIG.MEMORY_TTL / 1000 + 's',
      redisTTL: CACHE_CONFIG.REDIS_TTL + 's',
      staleTTL: CACHE_CONFIG.REDIS_STALE_TTL + 's'
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

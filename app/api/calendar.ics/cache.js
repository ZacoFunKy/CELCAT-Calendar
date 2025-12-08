/**
 * Cache management and preloading utilities for the Calendar API
 * Implements hybrid caching (Redis + In-Memory) for optimal performance and persistence.
 * Uses ioredis for standard Redis (TCP) support.
 */

import Redis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';

// Initialize Redis
let redis = null;
let isHttpRedis = false;

// Helper to determine if we should use standard Redis (TCP) or Upstash (HTTP)
// Note: This file runs in Node.js runtime, so we can use ioredis (TCP)
const connectionString = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

if (connectionString) {
  try {
    // Upstash HTTP URL
    if (connectionString.startsWith('http')) {
      isHttpRedis = true;
      redis = new UpstashRedis({
        url: connectionString,
        token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_PASSWORD || ''
      });
    } else {
      // Standard Redis (TCP)
      let url = connectionString;
      if (!url.startsWith('redis://') && !url.startsWith('rediss://')) {
        if (url.includes(':')) {
          url = `redis://${url}`;
        }
      }

      redis = new Redis(url, {
        retryStrategy: (times) => Math.min(times * 50, 2000),
        maxRetriesPerRequest: 1,
        password: process.env.REDIS_PASSWORD || process.env.UPSTASH_REDIS_REST_TOKEN,
      });

      redis.on('error', (err) => {
        handleRedisError(err);
      });
    }
  } catch (e) {
    console.warn('Failed to initialize Redis client:', e.message);
    redis = null;
    isHttpRedis = false;
  }
}

// Circuit breaker for Redis
let redisDisabled = false;

function handleRedisError(err) {
  // Only log once per session to avoid spam
  if (!redisDisabled) {
    console.warn('Redis connection failed, disabling Redis for this session:', err.message);
    redisDisabled = true;
    try {
      if (!isHttpRedis && redis?.disconnect) redis.disconnect();
    } catch (_) { /* ignore */ }
  }
}

// L1 In-memory cache (short-lived, for speed)
const memoryCache = new Map();
const requestStats = new Map();

// Configuration
const CACHE_CONFIG = {
  REDIS_TTL: 3600, // 1 hour in seconds
  MEMORY_TTL: 60000, // 1 minute in milliseconds (L1 cache)
  STATS_WINDOW: 86400000, // 24 hours
};

/**
 * Get cached data for a group
 * Strategy: Check L1 Memory -> Check L2 Redis
 */
export async function getCachedGroupData(groupName) {
  // 1. Check L1 Memory Cache
  const memCached = memoryCache.get(groupName);
  if (memCached && Date.now() - memCached.timestamp < CACHE_CONFIG.MEMORY_TTL) {
    return memCached.data;
  }

  // 2. Check L2 Redis Cache
  if (redis && !redisDisabled) {
    try {
      const redisData = isHttpRedis
        ? await redis.get(`group:${groupName}`)
        : await redis.get(`group:${groupName}`);
      if (redisData) {
        // ioredis returns string, we might need to parse if we stored object, 
        // but here we likely store the raw data object. 
        // Wait, Redis stores strings. We need to JSON.parse if it's an object.
        // The previous implementation passed 'data' directly. 
        // Let's assume data is an object and we need to parse it.
        let parsedData = redisData;
        try {
          parsedData = typeof redisData === 'string' ? JSON.parse(redisData) : redisData;
        } catch (e) { /* ignore */ }

        // Populate L1 cache for next time
        memoryCache.set(groupName, {
          data: parsedData,
          timestamp: Date.now()
        });
        return parsedData;
      }
    } catch (error) {
      handleRedisError(error);
    }
  }

  return null;
}

/**
 * Store data in cache
 * Strategy: Write to L1 Memory -> Write to L2 Redis (async)
 */
export async function setCachedGroupData(groupName, data) {
  // 1. Write to L1 Memory Cache
  memoryCache.set(groupName, {
    data,
    timestamp: Date.now()
  });

  // 2. Write to L2 Redis Cache
  if (redis && !redisDisabled) {
    const stringData = JSON.stringify(data);
    if (isHttpRedis) {
      redis.set(`group:${groupName}`, data, { ex: CACHE_CONFIG.REDIS_TTL })
        .catch(err => handleRedisError(err));
    } else {
      redis.set(`group:${groupName}`, stringData, 'EX', CACHE_CONFIG.REDIS_TTL)
        .catch(err => handleRedisError(err));
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
}

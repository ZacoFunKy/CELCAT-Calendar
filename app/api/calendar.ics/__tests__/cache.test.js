/**
 * Tests for calendar.ics cache module
 */

import {
  getCachedGroupData,
  setCachedGroupData,
  trackGroupRequest,
  shouldPreload,
  getPopularGroups,
  getUsageStatistics,
  pruneCache,
  clearAllCaches
} from '../cache.js';

describe('Calendar Cache', () => {
  beforeEach(() => {
    // Clear all caches before each test
    clearAllCaches();
    
    // Set NODE_ENV to non-test to enable caching
    process.env.NODE_ENV = 'development';
    delete process.env.JEST_WORKER_ID;
  });

  afterEach(() => {
    // Restore test environment
    process.env.NODE_ENV = 'test';
    clearAllCaches();
  });

  describe('getCachedGroupData', () => {
    it('should return null for non-existent cache entry', () => {
      const result = getCachedGroupData('non-existent-group');
      expect(result).toBeNull();
    });

    it('should store and retrieve cached data', () => {
      const testData = { events: [{ id: '1', name: 'Test Event' }] };
      
      setCachedGroupData('test-group', testData);
      const retrieved = getCachedGroupData('test-group');
      
      expect(retrieved).toEqual(testData);
    });

    it('should return null for expired cache', () => {
      const testData = { events: [] };
      
      // Mock Date.now() to control time
      const originalNow = Date.now;
      const startTime = Date.now();
      Date.now = jest.fn(() => startTime);
      
      setCachedGroupData('test-group', testData);
      
      // Advance time past TTL (1 hour + 1ms)
      Date.now = jest.fn(() => startTime + 3600001);
      
      const result = getCachedGroupData('test-group');
      expect(result).toBeNull();
      
      // Restore Date.now
      Date.now = originalNow;
    });

    it('should handle complex event data', () => {
      const complexData = {
        events: [
          {
            id: '1',
            summary: 'CM - Mathématiques',
            start: new Date('2025-01-15T09:00:00'),
            end: new Date('2025-01-15T11:00:00'),
            location: 'Amphi A',
            description: 'Professor Dupont\nGroup L3-INFO'
          }
        ]
      };

      setCachedGroupData('L3-INFO', complexData);
      const retrieved = getCachedGroupData('L3-INFO');
      
      expect(retrieved.events[0].summary).toBe('CM - Mathématiques');
      expect(retrieved.events[0].location).toBe('Amphi A');
    });
  });

  describe('trackGroupRequest', () => {
    it('should track request count for a group', () => {
      trackGroupRequest('test-group');
      trackGroupRequest('test-group');
      trackGroupRequest('test-group');
      
      const stats = getUsageStatistics();
      expect(stats['test-group']).toBeDefined();
      expect(stats['test-group'].requestCount).toBe(3);
    });

    it('should handle multiple different groups', () => {
      trackGroupRequest('group-1');
      trackGroupRequest('group-2');
      trackGroupRequest('group-1');
      
      const stats = getUsageStatistics();
      expect(stats['group-1'].requestCount).toBe(2);
      expect(stats['group-2'].requestCount).toBe(1);
    });

    it('should track timestamps', () => {
      trackGroupRequest('timestamp-group');
      
      const stats = getUsageStatistics();
      expect(stats['timestamp-group'].lastRequest).toBeDefined();
      expect(stats['timestamp-group'].firstRequest).toBeDefined();
    });
  });

  describe('shouldPreload', () => {
    it('should return false for groups with few requests', () => {
      trackGroupRequest('new-group');
      
      const result = shouldPreload('new-group');
      expect(result).toBe(false);
    });

    it('should return true for popular groups', () => {
      // Make 5+ requests to trigger preload threshold
      for (let i = 0; i < 6; i++) {
        trackGroupRequest('popular-group');
      }
      
      const result = shouldPreload('popular-group');
      expect(result).toBe(true);
    });

    it('should return false for unknown groups', () => {
      const result = shouldPreload('never-requested-group');
      expect(result).toBe(false);
    });
  });

  describe('getPopularGroups', () => {
    it('should return list of popular groups', () => {
      // Request multiple groups with varying frequency
      for (let i = 0; i < 10; i++) {
        trackGroupRequest('very-popular');
      }
      for (let i = 0; i < 6; i++) {
        trackGroupRequest('popular');
      }
      for (let i = 0; i < 2; i++) {
        trackGroupRequest('not-popular');
      }
      
      const popularGroups = getPopularGroups();
      
      expect(Array.isArray(popularGroups)).toBe(true);
      expect(popularGroups[0].name).toBe('very-popular');
      expect(popularGroups[0].count).toBe(10);
    });

    it('should return empty array when no requests tracked', () => {
      const popularGroups = getPopularGroups();
      expect(Array.isArray(popularGroups)).toBe(true);
      expect(popularGroups.length).toBe(0);
    });

    it('should respect limit parameter', () => {
      for (let i = 0; i < 15; i++) {
        trackGroupRequest(`group-${i}`);
      }
      
      const topFive = getPopularGroups(5);
      expect(topFive.length).toBeLessThanOrEqual(5);
    });

    it('should sort by request count descending', () => {
      trackGroupRequest('group-a');
      trackGroupRequest('group-a');
      trackGroupRequest('group-a');
      
      trackGroupRequest('group-b');
      trackGroupRequest('group-b');
      trackGroupRequest('group-b');
      trackGroupRequest('group-b');
      trackGroupRequest('group-b');
      
      const popular = getPopularGroups();
      expect(popular[0].name).toBe('group-b');
      expect(popular[1].name).toBe('group-a');
    });
  });

  describe('pruneCache', () => {
    it('should remove expired cache entries', () => {
      const originalNow = Date.now;
      const startTime = Date.now();
      Date.now = jest.fn(() => startTime);
      
      setCachedGroupData('old-group', { events: [] });
      
      // Advance time past TTL
      Date.now = jest.fn(() => startTime + 3600001);
      
      pruneCache();
      
      const result = getCachedGroupData('old-group');
      expect(result).toBeNull();
      
      Date.now = originalNow;
    });

    it('should preserve recent cache entries', () => {
      setCachedGroupData('recent-group', { events: [{ id: '1' }] });
      
      pruneCache();
      
      const result = getCachedGroupData('recent-group');
      expect(result).not.toBeNull();
    });

    it('should remove old request statistics', () => {
      const originalNow = Date.now;
      const startTime = Date.now();
      Date.now = jest.fn(() => startTime);
      
      trackGroupRequest('old-stats-group');
      
      // Advance time past stats window (24 hours)
      Date.now = jest.fn(() => startTime + 86400001);
      
      pruneCache();
      
      const stats = getUsageStatistics();
      expect(stats['old-stats-group']).toBeUndefined();
      
      Date.now = originalNow;
    });
  });

  describe('clearAllCaches', () => {
    it('should clear both cache and statistics', () => {
      // Add data and stats
      setCachedGroupData('test-group', { events: [] });
      trackGroupRequest('test-group');
      
      clearAllCaches();
      
      expect(getCachedGroupData('test-group')).toBeNull();
      const stats = getUsageStatistics();
      expect(Object.keys(stats).length).toBe(0);
    });
  });

  describe('Cache size management', () => {
    it('should enforce MAX_CACHE_SIZE limit', () => {
      // Add more than 50 groups (MAX_CACHE_SIZE)
      for (let i = 0; i < 55; i++) {
        setCachedGroupData(`group-${i}`, { events: [] });
      }
      
      // Oldest entries should be evicted
      const result = getCachedGroupData('group-0');
      expect(result).toBeNull();
      
      // Recent entries should still exist
      const recentResult = getCachedGroupData('group-54');
      expect(recentResult).not.toBeNull();
    });
  });

  describe('Cache integration scenarios', () => {
    it('should handle full cache lifecycle', () => {
      const groupName = 'lifecycle-group';
      
      // 1. Track requests
      for (let i = 0; i < 6; i++) {
        trackGroupRequest(groupName);
      }
      
      // 2. Check if should preload
      expect(shouldPreload(groupName)).toBe(true);
      
      // 3. Store data
      const data = { events: [{ id: '1', name: 'Event' }] };
      setCachedGroupData(groupName, data);
      
      // 4. Retrieve from cache
      const cached = getCachedGroupData(groupName);
      expect(cached).toEqual(data);
      
      // 5. Verify in popular groups
      const popular = getPopularGroups();
      expect(popular.some(g => g.name === groupName)).toBe(true);
    });

    it('should handle concurrent access patterns', () => {
      const groupName = 'concurrent-group';
      
      // Simulate multiple concurrent requests
      for (let i = 0; i < 3; i++) {
        trackGroupRequest(groupName);
      }
      
      setCachedGroupData(groupName, { events: [{ id: '1' }] });
      
      // Multiple retrievals should return same data
      const result1 = getCachedGroupData(groupName);
      const result2 = getCachedGroupData(groupName);
      const result3 = getCachedGroupData(groupName);
      
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });
});



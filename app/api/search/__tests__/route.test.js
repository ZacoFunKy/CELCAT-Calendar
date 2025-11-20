/**
 * Tests for /api/search route
 * Validates the search endpoint functionality
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock the fetch function
global.fetch = jest.fn();

describe('Search API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query Validation', () => {
    it('should return empty results when query is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/search');
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.results).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return empty results when query is too short (< 3 chars)', async () => {
      const request = new NextRequest('http://localhost:3000/api/search?q=ab');
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.results).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should accept queries with 3 or more characters', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { id: '1', text: 'Test Group 1' }
          ]
        })
      });

      const request = new NextRequest('http://localhost:3000/api/search?q=abc');
      const response = await GET(request);

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Search Functionality', () => {
    it('should fetch and return search results from Celcat', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { id: 'g123', text: 'Groupe Test 1' },
            { id: 'g456', text: 'Groupe Test 2' }
          ]
        })
      });

      const request = new NextRequest('http://localhost:3000/api/search?q=test');
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.results).toHaveLength(2);
      expect(json.results[0]).toEqual({ id: 'g123', text: 'Groupe Test 1' });
      expect(json.cached).toBe(false);
    });

    it('should properly encode query parameters', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] })
      });

      const request = new NextRequest('http://localhost:3000/api/search?q=test+special&chars');
      await GET(request);

      const fetchUrl = global.fetch.mock.calls[0][0];
      expect(fetchUrl).toContain(encodeURIComponent('test+special&chars'));
    });

    it('should strip HTML tags from result text', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { id: 'g1', text: '<b>Bold Text</b> with <i>HTML</i>' }
          ]
        })
      });

      const request = new NextRequest('http://localhost:3000/api/search?q=test');
      const response = await GET(request);
      const json = await response.json();

      expect(json.results[0].text).toBe('Bold Text with HTML');
    });

    it('should filter out empty results', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            { id: 'g1', text: 'Valid Result' },
            { id: '', text: 'No ID' },
            { id: 'g2', text: '' },
            { id: 'g3', text: 'Another Valid Result' }
          ]
        })
      });

      const request = new NextRequest('http://localhost:3000/api/search?q=test');
      const response = await GET(request);
      const json = await response.json();

      expect(json.results).toHaveLength(2);
      expect(json.results[0].text).toBe('Valid Result');
      expect(json.results[1].text).toBe('Another Valid Result');
    });

    it('should limit results to MAX_RESULTS', async () => {
      const manyResults = Array.from({ length: 50 }, (_, i) => ({
        id: `g${i}`,
        text: `Group ${i}`
      }));

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: manyResults })
      });

      const request = new NextRequest('http://localhost:3000/api/search?q=test');
      const response = await GET(request);
      const json = await response.json();

      expect(json.results.length).toBeLessThanOrEqual(15);
    });
  });

  describe('Caching', () => {
    it('should cache search results', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ id: 'g1', text: 'Cached Result' }]
        })
      });

      const request1 = new NextRequest('http://localhost:3000/api/search?q=test');
      const response1 = await GET(request1);
      const json1 = await response1.json();

      expect(json1.cached).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second request should use cache
      const request2 = new NextRequest('http://localhost:3000/api/search?q=test');
      const response2 = await GET(request2);
      const json2 = await response2.json();

      expect(json2.cached).toBe(true);
      expect(json2.results).toEqual(json1.results);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Still only one fetch
    });

    it('should be case-insensitive for cache keys', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ id: 'g1', text: 'Test Result' }]
        })
      });

      const request1 = new NextRequest('http://localhost:3000/api/search?q=TEST');
      await GET(request1);

      const request2 = new NextRequest('http://localhost:3000/api/search?q=test');
      const response2 = await GET(request2);
      const json2 = await response2.json();

      expect(json2.cached).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should trim whitespace from cache keys', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [{ id: 'g1', text: 'Test Result' }]
        })
      });

      const request1 = new NextRequest('http://localhost:3000/api/search?q=  test  ');
      await GET(request1);

      const request2 = new NextRequest('http://localhost:3000/api/search?q=test');
      const response2 = await GET(request2);
      const json2 = await response2.json();

      expect(json2.cached).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      // Clear the module cache to reset the searchCache Map
      jest.resetModules();
    });

    it('should return empty results with 500 status on fetch error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      // Need to re-import after reset
      const { GET } = require('../route');
      const request = new NextRequest('http://localhost:3000/api/search?q=uniquetest1');
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.results).toEqual([]);
    });

    it('should return empty results with 500 status on non-ok response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { GET } = require('../route');
      const request = new NextRequest('http://localhost:3000/api/search?q=uniquetest2');
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.results).toEqual([]);
    });

    it('should return empty results with 500 status on malformed JSON response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      const { GET } = require('../route');
      const request = new NextRequest('http://localhost:3000/api/search?q=uniquetest3');
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(500);
      expect(json.results).toEqual([]);
    });

    it('should handle missing results property', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      const { GET } = require('../route');
      const request = new NextRequest('http://localhost:3000/api/search?q=uniquetest4');
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.results).toEqual([]);
    });
  });

  describe('Request Headers', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    it('should include proper User-Agent header', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] })
      });

      const { GET } = require('../route');
      const request = new NextRequest('http://localhost:3000/api/search?q=headertest1');
      await GET(request);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('Windows NT'),
          }),
        })
      );
    });

    it('should include X-Requested-With header', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] })
      });

      const { GET } = require('../route');
      const request = new NextRequest('http://localhost:3000/api/search?q=headertest2');
      await GET(request);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Requested-With': 'XMLHttpRequest',
          }),
        })
      );
    });

    it('should include Accept header', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] })
      });

      const { GET } = require('../route');
      const request = new NextRequest('http://localhost:3000/api/search?q=headertest3');
      await GET(request);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': expect.stringContaining('application/json'),
          }),
        })
      );
    });
  });
});

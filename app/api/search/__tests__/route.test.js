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

      const request = new NextRequest('http://localhost:3000/api/search?q=uniquequery123');
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.results).toHaveLength(2);
      expect(json.results[0]).toEqual({ id: 'g123', text: 'Groupe Test 1' });
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

      const request = new NextRequest('http://localhost:3000/api/search?q=uniquelimit456');
      const response = await GET(request);
      const json = await response.json();

      expect(json.results.length).toBeLessThanOrEqual(15);
    });
  });
});

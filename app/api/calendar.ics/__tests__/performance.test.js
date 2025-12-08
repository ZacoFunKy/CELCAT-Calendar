/**
 * Performance tests for /api/calendar.ics route
 * These tests validate that the API responds within acceptable time limits
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock the fetch function
global.fetch = jest.fn();

describe('Calendar API Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 quickly when group is missing', async () => {
    const startTime = Date.now();
    const request = new NextRequest('http://localhost:3000/api/calendar.ics');
    const response = await GET(request);
    const endTime = Date.now();

    expect(response.status).toBe(400);
    expect(endTime - startTime).toBeLessThan(100);
  });

  it('should handle network errors quickly', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));

    const startTime = Date.now();
    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test');
    const response = await GET(request);
    const endTime = Date.now();

    expect([400, 404]).toContain(response.status);
    expect(endTime - startTime).toBeLessThan(5000);
  });

  it('should handle empty response efficiently', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => []
    });

    const startTime = Date.now();
    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=empty-group');
    const response = await GET(request);
    const endTime = Date.now();

    expect(response.status).toBe(404);
    expect(endTime - startTime).toBeLessThan(1000);
  });

  it('should validate group parameter quickly', async () => {
    const startTime = Date.now();
    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=group1,group2,group3');
    const response = await GET(request);
    const endTime = Date.now();

    expect(response.status).toBeDefined();
    expect(endTime - startTime).toBeLessThan(5000);
  });

  it('should reject invalid characters quickly', async () => {
    const startTime = Date.now();
    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=<script>alert(1)</script>');
    const response = await GET(request);
    const endTime = Date.now();

    expect([400, 404]).toContain(response.status);
    expect(endTime - startTime).toBeLessThan(500);
  });

  it('should process holidays parameter efficiently', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [{
        id: 'test-event',
        start: '2024-01-15T09:00:00',
        end: '2024-01-15T11:00:00',
        description: 'Test',
        eventCategory: 'Cours',
        modules: ['Test'],
      }]
    });

    const startTime = Date.now();
    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test&holidays=true');
    const response = await GET(request);
    const endTime = Date.now();

    expect(response.status).toBeDefined();
    expect(endTime - startTime).toBeLessThan(2000);
  });

  it('should handle format parameter efficiently', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [{
        id: 'test-event',
        start: '2024-01-15T09:00:00',
        end: '2024-01-15T11:00:00',
        description: 'Test',
        eventCategory: 'Cours',
        modules: ['Test'],
      }]
    });

    const startTime = Date.now();
    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test&format=json');
    const response = await GET(request);
    const endTime = Date.now();

    expect(response.status).toBeDefined();
    expect(endTime - startTime).toBeLessThan(2000);
  });
});

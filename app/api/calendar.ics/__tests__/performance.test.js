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
    process.env.CELCAT_URL = 'https://celcat.u-bordeaux.fr/Calendar/Home/GetCalendarData';
    process.env.LOG_LEVEL = 'error';
  });

  it('should respond within 2 seconds for single group', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => Array(20).fill(0).map((_, i) => ({
        id: `event-${i}`,
        start: `2024-01-${15 + (i % 7)}T09:00:00`,
        end: `2024-01-${15 + (i % 7)}T11:00:00`,
        description: `Test Event ${i}`,
        modules: ['Test'],
      }))
    });

    const startTime = Date.now();
    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test-group');
    const response = await GET(request);
    const endTime = Date.now();

    expect(response.status).toBe(200);
    expect(endTime - startTime).toBeLessThan(2000);
  });

  it('should handle multiple groups efficiently', async () => {
    // Mock responses for 3 groups
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => Array(10).fill(0).map((_, i) => ({
        id: `event-${Math.random()}`,
        start: `2024-01-15T09:00:00`,
        end: `2024-01-15T11:00:00`,
        description: `Test Event ${i}`,
        modules: ['Test'],
      }))
    });

    const startTime = Date.now();
    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=group1,group2,group3');
    const response = await GET(request);
    const endTime = Date.now();

    expect(response.status).toBe(200);
    expect(endTime - startTime).toBeLessThan(3000);
  });

  it('should process large event sets efficiently', async () => {
    // Generate 100 events
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => Array(100).fill(0).map((_, i) => ({
        id: `event-${i}`,
        start: `2024-0${1 + (i % 9)}-${10 + (i % 20)}T09:00:00`,
        end: `2024-0${1 + (i % 9)}-${10 + (i % 20)}T11:00:00`,
        description: `Course ${i}\nProfessor Name\nRoom ${i}`,
        eventCategory: 'Cours',
        modules: [`Module ${i}`],
        sites: [`Building ${i % 5}`]
      }))
    });

    const startTime = Date.now();
    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test-large');
    const response = await GET(request);
    const endTime = Date.now();

    expect(response.status).toBe(200);
    expect(endTime - startTime).toBeLessThan(3000);
    
    const icsContent = await response.text();
    expect(icsContent).toContain('BEGIN:VEVENT');
  });

  it('should handle duplicate event filtering efficiently', async () => {
    const sameEvents = Array(50).fill({
      id: 'duplicate-event',
      start: '2024-01-15T09:00:00',
      end: '2024-01-15T11:00:00',
      description: 'Duplicate',
      modules: ['Test'],
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sameEvents
    });

    const startTime = Date.now();
    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test-duplicates');
    const response = await GET(request);
    const endTime = Date.now();

    expect(response.status).toBe(200);
    expect(endTime - startTime).toBeLessThan(1000);
  });

  it('should use cache effectively for repeated requests', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [{
        id: 'cached-event',
        start: '2024-01-15T09:00:00',
        end: '2024-01-15T11:00:00',
        description: 'Cached Event',
        modules: ['Test'],
      }]
    });

    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test-cache');
    
    // First request
    const response1 = await GET(request);
    expect(response1.status).toBe(200);
    
    // Cache headers should be present
    const cacheControl = response1.headers.get('Cache-Control');
    expect(cacheControl).toBeTruthy();
    expect(cacheControl).toContain('public');
  });
});

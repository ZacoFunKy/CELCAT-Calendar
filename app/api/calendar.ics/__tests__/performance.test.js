/**
 * Performance tests for /api/calendar.ics route
 * These tests validate that the API responds within acceptable time limits
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';

// Stub ical-generator
jest.mock('ical-generator', () => {
  const createEvent = jest.fn(() => ({ categories: jest.fn(), x: jest.fn() }));
  const calendar = {
    createEvent,
    toString: jest.fn(() => 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Test\nEND:VEVENT\nEND:VCALENDAR')
  };
  const factory = () => calendar;
  return factory;
});

// Mock external dependencies to avoid open handles
global.fetch = jest.fn();
jest.mock('../cache.js', () => ({
  getCachedGroupData: jest.fn(() => null),
  setCachedGroupData: jest.fn(),
  trackGroupRequest: jest.fn(),
  pruneCache: jest.fn(),
  getCacheStats: jest.fn(() => ({})),
}));
jest.mock('../../notifications/notifier.js', () => ({
  checkScheduleChanges: jest.fn(() => ({ changed: false })),
  sendPushNotification: jest.fn(() => Promise.resolve(true))
}));
jest.mock('../../../../models/User');
jest.mock('../../../../models/UserPreference');
jest.mock('../../../../lib/db', () => jest.fn().mockResolvedValue());

describe('Calendar API Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 in under 100 ms when group is missing', async () => {
    const startTime = Date.now();
    const request = new NextRequest('http://localhost:3000/api/calendar.ics');
    const response = await GET(request);
    const elapsed = Date.now() - startTime;

    expect(response.status).toBe(400);
    expect(elapsed).toBeLessThan(100);
  });

  it('returns an error in under 500 ms when CELCAT is unreachable', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));

    const startTime = Date.now();
    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test');
    const response = await GET(request);
    const elapsed = Date.now() - startTime;

    expect([404, 500]).toContain(response.status);
    expect(elapsed).toBeLessThan(500);
  });

  it('returns 404 in under 200 ms for an empty CELCAT response', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => [] });

    const startTime = Date.now();
    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=empty-group');
    const response = await GET(request);
    const elapsed = Date.now() - startTime;

    expect(response.status).toBe(404);
    expect(elapsed).toBeLessThan(200);
  });

  it('rejects invalid characters in under 100 ms', async () => {
    const startTime = Date.now();
    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=<script>alert(1)</script>');
    const response = await GET(request);
    const elapsed = Date.now() - startTime;

    expect(response.status).toBe(400);
    expect(elapsed).toBeLessThan(100);
  });

  it('generates JSON response in under 500 ms for a single event', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [{
        id: 'perf-1',
        start: '2024-01-15T09:00:00',
        end: '2024-01-15T11:00:00',
        description: 'CM\nAlgorithmique\nProfesseur Test',
        eventCategory: 'Cours CM',
        modules: ['INF201'],
        sites: ['A'],
      }]
    });

    const startTime = Date.now();
    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test&format=json');
    const response = await GET(request);
    const elapsed = Date.now() - startTime;

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.events).toHaveLength(1);
    expect(elapsed).toBeLessThan(500);
  });

  it('generates ICS response in under 500 ms for a single event', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [{
        id: 'perf-2',
        start: '2024-01-15T09:00:00',
        end: '2024-01-15T11:00:00',
        description: 'CM\nAlgorithmique\nProfesseur Test',
        eventCategory: 'Cours CM',
        modules: ['INF201'],
        sites: ['A'],
      }]
    });

    const startTime = Date.now();
    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test');
    const response = await GET(request);
    const elapsed = Date.now() - startTime;

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/calendar');
    expect(elapsed).toBeLessThan(500);
  });

  it('handles 10 groups in parallel within 1 000 ms', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [{
        id: 'perf-multi',
        start: '2024-01-15T09:00:00',
        end: '2024-01-15T11:00:00',
        description: 'CM\nTest',
        eventCategory: 'Cours CM',
        modules: ['T01'],
        sites: ['A'],
      }]
    });

    const groups = Array.from({ length: 10 }, (_, i) => `group${i}`).join(',');
    const startTime = Date.now();
    const request = new NextRequest(`http://localhost:3000/api/calendar.ics?group=${groups}`);
    const response = await GET(request);
    const elapsed = Date.now() - startTime;

    expect([200, 404]).toContain(response.status);
    expect(elapsed).toBeLessThan(1000);
  });
});


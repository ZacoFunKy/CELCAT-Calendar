/**
 * Simplified Calendar API Tests - Focus on Error Handling and Parameter Validation
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';

// Stub ical-generator to avoid heavy parsing while keeping shape
jest.mock('ical-generator', () => {
  const createEvent = jest.fn(() => ({
    categories: jest.fn(),
    x: jest.fn()
  }));

  const calendar = {
    createEvent,
    toString: jest.fn(() => 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Test\nEND:VEVENT\nEND:VCALENDAR')
  };

  const factory = () => calendar;
  factory.__calendar = calendar;
  return factory;
});

// Mock external dependencies to keep tests self-contained
global.fetch = jest.fn();
jest.mock('../cache.js', () => ({
  getCachedGroupData: jest.fn(() => null),
  setCachedGroupData: jest.fn(),
  trackGroupRequest: jest.fn(),
  pruneCache: jest.fn()
}));
jest.mock('../../notifications/notifier.js', () => ({
  checkScheduleChanges: jest.fn(() => Promise.resolve({ changed: false })),
  sendPushNotification: jest.fn(() => Promise.resolve(true))
}));
jest.mock('../../../../models/User');
jest.mock('../../../../models/UserPreference');
jest.mock('../../../../lib/db', () => jest.fn().mockResolvedValue());

describe('Calendar API Route Tests', () => {
  const sampleEvent = {
    id: 'event-1',
    start: '2024-01-15T09:00:00',
    end: '2024-01-15T10:00:00',
    description: 'CM\nMathématiques avancées\nProfesseur X\nAmphi A',
    eventCategory: 'Cours CM',
    modules: ['MAT101'],
    sites: ['A']
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Parameter Validation', () => {
    it('returns 400 when no group parameter is provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/calendar.ics');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('group');
    });

    it('rejects empty group parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=');
      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('rejects group names containing script tags and does not call fetch', async () => {
      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=<script>alert(1)</script>');
      const response = await GET(request);

      expect([400, 404]).toContain(response.status);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('limits number of groups to 10', async () => {
      global.fetch.mockResolvedValue({ ok: true, json: async () => [sampleEvent] });

      const groups = Array(15).fill(0).map((_, i) => `group${i}`).join(',');
      const request = new NextRequest(`http://localhost:3000/api/calendar.ics?group=${groups}`);
      await GET(request);

      expect(global.fetch).toHaveBeenCalledTimes(10);
    });
  });

  describe('Success Responses', () => {
    it('returns ICS content with a valid group and events', async () => {
      global.fetch.mockResolvedValue({ ok: true, json: async () => [sampleEvent] });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=INFO-1');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/calendar');

      const ics = await response.text();
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('SUMMARY');
    });

    it('returns JSON when format=json is requested', async () => {
      global.fetch.mockResolvedValue({ ok: true, json: async () => [sampleEvent] });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=INFO-1&format=json');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.events).toHaveLength(1);
      expect(json.events[0].summary.toLowerCase()).toContain('math');
    });
  });

  describe('Filtering & Holidays', () => {
    it('filters blacklisted events and returns 404 when nothing remains', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => [{
          ...sampleEvent,
          id: 'blocked-1',
          description: 'DSPEG - Cours'
        }]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=INFO-1');
      const response = await GET(request);

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBeDefined();
    });

    it('keeps holiday events when holidays=true', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => [{
          ...sampleEvent,
          id: 'holiday-1',
          eventCategory: 'Vacances',
          description: 'Vacances de Noël'
        }]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=INFO-1&holidays=true');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const ics = await response.text();
      expect(ics).toContain('BEGIN:VEVENT');
    });

    it('returns empty events array for blacklisted events when format=json', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => [{
          ...sampleEvent,
          id: 'blocked-1',
          description: 'DSPEG - Cours'
        }]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=INFO-1&format=json');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.events).toHaveLength(0);
    });
  });

  describe('Error handling', () => {
    it('returns 404 on upstream fetch failure', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=INFO-1');
      const response = await GET(request);

      expect([404, 500]).toContain(response.status);
      const json = await response.json();
      expect(json.error).toBeDefined();
    });
  });
});

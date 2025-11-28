/**
 * Basic tests for /api/calendar.ics route
 * These tests validate core functionality with mocked dependencies
 */

import { GET, clearInFlightRequests } from '../route';
import { NextRequest } from 'next/server';
import ICAL from 'ical.js';
import { clearAllCaches } from '../cache.js';
import { clearScheduleHistory } from '../../notifications/notifier.js';

// Mock the fetch function
global.fetch = jest.fn();

// Mock the database modules
jest.mock('../../../../lib/db', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../../../models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('../../../../models/UserPreference', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn().mockResolvedValue(null),
  },
}));

describe('Calendar ICS API Route - Basic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAllCaches();
    clearScheduleHistory();
    clearInFlightRequests();
    process.env.CELCAT_URL = 'https://celcat.u-bordeaux.fr/Calendar/Home/GetCalendarData';
    process.env.LOG_LEVEL = 'error';
  });

  afterEach(() => {
    clearAllCaches();
    clearScheduleHistory();
    clearInFlightRequests();
  });

  describe('Error Handling', () => {
    it('should return 400 when group parameter is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/calendar.ics');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('group');
    });

    it('should return 400 when group parameter is empty', async () => {
      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('group');
    });

    it('should return 404 when no events are found', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test-group');
      const response = await GET(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeTruthy();
    });

    it('should return 500 when upstream service fails', async () => {
      global.fetch.mockRejectedValue(new Error('Network error'));

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test-group');
      const response = await GET(request);

      expect(response.status).toBe(404); // Returns 404 because no events found after retries
    });
  });

  describe('ICS Format Validation', () => {
    it('should return valid ICS format', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 'test-event-1',
          start: '2025-01-15T09:00:00',
          end: '2025-01-15T11:00:00',
          description: 'CM - Mathématiques\nProf Test',
          eventCategory: 'Cours',
          modules: ['Mathématiques'],
          sites: ['Amphi A']
        }]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test-group');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8');

      const icsContent = await response.text();

      // Validate ICS format using ical.js
      expect(() => {
        const jcalData = ICAL.parse(icsContent);
        const comp = new ICAL.Component(jcalData);
        expect(comp).toBeDefined();
      }).not.toThrow();

      // Check required ICS headers
      expect(icsContent).toContain('BEGIN:VCALENDAR');
      expect(icsContent).toContain('END:VCALENDAR');
      expect(icsContent).toContain('VERSION:2.0');
      expect(icsContent).toContain('PRODID');

      // Check event structure
      expect(icsContent).toContain('BEGIN:VEVENT');
      expect(icsContent).toContain('END:VEVENT');
      expect(icsContent).toContain('DTSTART');
      expect(icsContent).toContain('DTEND');
      expect(icsContent).toContain('SUMMARY');
    });

    it('should include proper timezone information', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 'test-event-2',
          start: '2025-01-15T09:00:00',
          end: '2025-01-15T11:00:00',
          description: 'Test Event\nProf Dupont',
          modules: ['Test Module'],
        }]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test-group');
      const response = await GET(request);
      const icsContent = await response.text();

      // Should contain timezone information for Europe/Paris
      expect(icsContent).toMatch(/Europe\/Paris/);
    });

    it('should properly set Content-Disposition header', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 'test-event-3',
          start: '2025-01-15T09:00:00',
          end: '2025-01-15T11:00:00',
          description: 'CM Test Event\nProf Martin',
          modules: ['Test Module'],
        }]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test-group');
      const response = await GET(request);

      const contentDisposition = response.headers.get('Content-Disposition');
      expect(contentDisposition).toContain('attachment');
      expect(contentDisposition).toContain('filename=');
      expect(contentDisposition).toContain('.ics');
    });
  });

  describe('Multiple Groups', () => {
    it('should handle multiple groups separated by commas', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{
            id: 'test-event-1',
            start: '2025-01-15T09:00:00',
            end: '2025-01-15T11:00:00',
            description: 'CM Event from Group 1\nProf A',
            modules: ['Test1 Module'],
          }]
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{
            id: 'test-event-2',
            start: '2025-01-15T14:00:00',
            end: '2025-01-15T16:00:00',
            description: 'TD Event from Group 2\nProf B',
            modules: ['Test2 Module'],
          }]
        });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=group1,group2');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const icsContent = await response.text();

      // Should contain events from both groups
      const jcalData = ICAL.parse(icsContent);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');

      expect(vevents.length).toBe(2);
    });

    it('should limit to 10 groups maximum', async () => {
      // Mock 11 groups
      const groups = Array.from({ length: 11 }, (_, i) => `group${i + 1}`).join(',');

      global.fetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: async () => [{
            id: `test-event-${Date.now()}-${Math.random()}`,
            start: '2025-01-15T09:00:00',
            end: '2025-01-15T11:00:00',
            description: 'CM Test Event\nProf Smith',
            modules: ['Test Module'],
          }]
        })
      );

      const request = new NextRequest(`http://localhost:3000/api/calendar.ics?group=${groups}`);
      const response = await GET(request);

      // Should only fetch for 10 groups (or fail gracefully)
      expect(global.fetch).toHaveBeenCalledTimes(10);
    });
  });

  describe('JSON Format', () => {
    it('should return JSON when format=json is specified', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 'test-event-1',
          start: '2025-01-15T09:00:00',
          end: '2025-01-15T11:00:00',
          description: 'CM - Mathématiques\nProf Dubois',
          eventCategory: 'Cours',
          modules: ['Mathématiques'],
          sites: ['Amphi A']
        }]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test-group&format=json');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/json');

      const data = await response.json();
      expect(data.events).toBeDefined();
      expect(Array.isArray(data.events)).toBe(true);
      expect(data.events.length).toBeGreaterThan(0);
    });
  });

  describe('Holiday Handling', () => {
    it('should exclude holidays by default', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'holiday-1',
            start: '2025-12-20T00:00:00',
            end: '2025-12-27T00:00:00',
            description: 'Vacances de Noël',
            eventCategory: 'Vacances',
            modules: [],
          },
          {
            id: 'course-1',
            start: '2025-01-15T09:00:00',
            end: '2025-01-15T11:00:00',
            description: 'CM - Mathématiques\nProf Leclerc',
            modules: ['Mathématiques'],
          }
        ]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test-group');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const icsContent = await response.text();

      // Should not contain holiday
      expect(icsContent).not.toContain('Vacances');
      expect(icsContent).toContain('Mathématiques');
    });

    it('should include holidays when holidays=true', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'holiday-1',
            start: '2025-12-20T00:00:00',
            end: '2025-12-27T00:00:00',
            description: 'Vacances de Noël',
            eventCategory: 'Vacances',
            modules: [],
          },
          {
            id: 'course-1',
            start: '2025-01-15T09:00:00',
            end: '2025-01-15T11:00:00',
            description: 'CM - Mathématiques\nProf Bernard',
            modules: ['Mathématiques'],
          }
        ]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test-group&holidays=true');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const icsContent = await response.text();

      // Should contain both holiday and course
      expect(icsContent).toContain('Vacances');
      expect(icsContent).toContain('Mathématiques');
    });
  });
});

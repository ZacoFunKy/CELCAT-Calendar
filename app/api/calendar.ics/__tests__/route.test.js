/**
 * Tests for /api/calendar.ics route
 * These tests validate:
 * 1. ICS format correctness and RFC 5545 compliance
 * 2. API functionality (parameters, error handling)
 * 3. Event processing logic (filtering, formatting)
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';
import ICAL from 'ical.js';

// Mock the fetch function
global.fetch = jest.fn();

describe('Calendar ICS API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env.CELCAT_URL = 'https://celcat.u-bordeaux.fr/Calendar/Home/GetCalendarData';
    process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
  });

  describe('ICS Format Validation', () => {
    it('should return valid ICS format according to RFC 5545', async () => {
      // Mock successful fetch response with sample data
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 'test-event-1',
          start: '2024-01-15T09:00:00',
          end: '2024-01-15T11:00:00',
          description: 'CM - Mathématiques',
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
          start: '2024-01-15T09:00:00',
          end: '2024-01-15T11:00:00',
          description: 'Test Event',
          modules: ['Test'],
        }]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test-group');
      const response = await GET(request);
      const icsContent = await response.text();

      // Should contain timezone information for Europe/Paris
      expect(icsContent).toMatch(/TZID.*Europe\/Paris/);
    });

    it('should properly escape special characters in ICS fields', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 'test-event-3',
          start: '2024-01-15T09:00:00',
          end: '2024-01-15T11:00:00',
          description: 'Test with "quotes", semicolons; and commas,',
          modules: ['Test Module'],
        }]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test-group');
      const response = await GET(request);
      const icsContent = await response.text();

      // ical-generator should handle escaping automatically
      expect(() => {
        const jcalData = ICAL.parse(icsContent);
        new ICAL.Component(jcalData);
      }).not.toThrow();
    });

    it('should generate valid UID for each event', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 'unique-event-123',
          start: '2024-01-15T09:00:00',
          end: '2024-01-15T11:00:00',
          description: 'Event with UID',
          modules: ['Test'],
        }]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test-group');
      const response = await GET(request);
      const icsContent = await response.text();

      expect(icsContent).toContain('UID:');
      
      // Parse and validate UID exists
      const jcalData = ICAL.parse(icsContent);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');
      expect(vevents.length).toBeGreaterThan(0);
      expect(vevents[0].getFirstPropertyValue('uid')).toBeTruthy();
    });
  });

  describe('API Parameter Validation', () => {
    it('should return 400 when group parameter is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/calendar.ics');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("group");
    });

    it('should accept single group parameter', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 'test-1',
          start: '2024-01-15T09:00:00',
          end: '2024-01-15T11:00:00',
          description: 'Test',
          modules: ['Test'],
        }]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=G123');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should accept multiple groups separated by commas', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => [{
          id: 'test-1',
          start: '2024-01-15T09:00:00',
          end: '2024-01-15T11:00:00',
          description: 'Test',
          modules: ['Test'],
        }]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=G123,G456');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should limit number of groups to 10', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => []
      });

      const groups = Array(15).fill(0).map((_, i) => `G${i}`).join(',');
      const request = new NextRequest(`http://localhost:3000/api/calendar.ics?group=${groups}`);
      await GET(request);

      // Should only fetch for 10 groups maximum
      expect(global.fetch).toHaveBeenCalledTimes(10);
    });

    it('should handle holidays parameter correctly', async () => {
      // Get the current academic year
      const now = new Date();
      const currentYear = now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear();
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 'holiday-1',
          start: `${currentYear}-12-20T00:00:00`,
          end: `${currentYear + 1}-01-03T00:00:00`,
          eventCategory: 'Vacances de Noël',
          description: 'Vacances de Noël',
        }]
      });

      // Test with holidays=true
      const requestWithHolidays = new NextRequest('http://localhost:3000/api/calendar.ics?group=test&holidays=true');
      const responseWithHolidays = await GET(requestWithHolidays);
      const icsWithHolidays = await responseWithHolidays.text();
      
      // Should contain the holiday event
      expect(icsWithHolidays).toContain('BEGIN:VEVENT');

      // Test with holidays=false (default)
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 'holiday-2',
          start: `${currentYear}-12-20T00:00:00`,
          end: `${currentYear + 1}-01-03T00:00:00`,
          eventCategory: 'Vacances',
          description: 'Vacances de Noël',
        }]
      });

      const requestWithoutHolidays = new NextRequest('http://localhost:3000/api/calendar.ics?group=test&holidays=false');
      const responseWithoutHolidays = await GET(requestWithoutHolidays);
      
      // Should return 404 when only holidays exist and holidays=false
      expect(responseWithoutHolidays.status).toBe(404);
    });
  });

  describe('Event Processing', () => {
    it('should filter blacklisted events', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'valid-event',
            start: '2024-01-15T09:00:00',
            end: '2024-01-15T11:00:00',
            description: 'Normal Course',
            modules: ['Test'],
          },
          {
            id: 'blacklisted-event',
            start: '2024-01-16T09:00:00',
            end: '2024-01-16T11:00:00',
            description: 'DSPEG - Should be filtered',
            modules: ['DSPEG'],
          }
        ]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test');
      const response = await GET(request);
      const icsContent = await response.text();

      expect(icsContent).toContain('Normal Course');
      expect(icsContent).not.toContain('DSPEG');
    });

    it('should format event titles with prefixes (CM, TD, TP)', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 'cm-event',
          start: '2024-01-15T09:00:00',
          end: '2024-01-15T11:00:00',
          description: 'CM - Mathématiques',
          eventCategory: 'Cours',
          modules: ['Mathématiques'],
        }]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test');
      const response = await GET(request);
      const icsContent = await response.text();

      // Parse and check summary
      const jcalData = ICAL.parse(icsContent);
      const comp = new ICAL.Component(jcalData);
      const vevent = comp.getFirstSubcomponent('vevent');
      const summary = vevent.getFirstPropertyValue('summary');

      expect(summary).toMatch(/CM/);
    });

    it('should clean HTML entities and tags from descriptions', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 'html-event',
          start: '2024-01-15T09:00:00',
          end: '2024-01-15T11:00:00',
          description: 'Test<br>with<br/>HTML&nbsp;&amp;&lt;&gt;&quot;',
          modules: ['Test'],
        }]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test');
      const response = await GET(request);
      const icsContent = await response.text();

      // Parse and check description
      const jcalData = ICAL.parse(icsContent);
      const comp = new ICAL.Component(jcalData);
      const vevent = comp.getFirstSubcomponent('vevent');
      const description = vevent.getFirstPropertyValue('description');

      expect(description).not.toContain('<br>');
      expect(description).not.toContain('&nbsp;');
      expect(description).not.toContain('&amp;');
    });

    it('should extract and format location information', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 'location-event',
          start: '2024-01-15T09:00:00',
          end: '2024-01-15T11:00:00',
          description: 'Cours en salle A101',
          modules: ['Test'],
          sites: ['Bâtiment A', 'Campus Talence']
        }]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test');
      const response = await GET(request);
      const icsContent = await response.text();

      expect(icsContent).toContain('LOCATION');
    });

    it('should handle all-day events correctly', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 'allday-event',
          start: '2024-01-15T00:00:00',
          end: '2024-01-16T00:00:00',
          description: 'All Day Event',
          modules: ['Test'],
          allDay: true
        }]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test');
      const response = await GET(request);
      const icsContent = await response.text();

      // All-day events should use VALUE=DATE format
      const jcalData = ICAL.parse(icsContent);
      const comp = new ICAL.Component(jcalData);
      const vevent = comp.getFirstSubcomponent('vevent');
      
      // Check that the event is properly formatted
      expect(vevent).toBeDefined();
    });

    it('should remove duplicate events', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'duplicate-event',
            start: '2024-01-15T09:00:00',
            end: '2024-01-15T11:00:00',
            description: 'Duplicate Event',
            modules: ['Test'],
          },
          {
            id: 'duplicate-event', // Same ID
            start: '2024-01-15T09:00:00',
            end: '2024-01-15T11:00:00',
            description: 'Duplicate Event',
            modules: ['Test'],
          }
        ]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test');
      const response = await GET(request);
      const icsContent = await response.text();

      // Parse and count events
      const jcalData = ICAL.parse(icsContent);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');
      
      expect(vevents.length).toBe(1); // Should only have one event
    });

    it('should use full course name from description instead of module code', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 'full-name-event',
          start: '2024-01-15T09:00:00',
          end: '2024-01-15T11:00:00',
          description: 'Conception des systèmes d\'information\nJean Dupont\nSalle A101',
          eventCategory: 'Cours CM',
          modules: ['4TYG503U Conception des SI'],
        }]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test');
      const response = await GET(request);
      const icsContent = await response.text();

      // Parse and check summary
      const jcalData = ICAL.parse(icsContent);
      const comp = new ICAL.Component(jcalData);
      const vevent = comp.getFirstSubcomponent('vevent');
      const summary = vevent.getFirstPropertyValue('summary');

      // Should use full name from description, not the module code
      expect(summary).toContain('Conception des systèmes d\'information');
      expect(summary).not.toContain('4TYG503U');
      expect(summary).toMatch(/CM/);
    });

    it('should append professor name to event summary', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 'professor-event',
          start: '2024-01-15T09:00:00',
          end: '2024-01-15T11:00:00',
          description: 'Conception des systèmes d\'information\nJean Dupont\nSalle A101',
          eventCategory: 'Cours CM',
          modules: ['Conception SI'],
        }]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test');
      const response = await GET(request);
      const icsContent = await response.text();

      // Parse and check summary
      const jcalData = ICAL.parse(icsContent);
      const comp = new ICAL.Component(jcalData);
      const vevent = comp.getFirstSubcomponent('vevent');
      const summary = vevent.getFirstPropertyValue('summary');

      // Should include professor name
      expect(summary).toContain('Jean Dupont');
      expect(summary).toMatch(/CM.*-.*Jean Dupont/);
    });

    it('should remove duplicate building names from location', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 'location-duplicate-event',
          start: '2024-01-15T09:00:00',
          end: '2024-01-15T11:00:00',
          description: 'Test Course\nBâtiment A29 - A29/ Salle 105',
          modules: ['Test'],
          sites: ['Bâtiment A29']
        }]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test');
      const response = await GET(request);
      const icsContent = await response.text();

      // Parse and check location
      const jcalData = ICAL.parse(icsContent);
      const comp = new ICAL.Component(jcalData);
      const vevent = comp.getFirstSubcomponent('vevent');
      const location = vevent.getFirstPropertyValue('location');

      // Should not have duplicate "A29"
      expect(location).toContain('Bâtiment A29/');
      expect(location).toContain('Salle 105');
      expect(location).not.toMatch(/A29\s*-\s*A29\//);
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test');
      const response = await GET(request);

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBeDefined();
    });

    it('should handle HTTP errors from upstream', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({})
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test');
      const response = await GET(request);

      expect(response.status).toBe(404);
    });

    it('should return 404 when no events found', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test');
      const response = await GET(request);

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toContain('Aucun cours trouvé');
    });

    it('should handle invalid group names', async () => {
      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=<script>alert(1)</script>');
      const response = await GET(request);

      // Invalid group names are filtered out, leading to no valid groups
      expect(response.status).toBe(404);
    });

    it('should implement retry logic for transient failures', async () => {
      // First call fails, second succeeds
      global.fetch
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [{
            id: 'retry-event',
            start: '2024-01-15T09:00:00',
            end: '2024-01-15T11:00:00',
            description: 'Event after retry',
            modules: ['Test'],
          }]
        });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache Headers', () => {
    it('should include proper cache control headers', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 'cache-event',
          start: '2024-01-15T09:00:00',
          end: '2024-01-15T11:00:00',
          description: 'Cache Test',
          modules: ['Test'],
        }]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test');
      const response = await GET(request);

      expect(response.headers.get('Cache-Control')).toBeTruthy();
      expect(response.headers.get('Cache-Control')).toContain('public');
    });

    it('should include content-disposition header for download', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 'download-event',
          start: '2024-01-15T09:00:00',
          end: '2024-01-15T11:00:00',
          description: 'Download Test',
          modules: ['Test'],
        }]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=TestGroup');
      const response = await GET(request);

      const contentDisposition = response.headers.get('Content-Disposition');
      expect(contentDisposition).toContain('attachment');
      expect(contentDisposition).toContain('.ics');
    });
  });

  describe('Academic Year Handling', () => {
    it('should fetch events for the full academic year', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test');
      await GET(request);

      // Check that fetch was called with date range
      expect(global.fetch).toHaveBeenCalled();
      
      const fetchCall = global.fetch.mock.calls[0];
      const formData = fetchCall[1].body;
      
      // Verify the form data contains start and end dates
      const bodyString = formData.toString();
      expect(bodyString).toMatch(/start=\d{4}-08-01/);
      expect(bodyString).toMatch(/end=\d{4}-08-31/);
    });

    it('should filter holidays outside academic year', async () => {
      const now = new Date();
      const currentYear = now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear();
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'valid-holiday',
            start: `${currentYear}-12-20T00:00:00`,
            end: `${currentYear + 1}-01-03T00:00:00`,
            eventCategory: 'Vacances',
            description: 'Vacances de Noël',
          },
          {
            id: 'invalid-holiday',
            start: `${currentYear - 2}-12-20T00:00:00`,
            end: `${currentYear - 2}-12-31T00:00:00`,
            eventCategory: 'Vacances',
            description: 'Old Holiday',
          }
        ]
      });

      const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test&holidays=true');
      const response = await GET(request);
      const icsContent = await response.text();

      // Should contain valid holiday event
      expect(icsContent).toContain('BEGIN:VEVENT');
      expect(icsContent).not.toContain('Old Holiday');
    });
  });
});

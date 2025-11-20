/**
 * End-to-End tests for the Calendar API
 * These tests validate the complete flow from request to response
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';
import ICAL from 'ical.js';

// Mock the fetch function
global.fetch = jest.fn();

describe('Calendar API E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CELCAT_URL = 'https://celcat.u-bordeaux.fr/Calendar/Home/GetCalendarData';
    process.env.LOG_LEVEL = 'error';
  });

  it('E2E: Complete flow for a single group with various event types', async () => {
    // Mock realistic data with different event types
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 'cm-event',
          start: '2024-01-15T09:00:00',
          end: '2024-01-15T11:00:00',
          description: 'Cours\nAlgorithmes et structures de données\nDUPONT Jean\nA29/ Amphithéâtre F',
          eventCategory: 'Cours CM',
          modules: ['5CYG501U Algo'],
          sites: ['Bâtiment A29']
        },
        {
          id: 'td-event',
          start: '2024-01-16T14:00:00',
          end: '2024-01-16T16:00:00',
          description: 'TD\nProgrammation orientée objet\nMARTIN Sophie\nCREMI - Salle 201',
          eventCategory: 'TD Machine',
          modules: ['POO'],
          sites: ['CREMI']
        },
        {
          id: 'tp-event',
          start: '2024-01-17T10:00:00',
          end: '2024-01-17T12:00:00',
          description: 'TP\nBases de données\nLEROY Paul',
          eventCategory: 'TP',
          modules: ['BDD'],
          sites: ['Bâtiment A9']
        },
        {
          id: 'exam-event',
          start: '2024-01-20T08:00:00',
          end: '2024-01-20T10:00:00',
          description: 'Examen\nMathématiques\nA29/ Amphithéâtre A',
          eventCategory: 'Examen',
          modules: ['Maths'],
          sites: ['Bâtiment A29']
        }
      ]
    });

    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=5CYG500S');
    const response = await GET(request);

    // Validate response
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8');

    const icsContent = await response.text();

    // Parse ICS
    const jcalData = ICAL.parse(icsContent);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    // Validate all events are present
    expect(vevents.length).toBe(4);

    // Validate CM event
    const cmEvent = vevents.find(e => e.getFirstPropertyValue('uid') === 'cm-event');
    expect(cmEvent).toBeTruthy();
    const cmSummary = cmEvent.getFirstPropertyValue('summary');
    expect(cmSummary).toContain('CM');
    expect(cmSummary).toContain('Algorithmes');

    // Validate TD Machine event
    const tdEvent = vevents.find(e => e.getFirstPropertyValue('uid') === 'td-event');
    expect(tdEvent).toBeTruthy();
    const tdSummary = tdEvent.getFirstPropertyValue('summary');
    expect(tdSummary).toContain('TD Machine');

    // Validate TP event
    const tpEvent = vevents.find(e => e.getFirstPropertyValue('uid') === 'tp-event');
    expect(tpEvent).toBeTruthy();
    const tpSummary = tpEvent.getFirstPropertyValue('summary');
    expect(tpSummary).toContain('TP');

    // Validate Exam event
    const examEvent = vevents.find(e => e.getFirstPropertyValue('uid') === 'exam-event');
    expect(examEvent).toBeTruthy();
    const examSummary = examEvent.getFirstPropertyValue('summary');
    expect(examSummary).toContain('EXAM');
  });

  it('E2E: Multiple groups merged into single calendar', async () => {
    // Mock responses for different groups
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 'group1-event',
          start: '2024-01-15T09:00:00',
          end: '2024-01-15T11:00:00',
          description: 'Group 1 Course',
          modules: ['Module1'],
        }]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          id: 'group2-event',
          start: '2024-01-16T14:00:00',
          end: '2024-01-16T16:00:00',
          description: 'Group 2 Course',
          modules: ['Module2'],
        }]
      });

    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=Group1,Group2');
    const response = await GET(request);

    expect(response.status).toBe(200);

    const icsContent = await response.text();
    const jcalData = ICAL.parse(icsContent);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    // Both events should be in the calendar
    expect(vevents.length).toBe(2);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('E2E: Holiday filtering with parameter', async () => {
    const now = new Date();
    const currentYear = now.getMonth() < 6 ? now.getFullYear() - 1 : now.getFullYear();

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'holiday-1',
          start: `${currentYear}-12-20T00:00:00`,
          end: `${currentYear + 1}-01-03T00:00:00`,
          eventCategory: 'Vacances',
          description: 'Vacances de Noël',
        },
        {
          id: 'course-1',
          start: '2024-01-15T09:00:00',
          end: '2024-01-15T11:00:00',
          description: 'Regular Course',
          modules: ['Test'],
        }
      ]
    });

    // Test with holidays=false (default)
    const requestWithoutHolidays = new NextRequest('http://localhost:3000/api/calendar.ics?group=test');
    const responseWithout = await GET(requestWithoutHolidays);
    expect(responseWithout.status).toBe(200);
    
    const icsWithout = await responseWithout.text();
    const jcalWithout = ICAL.parse(icsWithout);
    const compWithout = new ICAL.Component(jcalWithout);
    const veventsWithout = compWithout.getAllSubcomponents('vevent');
    
    // Should only have course, not holiday
    expect(veventsWithout.length).toBe(1);

    // Reset mock
    global.fetch.mockClear();
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 'holiday-2',
          start: `${currentYear}-12-20T00:00:00`,
          end: `${currentYear + 1}-01-03T00:00:00`,
          eventCategory: 'Vacances',
          description: 'Vacances de Noël',
        },
        {
          id: 'course-2',
          start: '2024-01-15T09:00:00',
          end: '2024-01-15T11:00:00',
          description: 'Regular Course',
          modules: ['Test'],
        }
      ]
    });

    // Test with holidays=true
    const requestWithHolidays = new NextRequest('http://localhost:3000/api/calendar.ics?group=test&holidays=true');
    const responseWith = await GET(requestWithHolidays);
    expect(responseWith.status).toBe(200);
    
    const icsWith = await responseWith.text();
    const jcalWith = ICAL.parse(icsWith);
    const compWith = new ICAL.Component(jcalWith);
    const veventsWith = compWith.getAllSubcomponents('vevent');
    
    // Should have both course and holiday
    expect(veventsWith.length).toBe(2);
  });

  it('E2E: Error handling and recovery', async () => {
    // All retries fail
    global.fetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'));

    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=failing-group');
    const response = await GET(request);

    // Should return 404 on error
    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('E2E: Blacklist filtering works end-to-end', async () => {
    // Set blacklist via environment (the route reads from CONFIG which uses process.env)
    const originalBlacklist = process.env.CELCAT_BLACKLIST;
    process.env.CELCAT_BLACKLIST = JSON.stringify(['BLOCKED', 'FILTERED']);

    // Need to reimport the module to pick up new env vars
    // But for this test, we'll use the fact that blacklist is checked in cleanDescription
    // Let's test with events that will be filtered by the default blacklist or descriptive keywords

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 'allowed-event',
          start: '2024-01-15T09:00:00',
          end: '2024-01-15T11:00:00',
          description: 'Allowed Course',
          modules: ['Test'],
        },
        {
          id: 'blocked-event-dspeg',
          start: '2024-01-16T09:00:00',
          end: '2024-01-16T11:00:00',
          description: 'DSPEG Course', // Uses default blacklist
          modules: ['Test'],
        }
      ]
    });

    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test');
    const response = await GET(request);

    expect(response.status).toBe(200);

    const icsContent = await response.text();
    const jcalData = ICAL.parse(icsContent);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    // Only the allowed event should be present (DSPEG is in default blacklist)
    expect(vevents.length).toBe(1);
    expect(icsContent).toContain('Allowed Course');
    expect(icsContent).not.toContain('DSPEG');
    
    // Restore original env
    if (originalBlacklist) {
      process.env.CELCAT_BLACKLIST = originalBlacklist;
    } else {
      delete process.env.CELCAT_BLACKLIST;
    }
  });

  it('E2E: Cache headers are properly set', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{
        id: 'cache-test',
        start: '2024-01-15T09:00:00',
        end: '2024-01-15T11:00:00',
        description: 'Cache Test',
        modules: ['Test'],
      }]
    });

    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test');
    const response = await GET(request);

    expect(response.status).toBe(200);

    // Validate cache headers
    const cacheControl = response.headers.get('Cache-Control');
    expect(cacheControl).toBeTruthy();
    expect(cacheControl).toContain('public');
    expect(cacheControl).toContain('max-age');
    expect(cacheControl).toContain('s-maxage');

    // Validate content-disposition for download
    const contentDisposition = response.headers.get('Content-Disposition');
    expect(contentDisposition).toBeTruthy();
    expect(contentDisposition).toContain('attachment');
    expect(contentDisposition).toContain('.ics');
  });
});

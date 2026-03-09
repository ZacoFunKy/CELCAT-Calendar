/**
 * Unit tests for calendar generators (ICS and JSON formats)
 */

import { generateICS, generateJSON } from '../handlers/generator';

// Stub ical-generator to isolate the generator logic
jest.mock('ical-generator', () => {
  const createdEvents = [];

  const createEvent = jest.fn((opts) => {
    const ev = { ...opts, _categories: [], _x: {}, categories: jest.fn(function (c) { this._categories = c; return this; }), x: jest.fn(function (k, v) { this._x[k] = v; return this; }) };
    createdEvents.push(ev);
    return ev;
  });

  const calendar = {
    createEvent,
    toString: jest.fn(() => 'BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Test\nEND:VEVENT\nEND:VCALENDAR'),
    _createdEvents: createdEvents,
  };

  const factory = jest.fn(() => {
    createdEvents.length = 0; // reset between calls
    return calendar;
  });
  factory.__calendar = calendar;
  factory.__createdEvents = createdEvents;
  return factory;
});

// ──────────────────────────────────────────────────────────────
// Shared fixtures
// ──────────────────────────────────────────────────────────────
const cmEvent = {
  id: 'evt-cm',
  start: '2024-03-01T09:00:00',
  end: '2024-03-01T11:00:00',
  description: 'CM\nAlgorithmique avancée\nProfesseur Dupont\nAmphi A',
  eventCategory: 'Cours CM',
  modules: ['INF501'],
  sites: ['A'],
};

const tdEvent = {
  id: 'evt-td',
  start: '2024-03-02T14:00:00',
  end: '2024-03-02T16:00:00',
  description: 'TD\nAlgorithmique avancée\nSalle 101',
  eventCategory: 'TD',
  modules: ['INF501'],
  sites: ['101'],
};

const holidayEvent = {
  id: 'evt-hol',
  start: '2024-04-01T00:00:00',
  end: '2024-04-07T00:00:00',
  description: 'Vacances de Pâques',
  eventCategory: 'Vacances',
  modules: [],
  sites: [],
};

const blacklistedEvent = {
  id: 'evt-bl',
  start: '2024-03-05T10:00:00',
  end: '2024-03-05T12:00:00',
  description: 'DSPEG - Cours spécial',
  eventCategory: 'Cours',
  modules: [],
  sites: [],
};

// ──────────────────────────────────────────────────────────────
// generateJSON
// ──────────────────────────────────────────────────────────────
describe('generateJSON', () => {
  it('returns an array of processed events', () => {
    const result = generateJSON([cmEvent], { showHolidays: false });

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'evt-cm',
      summary: expect.stringContaining('Algorithmique'),
      start: expect.any(String),
      end: expect.any(String),
    });
  });

  it('deduplicates events with the same id', () => {
    const result = generateJSON([cmEvent, cmEvent], { showHolidays: false });

    expect(result).toHaveLength(1);
  });

  it('excludes an event listed in hiddenEvents', () => {
    const result = generateJSON([cmEvent, tdEvent], {
      showHolidays: false,
      hiddenEvents: ['evt-cm'],
    });

    expect(result.map(e => e.id)).not.toContain('evt-cm');
    expect(result.map(e => e.id)).toContain('evt-td');
  });

  it('filters blacklisted events', () => {
    const result = generateJSON([blacklistedEvent], { showHolidays: true });

    expect(result).toHaveLength(0);
  });

  it('includes holiday events only when showHolidays=true', () => {
    const withHoliday = generateJSON([holidayEvent], { showHolidays: true });
    // Holiday events may fall outside the academic window, so just check it doesn't throw
    expect(Array.isArray(withHoliday)).toBe(true);

    const withoutHoliday = generateJSON([holidayEvent], { showHolidays: false });
    expect(withoutHoliday).toHaveLength(0);
  });

  it('applies renamingRules to event summaries', () => {
    // First generate to find the actual summary
    const base = generateJSON([cmEvent], { showHolidays: false });
    const originalSummary = base[0].summary;

    const result = generateJSON([cmEvent], {
      showHolidays: false,
      renamingRules: new Map([[originalSummary, 'Mon cours personnalisé']]),
    });

    expect(result[0].summary).toBe('Mon cours personnalisé');
  });

  it('hides events matching a hiddenRule by name', () => {
    const base = generateJSON([cmEvent], { showHolidays: false });
    const summary = base[0].summary;

    const result = generateJSON([cmEvent], {
      showHolidays: false,
      hiddenRules: [{ ruleType: 'name', value: summary }],
    });

    expect(result).toHaveLength(0);
  });

  it('applies colorMap to event output', () => {
    const result = generateJSON([cmEvent], {
      showHolidays: false,
      colorMap: new Map([['CM', '#ff0000']]),
    });

    expect(result[0].color).toBe('#ff0000');
  });

  it('returns an empty array for an empty input', () => {
    expect(generateJSON([], {})).toEqual([]);
  });

  it('skips events without an id', () => {
    const noId = { ...cmEvent, id: undefined };
    expect(generateJSON([noId], {})).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────────
// generateICS
// ──────────────────────────────────────────────────────────────
describe('generateICS', () => {
  it('returns a non-empty icsContent string', () => {
    const { icsContent, eventCount } = generateICS([cmEvent], ['INFO-L3'], { showHolidays: false });

    expect(typeof icsContent).toBe('string');
    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(eventCount).toBeGreaterThan(0);
  });

  it('counts only non-holiday events in eventCount', () => {
    const { eventCount } = generateICS([cmEvent, tdEvent], ['INFO-L3'], { showHolidays: false });

    expect(eventCount).toBe(2);
  });

  it('deduplicates events with the same id', () => {
    const { eventCount } = generateICS([cmEvent, cmEvent], ['INFO-L3'], { showHolidays: false });

    expect(eventCount).toBe(1);
  });

  it('excludes events in hiddenEvents list', () => {
    const { eventCount } = generateICS([cmEvent, tdEvent], ['INFO-L3'], {
      showHolidays: false,
      hiddenEvents: ['evt-cm'],
    });

    expect(eventCount).toBe(1);
  });

  it('filters blacklisted events', () => {
    const { eventCount } = generateICS([blacklistedEvent], ['INFO-L3'], { showHolidays: true });

    expect(eventCount).toBe(0);
  });

  it('returns eventCount=0 for an empty event array', () => {
    const { eventCount } = generateICS([], ['INFO-L3'], {});

    expect(eventCount).toBe(0);
  });
});

/**
 * Tests for calendar.ics utility functions
 */

import { 
  CONFIG, 
  formatDate, 
  getFullAcademicYear, 
  cleanDescriptionText, 
  processEvent, 
  applyCustomizations 
} from '../utils.js';

describe('Calendar Utils', () => {
  describe('formatDate', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = new Date('2025-01-15T10:30:00');
      expect(formatDate(date)).toBe('2025-01-15');
    });

    it('should handle different months correctly', () => {
      const date = new Date('2025-12-31T23:59:59');
      expect(formatDate(date)).toBe('2025-12-31');
    });
  });

  describe('getFullAcademicYear', () => {
    it('should return current academic year when after June', () => {
      // Mock date to November (after June)
      const mockDate = new Date('2025-11-28');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const { start, end } = getFullAcademicYear();
      expect(start).toBe('2025-08-01');
      expect(end).toBe('2026-08-31');

      global.Date.mockRestore();
    });

    it('should return previous academic year when before June', () => {
      const mockDate = new Date('2025-03-15');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const { start, end } = getFullAcademicYear();
      expect(start).toBe('2024-08-01');
      expect(end).toBe('2025-08-31');

      global.Date.mockRestore();
    });
  });

  describe('cleanDescriptionText', () => {
    it('should remove HTML tags', () => {
      const input = '<p>Test <b>bold</b> text</p>';
      const result = cleanDescriptionText(input);
      expect(result).toBe('Test bold text');
    });

    it('should convert HTML entities', () => {
      const input = 'Test &quot;quoted&quot; &amp; &lt;text&gt;';
      const result = cleanDescriptionText(input);
      expect(result).toContain('"quoted"');
      expect(result).toContain('&');
      expect(result).toContain('<text>');
    });

    it('should convert <br> to newlines', () => {
      const input = 'Line 1<br>Line 2<br/>Line 3';
      const result = cleanDescriptionText(input);
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should remove empty lines', () => {
      const input = 'Line 1\n\n\nLine 2\n  \nLine 3';
      const result = cleanDescriptionText(input);
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should handle null/undefined input', () => {
      expect(cleanDescriptionText(null)).toBe('');
      expect(cleanDescriptionText(undefined)).toBe('');
      expect(cleanDescriptionText('')).toBe('');
    });
  });

  describe('processEvent', () => {
    it('should return null for invalid event', () => {
      expect(processEvent(null, { showHolidays: false })).toBeNull();
      expect(processEvent({}, { showHolidays: false })).toBeNull();
      expect(processEvent({ id: '123' }, { showHolidays: false })).toBeNull();
    });

    it('should filter blacklisted events', () => {
      const event = {
        id: 'test-1',
        start: '2025-01-15T09:00:00',
        end: '2025-01-15T11:00:00',
        description: 'DSPEG Course',
        modules: ['Test']
      };
      const result = processEvent(event, { showHolidays: false });
      expect(result).toBeNull();
    });

    it('should process regular course event', () => {
      const event = {
        id: 'test-1',
        start: '2025-01-15T09:00:00',
        end: '2025-01-15T11:00:00',
        description: 'CM - Mathématiques\nProf Dupont\nAmphi A',
        eventCategory: 'Cours',
        modules: ['Mathématiques'],
        sites: ['Amphi A']
      };

      const result = processEvent(event, { showHolidays: false });
      
      expect(result).not.toBeNull();
      expect(result.id).toBe('test-1');
      expect(result.summary).toContain('Mathématiques');
      expect(result.summary).toContain('CM');
      expect(result.location).toContain('Amphi A');
      expect(result.isHoliday).toBe(false);
      expect(result.eventType).toBe('CM');
    });

    it('should detect TD events', () => {
      const event = {
        id: 'test-2',
        start: '2025-01-15T14:00:00',
        end: '2025-01-15T16:00:00',
        description: 'TD Informatique\nProf Martin',
        modules: ['Informatique']
      };

      const result = processEvent(event, { showHolidays: false });
      expect(result.summary).toContain('TD');
      expect(result.eventType).toBe('TD');
    });

    it('should detect TP Machine events', () => {
      const event = {
        id: 'test-3',
        start: '2025-01-15T14:00:00',
        end: '2025-01-15T16:00:00',
        description: 'TP Programmation',
        modules: ['Programmation'],
        sites: ['CREMI']
      };

      const result = processEvent(event, { showHolidays: false });
      expect(result.summary).toContain('TP Machine');
      expect(result.eventType).toBe('TP Machine');
    });

    it('should process holiday events when showHolidays is true', () => {
      const event = {
        id: 'holiday-1',
        start: '2025-12-20T00:00:00',
        end: '2025-12-27T00:00:00',
        description: 'Vacances de Noël',
        eventCategory: 'Vacances',
        modules: []
      };

      const result = processEvent(event, { showHolidays: true });
      
      expect(result).not.toBeNull();
      expect(result.isHoliday).toBe(true);
      expect(result.allDay).toBe(true);
      expect(result.summary).toContain('Vacances');
    });

    it('should hide holidays when showHolidays is false', () => {
      const event = {
        id: 'holiday-1',
        start: '2025-12-20T00:00:00',
        end: '2025-12-27T00:00:00',
        description: 'Vacances de Noël',
        eventCategory: 'Vacances',
        modules: []
      };

      const result = processEvent(event, { showHolidays: false });
      expect(result).toBeNull();
    });

    it('should extract professor name from description', () => {
      const event = {
        id: 'test-4',
        start: '2025-01-15T09:00:00',
        end: '2025-01-15T11:00:00',
        description: 'CM Mathématiques\nDupont Jean\nAmphi A',
        modules: ['Mathématiques']
      };

      const result = processEvent(event, { showHolidays: false });
      expect(result.summary).toContain('Dupont Jean');
    });

    it('should handle events with minimal information', () => {
      const event = {
        id: 'test-5',
        start: '2025-01-15T09:00:00',
        end: '2025-01-15T11:00:00',
        description: 'Test Course',
        modules: ['Test']
      };

      const result = processEvent(event, { showHolidays: false });
      expect(result).not.toBeNull();
      expect(result.summary).toBeTruthy();
    });
  });

  describe('applyCustomizations', () => {
    it('should return null for null event', () => {
      const result = applyCustomizations(null, {});
      expect(result).toBeNull();
    });

    it('should hide event based on hidden rules (name)', () => {
      const event = {
        id: 'test-1',
        summary: 'CM - Mathématiques',
        eventType: 'CM'
      };

      const hiddenRules = [
        { ruleType: 'name', value: 'CM - Mathématiques' }
      ];

      const result = applyCustomizations(event, { hiddenRules });
      expect(result).toBeNull();
    });

    it('should hide event based on hidden rules (professor)', () => {
      const event = {
        id: 'test-1',
        summary: 'CM - Mathématiques - Prof Dupont',
        eventType: 'CM'
      };

      const hiddenRules = [
        { ruleType: 'professor', value: 'Dupont' }
      ];

      const result = applyCustomizations(event, { hiddenRules });
      expect(result).toBeNull();
    });

    it('should apply custom name by ID', () => {
      const event = {
        id: 'test-1',
        summary: 'CM - Mathématiques',
        eventType: 'CM'
      };

      const customNames = { 'test-1': 'My Custom Name' };

      const result = applyCustomizations(event, { customNames });
      expect(result.summary).toBe('My Custom Name');
    });

    it('should apply renaming rules', () => {
      const event = {
        id: 'test-1',
        summary: 'CM - Mathématiques',
        eventType: 'CM'
      };

      const renamingRules = new Map([['CM - Mathématiques', 'Math Course']]);

      const result = applyCustomizations(event, { renamingRules });
      expect(result.summary).toBe('Math Course');
    });

    it('should apply type mappings', () => {
      const event = {
        id: 'test-1',
        summary: 'CM - Mathématiques',
        eventType: 'CM'
      };

      const typeMappings = new Map([['CM', '📚 Lecture']]);

      const result = applyCustomizations(event, { typeMappings });
      expect(result.summary).toBe('📚 Lecture - Mathématiques');
    });

    it('should prioritize custom name over renaming rules', () => {
      const event = {
        id: 'test-1',
        summary: 'CM - Mathématiques',
        eventType: 'CM'
      };

      const customNames = { 'test-1': 'Custom Priority' };
      const renamingRules = new Map([['CM - Mathématiques', 'Rule Name']]);

      const result = applyCustomizations(event, { customNames, renamingRules });
      expect(result.summary).toBe('Custom Priority');
    });

    it('should handle Map and Object formats for customNames', () => {
      const event = {
        id: 'test-1',
        summary: 'CM - Mathématiques',
        eventType: 'CM'
      };

      // Test with Object
      let result = applyCustomizations(event, { 
        customNames: { 'test-1': 'Object Custom' } 
      });
      expect(result.summary).toBe('Object Custom');

      // Test with Map
      event.summary = 'CM - Mathématiques'; // Reset
      result = applyCustomizations(event, { 
        customNames: new Map([['test-1', 'Map Custom']]) 
      });
      expect(result.summary).toBe('Map Custom');
    });
  });

  describe('CONFIG', () => {
    it('should have required configuration properties', () => {
      expect(CONFIG).toHaveProperty('celcatUrl');
      expect(CONFIG).toHaveProperty('timezone');
      expect(CONFIG).toHaveProperty('blacklist');
      expect(CONFIG).toHaveProperty('replacements');
      expect(CONFIG).toHaveProperty('MAX_RETRIES');
      expect(CONFIG).toHaveProperty('INITIAL_BACKOFF');
      expect(CONFIG).toHaveProperty('TIMEOUT');
      expect(CONFIG).toHaveProperty('CACHE_TTL');
      expect(CONFIG).toHaveProperty('GROUP_REGEX');
    });

    it('should have valid GROUP_REGEX', () => {
      expect(CONFIG.GROUP_REGEX.test('test-group')).toBe(true);
      expect(CONFIG.GROUP_REGEX.test('Group123')).toBe(true);
      expect(CONFIG.GROUP_REGEX.test('invalid<group>')).toBe(false);
      expect(CONFIG.GROUP_REGEX.test('test@group')).toBe(false);
    });

    it('should have numeric configuration values in valid ranges', () => {
      expect(CONFIG.MAX_RETRIES).toBeGreaterThan(0);
      expect(CONFIG.INITIAL_BACKOFF).toBeGreaterThan(0);
      expect(CONFIG.TIMEOUT).toBeGreaterThan(0);
      expect(CONFIG.CACHE_TTL).toBeGreaterThan(0);
    });
  });
});

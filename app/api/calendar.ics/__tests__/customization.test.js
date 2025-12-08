import { processEvent, cleanDescriptionText, applyCustomizations } from '../utils';

// Mock dependencies
jest.mock('../../../../models/User');
jest.mock('../../../../models/UserPreference');
jest.mock('../../../../lib/db');
jest.mock('../cache.js', () => ({
    getCachedGroupData: jest.fn(),
    setCachedGroupData: jest.fn(),
    trackGroupRequest: jest.fn(),
    pruneCache: jest.fn()
}));
jest.mock('../../notifications/notifier.js', () => ({
    checkScheduleChanges: jest.fn(() => ({ changed: false })),
    sendPushNotification: jest.fn().mockResolvedValue(true)
}));


describe('Calendar ICS Customization Logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should correctly process event with course description', () => {
        const rawEvent = {
            id: 'event-1',
            start: '2024-01-15T09:00:00',
            end: '2024-01-15T11:00:00',
            description: 'CM\nMathématiques\nProfessor Name\nAmphithéâtre A',
            eventCategory: 'Cours CM',
            modules: ['MAT101']
        };

        const processed = processEvent(rawEvent, { showHolidays: true });

        // Should extract course name from description
        expect(processed).toBeDefined();
        expect(processed.summary).toBeTruthy();
        expect(processed.summary.toLowerCase()).toContain('mathématiques');
    });

    it('should process holiday events correctly', () => {
        const currentYear = new Date().getMonth() < 6 ? new Date().getFullYear() - 1 : new Date().getFullYear();
        
        const holidayEvent = {
            id: 'holiday-1',
            start: `${currentYear}-12-24T00:00:00`,
            end: `${currentYear}-12-31T00:00:00`,
            description: 'Vacances de Noël',
            eventCategory: 'Vacances',
            modules: []
        };

        const processed = processEvent(holidayEvent, { showHolidays: true });
        expect(processed).toBeDefined();
        expect(processed.isHoliday).toBe(true);
        expect(processed.allDay).toBe(true);
    });

    it('should return null for holidays when showHolidays is false', () => {
        const currentYear = new Date().getMonth() < 6 ? new Date().getFullYear() - 1 : new Date().getFullYear();
        
        const holidayEvent = {
            id: 'holiday-2',
            start: `${currentYear}-12-24T00:00:00`,
            end: `${currentYear}-12-31T00:00:00`,
            description: 'Vacances de Noël',
            eventCategory: 'Vacances',
            modules: []
        };

        const processed = processEvent(holidayEvent, { showHolidays: false });
        expect(processed).toBeNull();
    });

    it('should clean description text properly', () => {
        const dirtyText = 'TD<br/>Informatique&nbsp;&nbsp;Test&quot;Hello&quot;';
        const cleaned = cleanDescriptionText(dirtyText);
        
        expect(cleaned).not.toContain('<br');
        expect(cleaned).not.toContain('&nbsp;');
        expect(cleaned).toContain('Hello');
    });

    it('should filter blacklisted events', () => {
        const blacklistedEvent = {
            id: 'blacklist-1',
            start: '2024-01-15T09:00:00',
            end: '2024-01-15T11:00:00',
            description: 'DSPEG - Test',
            eventCategory: 'Cours',
            modules: ['TEST']
        };

        const processed = processEvent(blacklistedEvent, { showHolidays: true });
        // DSPEG is in default blacklist
        expect(processed).toBeNull();
    });

    it('should apply custom names and renaming rules', () => {
        const event = {
            id: 'event-rename',
            summary: 'CM - Mathématiques',
            eventType: 'CM'
        };

        const customized = applyCustomizations(event, {
            customNames: new Map([['event-rename', 'Cours de maths avancé']]),
            renamingRules: { 'CM - Mathématiques': 'Mathématiques pour tous' },
            typeMappings: null,
            hiddenRules: null
        });

        expect(customized.summary).toBe('Cours de maths avancé');
    });

    it('should apply type mappings on prefixed summary', () => {
        const event = {
            id: 'event-type',
            summary: 'TD - Informatique',
            eventType: 'TD'
        };

        const customized = applyCustomizations(event, {
            customNames: null,
            typeMappings: new Map([['TD', '💻 Travaux Dirigés']]),
            renamingRules: null,
            hiddenRules: null
        });

        expect(customized.summary).toBe('💻 Travaux Dirigés - Informatique');
    });

    it('should hide events matching hidden rules', () => {
        const event = {
            id: 'event-hide',
            summary: 'CM - Histoire',
            eventType: 'CM'
        };

        const customized = applyCustomizations(event, {
            customNames: null,
            typeMappings: null,
            renamingRules: null,
            hiddenRules: [{ ruleType: 'name', value: 'CM - Histoire' }]
        });

        expect(customized).toBeNull();
    });
});

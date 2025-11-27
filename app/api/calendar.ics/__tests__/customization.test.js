import { processEvent, applyCustomizations } from '../utils';

// Mock dependencies
jest.mock('../../../../models/User');
jest.mock('../../../../models/UserPreference');
jest.mock('../../../../lib/db');
jest.mock('../cache.js', () => ({
    getCachedGroupData: jest.fn(),
    setCachedGroupData: jest.fn(),
    trackGroupRequest: jest.fn(),
    pruneCache: jest.fn()
import { processEvent, applyCustomizations } from '../utils';

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

/*
describe('Calendar ICS Customization Logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should correctly process event with custom name and type', () => {
        const rawEvent = {
            id: 'event-1',
            start: '2024-01-15T09:00:00',
            end: '2024-01-15T11:00:00',
            description: 'CM - Mathématiques',
            eventCategory: 'Cours',
            modules: ['Mathématiques']
        };

        const processed = processEvent(rawEvent, { showHolidays: true });

        expect(processed).toBeDefined();
        expect(processed.summary).toBe('CM - Mathématiques');
        expect(processed.eventType).toBe('CM');

        // Apply Customizations
        const customized = applyCustomizations(processed, {
            customNames: new Map([['event-1', 'Custom Math Name']]),
            typeMappings: new Map([['CM', '📚 Cours Magistral']])
        });

        console.log('Test 1 Summary:', customized.summary);
        expect(customized.summary).toBe('Custom Math Name'); // Custom Name takes precedence
    });

    it('should apply type mappings correctly', () => {
        const rawEvent = {
            id: 'event-2',
            start: '2024-01-15T09:00:00',
            end: '2024-01-15T11:00:00',
            description: 'TD - Informatique',
            eventCategory: 'TD',
            modules: ['Informatique']
        };

        const processed = processEvent(rawEvent, { showHolidays: true });
        console.log('Test 2 Processed Summary:', processed.summary);

        const customized = applyCustomizations(processed, {
            typeMappings: new Map([['TD', '💻']])
        });

        console.log('Test 2 Customized Summary:', customized.summary);
        // "TD - Informatique" -> "💻 - Informatique"
        expect(customized.summary).toBe('💻 - Informatique');
    });
});
*/

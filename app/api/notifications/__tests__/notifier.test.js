/**
 * Tests for schedule change detection (notifier.js)
 */

import { checkScheduleChanges } from '../../notifications/notifier';

describe('Schedule Change Detection', () => {
  beforeEach(() => {
    // Clear the internal scheduleHashes Map between tests
    // Since we can't directly access it, we'll work with isolated group names
  });

  it('should return synchronous result (not a Promise)', () => {
    const events = [
      { id: '1', start: '2025-12-10T08:00:00', end: '2025-12-10T10:00:00', description: 'Test' }
    ];

    const result = checkScheduleChanges('test-group-1', events);

    // Result should be an object, not a Promise
    expect(result).toEqual({
      changed: false,
      groupName: 'test-group-1',
      hash: expect.any(String),
    });
    expect(typeof result.then).toBe('undefined'); // Not a Promise
  });

  it('should detect changes when events are added', () => {
    const initialEvents = [
      { id: '1', start: '2025-12-10T08:00:00', end: '2025-12-10T10:00:00', description: 'Test' }
    ];
    const moreEvents = [
      { id: '1', start: '2025-12-10T08:00:00', end: '2025-12-10T10:00:00', description: 'Test' },
      { id: '2', start: '2025-12-11T14:00:00', end: '2025-12-11T16:00:00', description: 'New' }
    ];

    // First call stores the hash
    const result1 = checkScheduleChanges('test-group-2', initialEvents);
    expect(result1.changed).toBe(false);

    // Second call detects change
    const result2 = checkScheduleChanges('test-group-2', moreEvents);
    expect(result2.changed).toBe(true);
    expect(result2.previousHash).not.toBe(result2.newHash);
  });

  it('should detect changes when events are modified', () => {
    const originalEvents = [
      { id: '1', start: '2025-12-10T08:00:00', end: '2025-12-10T10:00:00', description: 'Original' }
    ];
    const modifiedEvents = [
      { id: '1', start: '2025-12-10T09:00:00', end: '2025-12-10T11:00:00', description: 'Modified' }
    ];

    checkScheduleChanges('test-group-3', originalEvents);
    const result = checkScheduleChanges('test-group-3', modifiedEvents);

    expect(result.changed).toBe(true);
  });

  it('should handle empty events (no change)', () => {
    const emptyEvents = [];

    const result1 = checkScheduleChanges('test-group-4', emptyEvents);
    expect(result1.changed).toBe(false);
    expect(result1.hash).toBe('empty');

    const result2 = checkScheduleChanges('test-group-4', emptyEvents);
    expect(result2.changed).toBe(false); // Still empty, no change
  });

  it('should handle transition from events to empty', () => {
    const events = [
      { id: '1', start: '2025-12-10T08:00:00', end: '2025-12-10T10:00:00', description: 'Test' }
    ];
    const emptyEvents = [];

    checkScheduleChanges('test-group-5', events);
    const result = checkScheduleChanges('test-group-5', emptyEvents);

    expect(result.changed).toBe(true); // Transition from events to empty is a change
  });

  it('should not throw when called correctly (synchronous)', () => {
    const events = [
      { id: '1', start: '2025-12-10T08:00:00', end: '2025-12-10T10:00:00', description: 'Test' }
    ];

    // This should NOT throw
    expect(() => {
      const result = checkScheduleChanges('test-group-6', events);
      expect(result.changed).toBe(false);
    }).not.toThrow();
  });

  it('should throw if .catch() is incorrectly chained (regression test)', () => {
    const events = [
      { id: '1', start: '2025-12-10T08:00:00', end: '2025-12-10T10:00:00', description: 'Test' }
    ];

    // This was the bug: treating sync function as Promise
    expect(() => {
      // @ts-ignore - intentionally calling .catch() on non-Promise
      const result = checkScheduleChanges('test-group-7', events).catch(() => {});
    }).toThrow(); // Should throw TypeError: checkScheduleChanges(...).catch is not a function
  });

  it('should maintain separate state for different groups', () => {
    const events1 = [
      { id: '1', start: '2025-12-10T08:00:00', end: '2025-12-10T10:00:00', description: 'Group1' }
    ];
    const events2 = [
      { id: '2', start: '2025-12-10T14:00:00', end: '2025-12-10T16:00:00', description: 'Group2' }
    ];

    const result1 = checkScheduleChanges('group-A', events1);
    const result2 = checkScheduleChanges('group-B', events2);

    expect(result1.groupName).toBe('group-A');
    expect(result2.groupName).toBe('group-B');
    expect(result1.hash).not.toBe(result2.hash);
  });
});

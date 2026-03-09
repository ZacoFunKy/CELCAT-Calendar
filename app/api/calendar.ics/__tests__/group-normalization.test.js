/**
 * Tests for group normalization and CELCAT federation ID handling
 */

import { GET, clearInFlightRequests } from '../route';
import { clearAllCaches } from '../cache';
import { normalizeGroupValue, isValidGroupName } from '../handlers/fetcher';

// Mock dependencies
jest.mock('../../../../lib/db', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../../models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

jest.mock('../../../../models/UserPreference', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

// ──────────────────────────────────────────────────────────────
// Unit tests for normalizeGroupValue
// ──────────────────────────────────────────────────────────────
describe('normalizeGroupValue', () => {
  it('handles a plain string', () => {
    expect(normalizeGroupValue('INFO-1')).toEqual({ id: 'INFO-1', label: 'INFO-1' });
  });

  it('handles the id::label format', () => {
    expect(normalizeGroupValue('42::Licence Informatique')).toEqual({
      id: '42',
      label: 'Licence Informatique',
    });
  });

  it('handles an object with id and label', () => {
    expect(normalizeGroupValue({ id: '99', label: 'Master Info' })).toEqual({
      id: '99',
      label: 'Master Info',
    });
  });

  it('handles an object with text instead of label', () => {
    expect(normalizeGroupValue({ id: '7', text: 'Groupe A' })).toEqual({
      id: '7',
      label: 'Groupe A',
    });
  });

  it('returns empty strings for null/undefined input', () => {
    expect(normalizeGroupValue(null)).toEqual({ id: '', label: '' });
    expect(normalizeGroupValue(undefined)).toEqual({ id: '', label: '' });
  });

  it('preserves extra colons in label when using id::label format', () => {
    const result = normalizeGroupValue('5::Label:With:Colons');
    expect(result.id).toBe('5');
    expect(result.label).toBe('Label:With:Colons');
  });
});

// ──────────────────────────────────────────────────────────────
// Unit tests for isValidGroupName
// ──────────────────────────────────────────────────────────────
describe('isValidGroupName', () => {
  it('accepts a normal group name', () => {
    expect(isValidGroupName('INFO-L3')).toBe(true);
    expect(isValidGroupName('Groupe A')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidGroupName('')).toBe(false);
  });

  it('rejects null / undefined', () => {
    expect(isValidGroupName(null)).toBe(false);
    expect(isValidGroupName(undefined)).toBe(false);
  });

  it('rejects a group name with < or >', () => {
    expect(isValidGroupName('<script>alert(1)</script>')).toBe(false);
    expect(isValidGroupName('group<bad')).toBe(false);
    expect(isValidGroupName('group>bad')).toBe(false);
  });

  it('rejects a group name with a null byte', () => {
    expect(isValidGroupName('group\0name')).toBe(false);
  });

  it('rejects a group name with javascript: protocol', () => {
    expect(isValidGroupName('javascript:alert(1)')).toBe(false);
    expect(isValidGroupName('JAVASCRIPT:ALERT(1)')).toBe(false);
  });

  it('rejects a group name longer than 200 characters', () => {
    expect(isValidGroupName('a'.repeat(201))).toBe(false);
    expect(isValidGroupName('a'.repeat(200))).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// Integration tests via the GET route
// ──────────────────────────────────────────────────────────────
describe('Group Normalization (Route Integration)', () => {
  beforeEach(() => {
    clearAllCaches();
    clearInFlightRequests();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should reject groups with XSS attempts', async () => {
    const User = require('../../../../models/User').default;
    const UserPreference = require('../../../../models/UserPreference').default;

    User.findOne.mockResolvedValueOnce({
      _id: 'user123',
      calendarToken: 'test-token',
    });

    UserPreference.findOne.mockResolvedValueOnce({
      userId: 'user123',
      groups: ['<script>alert(1)</script>'],
      hiddenEvents: [],
      settings: {},
    });

    const request = new Request('http://localhost/api/calendar.ics?token=test-token&format=json');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Groupe invalide');
  });

  it('should return empty events when user has no groups configured', async () => {
    const User = require('../../../../models/User').default;
    const UserPreference = require('../../../../models/UserPreference').default;

    User.findOne.mockResolvedValueOnce({
      _id: 'user123',
      calendarToken: 'test-token',
    });

    UserPreference.findOne.mockResolvedValueOnce({
      userId: 'user123',
      groups: [],
      hiddenEvents: [],
      settings: {},
    });

    const request = new Request('http://localhost/api/calendar.ics?token=test-token&format=json');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.events).toEqual([]);
  });

  it('should handle CELCAT returning empty array', async () => {
    const User = require('../../../../models/User').default;
    const UserPreference = require('../../../../models/UserPreference').default;

    User.findOne.mockResolvedValueOnce({
      _id: 'user123',
      calendarToken: 'test-token',
    });

    UserPreference.findOne.mockResolvedValueOnce({
      userId: 'user123',
      groups: ['TEST-GROUP'],
      hiddenEvents: [],
      settings: {},
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [], // CELCAT returns empty array
    });

    const request = new Request('http://localhost/api/calendar.ics?token=test-token&format=json');
    const response = await GET(request);

    // Empty result is still 200 with empty events array
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.events).toEqual([]);
  });

  it('should handle CELCAT HTTP errors gracefully', async () => {
    const User = require('../../../../models/User').default;
    const UserPreference = require('../../../../models/UserPreference').default;

    User.findOne.mockResolvedValueOnce({
      _id: 'user123',
      calendarToken: 'test-token',
    });

    UserPreference.findOne.mockResolvedValueOnce({
      userId: 'user123',
      groups: ['TEST-GROUP'],
      hiddenEvents: [],
      settings: {},
    });

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const request = new Request('http://localhost/api/calendar.ics?token=test-token&format=json');
    const response = await GET(request);

    // HTTP errors from CELCAT return empty array with 200 status
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.events).toEqual([]);
  });
});


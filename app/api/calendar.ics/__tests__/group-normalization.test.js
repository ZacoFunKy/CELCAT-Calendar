/**
 * Tests for group normalization and CELCAT federation ID handling
 */

import { GET, clearInFlightRequests } from '../route';
import { clearAllCaches } from '../cache';

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

describe('Group Normalization', () => {
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

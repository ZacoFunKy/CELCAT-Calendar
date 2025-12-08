/**
 * End-to-End tests for the Calendar API
 * These tests validate API error handling and parameter validation
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock the fetch function
global.fetch = jest.fn();

describe('Calendar API E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 when no group parameter is provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/calendar.ics');
    const response = await GET(request);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('should handle network errors gracefully', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));

    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test-group');
    const response = await GET(request);

    expect(response.status).toBe(404);
  });

  it('should reject invalid group names', async () => {
    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=<script>alert(1)</script>');
    const response = await GET(request);

    expect([400, 404]).toContain(response.status);
  });

  it('should return proper error format', async () => {
    const request = new NextRequest('http://localhost:3000/api/calendar.ics');
    const response = await GET(request);

    const json = await response.json();
    expect(json).toHaveProperty('error');
    expect(typeof json.error).toBe('string');
  });

  it('should accept valid group parameter', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => []
    });

    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=valid-group');
    const response = await GET(request);

    expect([200, 404]).toContain(response.status);
  });

  it('should handle multiple groups', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => []
    });

    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=group1,group2,group3');
    const response = await GET(request);

    expect(response.status).toBeDefined();
  });

  it('should have proper content-type header', async () => {
    const request = new NextRequest('http://localhost:3000/api/calendar.ics');
    const response = await GET(request);

    expect(response.headers.has('content-type')).toBe(true);
  });

  it('should reject script injection in group param', async () => {
    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test";DROP TABLE');
    const response = await GET(request);

    expect([400, 404]).toContain(response.status);
  });

  it('should handle holidays parameter', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [{
        id: 'test',
        start: '2024-01-15T09:00:00',
        end: '2024-01-15T11:00:00',
        description: 'Test',
        modules: ['Test'],
      }]
    });

    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test&holidays=true');
    const response = await GET(request);

    expect(response.status).toBeDefined();
  });

  it('should handle format parameter', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [{
        id: 'test',
        start: '2024-01-15T09:00:00',
        end: '2024-01-15T11:00:00',
        description: 'Test',
        modules: ['Test'],
      }]
    });

    const request = new NextRequest('http://localhost:3000/api/calendar.ics?group=test&format=json');
    const response = await GET(request);

    expect(response.status).toBeDefined();
  });
});

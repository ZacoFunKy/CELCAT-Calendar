# Testing Documentation

## Test Suite Overview

This project uses **Jest 30.2.0** as the testing framework with comprehensive test coverage for the CELCAT Calendar ICS API.

### Current Test Coverage

```
Coverage Summary (calendar.ics module):
----------|---------|----------|---------|---------|
File      | % Stmts | % Branch | % Funcs | % Lines |
----------|---------|----------|---------|---------|
cache.js  |   96.55% |      92% |    100% |  96.55% |
route.js  |   69.84% |   45.18% |  82.35% |  74.26% |
utils.js  |   88.23% |   75.81% |  94.44% |  91.24% |
----------|---------|----------|---------|---------|
Total     |   81.05% |   65.86% |  91.11% |  84.15% |
----------|---------|----------|---------|---------|
```

### Test Suites

#### 1. Route Tests (`app/api/calendar.ics/__tests__/route.test.js`)
**13 tests** covering the main API endpoint

**Test Categories:**
- **Error Handling**: 404 (group not found), 400 (invalid groups), 500 (network errors)
- **ICS Format Validation**: RFC 5545 compliance, VCALENDAR structure, VTIMEZONE, VEVENT components
- **Multiple Groups**: Handling 2 groups, 10+ groups, data merging
- **JSON Format**: Alternative output format with proper structure
- **Holiday Handling**: Filtering with showHolidays parameter

**Key Features Tested:**
- Query parameter parsing (`groups`, `format`, `showHolidays`)
- CELCAT API integration with error handling
- ICS file generation with ical-generator
- Event processing and customization
- Caching and performance
- Proper HTTP status codes and content types

#### 2. Utils Tests (`app/api/calendar.ics/__tests__/utils.test.js`)
**29 tests** covering utility functions

**Functions Tested:**
- `formatDate()`: Date formatting to YYYY-MM-DD
- `getFullAcademicYear()`: Academic year calculation (August start)
- `cleanDescriptionText()`: HTML cleaning, entity conversion, whitespace handling
- `processEvent()`: Event validation, type detection (CM/TD/TP), professor extraction, holiday filtering
- `applyCustomizations()`: Hidden rules, custom names, renaming, type mappings
- `CONFIG`: Validation of configuration constants

**Test Scenarios:**
- Edge cases: null/undefined inputs, empty strings, malformed data
- Event type detection: CM (cours magistral), TD (travaux dirigés), TP Machine
- Blacklist filtering: DSPEG and other excluded events
- Holiday processing: All-day events, showHolidays flag
- Customization priorities: Custom names > renaming rules > type mappings

#### 3. Cache Tests (`app/api/calendar.ics/__tests__/cache.test.js`)
**21 tests** covering caching system

**Functions Tested:**
- `getCachedGroupData()`: Retrieval with expiration
- `setCachedGroupData()`: Storage with LRU eviction
- `trackGroupRequest()`: Request frequency tracking
- `shouldPreload()`: Popularity threshold (5+ requests)
- `getPopularGroups()`: Sorted list of popular groups
- `pruneCache()`: Expiration cleanup (1h cache TTL, 24h stats TTL)
- `clearAllCaches()`: Full cache reset

**Test Scenarios:**
- Cache lifecycle: Store → Retrieve → Expire
- LRU eviction: MAX_CACHE_SIZE (50 groups)
- Request tracking: Multiple groups, frequency counters
- Preloading logic: PRELOAD_THRESHOLD (5 requests)
- TTL enforcement: 1 hour cache, 24 hour statistics
- Concurrent access: Multiple simultaneous requests

## Running Tests

### Run all tests
```bash
npm test
```

### Run specific test suite
```bash
npm test -- app/api/calendar.ics/__tests__/route.test.js
npm test -- app/api/calendar.ics/__tests__/utils.test.js
npm test -- app/api/calendar.ics/__tests__/cache.test.js
```

### Run with coverage
```bash
npm test -- --coverage
```

### Run in watch mode (development)
```bash
npm test -- --watch
```

### Clear Jest cache
```bash
npx jest --clearCache
```

## Test Configuration

### Jest Setup (`jest.config.js`)
```javascript
{
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  collectCoverageFrom: [
    'app/**/*.{js,jsx}',
    'components/**/*.{js,jsx}',
    'lib/**/*.{js,jsx}',
    '!**/*.test.{js,jsx}',
    '!**/node_modules/**'
  ]
}
```

### Test Environment Variables (`.env.test`)
```
MONGODB_URI=mongodb://localhost:27017/test
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=test-secret-key-for-testing-only
NODE_ENV=test
```

## Mocking Strategy

### External APIs
- **CELCAT API**: Mocked with `global.fetch`
- **MongoDB**: Connection skipped in test environment via `JEST_WORKER_ID` check
- **NextAuth**: User model mocked with in-memory data

### Example Mock Setup
```javascript
global.fetch = jest.fn((url) => {
  if (url.includes('test-group')) {
    return Promise.resolve({
      ok: true,
      json: async () => mockCelcatData
    });
  }
  return Promise.reject(new Error('Network error'));
});
```

## Test Best Practices

### 1. Isolation
Each test is independent with proper setup/teardown:
```javascript
beforeEach(() => {
  jest.clearAllMocks();
  clearAllCaches();
});
```

### 2. Realistic Data
Tests use realistic event structures matching CELCAT API format:
```javascript
{
  id: 'event-123',
  start: '2025-01-15T09:00:00',
  end: '2025-01-15T11:00:00',
  description: 'CM - Mathématiques\nProf Dupont\nAmphi A',
  modules: ['Mathématiques'],
  eventCategory: 'Cours'
}
```

### 3. RFC Compliance
ICS format tests validate against RFC 5545 using ical.js:
```javascript
const parsed = ICAL.parse(icsContent);
const comp = new ICAL.Component(parsed);
expect(comp.name).toBe('vcalendar');
```

### 4. Error Scenarios
Comprehensive error testing:
- Network failures
- Invalid input data
- Missing required fields
- Malformed responses

## CI/CD Integration

### GitHub Actions Workflow (`.github/workflows/ci.yml`)
```yaml
- name: Run tests
  run: npm test
  env:
    MONGODB_URI: ${{ secrets.MONGODB_URI }}
    NEXTAUTH_URL: http://localhost:3000
    NEXTAUTH_SECRET: test-secret
```

### Pre-commit Checks
Tests run automatically:
1. On every commit (local)
2. On pull requests (CI)
3. Before deployment (CD)

## Known Issues & Workarounds

### Category Validation Errors
Some tests show expected error logs for empty eventType categories:
```
[ERROR] Failed to set category for eventType: "CM"
```
This is expected behavior - errors are caught gracefully and don't break functionality.

### Jest Cache
If tests show stale results:
```bash
npx jest --clearCache && npm test
```

### MongoDB Connection in Tests
Database connections are automatically skipped when `JEST_WORKER_ID` is present.

## Future Improvements

### Priority 1: Route.js Coverage
- Add tests for notification system
- Test user authentication flows
- Cover schedule change detection

### Priority 2: Performance Tests
- Benchmark cache effectiveness
- Test concurrent request handling
- Measure response times

### Priority 3: Integration Tests
- End-to-end ICS subscription flow
- Calendar app compatibility (Google, Apple, Outlook)
- Multi-user scenarios

## Debugging Tests

### Enable verbose output
```bash
npm test -- --verbose
```

### Run single test
```bash
npm test -- -t "should return 404 for non-existent group"
```

### Debug with Node inspector
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure >80% coverage for new code
3. Update this documentation
4. Run full test suite before committing

## Resources

- [Jest Documentation](https://jestjs.io/)
- [ical-generator API](https://github.com/sebbo2002/ical-generator)
- [ical.js Documentation](https://mozilla-comm.github.io/ical.js/)
- [RFC 5545 (iCalendar)](https://tools.ietf.org/html/rfc5545)

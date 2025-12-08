// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Reduce noisy logs in test runs
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'warn';

// Polyfill fetch for Node.js environment if needed
// In Node 18+, fetch is available globally, but we still need to set up mocking
if (typeof global.fetch === 'undefined') {
  console.log('Fetch not defined, creating mock');
  global.fetch = jest.fn();
} else {
  console.log('Fetch already defined:', typeof global.fetch);
}
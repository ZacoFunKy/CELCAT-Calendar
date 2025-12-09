/**
 * @fileoverview Centralized logger with structured logging and log levels
 * Provides consistent logging across the application with configurable verbosity
 * 
 * @module lib/logger
 */

import { APP_CONFIG } from './config.js';

/**
 * Log levels in order of severity
 */
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

/**
 * Get numeric log level
 * @param {string} level - Log level string
 * @returns {number} Numeric log level
 */
function getLogLevelValue(level) {
  return LOG_LEVELS[level] ?? LOG_LEVELS.warn;
}

/**
 * Current log level from configuration
 */
const currentLogLevel = getLogLevelValue(APP_CONFIG.logLevel);

/**
 * Format log message with timestamp and context
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} [context] - Additional context
 * @returns {string} Formatted log message
 */
function formatLogMessage(level, message, context) {
  const timestamp = new Date().toISOString();
  const levelStr = level.toUpperCase().padEnd(5);
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${levelStr}] ${message}${contextStr}`;
}

/**
 * Logger class with configurable log levels
 */
class Logger {
  /**
   * Create a logger instance
   * @param {string} [namespace] - Optional namespace for this logger
   */
  constructor(namespace) {
    this.namespace = namespace;
  }

  /**
   * Add namespace prefix to message if set
   * @param {string} message - Original message
   * @returns {string} Message with namespace
   * @private
   */
  _addNamespace(message) {
    return this.namespace ? `[${this.namespace}] ${message}` : message;
  }

  /**
   * Log debug message (most verbose)
   * @param {string} message - Log message
   * @param {Object} [context] - Additional context
   */
  debug(message, context) {
    if (currentLogLevel <= LOG_LEVELS.debug) {
      console.debug(formatLogMessage('debug', this._addNamespace(message), context));
    }
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {Object} [context] - Additional context
   */
  info(message, context) {
    if (currentLogLevel <= LOG_LEVELS.info) {
      console.log(formatLogMessage('info', this._addNamespace(message), context));
    }
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {Object} [context] - Additional context
   */
  warn(message, context) {
    if (currentLogLevel <= LOG_LEVELS.warn) {
      console.warn(formatLogMessage('warn', this._addNamespace(message), context));
    }
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Error|Object} [error] - Error object or context
   */
  error(message, error) {
    if (currentLogLevel <= LOG_LEVELS.error) {
      const context = error instanceof Error 
        ? { message: error.message, stack: error.stack }
        : error;
      console.error(formatLogMessage('error', this._addNamespace(message), context));
    }
  }

  /**
   * Create a child logger with a namespace
   * @param {string} childNamespace - Child namespace
   * @returns {Logger} New logger instance
   */
  child(childNamespace) {
    const newNamespace = this.namespace 
      ? `${this.namespace}:${childNamespace}`
      : childNamespace;
    return new Logger(newNamespace);
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Create a namespaced logger
 * @param {string} namespace - Namespace for the logger
 * @returns {Logger} New logger instance
 */
export function createLogger(namespace) {
  return new Logger(namespace);
}

/**
 * Performance timing utility
 */
export class PerformanceTimer {
  constructor(label) {
    this.label = label;
    this.start = Date.now();
  }

  /**
   * End timer and log duration
   * @param {Logger} [loggerInstance] - Logger to use
   * @returns {number} Duration in milliseconds
   */
  end(loggerInstance = logger) {
    const duration = Date.now() - this.start;
    loggerInstance.debug(`${this.label} completed`, { duration: `${duration}ms` });
    return duration;
  }
}

/**
 * Start a performance timer
 * @param {string} label - Timer label
 * @returns {PerformanceTimer} Timer instance
 */
export function startTimer(label) {
  return new PerformanceTimer(label);
}

export default logger;

/**
 * @fileoverview Custom error classes for better error handling
 * Provides structured errors with proper types and context
 * 
 * @module lib/errors
 */

/**
 * Base application error
 * @extends Error
 */
export class AppError extends Error {
  /**
   * Create an application error
   * @param {string} message - Error message
   * @param {number} [statusCode=500] - HTTP status code
   * @param {Object} [context] - Additional context
   */
  constructor(message, statusCode = 500, context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.context = context;
    this.isOperational = true; // Distinguishes operational errors from programming errors
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON response
   * @param {boolean} [includeStack=false] - Include stack trace
   * @returns {Object} JSON representation
   */
  toJSON(includeStack = false) {
    const json = {
      error: this.message,
      type: this.name,
      ...this.context,
    };

    if (includeStack && process.env.NODE_ENV !== 'production') {
      json.stack = this.stack;
    }

    return json;
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message, context = {}) {
    super(message, 400, context);
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', context = {}) {
    super(message, 401, context);
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Access denied', context = {}) {
    super(message, 403, context);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', context = {}) {
    super(message, 404, context);
  }
}

/**
 * External API error (502)
 */
export class ExternalAPIError extends AppError {
  constructor(message, context = {}) {
    super(message, 502, context);
  }
}

/**
 * Cache error (500)
 */
export class CacheError extends AppError {
  constructor(message, context = {}) {
    super(message, 500, { ...context, type: 'cache' });
  }
}

/**
 * Database error (500)
 */
export class DatabaseError extends AppError {
  constructor(message, context = {}) {
    super(message, 500, { ...context, type: 'database' });
  }
}

/**
 * Service unavailable error (503)
 */
export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable', context = {}) {
    super(message, 503, context);
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests', context = {}) {
    super(message, 429, context);
  }
}

/**
 * Check if error is operational (expected) vs programming error (bug)
 * @param {Error} error - Error to check
 * @returns {boolean} True if operational error
 */
export function isOperationalError(error) {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Error handler middleware for Next.js API routes
 * @param {Error} error - Error to handle
 * @param {Object} [logger] - Logger instance
 * @returns {Response} Next.js response
 */
export function handleAPIError(error, logger) {
  // Log error
  if (logger) {
    if (isOperationalError(error)) {
      logger.warn('Operational error occurred', {
        message: error.message,
        statusCode: error.statusCode,
        context: error.context,
      });
    } else {
      logger.error('Unexpected error occurred', error);
    }
  }

  // For AppError instances, use their statusCode and message
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: error.toJSON(process.env.NODE_ENV !== 'production'),
    };
  }

  // For unknown errors, return generic 500
  return {
    statusCode: 500,
    body: {
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message,
      type: 'InternalError',
    },
  };
}

/**
 * Wrap async function to catch errors and pass to handler
 * @param {Function} fn - Async function to wrap
 * @param {Object} [logger] - Logger instance
 * @returns {Function} Wrapped function
 */
export function asyncHandler(fn, logger) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      const { statusCode, body } = handleAPIError(error, logger);
      const { NextResponse } = await import('next/server');
      return NextResponse.json(body, { status: statusCode });
    }
  };
}

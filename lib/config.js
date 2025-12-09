/**
 * @fileoverview Centralized configuration for the CELCAT Calendar application
 * This file contains all environment variables, constants, and configuration settings
 * in one place to improve maintainability and reduce coupling.
 * 
 * @module lib/config
 */

// ==========================================
// HELPERS
// ==========================================

/**
 * Safely parse JSON environment variable
 * @param {string} key - Environment variable key
 * @param {Array} defaultValue - Default value if parsing fails
 * @returns {Array} Parsed array or default
 */
const getEnvArray = (key, defaultValue = []) => {
  try {
    return process.env[key] ? JSON.parse(process.env[key]) : defaultValue;
  } catch (error) {
    console.warn(`Failed to parse ${key}, using default:`, error.message);
    return defaultValue;
  }
};

/**
 * Safely parse JSON object environment variable
 * @param {string} key - Environment variable key
 * @param {Object} defaultValue - Default value if parsing fails
 * @returns {Object} Parsed object or default
 */
const getEnvObject = (key, defaultValue = {}) => {
  try {
    return process.env[key] ? JSON.parse(process.env[key]) : defaultValue;
  } catch (error) {
    console.warn(`Failed to parse ${key}, using default:`, error.message);
    return defaultValue;
  }
};

/**
 * Get integer environment variable with default
 * @param {string} key - Environment variable key
 * @param {number} defaultValue - Default value
 * @returns {number} Parsed integer or default
 */
const getEnvInt = (key, defaultValue) => {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Get boolean environment variable with default
 * @param {string} key - Environment variable key
 * @param {boolean} defaultValue - Default value
 * @returns {boolean} Parsed boolean or default
 */
const getEnvBool = (key, defaultValue) => {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
};

// ==========================================
// APPLICATION CONFIGURATION
// ==========================================

export const APP_CONFIG = {
  name: 'CELCAT Calendar',
  version: '2.0.0',
  timezone: 'Europe/Paris',
  
  // Academic year configuration
  academicYearStartMonth: 8, // August (0-indexed: 7)
  academicYearEndMonth: 8,   // Next August
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'warn', // 'debug', 'info', 'warn', 'error'
  
  // Feature flags
  features: {
    notifications: getEnvBool('FEATURE_NOTIFICATIONS', true),
    caching: getEnvBool('FEATURE_CACHING', true),
    rateLimiting: getEnvBool('FEATURE_RATE_LIMITING', true),
  }
};

// ==========================================
// CELCAT API CONFIGURATION
// ==========================================

export const CELCAT_CONFIG = {
  // API endpoint
  url: process.env.CELCAT_URL || 'https://celcat.u-bordeaux.fr/Calendar/Home/GetCalendarData',
  
  // Request configuration
  timeout: getEnvInt('CELCAT_TIMEOUT', 6000),
  maxRetries: getEnvInt('CELCAT_MAX_RETRIES', 3),
  initialBackoff: getEnvInt('CELCAT_INITIAL_BACKOFF', 500),
  maxBackoff: getEnvInt('CELCAT_MAX_BACKOFF', 5000),
  
  // Validation
  groupRegex: /^[a-zA-Z0-9\s\-\_\.\(\)\,\/:'àâäçèéêëîïôöùûüÀÂÄÇÈÉÊËÎÏÔÖÙÛÜ]+$/,
  
  // Content filtering
  blacklist: getEnvArray('CELCAT_BLACKLIST', ['DSPEG', 'Cours DSPEG']),
  replacements: getEnvObject('CELCAT_REPLACEMENTS', { 'Test': '💻' }),
};

// ==========================================
// CACHE CONFIGURATION
// ==========================================

export const CACHE_CONFIG = {
  // Redis connection
  redis: {
    url: process.env.REDIS_URL || '',
    enabled: !!process.env.REDIS_URL,
    
    // Connection pool
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    commandTimeout: 3000,
    enableAutoPipelining: true,
    
    // Circuit breaker
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
    }
  },
  
  // TTL configuration (in seconds)
  ttl: {
    fresh: getEnvInt('CACHE_TTL_FRESH', 7200),        // 2 hours
    stale: getEnvInt('CACHE_TTL_STALE', 86400),       // 24 hours
    memory: getEnvInt('CACHE_TTL_MEMORY', 300),       // 5 minutes
    stats: getEnvInt('CACHE_TTL_STATS', 60),          // 1 minute
  },
  
  // Memory cache limits
  memory: {
    maxEntries: getEnvInt('MEMORY_CACHE_MAX_ENTRIES', 100),
    pruneThreshold: getEnvInt('MEMORY_CACHE_PRUNE_THRESHOLD', 120),
  },
  
  // Tracking
  tracking: {
    enabled: getEnvBool('CACHE_TRACKING_ENABLED', true),
    ttl: getEnvInt('CACHE_TRACKING_TTL', 3600), // 1 hour
  }
};

// ==========================================
// DATABASE CONFIGURATION
// ==========================================

export const DB_CONFIG = {
  mongodb: {
    uri: process.env.MONGODB_URI || '',
    options: {
      maxPoolSize: getEnvInt('MONGODB_POOL_SIZE', 10),
      serverSelectionTimeoutMS: getEnvInt('MONGODB_TIMEOUT', 5000),
    }
  }
};

// ==========================================
// AUTHENTICATION CONFIGURATION
// ==========================================

export const AUTH_CONFIG = {
  nextAuth: {
    secret: process.env.NEXTAUTH_SECRET,
    url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },
  
  session: {
    maxAge: getEnvInt('SESSION_MAX_AGE', 30 * 24 * 60 * 60), // 30 days
  },
  
  token: {
    length: 64, // bytes for random token
  }
};

// ==========================================
// NOTIFICATION CONFIGURATION
// ==========================================

export const NOTIFICATION_CONFIG = {
  webPush: {
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',
    vapidSubject: process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  },
  
  checkInterval: getEnvInt('NOTIFICATION_CHECK_INTERVAL', 3600000), // 1 hour
  enabled: getEnvBool('NOTIFICATIONS_ENABLED', false),
};

// ==========================================
// RATE LIMITING CONFIGURATION
// ==========================================

export const RATE_LIMIT_CONFIG = {
  // Window size in seconds
  windowSize: getEnvInt('RATE_LIMIT_WINDOW', 60),
  
  // Maximum requests per window
  maxRequests: getEnvInt('RATE_LIMIT_MAX', 100),
  
  // IP-based rate limiting
  ipLimits: {
    windowSize: getEnvInt('RATE_LIMIT_IP_WINDOW', 60),
    maxRequests: getEnvInt('RATE_LIMIT_IP_MAX', 30),
  },
  
  // Enabled only in production
  enabled: process.env.NODE_ENV === 'production' && getEnvBool('RATE_LIMITING_ENABLED', true),
};

// ==========================================
// CALENDAR GENERATION CONFIGURATION
// ==========================================

export const CALENDAR_CONFIG = {
  // iCalendar metadata
  name: 'CELCAT Calendar',
  description: 'Emploi du temps généré depuis CELCAT',
  timezone: APP_CONFIG.timezone,
  ttl: parseInt(process.env.CACHE_TTL || '3600'),
  prodId: {
    company: 'CELCAT Calendar',
    product: 'Calendar Feed',
  },
  
  // Event filtering
  blacklist: getEnvArray('CELCAT_BLACKLIST', ['DSPEG', 'Cours DSPEG']),
  replacements: getEnvObject('CELCAT_REPLACEMENTS', { 'Test': '💻' }),
  
  // Default event types and colors
  eventTypes: {
    CM: { label: 'Cours Magistral', color: '#3788d8' },
    TD: { label: 'Travaux Dirigés', color: '#22c55e' },
    TP: { label: 'Travaux Pratiques', color: '#f59e0b' },
    Exam: { label: 'Examen', color: '#ef4444' },
    Other: { label: 'Autre', color: '#8b5cf6' },
  },
  
  // Holidays configuration
  holidayColor: '#FF0000',
  holidayCategory: 'Vacances',
};

// ==========================================
// API RESPONSE CONFIGURATION
// ==========================================

export const API_CONFIG = {
  // Timeouts
  timeout: getEnvInt('API_TIMEOUT', 10000),
  
  // Response headers
  headers: {
    'Content-Type': 'text/calendar; charset=utf-8',
    'Content-Disposition': 'attachment; filename="calendar.ics"',
  },
  
  // CORS
  cors: {
    allowedOrigins: getEnvArray('CORS_ALLOWED_ORIGINS', ['*']),
  },
};

// ==========================================
// ERROR MESSAGES
// ==========================================

export const ERROR_MESSAGES = {
  // User-facing errors (French)
  user: {
    serviceUnavailable: 'Service indisponible',
    invalidToken: 'Token invalide ou expiré',
    noGroups: 'Aucun groupe configuré',
    noCourses: 'Aucun cours trouvé',
    invalidGroup: 'Groupe invalide',
    fetchFailed: 'Échec de récupération des données',
  },
  
  // Internal errors (English for logs)
  internal: {
    redisConnectionFailed: 'Failed to connect to Redis',
    mongoConnectionFailed: 'Failed to connect to MongoDB',
    celcatApiFailed: 'CELCAT API request failed',
    cacheWriteFailed: 'Failed to write to cache',
    invalidConfiguration: 'Invalid configuration',
  }
};

// ==========================================
// VALIDATION
// ==========================================

/**
 * Validate that all required configuration is present
 * @throws {Error} If required configuration is missing
 */
export function validateConfig() {
  const required = [
    { name: 'NEXTAUTH_SECRET', value: AUTH_CONFIG.nextAuth.secret },
    { name: 'MONGODB_URI', value: DB_CONFIG.mongodb.uri },
  ];
  
  const missing = required.filter(({ value }) => !value);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.map(m => m.name).join(', ')}`
    );
  }
  
  // Warn about optional but recommended config
  if (!CACHE_CONFIG.redis.url) {
    console.warn('[CONFIG] REDIS_URL not set - caching will be memory-only');
  }
  
  if (!NOTIFICATION_CONFIG.webPush.vapidPublicKey) {
    console.warn('[CONFIG] VAPID keys not set - notifications will be disabled');
  }
}

// ==========================================
// EXPORTS
// ==========================================

export default {
  app: APP_CONFIG,
  celcat: CELCAT_CONFIG,
  cache: CACHE_CONFIG,
  db: DB_CONFIG,
  auth: AUTH_CONFIG,
  notification: NOTIFICATION_CONFIG,
  rateLimit: RATE_LIMIT_CONFIG,
  calendar: CALENDAR_CONFIG,
  api: API_CONFIG,
  errors: ERROR_MESSAGES,
  
  // Validation
  validate: validateConfig,
};

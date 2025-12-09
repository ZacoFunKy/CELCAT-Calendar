/**
 * @fileoverview Authentication and preferences handler
 * Handles token-based authentication and user preference loading
 */

import dbConnect from '../../../../lib/db.js';
import User from '../../../../models/User.js';
import UserPreference from '../../../../models/UserPreference.js';
import { createLogger } from '../../../../lib/logger.js';

const logger = createLogger('Auth');

/**
 * Load user preferences from token
 * @param {string} token - User calendar token
 * @returns {Promise<Object|null>} User preferences or null
 */
export async function loadUserPreferences(token) {
  if (!token) return null;

  try {
    await dbConnect();
    const user = await User.findOne({ calendarToken: token });

    if (!user) {
      logger.debug('Token not found', { token: token.substring(0, 10) + '...' });
      return null;
    }

    const prefs = await UserPreference.findOne({ userId: user._id });
    
    if (!prefs) {
      logger.debug('User has no preferences', { userId: user._id });
      return {
        userId: user._id,
        groups: [],
        settings: {},
        hiddenEvents: [],
        colorMap: new Map(),
      };
    }

    // Normalize preferences
    const colorMap = prefs.colorMap instanceof Map 
      ? prefs.colorMap 
      : new Map(Object.entries(prefs.colorMap || {}));

    const customNames = prefs.settings?.customNames || new Map();
    const hiddenRules = prefs.settings?.hiddenRules || [];
    const renamingRules = prefs.settings?.renamingRules || [];

    logger.info('Loaded user preferences', { 
      userId: user._id, 
      groupCount: prefs.groups?.length || 0 
    });

    return {
      userId: user._id,
      groups: prefs.groups || [],
      showHolidays: prefs.settings?.showHolidays ?? false,
      hiddenEvents: prefs.hiddenEvents || [],
      colorMap,
      customNames,
      hiddenRules,
      renamingRules,
    };
  } catch (error) {
    logger.error('Failed to load preferences', { error: error.message });
    return null;
  }
}

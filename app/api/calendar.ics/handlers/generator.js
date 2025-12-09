/**
 * @fileoverview Calendar generators (ICS and JSON formats)
 * Handles generation of calendar responses in different formats
 */

import ical from 'ical-generator';
import { processEvent, applyCustomizations } from '../utils.js';
import { createLogger } from '../../../../lib/logger.js';
import { CALENDAR_CONFIG } from '../../../../lib/config.js';

const logger = createLogger('CalendarGenerator');

/**
 * Generate ICS calendar from events
 * @param {Array} events - Raw events from CELCAT
 * @param {Array} groupLabels - Group display names
 * @param {Object} options - Generation options
 * @returns {Object} {icsContent: string, eventCount: number}
 */
export function generateICS(events, groupLabels, options = {}) {
  const {
    showHolidays = false,
    hiddenEvents = [],
    customNames = new Map(),
    colorMap = new Map(),
    hiddenRules = [],
    renamingRules = new Map(),
  } = options;

  const calendar = ical({
    name: `EDT - ${groupLabels.join('+')}`,
    timezone: CALENDAR_CONFIG.timezone,
    ttl: CALENDAR_CONFIG.ttl
  });

  let realCourseCount = 0;
  const processedEventIds = new Set();

  events.forEach((rawEvent) => {
    if (!rawEvent || !rawEvent.id) return;
    if (processedEventIds.has(rawEvent.id)) return;

    // Skip hidden events (ID based)
    if (hiddenEvents.includes(rawEvent.id)) return;

    const event = processEvent(rawEvent, { showHolidays });
    if (!event) return;

    // Apply customizations (rules, renaming)
    const customizedEvent = applyCustomizations(event, {
      customNames,
      typeMappings: null, // Not used in ICS generation
      renamingRules,
      hiddenRules
    });

    if (!customizedEvent) return; // Hidden by rule

    if (!customizedEvent.isHoliday) realCourseCount++;

    // Ensure eventType is valid
    let eventType = customizedEvent.eventType;
    if (!eventType || typeof eventType !== 'string' || eventType.trim() === '') {
      eventType = 'Other';
    } else {
      eventType = eventType.trim();
    }

    const color = colorMap.get(eventType);

    const icalEvent = calendar.createEvent({
      id: customizedEvent.id,
      start: customizedEvent.start,
      end: customizedEvent.end,
      summary: customizedEvent.summary,
      description: customizedEvent.description,
      location: customizedEvent.location,
      timezone: CALENDAR_CONFIG.timezone,
      allDay: customizedEvent.allDay
    });

    // Add categories for coloring
    icalEvent.categories([{ name: eventType }]);

    // Add custom color if available
    if (color) {
      icalEvent.x('X-COLOR', color);
      icalEvent.x('X-APPLE-CALENDAR-COLOR', color);
    }

    processedEventIds.add(rawEvent.id);
  });

  logger.info('Generated ICS calendar', { 
    totalEvents: events.length,
    processedEvents: realCourseCount,
    groups: groupLabels 
  });

  return {
    icsContent: calendar.toString(),
    eventCount: realCourseCount
  };
}

/**
 * Generate JSON calendar from events
 * @param {Array} events - Raw events from CELCAT
 * @param {Object} options - Generation options
 * @returns {Array} Processed events as JSON
 */
export function generateJSON(events, options = {}) {
  const {
    showHolidays = false,
    hiddenEvents = [],
    customNames = new Map(),
    colorMap = new Map(),
    hiddenRules = [],
    renamingRules = new Map(),
  } = options;

  const processedEvents = [];
  const processedEventIds = new Set();

  events.forEach((rawEvent) => {
    if (!rawEvent || !rawEvent.id) return;

    // Deduplicate
    if (processedEventIds.has(rawEvent.id)) return;
    processedEventIds.add(rawEvent.id);

    // Skip hidden events (ID based)
    if (hiddenEvents.includes(rawEvent.id)) return;

    // Process with filters
    const processed = processEvent(rawEvent, { showHolidays });
    if (!processed) return;

    // Apply customizations (rules, renaming)
    const customized = applyCustomizations(processed, {
      customNames,
      typeMappings: null, // Not used in JSON generation
      renamingRules,
      hiddenRules
    });

    if (!customized) return; // Hidden by rule

    processedEvents.push({
      id: customized.id,
      start: customized.start,
      end: customized.end,
      summary: customized.summary,
      description: customized.description || '',
      location: customized.location || '',
      eventType: customized.eventType || '',
      color: colorMap.get(customized.eventType) || '',
    });
  });

  logger.info('Generated JSON calendar', { 
    totalEvents: events.length,
    processedEvents: processedEvents.length 
  });

  return processedEvents;
}

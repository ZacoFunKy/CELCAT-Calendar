/**
 * Push Notifications Module
 * Detects changes in schedules and sends notifications
 * For now, this is a simple implementation that sends notifications to the developer
 */

// Store previous schedule hashes to detect changes
const scheduleHashes = new Map();

/**
 * Generate a hash of a schedule for change detection
 */
function hashSchedule(events) {
  if (!events || events.length === 0) {
    return 'empty';
  }
  
  // Create a simple hash based on event IDs, start times, and descriptions
  const eventSignature = events
    .map(e => `${e.id}-${e.start}-${e.description}`)
    .sort()
    .join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < eventSignature.length; i++) {
    const char = eventSignature.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return hash.toString(36);
}

/**
 * Check if schedule has changed and send notification if needed
 */
export function checkScheduleChanges(groupName, events) {
  const newHash = hashSchedule(events);
  const previousHash = scheduleHashes.get(groupName);
  
  if (previousHash && previousHash !== newHash) {
    // Schedule has changed!
    return {
      changed: true,
      groupName,
      previousHash,
      newHash,
      eventCount: events.length,
    };
  }
  
  // Store current hash
  scheduleHashes.set(groupName, newHash);
  
  return {
    changed: false,
    groupName,
    hash: newHash,
  };
}

/**
 * Send push notification
 * For now, this logs the notification (developer will receive it via logs)
 * In the future, this can be extended to use services like FCM, OneSignal, etc.
 */
export async function sendPushNotification(notification) {
  const { groupName, eventCount } = notification;
  
  // Log for developer
  console.log('🔔 PUSH NOTIFICATION:', JSON.stringify({
    type: 'schedule_change',
    message: `Schedule changed for ${groupName}`,
    details: {
      group: groupName,
      events: eventCount,
      timestamp: new Date().toISOString(),
    }
  }));
  
  // If webhook URL is configured, send notification there
  const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `📅 Schedule Update: ${groupName} has ${eventCount} events`,
          timestamp: new Date().toISOString(),
          group: groupName,
        }),
      });
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
    }
  }
  
  return true;
}

/**
 * Clear schedule history (for testing or admin purposes)
 */
export function clearScheduleHistory() {
  scheduleHashes.clear();
}

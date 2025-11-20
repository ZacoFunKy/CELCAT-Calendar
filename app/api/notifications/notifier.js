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
 * Sends notifications for downloads, refreshes, and schedule changes
 */
export async function sendPushNotification(notification) {
  const { groupName, eventCount, type = 'download' } = notification;
  
  // Determine message based on notification type
  let message;
  let emoji;
  switch (type) {
    case 'schedule_change':
      message = `Modification détectée pour ${groupName}`;
      emoji = '🔄';
      break;
    case 'refresh':
      message = `Actualisation du calendrier ${groupName}`;
      emoji = '🔄';
      break;
    case 'download':
    default:
      message = `Téléchargement du calendrier ${groupName}`;
      emoji = '📥';
      break;
  }
  
  // Log for developer
  console.log('🔔 PUSH NOTIFICATION:', JSON.stringify({
    type,
    message,
    details: {
      group: groupName,
      events: eventCount,
      timestamp: new Date().toISOString(),
    }
  }));
  
  // If webhook URL is configured, send notification there
console.log('DEBUG - URL:', process.env.NOTIFICATION_WEBHOOK_URL);
const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `${emoji} ${message}`,
          timestamp: new Date().toISOString(),
          group: groupName,
          eventCount: eventCount || 0,
          type,
        }),
      });
      
      if (!response.ok) {
        console.error('Webhook response not OK:', response.status, await response.text());
      }
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

import { NextResponse } from 'next/server';
import { sendPushNotification } from '../notifier.js';

/**
 * API endpoint for testing push notifications
 * Requires admin authentication
 */
export async function POST(request) {
  try {
    // Simple authentication check
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.ADMIN_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Admin access not configured' }, 
        { status: 503 }
      );
    }
    
    if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const body = await request.json();
    const { groupName, message, eventCount } = body;

    if (!groupName) {
      return NextResponse.json(
        { error: 'groupName is required' }, 
        { status: 400 }
      );
    }

    // Send test notification
    await sendPushNotification({
      groupName,
      eventCount: eventCount || 0,
      test: true,
    });

    return NextResponse.json({
      success: true,
      message: `Test notification sent for ${groupName}`,
    });

  } catch (error) {
    console.error('Notification test error:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' }, 
      { status: 500 }
    );
  }
}

/**
 * Get notification settings and status
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.ADMIN_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Admin access not configured' }, 
        { status: 503 }
      );
    }
    
    if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    const webhookConfigured = !!process.env.NOTIFICATION_WEBHOOK_URL;

    return NextResponse.json({
      enabled: true,
      webhookConfigured,
      recipient: 'Developer (via logs and webhook)',
      features: [
        'Schedule change detection',
        'Automatic notifications on changes',
        'Webhook support for external integrations',
      ],
      instructions: {
        webhook: 'Set NOTIFICATION_WEBHOOK_URL environment variable to enable webhook notifications',
        testing: 'POST to this endpoint with groupName to test notifications',
      },
    });

  } catch (error) {
    console.error('Notification settings error:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' }, 
      { status: 500 }
    );
  }
}

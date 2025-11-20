import { NextResponse } from 'next/server';
import { getUsageStatistics, getPopularGroups } from '../../calendar.ics/cache.js';

/**
 * Admin API endpoint for viewing usage statistics
 * This endpoint requires authentication (basic implementation for now)
 */
export async function GET(request) {
  try {
    // Simple authentication check using API key
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.ADMIN_API_KEY;
    
    // If no API key is configured, deny access
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Admin access not configured' }, 
        { status: 503 }
      );
    }
    
    // Check authorization
    if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or missing API key' }, 
        { status: 401 }
      );
    }

    // Get statistics
    const stats = getUsageStatistics();
    const popularGroups = getPopularGroups(20);
    
    const totalRequests = Object.values(stats).reduce(
      (sum, group) => sum + group.requestCount, 
      0
    );

    return NextResponse.json({
      summary: {
        totalRequests,
        totalGroups: Object.keys(stats).length,
        timestamp: new Date().toISOString(),
      },
      popularGroups: popularGroups.map(g => ({
        name: g.name,
        requestCount: g.count,
        lastRequest: new Date(g.lastRequest).toISOString(),
      })),
      allGroups: stats,
    });

  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

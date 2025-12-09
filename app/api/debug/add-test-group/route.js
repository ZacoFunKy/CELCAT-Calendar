import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db.js';
import User from '../../../../models/User.js';
import UserPreference from '../../../../models/UserPreference.js';

/**
 * Add a test group to the user's preferences.
 * This is useful for debugging when groups aren't showing up.
 * Usage: POST /api/debug/add-test-group?token=YOUR_TOKEN&group=M1-S1-GrC
 */
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const group = searchParams.get('group') || 'M1-S1-GrC'; // Default test group

    if (!token) {
      return NextResponse.json({ error: 'Missing token parameter' }, { status: 400 });
    }

    await dbConnect();
    
    const user = await User.findOne({ calendarToken: token });
    if (!user) {
      return NextResponse.json({ error: 'User not found with this token' }, { status: 404 });
    }

    let prefs = await UserPreference.findOne({ userId: user._id });
    if (!prefs) {
      prefs = new UserPreference({ userId: user._id, groups: [] });
    }

    if (!prefs.groups.includes(group)) {
      prefs.groups.push(group);
      await prefs.save();
    }

    return NextResponse.json({
      message: `Added group "${group}" to user`,
      groups: prefs.groups,
      userId: user._id,
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

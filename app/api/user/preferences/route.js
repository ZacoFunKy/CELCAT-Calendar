import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import dbConnect from '../../../../lib/db';
import UserPreference from '../../../../models/UserPreference';
import User from '../../../../models/User';
import crypto from 'crypto';

export async function GET(request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    let prefs = await UserPreference.findOne({ userId: session.user.id });

    if (!prefs) {
        // Create default preferences if none exist
        prefs = await UserPreference.create({
            userId: session.user.id,
            groups: [],
            colorMap: {},
            hiddenEvents: [],
            theme: 'system',
        });
    }

    // Also fetch the calendar token
    const user = await User.findById(session.user.id).select('calendarToken');

    // Generate token if missing
    if (!user.calendarToken) {
        user.calendarToken = crypto.randomBytes(32).toString('hex');
        await user.save();
    }

    return NextResponse.json({
        preferences: prefs,
        calendarToken: user.calendarToken,
    });
}

export async function PUT(request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const data = await request.json();
        await dbConnect();

        const prefs = await UserPreference.findOneAndUpdate(
            { userId: session.user.id },
            {
                $set: {
                    groups: data.groups,
                    colorMap: data.colorMap || data.colors, // Handle both for backward compatibility
                    hiddenEvents: data.hiddenEvents,
                    theme: data.theme,
                    settings: data.settings,
                }
            },
            { new: true, upsert: true }
        );

        return NextResponse.json({ preferences: prefs });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    const session = await getServerSession(authOptions);

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await dbConnect();
        await UserPreference.findOneAndDelete({ userId: session.user.id });

        // Return default preferences structure so frontend can update immediately
        const defaultPrefs = {
            groups: [],
            colorMap: {},
            hiddenEvents: [],
            theme: 'system',
            settings: {
                showHolidays: true,
                titleFormat: "{type} - {name}",
                customNames: {},
                typeMappings: {}
            }
        };

        return NextResponse.json({ preferences: defaultPrefs });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

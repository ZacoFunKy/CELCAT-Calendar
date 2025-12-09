import { NextResponse } from 'next/server';
import { clearInFlightRequests } from './route.js';
import { pruneCache } from './cache.js';

export async function POST(request) {
  try {
    clearInFlightRequests();
    pruneCache();
    return NextResponse.json({ message: 'Cache cleared' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

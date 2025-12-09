import { NextResponse } from 'next/server';
import { pruneCache, clearAllCaches } from '../cache.js';

export async function POST(request) {
  try {
    clearAllCaches();
    return NextResponse.json({ message: 'Cache cleared' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

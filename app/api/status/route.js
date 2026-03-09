import { NextResponse } from 'next/server';

export const revalidate = 60;

export async function GET() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch('https://celcat.u-bordeaux.fr/Calendar/Home/Index', {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (U-Bordeaux Status Check)'
      }
    });

    clearTimeout(timeoutId);
    return NextResponse.json({ online: res.ok });

  } catch (error) {
    clearTimeout(timeoutId);
    return NextResponse.json({ online: false });
  }
}

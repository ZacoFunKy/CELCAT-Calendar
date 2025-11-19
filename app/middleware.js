import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Si tu n'as pas configuré Redis, le middleware laisse passer (mode fail-open)
const redis = process.env.UPSTASH_REDIS_REST_URL 
  ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
  : null;

const ratelimit = redis 
  ? new Ratelimit({ redis: redis, limiter: Ratelimit.slidingWindow(15, '60 s') }) // 15 req / min
  : null;

export async function middleware(request) {
  if (!request.nextUrl.pathname.startsWith('/api/calendar')) return NextResponse.next();

  // Si Redis n'est pas là, on skip la protection (ou on met une protection basique)
  if (!ratelimit) return NextResponse.next();

  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  
  try {
    const { success } = await ratelimit.limit(ip);
    
    if (!success) {
      return new NextResponse(JSON.stringify({ error: "Trop de requêtes" }), { 
        status: 429, headers: { 'Content-Type': 'application/json' } 
      });
    }
  } catch (e) {
    console.error("Erreur Rate Limit", e);
  }

  return NextResponse.next();
}

export const config = { matcher: '/api/calendar/:path*' };
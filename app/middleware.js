import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export async function middleware(req) {
  const path = req.nextUrl.pathname;

  // 1. Authentication Check (Protect Dashboard & User API)
  if (path.startsWith('/dashboard') || path.startsWith('/api/user')) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const url = new URL('/login', req.url);
      url.searchParams.set('callbackUrl', encodeURI(req.url));
      return NextResponse.redirect(url);
    }
  }

  // 2. Rate Limiting (Only for Calendar API)
  if (path.startsWith('/api/calendar')) {
    // DEBUG : Vérifier les variables
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.error("❌ ERREUR CRITIQUE : Variables Redis manquantes !");
      return NextResponse.next();
    }

    try {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });

      const ratelimit = new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(10, '60 s'),
        analytics: true,
        prefix: "@upstash/ratelimit",
      });

      const ip = req.ip || req.headers.get('x-forwarded-for') || '127.0.0.1';
      const { success, limit, remaining } = await ratelimit.limit(ip);

      const response = success ? NextResponse.next() : new NextResponse(
        JSON.stringify({ error: "Trop de requêtes, calmez-vous !" }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );

      response.headers.set('X-RateLimit-Limit', limit.toString());
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      response.headers.set('X-RateLimit-IP', ip);

      return response;

    } catch (error) {
      console.error("❌ Erreur Redis Middleware:", error);
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/user/:path*',
    '/api/calendar/:path*'
  ],
};
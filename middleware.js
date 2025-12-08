import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Rate Limiter if Redis is available
// Initialize Rate Limiter if Redis is available
// Initialize Rate Limiter if Redis is available
let ratelimit = null;
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;

if (redisUrl && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
        // Middleware runs on Edge Runtime, which ONLY supports HTTP-based Redis (Upstash)
        // Standard Redis (TCP) is NOT supported in Edge Runtime.
        if (redisUrl.startsWith('http')) {
            const redis = new Redis({
                url: redisUrl,
                token: process.env.UPSTASH_REDIS_REST_TOKEN,
                retry: {
                    retries: 0, // Don't retry in middleware to avoid latency spikes
                }
            });

            ratelimit = new Ratelimit({
                redis: redis,
                limiter: Ratelimit.slidingWindow(100, '10 s'), // 100 requests per 10 seconds
                analytics: true,
            });
        } else {
            console.warn('Rate Limiter disabled: Middleware runs on Edge Runtime and requires an HTTP Redis URL (Upstash). Standard Redis (TCP) is not supported here.');
        }
    } catch (e) {
        console.warn('Rate Limiter disabled (Redis not configured or invalid):', e.message);
        ratelimit = null;
    }
}

export async function middleware(request) {
    const response = NextResponse.next();

    // 1. Security Headers
    const headers = response.headers;
    headers.set('X-DNS-Prefetch-Control', 'on');
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    headers.set('X-XSS-Protection', '1; mode=block');
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'origin-when-cross-origin');
    // Content-Security-Policy can be tricky with inline scripts/styles, so we'll be permissive for now but strict on object-src
    headers.set('Content-Security-Policy', "object-src 'none'; base-uri 'self';");

    // 2. Rate Limiting (API Routes only)
    if (request.nextUrl.pathname.startsWith('/api/') && ratelimit) {
        const ip = request.ip || '127.0.0.1';
        try {
            const { success, limit, reset, remaining } = await ratelimit.limit(ip);

            response.headers.set('X-RateLimit-Limit', limit.toString());
            response.headers.set('X-RateLimit-Remaining', remaining.toString());
            response.headers.set('X-RateLimit-Reset', reset.toString());

            if (!success) {
                return NextResponse.json(
                    { error: 'Too Many Requests' },
                    { status: 429, headers: response.headers }
                );
            }
        } catch (e) {
            console.error('Rate limit error:', e);
            // Fail open if rate limit fails
        }
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};

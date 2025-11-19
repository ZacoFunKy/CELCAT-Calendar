import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export async function middleware(request) {
  // 1. On filtre uniquement l'API calendar
  if (!request.nextUrl.pathname.startsWith('/api/calendar')) {
    return NextResponse.next();
  }

  // 2. DEBUG : Vérifier les variables
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.error("❌ ERREUR CRITIQUE : Variables Redis manquantes !");
    // On laisse passer pour ne pas casser le site, mais on log l'erreur
    return NextResponse.next();
  }

  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    // On utilise un prefixe visible pour le debug
    const ratelimit = new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      analytics: true,
      prefix: "@upstash/ratelimit", // Standard
    });

    // Récupération IP (Compatible Vercel/Localhost)
    const ip = request.ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
    
    console.log(`🔒 Rate Limit Check pour IP: ${ip}`);

    const { success, limit, remaining } = await ratelimit.limit(ip);
    
    // On ajoute les infos dans les headers de réponse pour que tu puisses vérifier dans ton navigateur
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
    return NextResponse.next(); // En cas d'erreur, on laisse passer
  }
}

export const config = {
  matcher: '/api/calendar/:path*',
};
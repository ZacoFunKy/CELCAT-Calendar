import { NextResponse } from 'next/server';

// ==========================================
// CONFIGURATION
// ==========================================
const CONFIG = {
  baseUrl: 'https://celcat.u-bordeaux.fr/Calendar/Home/ReadResourceListItems',
  // Durée du cache en millisecondes (60 secondes)
  CACHE_TTL: 60 * 1000,
  MAX_RESULTS: 15,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'X-Requested-With': 'XMLHttpRequest'
  }
};

const searchCache = new Map();

/**
 * Nettoyage périodique du cache (pour éviter fuite mémoire sur long terme)
 */
function pruneCache() {
  const now = Date.now();
  if (searchCache.size > 500) { // Seuil arbitraire de sécurité
    for (const [key, value] of searchCache.entries()) {
      if (now > value.expiry) searchCache.delete(key);
    }
    if (searchCache.size > 500) searchCache.clear();
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  // 1. Validation rapide
  if (!query || query.length < 3) {
    return NextResponse.json({ results: [] });
  }

  // Normalisation de la clé de cache (minuscules)
  const cacheKey = query.trim().toLowerCase();
  const now = Date.now();

  // 2. Vérification du Cache
  if (searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey);
    if (now < cached.expiry) {
      return NextResponse.json({ results: cached.data, cached: true });
    } else {
      searchCache.delete(cacheKey);
    }
  }

  try {
    const celcatUrl = `${CONFIG.baseUrl}?myResources=false&searchTerm=${encodeURIComponent(query)}&pageSize=${CONFIG.MAX_RESULTS + 5}&pageNumber=1&resType=103&_=${now}`;

    const res = await fetch(celcatUrl, {
      method: 'GET',
      headers: CONFIG.headers
    });

    if (!res.ok) {
      throw new Error(`Erreur Celcat: ${res.status}`);
    }

    const rawData = await res.json();

    const items = (rawData.results || [])
      .map(item => ({
        id: item.id,
        text: (item.text || "").replace(/<[^>]*>/g, '').trim() 
      }))
      .filter(item => item.id && item.text.length > 0)
      .slice(0, CONFIG.MAX_RESULTS);

    pruneCache(); // Petit nettoyage si besoin
    searchCache.set(cacheKey, {
      data: items,
      expiry: now + CONFIG.CACHE_TTL
    });

    return NextResponse.json({ results: items, cached: false });

  } catch (error) {
    console.error('[Search API Error]:', error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { createLogger } from '../../../lib/logger.js';
import { CELCAT_CONFIG } from '../../../lib/config.js';
import { ValidationError, ExternalAPIError } from '../../../lib/errors.js';

const logger = createLogger('Search');

// ==========================================
// CONFIGURATION
// ==========================================
const SEARCH_CONFIG = {
  baseUrl: 'https://celcat.u-bordeaux.fr/Calendar/Home/ReadResourceListItems',
  cacheTTL: 60 * 1000, // 60 seconds
  maxResults: 15,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
  if (searchCache.size > 500) {
    for (const [key, value] of searchCache.entries()) {
      if (now > value.expiry) searchCache.delete(key);
    }
    if (searchCache.size > 500) {
      searchCache.clear();
      logger.warn('Search cache cleared due to size limit');
    }
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
      logger.debug('Cache hit', { query: cacheKey });
      return NextResponse.json({ results: cached.data, cached: true });
    } else {
      searchCache.delete(cacheKey);
    }
  }

  try {
    const celcatUrl = `${SEARCH_CONFIG.baseUrl}?myResources=false&searchTerm=${encodeURIComponent(query)}&pageSize=${SEARCH_CONFIG.maxResults + 5}&pageNumber=1&resType=103&_=${now}`;

    logger.debug('Searching CELCAT', { query });

    const res = await fetch(celcatUrl, {
      method: 'GET',
      headers: SEARCH_CONFIG.headers,
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) {
      throw new ExternalAPIError('CELCAT search failed', { status: res.status });
    }

    const rawData = await res.json();

    const items = (rawData.results || [])
      .map(item => ({
        id: item.id,
        text: (item.text || "").replace(/<[^>]*>/g, '').trim() 
      }))
      .filter(item => item.id && item.text.length > 0)
      .slice(0, SEARCH_CONFIG.maxResults);

    logger.info('Search completed', { query, count: items.length });

    pruneCache();
    searchCache.set(cacheKey, {
      data: items,
      expiry: now + SEARCH_CONFIG.cacheTTL
    });

    return NextResponse.json({ results: items, cached: false });

  } catch (error) {
    logger.error('Search failed', { query, error: error.message });
    return NextResponse.json({ 
      results: [], 
      error: 'Search failed' 
    }, { status: 500 });
  }
}
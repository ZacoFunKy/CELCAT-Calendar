import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return NextResponse.json({ results: [] });
  }

  try {
    // On appelle l'API officielle de Celcat
    // On ajoute un timestamp (_=...) pour éviter que Celcat ne garde du vieux cache
    const celcatUrl = `https://celcat.u-bordeaux.fr/Calendar/Home/ReadResourceListItems?myResources=false&searchTerm=${encodeURIComponent(query)}&pageSize=50&pageNumber=1&resType=103&secondaryFilterValue1=&secondaryFilterValue2=&_=${Date.now()}`;

    const res = await fetch(celcatUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest' // Important pour faire croire qu'on est un navigateur
      }
    });

    if (!res.ok) {
      throw new Error(`Erreur Celcat: ${res.status}`);
    }

    const data = await res.json();
    
    // On renvoie les données au format JSON à ton frontend
    return NextResponse.json(data);

  } catch (error) {
    console.error('Erreur Proxy Recherche:', error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeAuthors(authors) {
  return asArray(authors)
    .map((author) => {
      if (typeof author === 'string') return author;
      if (author?.name) return author.name;
      return [author?.givenName, author?.familyName].filter(Boolean).join(' ').trim();
    })
    .filter(Boolean)
    .join(', ');
}

function normalizeCoreItem(item, index = 0) {
  const title = item.title || 'Untitled record';
  const creator = normalizeAuthors(item.authors) || 'Unknown creator';
  const abstract = item.abstract || '';
  const year = item.year_published || item.yearPublished || '';
  const downloadUrl = item.download_url || item.downloadUrl || '';
  const fulltextUrls = item.source_fulltext_urls || item.sourceFulltextUrls || [];
  const doi = item.doi || '';
  const publisher =
    typeof item.publisher === 'string'
      ? item.publisher
      : item.publisher?.name || '';

  const journalTitle = asArray(item.journals)[0]?.title || '';

  const externalLinks = [];
  if (downloadUrl) externalLinks.push({ label: 'Download PDF', url: downloadUrl });
  if (fulltextUrls[0]) externalLinks.push({ label: 'Full text', url: fulltextUrls[0] });
  if (doi) externalLinks.push({ label: 'DOI', url: `https://doi.org/${doi}` });

  return {
    id: `core-${item.id || index}`,
    title,
    creator,
    summary: abstract || 'Live result from CORE.',
    abstract,
    description: [
      publisher ? `Publisher: ${publisher}.` : '',
      journalTitle ? `Journal: ${journalTitle}.` : '',
      year ? `Year: ${year}.` : '',
    ].filter(Boolean),
    type: 'Research paper',
    cat: 'CORE live results',
    region: 'Global',
    country: '',
    community: '',
    period: year ? String(year) : '',
    concepts: [],
    themes: ['Research', 'Open Access'],
    tags: [
      ...asArray(item.subjects).slice(0, 6),
      ...asArray(item.tags).slice(0, 4),
      ...asArray(item.document_type || item.documentType).slice(0, 3),
    ].filter(Boolean),
    rights: 'External source rights apply',
    provenance: 'Live metadata pulled from CORE API.',
    source: 'CORE',
    collection: 'CORE live discovery',
    institution: 'CORE',
    language: item.language?.name
      ? [item.language.name]
      : item.language?.code
      ? [item.language.code]
      : [],
    sourceUrl: downloadUrl || fulltextUrls[0] || (doi ? `https://doi.org/${doi}` : ''),
    sourceActionLabel: 'Open source record',
    externalLinks,
    sourcePathways: ['CORE API', 'Live source adapter'],
    notes: ['Live-fetched result from CORE works search.'],
    archiveIdentifier: item.id ? `CORE-${item.id}` : '',
    recordIdentifier: String(item.id || ''),
    resultMode: 'live',
    trustScore: 0.9,
    liveSourceHint: 'core',
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchCore(url, apiKey, attempt = 1) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (response.ok) {
    return response.json();
  }

  const text = await response.text();

  if (attempt < 4 && response.status >= 500) {
    const delay = 700 * attempt;
    await sleep(delay);
    return fetchCore(url, apiKey, attempt + 1);
  }

  throw new Error(text || `CORE request failed (${response.status})`);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get('q') || '').trim();
    const limit = Math.min(Number(searchParams.get('limit') || '10'), 10);
    const offset = Number(searchParams.get('offset') || '0');
    const apiKey = process.env.CORE_API_KEY;

    if (!q) {
      return NextResponse.json(
        { ok: false, error: 'Missing q parameter' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: 'Missing CORE_API_KEY' },
        { status: 500 }
      );
    }

    const url =
      `https://api.core.ac.uk/v3/search/works` +
      `?q=${encodeURIComponent(q)}` +
      `&limit=${limit}` +
      `&offset=${offset}`;

    const data = await fetchCore(url, apiKey);
    const results = asArray(data.results).map((item, index) =>
      normalizeCoreItem(item, index)
    );

    return NextResponse.json({
      ok: true,
      totalHits: data.total_hits ?? data.totalHits ?? results.length,
      results,
    });
  } catch (error) {
    console.error('CORE search failed:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'CORE temporarily busy',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 503 }
    );
  }
}

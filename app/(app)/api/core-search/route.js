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

function isEsOverload(text) {
  return (
    typeof text === 'string' &&
    text.includes('es_rejected_execution_exception')
  );
}

function extractPartialResults(text) {
  try {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return null;
    }

    if (typeof parsed?.message === 'string') {
      try {
        const inner = JSON.parse(parsed.message);
        if (inner?.hits?.hits || inner?.results) {
          parsed = inner;
        }
      } catch {
        // not double-encoded, continue with parsed as-is
      }
    }

    if (Array.isArray(parsed?.results) && parsed.results.length > 0) {
      return {
        results: parsed.results,
        totalHits: parsed.total_hits ?? parsed.totalHits ?? parsed.results.length,
      };
    }

    if (Array.isArray(parsed?.hits?.hits) && parsed.hits.hits.length > 0) {
      return {
        results: parsed.hits.hits.map((hit) => hit._source || hit),
        totalHits: parsed.hits?.total?.value ?? parsed.hits.hits.length,
      };
    }

    return null;
  } catch {
    return null;
  }
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
    return { data: await response.json(), partial: false };
  }

  const text = await response.text();

  if (isEsOverload(text)) {
    if (attempt === 1) {
      console.warn('[CORE API] ES overload detected, retrying after 900ms', {
        attempt,
        status: response.status,
      });
      await sleep(900);
      return fetchCore(url, apiKey, attempt + 1);
    }

    const partial = extractPartialResults(text);
    if (partial && partial.results.length > 0) {
      console.warn('[CORE API] ES overload on retry, returning partial results', {
        count: partial.results.length,
      });
      return { data: partial, partial: true };
    }

    // No results extractable — return empty gracefully rather than throwing
    console.warn('[CORE API] ES overload on retry, no results extractable, returning empty');
    return {
      data: { results: [], total_hits: 0 },
      partial: true,
      overloaded: true,
    };
  }

  if (attempt < 3 && response.status >= 500) {
    const delay = 700 * attempt;
    console.warn('[CORE API] 5xx error, retrying', { attempt, status: response.status, delay });
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

    console.log('[CORE API] incoming request', {
      q,
      limit,
      offset,
      time: new Date().toISOString(),
    });

    if (!q) {
      return NextResponse.json(
        { ok: false, error: 'Missing q parameter' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      console.error('[CORE API] missing CORE_API_KEY environment variable');
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

    console.log('[CORE API] fetching upstream', url);

    const { data, partial, overloaded } = await fetchCore(url, apiKey);

    console.log('[CORE API] upstream shape', {
      hasResults: !!data?.results,
      resultsCount: Array.isArray(data?.results) ? data.results.length : null,
      totalHits: data?.total_hits ?? data?.totalHits ?? null,
      partial,
      overloaded: overloaded || false,
    });

    const results = asArray(data.results).map((item, index) => {
      const normalized = normalizeCoreItem(item, index);
      console.log('[CORE API] normalized item', {
        index,
        id: normalized.id,
        hasTitle: !!normalized.title && normalized.title !== 'Untitled record',
        hasCreator: !!normalized.creator && normalized.creator !== 'Unknown creator',
        hasSourceUrl: !!normalized.sourceUrl,
        hasAbstract: !!normalized.abstract,
      });
      return normalized;
    });

    console.log('[CORE API] returning results', {
      count: results.length,
      totalHits: data.total_hits ?? data.totalHits ?? results.length,
      partial,
    });

    return NextResponse.json({
      ok: true,
      partial: partial || false,
      warning: overloaded
        ? 'CORE search service is temporarily under load. Local and fallback results are shown instead.'
        : partial
        ? 'CORE returned partial results because its search service is under load. Showing available results.'
        : undefined,
      totalHits: data.total_hits ?? data.totalHits ?? results.length,
      results,
    });
  } catch (error) {
    console.error('[CORE API] failed', {
      message: error instanceof Error ? error.message : String(error),
      time: new Date().toISOString(),
    });

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

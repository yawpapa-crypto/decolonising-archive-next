import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

function normalizeTerm(term) {
  return String(term || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const term = normalizeTerm(body.term);

    if (!term || term.length < 2) {
      return NextResponse.json(
        { ok: false, error: 'Invalid term' },
        { status: 400 }
      );
    }

    await sql`
      insert into search_terms (term, count, last_searched_at)
      values (${term}, 1, now())
      on conflict (term)
      do update set
        count = search_terms.count + 1,
        last_searched_at = now()
    `;

    await sql`
      insert into search_events (term)
      values (${term})
    `;

    return NextResponse.json({ ok: true, term });
  } catch (error) {
    console.error('search-term POST failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    );
  }
}

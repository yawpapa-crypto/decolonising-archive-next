import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    const { rows } = await sql`
      select term, count, last_searched_at
      from search_terms
      order by count desc, last_searched_at desc
      limit 10
    `;

    return NextResponse.json({
      ok: true,
      results: rows,
    });
  } catch (error) {
    console.error('top-searches GET failed:', error);

    return NextResponse.json(
      {
        ok: false,
        error: 'Server error',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}


import { NextResponse } from 'next/server'
import { readSources, writeSources } from '@/lib/sources'

export async function GET() {
  try {
    const sources = await readSources()
    return NextResponse.json({ ok: true, sources })
  } catch (error) {
    console.error('Failed to read sources:', error)
    return NextResponse.json({ ok: false, error: 'Failed to read sources' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    await writeSources(body.sources ?? [])
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to save sources:', error)
    return NextResponse.json({ ok: false, error: 'Failed to save sources' }, { status: 500 })
  }
}

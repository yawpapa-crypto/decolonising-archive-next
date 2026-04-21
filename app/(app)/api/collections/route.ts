
import { NextResponse } from 'next/server'
import { readCollections, writeCollections } from '@/lib/collections'

export async function GET() {
  try {
    const collections = await readCollections()
    return NextResponse.json({ ok: true, collections })
  } catch (error) {
    console.error('Failed to read collections:', error)
    return NextResponse.json({ ok: false, error: 'Failed to read collections' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    await writeCollections(body.collections ?? [])
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to save collections:', error)
    return NextResponse.json({ ok: false, error: 'Failed to save collections' }, { status: 500 })
  }
}

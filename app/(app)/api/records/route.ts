import { NextResponse } from 'next/server'
import { readRecords, writeRecords } from '@/lib/records'

export async function GET() {
  try {
    const records = await readRecords()
    return NextResponse.json({ ok: true, records })
  } catch (error) {
    console.error('Failed to read records:', error)
    return NextResponse.json({ ok: false, error: 'Failed to read records' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    await writeRecords(body.records ?? [])
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to save records:', error)
    return NextResponse.json({ ok: false, error: 'Failed to save records' }, { status: 500 })
  }
}
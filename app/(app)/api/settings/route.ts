
import { NextResponse } from 'next/server'
import { readSettings, writeSettings } from '@/lib/settings'

export async function GET() {
  try {
    const settings = await readSettings()
    return NextResponse.json({ ok: true, settings })
  } catch (error) {
    console.error('Failed to read settings:', error)
    return NextResponse.json({ ok: false, error: 'Failed to read settings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    await writeSettings(body.settings)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to save settings:', error)
    return NextResponse.json({ ok: false, error: 'Failed to save settings' }, { status: 500 })
  }
}

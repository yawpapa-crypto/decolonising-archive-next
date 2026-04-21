
import { NextResponse } from 'next/server'
import { readSiteContent, writeSiteContent } from '@/lib/site-content'

export async function GET() {
  try {
    const content = await readSiteContent()
    return NextResponse.json({ ok: true, content })
  } catch (error) {
    console.error('Failed to read site content:', error)
    return NextResponse.json({ ok: false, error: 'Failed to read site content' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    await writeSiteContent(body)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to save site content:', error)
    return NextResponse.json({ ok: false, error: 'Failed to save site content' }, { status: 500 })
  }
}

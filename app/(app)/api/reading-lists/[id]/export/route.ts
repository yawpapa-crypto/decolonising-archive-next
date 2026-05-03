import { NextRequest, NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx'
import { createClient } from '@/src/lib/supabase/server'
import {
  buildReadingListExportText,
  formatRecordCitation,
  safeExportFilename,
  type CitationRecord,
} from '@/lib/citations'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

async function pdfToBuffer(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })
}

function getRecordTitle(record: CitationRecord) {
  return record.title || record.name || record.record_title || record.metadata?.title || 'Untitled record'
}

function getRecordSource(record: CitationRecord) {
  return (
    record.publisher ||
    record.source_name ||
    record.record_source ||
    record.metadata?.publisher ||
    record.metadata?.source ||
    record.archive ||
    record.collection ||
    'Decolonising Archive'
  )
}

function getRecordUrl(record: CitationRecord) {
  return (
    record.url ||
    record.source_url ||
    record.record_source_url ||
    record.recordUrl ||
    record.href ||
    record.metadata?.url ||
    record.metadata?.source_url ||
    'No URL available'
  )
}

function itemText(item: Record<string, unknown>, key: string) {
  const value = item[key]
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function snapshotRecordFromItem(item: Record<string, unknown>, richRecord?: CitationRecord) {
  const recordId = String(item.record_id ?? '')
  const metadata =
    item.record_metadata && typeof item.record_metadata === 'object'
      ? (item.record_metadata as Record<string, unknown>)
      : {}
  const recordTitle = itemText(item, 'record_title')
  const recordAuthor = itemText(item, 'record_author')
  const recordSource = itemText(item, 'record_source')
  const recordSourceUrl = itemText(item, 'record_source_url')
  const recordType = itemText(item, 'record_type')
  const recordYear = itemText(item, 'record_year')
  const note = itemText(item, 'note')
  const snapshot = {
    id: recordId,
    title: recordTitle || `Archive record ${recordId}`,
    record_title: recordTitle || null,
    author: recordAuthor || null,
    record_author: recordAuthor || null,
    source_name: recordSource || 'Decolonising Archive',
    record_source: recordSource || null,
    source_url: recordSourceUrl || null,
    url: recordSourceUrl || null,
    record_source_url: recordSourceUrl || null,
    type: recordType || 'Record',
    record_type: recordType || null,
    year: recordYear || null,
    record_year: recordYear || null,
    note: note || null,
    metadata,
  } as CitationRecord

  return richRecord
    ? ({
        ...snapshot,
        ...richRecord,
        title: richRecord.title || richRecord.name || snapshot.title,
        author: richRecord.author || richRecord.creator || snapshot.author,
        source_name: richRecord.source_name || snapshot.source_name,
        source_url: richRecord.source_url || snapshot.source_url,
        url: richRecord.url || snapshot.url,
        type: richRecord.type || richRecord.record_type || snapshot.type,
        year: richRecord.year || snapshot.year,
        metadata: {
          ...(snapshot.metadata ?? {}),
          ...(richRecord.metadata ?? {}),
        },
      } as CitationRecord)
    : snapshot
}

async function getReadingListData(listId: string) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      error: NextResponse.json({ error: 'Unauthenticated' }, { status: 401 }),
    }
  }

  const { data: list, error: listError } = await supabase
    .from('reading_lists')
    .select('*')
    .eq('id', listId)
    .single()

  if (listError || !list) {
    return {
      error: NextResponse.json({ error: 'Reading list not found' }, { status: 404 }),
    }
  }

  const isOwner = list.user_id === user.id
  const isPublic = Boolean(list.is_public)

  if (!isOwner && !isPublic) {
    return {
      error: NextResponse.json({ error: 'Not allowed' }, { status: 403 }),
    }
  }

  const { data: listRecords, error: recordsError } = await supabase
    .from('reading_list_items')
    .select('*')
    .eq('reading_list_id', listId)
    .order('position', { ascending: true })

  if (recordsError) {
    return {
      error: NextResponse.json(
        {
          error: 'Could not load reading list records',
          details: recordsError.message,
        },
        { status: 500 },
      ),
    }
  }

  const recordIds = listRecords?.map((item) => item.record_id).filter(Boolean) ?? []

  const { data: recordsData } = recordIds.length
    ? await supabase.from('records').select('*').in('id', recordIds)
    : { data: [] }

  const recordsById = new Map(
    (recordsData ?? []).map((record) => [String(record.id), record as CitationRecord]),
  )

  const records =
    listRecords
      ?.map((item) => {
        const record = recordsById.get(String(item.record_id))

        return snapshotRecordFromItem(item, record)
      })
      .filter(Boolean) as CitationRecord[]

  return {
    user,
    list,
    records,
  }
}

function buildPdfBuffer({
  list,
  records,
}: {
  list: { title?: string | null; description?: string | null }
  records: CitationRecord[]
}) {
  const doc = new PDFDocument({
    margin: 54,
    size: 'A4',
  })

  const bufferPromise = pdfToBuffer(doc)

  doc.fontSize(18).fillColor('#000').text('Decolonising Archive Reading List')
  doc.moveDown(0.75)
  doc.fontSize(13).text(list.title || 'Untitled reading list')
  doc.moveDown(0.35)
  doc.fontSize(10).fillColor('#555').text(list.description || 'No description provided.')
  doc.moveDown(0.35)
  doc.text(`Exported on ${new Date().toLocaleDateString('en-AU')}`)
  doc.text('Citation style: APA 7')
  doc.text('Citation note: Exports use available archive metadata. Please check details against the original source.')

  doc.moveDown(1.2)
  doc.fillColor('#000').fontSize(13).text('Citations')
  doc.moveDown(0.5)

  if (records.length === 0) {
    doc.fontSize(10).fillColor('#444').text('This reading list has no records to export yet.')
  } else {
    records.forEach((record, index) => {
      doc.fontSize(10).fillColor('#000').text(`${index + 1}. ${formatRecordCitation(record)}`, {
        paragraphGap: 8,
      })
    })
  }

  doc.moveDown(1)
  doc.fontSize(13).fillColor('#000').text('Records')
  doc.moveDown(0.5)

  if (records.length === 0) {
    doc.fontSize(10).fillColor('#444').text('No records are currently added to this list.')
  } else {
    records.forEach((record, index) => {
      doc.fontSize(10).fillColor('#000').text(`${index + 1}. ${getRecordTitle(record)}`)
      doc.fontSize(9).fillColor('#555').text(`Type: ${record.type || record.record_type || 'Record'}`)
      doc.text(`Source: ${getRecordSource(record)}`)
      doc.text(`URL: ${getRecordUrl(record)}`)
      doc.moveDown(0.7)
    })
  }

  doc.moveDown(1)
  doc.fontSize(8).fillColor('#777').text('Generated from Decolonising Archive')

  doc.end()

  return bufferPromise
}

async function buildDocxBuffer({
  list,
  records,
}: {
  list: { title?: string | null; description?: string | null }
  records: CitationRecord[]
}) {
  const citationParagraphs =
    records.length === 0
      ? [
          new Paragraph({
            children: [new TextRun('This reading list has no records to export yet.')],
          }),
        ]
      : records.map(
          (record, index) =>
            new Paragraph({
              spacing: { after: 180 },
              children: [new TextRun(`${index + 1}. ${formatRecordCitation(record)}`)],
            }),
        )

  const recordParagraphs =
    records.length === 0
      ? [
          new Paragraph({
            children: [new TextRun('No records are currently added to this list.')],
          }),
        ]
      : records.flatMap((record, index) => [
          new Paragraph({
            spacing: { before: 180 },
            children: [
              new TextRun({
                text: `${index + 1}. ${getRecordTitle(record)}`,
                bold: true,
              }),
            ],
          }),
          new Paragraph(`Type: ${record.type || record.record_type || 'Record'}`),
          new Paragraph(`Source: ${getRecordSource(record)}`),
          new Paragraph(`URL: ${getRecordUrl(record)}`),
        ])

  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: 'Decolonising Archive Reading List',
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            text: list.title || 'Untitled reading list',
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph(list.description || 'No description provided.'),
          new Paragraph(`Exported on ${new Date().toLocaleDateString('en-AU')}`),
          new Paragraph('Citation style: APA 7'),
          new Paragraph('Citation note: Exports use available archive metadata. Please check titles, authors, dates, and source details against the original record before formal submission or publication.'),
          new Paragraph({
            text: 'Citations',
            heading: HeadingLevel.HEADING_2,
          }),
          ...citationParagraphs,
          new Paragraph({
            text: 'Records',
            heading: HeadingLevel.HEADING_2,
          }),
          ...recordParagraphs,
          new Paragraph('Generated from Decolonising Archive'),
        ],
      },
    ],
  })

  return Packer.toBuffer(document)
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  const searchParams = request.nextUrl.searchParams
  const format = searchParams.get('format') || 'txt'

  const result = await getReadingListData(id)

  if ('error' in result) {
    return result.error
  }

  const { list, records } = result
  const filenameBase = list.title || 'reading-list'

  if (format === 'json') {
    return NextResponse.json({
      list,
      records,
      citations: records.map((record) => formatRecordCitation(record)),
    })
  }

  if (format === 'txt') {
    const body = buildReadingListExportText({ list, records })

    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeExportFilename(filenameBase, 'txt')}"`,
      },
    })
  }

  if (format === 'pdf') {
    const buffer = await buildPdfBuffer({ list, records })

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeExportFilename(filenameBase, 'pdf')}"`,
      },
    })
  }

  if (format === 'docx') {
    const buffer = await buildDocxBuffer({ list, records })

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeExportFilename(filenameBase, 'docx')}"`,
      },
    })
  }

  return NextResponse.json({ error: 'Unsupported export format' }, { status: 400 })
}

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
  formatRecordCitation,
  safeExportFilename,
  type CitationRecord,
} from '@/lib/citations'

export const runtime = 'nodejs'

type ReadingList = {
  id: string
  title?: string | null
  description?: string | null
  is_public?: boolean | null
}

type ReadingListBundle = {
  list: ReadingList
  records: CitationRecord[]
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

async function getAllReadingListsData() {
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

  const { data: lists, error: listsError } = await supabase
    .from('reading_lists')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (listsError) {
    return {
      error: NextResponse.json(
        {
          error: 'Could not load reading lists',
          details: listsError.message,
        },
        { status: 500 },
      ),
    }
  }

  const readingLists = (lists ?? []) as ReadingList[]
  const listIds = readingLists.map((list) => list.id)

  if (listIds.length === 0) {
    return {
      bundles: [] as ReadingListBundle[],
    }
  }

  const { data: listItems, error: itemsError } = await supabase
    .from('reading_list_items')
    .select('*')
    .in('reading_list_id', listIds)
    .order('position', { ascending: true })

  if (itemsError) {
    return {
      error: NextResponse.json(
        {
          error: 'Could not load reading list items',
          details: itemsError.message,
        },
        { status: 500 },
      ),
    }
  }

  const recordIds =
    listItems?.map((item) => item.record_id).filter(Boolean) ?? []

  const uniqueRecordIds = [...new Set(recordIds.map(String))]

  const { data: recordsData } = uniqueRecordIds.length
    ? await supabase.from('records').select('*').in('id', uniqueRecordIds)
    : { data: [] }

  const recordsById = new Map(
    (recordsData ?? []).map((record) => [String(record.id), record as CitationRecord]),
  )

  const itemsByListId = new Map<string, CitationRecord[]>()

  for (const item of listItems ?? []) {
    const readingListId = String(item.reading_list_id)
    const record = snapshotRecordFromItem(
      item as Record<string, unknown>,
      recordsById.get(String(item.record_id)),
    )

    if (!itemsByListId.has(readingListId)) {
      itemsByListId.set(readingListId, [])
    }

    itemsByListId.get(readingListId)?.push(record)
  }

  const bundles = readingLists.map((list) => ({
    list,
    records: itemsByListId.get(list.id) ?? [],
  }))

  return { bundles }
}

function buildAllReadingListsText(bundles: ReadingListBundle[]) {
  const exportedAt = new Date()

  const lines: string[] = [
    'All Reading Lists',
    'Exported from Decolonising Archive',
    `Exported on ${exportedAt.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`,
    'Citation style: APA 7',
    'Citation note: Exports use available archive metadata. Please check titles, authors, dates, and source details against the original record before formal submission or publication.',
    '',
  ]

  if (bundles.length === 0) {
    lines.push('No reading lists were found for this account.')
    return lines.join('\n')
  }

  bundles.forEach((bundle, listIndex) => {
    lines.push('='.repeat(64))
    lines.push(`${listIndex + 1}. ${bundle.list.title || 'Untitled reading list'}`)
    lines.push('='.repeat(64))
    lines.push(`Description: ${bundle.list.description || 'No description provided.'}`)
    lines.push(`Visibility: ${bundle.list.is_public ? 'Public' : 'Private'}`)
    lines.push('')

    lines.push('Citations')
    lines.push('')

    if (bundle.records.length === 0) {
      lines.push('This reading list has no records to export yet.')
    } else {
      bundle.records.forEach((record, recordIndex) => {
        lines.push(`${recordIndex + 1}. ${formatRecordCitation(record)}`)
      })
    }

    lines.push('')
    lines.push('Records')
    lines.push('')

    if (bundle.records.length === 0) {
      lines.push('No records are currently added to this list.')
    } else {
      bundle.records.forEach((record, recordIndex) => {
        lines.push(`${recordIndex + 1}. ${getRecordTitle(record)}`)
        lines.push(`   Type: ${record.type || record.record_type || 'Record'}`)
        lines.push(`   Source: ${getRecordSource(record)}`)
        lines.push(`   URL: ${getRecordUrl(record)}`)
        lines.push('')
      })
    }

    lines.push('')
  })

  return lines.join('\n')
}

function buildAllPdfBuffer(bundles: ReadingListBundle[]) {
  const doc = new PDFDocument({
    margin: 54,
    size: 'A4',
  })

  const bufferPromise = pdfToBuffer(doc)

  doc.fontSize(18).fillColor('#000').text('All Reading Lists')
  doc.moveDown(0.5)
  doc.fontSize(10).fillColor('#555').text('Exported from Decolonising Archive')
  doc.text(`Exported on ${new Date().toLocaleDateString('en-AU')}`)
  doc.text('Citation style: APA 7')
  doc.text('Citation note: Exports use available archive metadata. Please check details against the original source.')

  if (bundles.length === 0) {
    doc.moveDown(1)
    doc.fontSize(10).fillColor('#444').text('No reading lists were found for this account.')
    doc.end()
    return bufferPromise
  }

  bundles.forEach((bundle, listIndex) => {
    if (listIndex > 0) doc.addPage()

    doc.moveDown(1.2)
    doc.fontSize(15).fillColor('#000').text(`${listIndex + 1}. ${bundle.list.title || 'Untitled reading list'}`)
    doc.moveDown(0.35)
    doc.fontSize(10).fillColor('#555').text(bundle.list.description || 'No description provided.')
    doc.text(`Visibility: ${bundle.list.is_public ? 'Public' : 'Private'}`)

    doc.moveDown(1)
    doc.fontSize(12).fillColor('#000').text('Citations')
    doc.moveDown(0.4)

    if (bundle.records.length === 0) {
      doc.fontSize(10).fillColor('#444').text('This reading list has no records to export yet.')
    } else {
      bundle.records.forEach((record, recordIndex) => {
        doc.fontSize(10).fillColor('#000').text(`${recordIndex + 1}. ${formatRecordCitation(record)}`, {
          paragraphGap: 8,
        })
      })
    }

    doc.moveDown(1)
    doc.fontSize(12).fillColor('#000').text('Records')
    doc.moveDown(0.4)

    if (bundle.records.length === 0) {
      doc.fontSize(10).fillColor('#444').text('No records are currently added to this list.')
    } else {
      bundle.records.forEach((record, recordIndex) => {
        doc.fontSize(10).fillColor('#000').text(`${recordIndex + 1}. ${getRecordTitle(record)}`)
        doc.fontSize(9).fillColor('#555').text(`Type: ${record.type || record.record_type || 'Record'}`)
        doc.text(`Source: ${getRecordSource(record)}`)
        doc.text(`URL: ${getRecordUrl(record)}`)
        doc.moveDown(0.7)
      })
    }
  })

  doc.moveDown(1)
  doc.fontSize(8).fillColor('#777').text('Generated from Decolonising Archive')
  doc.end()

  return bufferPromise
}

async function buildAllDocxBuffer(bundles: ReadingListBundle[]) {
  const children: Paragraph[] = [
    new Paragraph({
      text: 'All Reading Lists',
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph('Exported from Decolonising Archive'),
    new Paragraph(`Exported on ${new Date().toLocaleDateString('en-AU')}`),
    new Paragraph('Citation style: APA 7'),
    new Paragraph('Citation note: Exports use available archive metadata. Please check titles, authors, dates, and source details against the original record before formal submission or publication.'),
  ]

  if (bundles.length === 0) {
    children.push(new Paragraph('No reading lists were found for this account.'))
  }

  bundles.forEach((bundle, listIndex) => {
    children.push(
      new Paragraph({
        text: `${listIndex + 1}. ${bundle.list.title || 'Untitled reading list'}`,
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph(bundle.list.description || 'No description provided.'),
      new Paragraph(`Visibility: ${bundle.list.is_public ? 'Public' : 'Private'}`),
      new Paragraph({
        text: 'Citations',
        heading: HeadingLevel.HEADING_2,
      }),
    )

    if (bundle.records.length === 0) {
      children.push(new Paragraph('This reading list has no records to export yet.'))
    } else {
      bundle.records.forEach((record, recordIndex) => {
        children.push(
          new Paragraph({
            spacing: { after: 180 },
            children: [new TextRun(`${recordIndex + 1}. ${formatRecordCitation(record)}`)],
          }),
        )
      })
    }

    children.push(
      new Paragraph({
        text: 'Records',
        heading: HeadingLevel.HEADING_2,
      }),
    )

    if (bundle.records.length === 0) {
      children.push(new Paragraph('No records are currently added to this list.'))
    } else {
      bundle.records.forEach((record, recordIndex) => {
        children.push(
          new Paragraph({
            spacing: { before: 180 },
            children: [
              new TextRun({
                text: `${recordIndex + 1}. ${getRecordTitle(record)}`,
                bold: true,
              }),
            ],
          }),
          new Paragraph(`Type: ${record.type || record.record_type || 'Record'}`),
          new Paragraph(`Source: ${getRecordSource(record)}`),
          new Paragraph(`URL: ${getRecordUrl(record)}`),
        )
      })
    }
  })

  children.push(new Paragraph('Generated from Decolonising Archive'))

  const document = new Document({
    sections: [
      {
        children,
      },
    ],
  })

  return Packer.toBuffer(document)
}

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format') || 'txt'
  const result = await getAllReadingListsData()

  if ('error' in result) {
    return result.error
  }

  const { bundles } = result
  const filenameBase = 'all-reading-lists'

  if (format === 'json') {
    return NextResponse.json({
      readingLists: bundles,
      citations: bundles.map((bundle) => ({
        list: bundle.list,
        citations: bundle.records.map((record) => formatRecordCitation(record)),
      })),
    })
  }

  if (format === 'txt') {
    const body = buildAllReadingListsText(bundles)

    return new NextResponse(body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeExportFilename(filenameBase, 'txt')}"`,
      },
    })
  }

  if (format === 'pdf') {
    const buffer = await buildAllPdfBuffer(bundles)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeExportFilename(filenameBase, 'pdf')}"`,
      },
    })
  }

  if (format === 'docx') {
    const buffer = await buildAllDocxBuffer(bundles)

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

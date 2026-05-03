export type CitationStyle = 'apa7'

export type CitationRecord = {
  id?: string
  title?: string | null
  name?: string | null
  record_title?: string | null
  author?: string | null
  creator?: string | null
  contributor?: string | null
  record_author?: string | null
  source?: string | null
  source_name?: string | null
  record_source?: string | null
  publisher?: string | null
  archive?: string | null
  collection?: string | null
  year?: string | number | null
  record_year?: string | number | null
  date?: string | null
  published_at?: string | null
  created_at?: string | null
  type?: string | null
  record_type?: string | null
  url?: string | null
  source_url?: string | null
  record_source_url?: string | null
  recordUrl?: string | null
  href?: string | null
  metadata?: {
    title?: string | null
    author?: string | null
    creator?: string | null
    contributor?: string | null
    date?: string | null
    year?: string | number | null
    source?: string | null
    source_name?: string | null
    publisher?: string | null
    archive?: string | null
    collection?: string | null
    url?: string | null
    source_url?: string | null
    type?: string | null
  } | null
}

export type ReadingListExport = {
  title?: string | null
  description?: string | null
  is_public?: boolean | null
}

function firstText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }

  return ''
}

function extractYear(value: unknown) {
  const text = firstText(value)

  if (!text) return 'n.d.'

  const yearMatch = text.match(/\b(1[5-9]\d{2}|20\d{2}|21\d{2})\b/)
  return yearMatch?.[0] ?? text
}

/**
 * Best-effort APA 7 citation formatter.
 * This uses whatever metadata is available in the archive record.
 * It gives members a clean exportable starting point, but it is not a full scholarly metadata parser.
 */
export function formatRecordCitation(
  record: CitationRecord | null | undefined,
  style: CitationStyle = 'apa7',
) {
  if (!record) return 'Record unavailable.'

  if (style !== 'apa7') {
    throw new Error(`Unsupported citation style: ${style}`)
  }

  const author =
    firstText(
      record.author,
      record.creator,
      record.contributor,
      record.record_author,
      record.metadata?.author,
      record.metadata?.creator,
      record.metadata?.contributor,
    ) || 'Unknown author'

  const year = extractYear(
    record.year ??
      record.record_year ??
      record.date ??
      record.metadata?.year ??
      record.metadata?.date ??
      record.published_at ??
      record.created_at,
  )

  const title =
    firstText(
      record.title,
      record.name,
      record.record_title,
      record.metadata?.title,
    ) || 'Untitled record'

  const source =
    firstText(
      record.publisher,
      record.source_name,
      record.record_source,
      record.metadata?.publisher,
      record.metadata?.source,
      record.metadata?.source_name,
      record.archive,
      record.collection,
      record.metadata?.archive,
      record.metadata?.collection,
    ) ||
    'Decolonising Archive'

  const url = firstText(
    record.url,
    record.source_url,
    record.record_source_url,
    record.recordUrl,
    record.href,
    record.metadata?.url,
    record.metadata?.source_url,
  )

  return [
    author,
    `(${year}).`,
    title.endsWith('.') ? title : `${title}.`,
    source.endsWith('.') ? source : `${source}.`,
    url,
  ]
    .filter(Boolean)
    .join(' ')
}

export function safeExportFilename(title: string | null | undefined, extension: string) {
  const base =
    title
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'reading-list'

  return `${base}-citations.${extension.replace(/^\./, '')}`
}

export function buildReadingListExportText({
  list,
  records,
  exportedAt = new Date(),
}: {
  list: ReadingListExport
  records: CitationRecord[]
  exportedAt?: Date
}) {
  const title = firstText(list.title) || 'Untitled reading list'
  const description = firstText(list.description) || 'No description provided.'
  const citations = records.map((record) => formatRecordCitation(record))

  const lines: string[] = [
    `Reading List: ${title}`,
    `Description: ${description}`,
    'Exported from Decolonising Archive',
    `Exported on ${exportedAt.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`,
    'Citation style: APA 7',
    'Citation note: Exports use available archive metadata. Please check titles, authors, dates, and source details against the original record before formal submission or publication.',
    '',
    'Citations',
    '',
  ]

  if (citations.length === 0) {
    lines.push('This reading list has no records to export yet.')
  } else {
    citations.forEach((citation, index) => {
      lines.push(`${index + 1}. ${citation}`)
    })
  }

  lines.push('', 'Records', '')

  if (records.length === 0) {
    lines.push('No records are currently added to this list.')
  } else {
    records.forEach((record, index) => {
      const title =
        firstText(record.title, record.name, record.record_title, record.metadata?.title) ||
        'Untitled record'
      const type = firstText(record.type, record.record_type) || 'Record'
      const source =
        firstText(
          record.publisher,
          record.source_name,
          record.record_source,
          record.metadata?.publisher,
          record.metadata?.source,
          record.metadata?.source_name,
          record.archive,
          record.collection,
          record.metadata?.archive,
          record.metadata?.collection,
        ) ||
        'Decolonising Archive'
      const url =
        firstText(
          record.url,
          record.source_url,
          record.record_source_url,
          record.recordUrl,
          record.href,
          record.metadata?.url,
          record.metadata?.source_url,
        ) || 'No URL available'

      lines.push(`${index + 1}. ${title}`)
      lines.push(`   Type: ${type}`)
      lines.push(`   Source: ${source}`)
      lines.push(`   URL: ${url}`)
      lines.push('')
    })
  }

  return lines.join('\n')
}

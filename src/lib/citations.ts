export type ArchiveRecord = {
  id?: string
  title?: string
  type?: string
  creator?: string
  period?: string
  institution?: string
  source?: string
  sourceUrl?: string
  collection?: string
  recordIdentifier?: string
  archiveIdentifier?: string
}

function extractYear(period?: string): string {
  if (!period) return ''
  const match = period.match(/\b(1[0-9]{3}|20[0-9]{2}|21[0-9]{2})\b/)
  return match ? match[1] : ''
}

function mapRecordTypeToRIS(type?: string): string {
  const value = (type || '').toLowerCase()

  if (value.includes('book')) return 'BOOK'
  if (value.includes('journal')) return 'JOUR'
  if (value.includes('article')) return 'JOUR'
  if (value.includes('archival')) return 'MANSCPT'
  if (value.includes('oral')) return 'GEN'
  if (value.includes('poster')) return 'ART'
  if (value.includes('image')) return 'ART'
  if (value.includes('artefact') || value.includes('artifact')) return 'ART'
  if (value.includes('architecture')) return 'GEN'

  return 'GEN'
}

function cleanValue(value?: string): string {
  return (value || '').trim()
}

export function generateArchiveCitation(record: ArchiveRecord): string {
  const creator = cleanValue(record.creator)
  const title = cleanValue(record.title)
  const institution = cleanValue(record.institution || record.source)
  const year = extractYear(record.period)
  const url = cleanValue(record.sourceUrl)
  const id = cleanValue(record.recordIdentifier || record.archiveIdentifier)

  return [
    creator,
    title ? `"${title}."` : '',
    institution,
    year,
    url,
    id ? `Record ID: ${id}.` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

export function generateRIS(record: ArchiveRecord): string {
  const lines: string[] = []
  const risType = mapRecordTypeToRIS(record.type)
  const year = extractYear(record.period)

  lines.push(`TY  - ${risType}`)

  if (record.title) lines.push(`TI  - ${record.title}`)
  if (record.creator) lines.push(`AU  - ${record.creator}`)
  if (year) lines.push(`PY  - ${year}`)
  if (record.institution || record.source) {
    lines.push(`PB  - ${record.institution || record.source}`)
  }
  if (record.collection) lines.push(`T2  - ${record.collection}`)
  if (record.sourceUrl) lines.push(`UR  - ${record.sourceUrl}`)
  if (record.recordIdentifier || record.archiveIdentifier) {
    lines.push(`ID  - ${record.recordIdentifier || record.archiveIdentifier}`)
  }

  lines.push('ER  -')
  return lines.join('\n')
}

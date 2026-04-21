import fs from 'fs/promises'
import path from 'path'

export type ArchiveRecord = {
  id: string
  title: string
  type: string
  creator: string
  region: string
  source: string
  summary: string
  tags: string[]
  published: boolean
  abstract?: string
  description?: string[]
  collection?: string
  institution?: string
  sourceUrl?: string
  sourceActionLabel?: string
  language?: string[]
  keywords?: string[]
  notes?: string[]
  archiveIdentifier?: string
  recordIdentifier?: string
}

const filePath = path.join(process.cwd(), 'data', 'records.json')

const defaultRecords: ArchiveRecord[] = []

export async function readRecords(): Promise<ArchiveRecord[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as ArchiveRecord[]
  } catch {
    return defaultRecords
  }
}

export async function writeRecords(records: ArchiveRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(records, null, 2), 'utf-8')
}
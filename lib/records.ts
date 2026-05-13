import fs from 'fs/promises'
import path from 'path'
import { normalizeArchiveRecord, type ArchiveRecord } from './archive-metadata'

export type { ArchiveRecord }

const filePath = path.join(process.cwd(), 'data', 'records.json')

const defaultRecords: ArchiveRecord[] = []

export async function readRecords(): Promise<ArchiveRecord[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return (JSON.parse(raw) as unknown[]).map(normalizeArchiveRecord)
  } catch {
    return defaultRecords
  }
}

export async function writeRecords(records: ArchiveRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(records.map(normalizeArchiveRecord), null, 2), 'utf-8')
}

import fs from 'fs/promises'
import path from 'path'
import { cache } from 'react'
import { normalizeArchiveRecord, type ArchiveRecord } from './archive-metadata'

export type { ArchiveRecord }

const filePath = path.join(process.cwd(), 'data', 'records.json')

const defaultRecords: ArchiveRecord[] = []

async function readRecordsUncached(): Promise<ArchiveRecord[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return (JSON.parse(raw) as unknown[]).map(normalizeArchiveRecord)
  } catch {
    return defaultRecords
  }
}

/** Dedupes parallel reads within a single server request. */
export const readRecords = cache(readRecordsUncached)

export async function writeRecords(records: ArchiveRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(records.map(normalizeArchiveRecord), null, 2), 'utf-8')
}

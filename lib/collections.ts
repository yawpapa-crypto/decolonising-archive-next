
import fs from 'fs/promises'
import path from 'path'

export type ArchiveCollection = {
  id: string
  title: string
  icon: string
  count: number
  region: string
  description: string
  published: boolean
}

const filePath = path.join(process.cwd(), 'data', 'collections.json')

const defaultCollections: ArchiveCollection[] = []

export async function readCollections(): Promise<ArchiveCollection[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as ArchiveCollection[]
  } catch {
    return defaultCollections
  }
}

export async function writeCollections(collections: ArchiveCollection[]): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(collections, null, 2), 'utf-8')
}


import fs from 'fs/promises'
import path from 'path'

export type ArchiveSource = {
  id: string
  name: string
  region: string
  type: string
  access: string
  description: string
  url: string
  published: boolean
}

const filePath = path.join(process.cwd(), 'data', 'sources.json')

const defaultSources: ArchiveSource[] = []

export async function readSources(): Promise<ArchiveSource[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as ArchiveSource[]
  } catch {
    return defaultSources
  }
}

export async function writeSources(sources: ArchiveSource[]): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(sources, null, 2), 'utf-8')
}


import fs from 'fs/promises'
import path from 'path'

export type HomeContent = {
  eyebrow: string
  heading: string
  intro: string
  featuredTitle: string
  collectionsTitle: string
  themesTitle: string
}

export type SiteContent = {
  home: HomeContent
}

const filePath = path.join(process.cwd(), 'data', 'site-content.json')

const defaultContent: SiteContent = {
  home: {
    eyebrow: 'Decolonising Archive',
    heading: 'The archive of decolonising knowledge',
    intro:
      'Books, oral histories, artefacts, images, textiles, posters, manuscripts, architectural documentation, and cultural records across Africa, the diaspora, and the Global South.',
    featuredTitle: 'Featured Records',
    collectionsTitle: 'Collections',
    themesTitle: 'Browse by Theme',
  },
}

export async function readSiteContent(): Promise<SiteContent> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as SiteContent
  } catch {
    return defaultContent
  }
}

export async function writeSiteContent(content: SiteContent): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf-8')
}

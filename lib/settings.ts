
import fs from 'fs/promises'
import path from 'path'

export type FooterLink = {
  label: string
  href: string
}

export type SiteSettings = {
  siteTitle: string
  navPrimaryLabel: string
  navSourcesLabel: string
  navAboutLabel: string
  footerLeftText: string
  footerLinks: FooterLink[]
  legalEyebrow: string
  archiveNote: string
}

const filePath = path.join(process.cwd(), 'data', 'settings.json')

const defaultSettings: SiteSettings = {
  siteTitle: 'Decolonising Archive',
  navPrimaryLabel: 'Library',
  navSourcesLabel: 'Sources',
  navAboutLabel: 'About',
  footerLeftText: 'Decolonising Archive, local-first discovery with live pathways.',
  footerLinks: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Copyright', href: '/copyright' },
    { label: 'Takedown', href: '/takedown' },
  ],
  legalEyebrow: 'Archive policies',
  archiveNote: 'A working archive of decolonising knowledge across Africa, the diaspora, and the Global South.',
}

export async function readSettings(): Promise<SiteSettings> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw) as SiteSettings
  } catch {
    return defaultSettings
  }
}

export async function writeSettings(settings: SiteSettings): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(settings, null, 2), 'utf-8')
}


'use client'

import { useEffect, useState } from 'react'

type FooterLink = {
  label: string
  href: string
}

type SiteSettings = {
  siteTitle: string
  navPrimaryLabel: string
  navSourcesLabel: string
  navAboutLabel: string
  footerLeftText: string
  footerLinks: FooterLink[]
  legalEyebrow: string
  archiveNote: string
}

const blankSettings: SiteSettings = {
  siteTitle: '',
  navPrimaryLabel: '',
  navSourcesLabel: '',
  navAboutLabel: '',
  footerLeftText: '',
  footerLinks: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Copyright', href: '/copyright' },
    { label: 'Takedown', href: '/takedown' },
  ],
  legalEyebrow: '',
  archiveNote: '',
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(blankSettings)
  const [status, setStatus] = useState('')

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch('/api/settings', { cache: 'no-store' })
        const data = await response.json()
        if (data?.ok && data.settings) {
          setSettings(data.settings)
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }

    loadSettings()
  }, [])

  function updateField<K extends keyof SiteSettings>(field: K, value: SiteSettings[K]) {
    setSettings((current) => ({ ...current, [field]: value }))
  }

  function updateFooterLink(index: number, key: keyof FooterLink, value: string) {
    setSettings((current) => {
      const nextLinks = [...current.footerLinks]
      nextLinks[index] = { ...nextLinks[index], [key]: value }
      return { ...current, footerLinks: nextLinks }
    })
  }

  async function handleSave() {
    setStatus('Saving...')
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })

      const data = await response.json()
      if (!response.ok || !data?.ok) throw new Error('Save failed')

      setStatus('Saved')
      window.setTimeout(() => setStatus(''), 2000)
    } catch (error) {
      console.error(error)
      setStatus('Save failed')
    }
  }

  return (
    <div className="admin-editor">
      <div className="admin-header">
        <div>
          <p className="admin-kicker">Settings</p>
          <h1>Site settings</h1>
          <p className="admin-subtext">
            Edit site-wide labels, footer content, and archive support text.
          </p>
        </div>

        <div className="admin-actions">
          <button className="admin-button" type="button" onClick={handleSave}>
            Save changes
          </button>
        </div>
      </div>

      {status ? <p className="admin-save-status">{status}</p> : null}

      <div className="admin-editor-grid">
        <section className="admin-form-panel">
          <div className="admin-form-section">
            <div className="admin-panel-label">Navigation and titles</div>

            <label className="admin-field">
              <span>Site title</span>
              <input
                type="text"
                value={settings.siteTitle}
                onChange={(e) => updateField('siteTitle', e.target.value)}
              />
            </label>

            <div className="admin-split-fields">
              <label className="admin-field">
                <span>Primary nav label</span>
                <input
                  type="text"
                  value={settings.navPrimaryLabel}
                  onChange={(e) => updateField('navPrimaryLabel', e.target.value)}
                />
              </label>

              <label className="admin-field">
                <span>Sources nav label</span>
                <input
                  type="text"
                  value={settings.navSourcesLabel}
                  onChange={(e) => updateField('navSourcesLabel', e.target.value)}
                />
              </label>
            </div>

            <label className="admin-field">
              <span>About nav label</span>
              <input
                type="text"
                value={settings.navAboutLabel}
                onChange={(e) => updateField('navAboutLabel', e.target.value)}
              />
            </label>
          </div>

          <div className="admin-form-section">
            <div className="admin-panel-label">Footer content</div>

            <label className="admin-field">
              <span>Footer left text</span>
              <textarea
                rows={4}
                value={settings.footerLeftText}
                onChange={(e) => updateField('footerLeftText', e.target.value)}
              />
            </label>

            {(settings.footerLinks || []).map((link, index) => (
              <div className="admin-split-fields" key={index}>
                <label className="admin-field">
                  <span>Footer link label</span>
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => updateFooterLink(index, 'label', e.target.value)}
                  />
                </label>

                <label className="admin-field">
                  <span>Footer link URL</span>
                  <input
                    type="text"
                    value={link.href}
                    onChange={(e) => updateFooterLink(index, 'href', e.target.value)}
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="admin-form-section">
            <div className="admin-panel-label">Archive support text</div>

            <label className="admin-field">
              <span>Legal eyebrow</span>
              <input
                type="text"
                value={settings.legalEyebrow}
                onChange={(e) => updateField('legalEyebrow', e.target.value)}
              />
            </label>

            <label className="admin-field">
              <span>Archive note</span>
              <textarea
                rows={5}
                value={settings.archiveNote}
                onChange={(e) => updateField('archiveNote', e.target.value)}
              />
            </label>
          </div>
        </section>

        <aside className="admin-preview-panel">
          <div className="admin-panel-label">Preview</div>

          <div className="admin-preview-card">
            <p className="admin-preview-eyebrow">{settings.siteTitle}</p>
            <h2>{settings.navPrimaryLabel} · {settings.navSourcesLabel} · {settings.navAboutLabel}</h2>
            <p>{settings.footerLeftText}</p>
            <p>{settings.archiveNote}</p>
            <div className="admin-preview-meta">
              {(settings.footerLinks || []).map((link, index) => (
                <span key={index}>{link.label}</span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

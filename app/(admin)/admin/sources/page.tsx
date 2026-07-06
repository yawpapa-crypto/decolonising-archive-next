
'use client'

import { useEffect, useMemo, useState } from 'react'

type ArchiveSource = {
  id: string
  name: string
  region: string
  type: string
  access: string
  description: string
  url: string
  published: boolean
}

const blankSource: ArchiveSource = {
  id: '',
  name: '',
  region: '',
  type: '',
  access: '',
  description: '',
  url: '',
  published: true,
}

export default function AdminSourcesPage() {
  const [sources, setSources] = useState<ArchiveSource[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    async function loadSources() {
      try {
        const response = await fetch('/api/sources', { cache: 'no-store' })
        const data = await response.json()
        if (data?.ok && Array.isArray(data.sources)) {
          setSources(data.sources)
          if (data.sources[0]?.id) setSelectedId(data.sources[0].id)
        }
      } catch (error) {
        console.error('Failed to load sources:', error)
      }
    }

    loadSources()
  }, [])

  const filteredSources = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return sources
    return sources.filter((source) =>
      [source.name, source.region, source.type, source.access, source.description, source.url]
        .join(' ')
        .toLowerCase()
        .includes(term)
    )
  }, [sources, query])

  const selectedSource =
    sources.find((source) => source.id === selectedId) ||
    filteredSources[0] ||
    null

  useEffect(() => {
    if (!selectedSource && filteredSources[0]) {
      setSelectedId(filteredSources[0].id)
    }
  }, [filteredSources, selectedSource])

  function updateSource<K extends keyof ArchiveSource>(field: K, value: ArchiveSource[K]) {
    setSources((current) =>
      current.map((source) =>
        source.id === selectedSource?.id ? { ...source, [field]: value } : source
      )
    )
  }

  function addNewSource() {
    const newId = `s${String(Date.now()).slice(-6)}`
    const next = { ...blankSource, id: newId, name: 'Untitled source' }
    setSources((current) => [next, ...current])
    setSelectedId(newId)
  }

  async function handleSave() {
    setStatus('Saving...')
    try {
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources }),
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
          <p className="admin-kicker">Sources</p>
          <h1>Archive sources</h1>
          <p className="admin-subtext">
            Edit source pathways, access types, regions, and public descriptions.
          </p>
        </div>

        <div className="admin-actions">
          <button className="admin-button admin-button-secondary" type="button" onClick={addNewSource}>
            New source
          </button>
          <button className="admin-button" type="button" onClick={handleSave}>
            Save changes
          </button>
        </div>
      </div>

      {status ? <p className="admin-save-status">{status}</p> : null}

      <div className="admin-records-layout">
        <aside className="admin-records-list">
          <div className="admin-panel-label">Source list</div>
          <input
            className="admin-search"
            type="text"
            placeholder="Search sources…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="admin-record-items">
            {filteredSources.map((source) => (
              <button
                key={source.id}
                type="button"
                className={`admin-record-item ${source.id === selectedSource?.id ? 'is-active' : ''}`}
                onClick={() => setSelectedId(source.id)}
              >
                <strong>{source.name}</strong>
                <div className="admin-record-item-meta">
                  <span>{source.type}</span>
                  <span>{source.region}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="admin-records-form">
          {selectedSource ? (
            <>
              <div className="admin-record-section">
                <div className="admin-panel-label">Core source metadata</div>

                <label className="admin-field">
                  <span>Name</span>
                  <input
                    type="text"
                    value={selectedSource.name}
                    onChange={(e) => updateSource('name', e.target.value)}
                  />
                </label>

                <label className="admin-field">
                  <span>Region</span>
                  <input
                    type="text"
                    value={selectedSource.region}
                    onChange={(e) => updateSource('region', e.target.value)}
                  />
                </label>

                <div className="admin-split-fields">
                  <label className="admin-field">
                    <span>Type</span>
                    <input
                      type="text"
                      value={selectedSource.type}
                      onChange={(e) => updateSource('type', e.target.value)}
                    />
                  </label>

                  <label className="admin-field">
                    <span>Access</span>
                    <input
                      type="text"
                      value={selectedSource.access}
                      onChange={(e) => updateSource('access', e.target.value)}
                    />
                  </label>
                </div>

                <label className="admin-field">
                  <span>URL</span>
                  <input
                    type="text"
                    value={selectedSource.url}
                    onChange={(e) => updateSource('url', e.target.value)}
                  />
                </label>
              </div>

              <div className="admin-record-section">
                <div className="admin-panel-label">Public description</div>

                <label className="admin-field">
                  <span>Description</span>
                  <textarea
                    rows={8}
                    value={selectedSource.description}
                    onChange={(e) => updateSource('description', e.target.value)}
                  />
                </label>

                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={selectedSource.published}
                    onChange={(e) => updateSource('published', e.target.checked)}
                  />
                  <span>Published</span>
                </label>
              </div>
            </>
          ) : (
            <div className="admin-empty-state">No source selected.</div>
          )}
        </section>

        <aside className="admin-records-preview">
          <div className="admin-panel-label">Preview</div>
          {selectedSource ? (
            <div className="admin-preview-card admin-preview-card-sticky">
              <p className="admin-preview-eyebrow">{selectedSource.type}</p>
              <h2>{selectedSource.name}</h2>
              <p>{selectedSource.description}</p>
              <div className="admin-preview-meta">
                <span>{selectedSource.region}</span>
                <span>{selectedSource.access}</span>
                {selectedSource.url ? <span>{selectedSource.url}</span> : null}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}

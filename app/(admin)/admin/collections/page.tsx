
'use client'

import { useEffect, useMemo, useState } from 'react'

type ArchiveCollection = {
  id: string
  title: string
  icon: string
  count: number
  region: string
  description: string
  published: boolean
}

const blankCollection: ArchiveCollection = {
  id: '',
  title: '',
  icon: '◈',
  count: 0,
  region: '',
  description: '',
  published: true,
}

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<ArchiveCollection[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    async function loadCollections() {
      try {
        const response = await fetch('/api/collections', { cache: 'no-store' })
        const data = await response.json()
        if (data?.ok && Array.isArray(data.collections)) {
          setCollections(data.collections)
          if (data.collections[0]?.id) setSelectedId(data.collections[0].id)
        }
      } catch (error) {
        console.error('Failed to load collections:', error)
      }
    }

    loadCollections()
  }, [])

  const filteredCollections = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return collections
    return collections.filter((collection) =>
      [collection.title, collection.region, collection.description, collection.icon]
        .join(' ')
        .toLowerCase()
        .includes(term)
    )
  }, [collections, query])

  const selectedCollection =
    collections.find((collection) => collection.id === selectedId) ||
    filteredCollections[0] ||
    null

  useEffect(() => {
    if (!selectedCollection && filteredCollections[0]) {
      setSelectedId(filteredCollections[0].id)
    }
  }, [filteredCollections, selectedCollection])

  function updateCollection<K extends keyof ArchiveCollection>(field: K, value: ArchiveCollection[K]) {
    setCollections((current) =>
      current.map((collection) =>
        collection.id === selectedCollection?.id ? { ...collection, [field]: value } : collection
      )
    )
  }

  function addNewCollection() {
    const newId = `c${String(Date.now()).slice(-6)}`
    const next = { ...blankCollection, id: newId, title: 'Untitled collection' }
    setCollections((current) => [next, ...current])
    setSelectedId(newId)
  }

  async function handleSave() {
    setStatus('Saving...')
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collections }),
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
          <p className="admin-kicker">Collections</p>
          <h1>Archive collections</h1>
          <p className="admin-subtext">
            Edit collection titles, icons, regions, counts, and public descriptions.
          </p>
        </div>

        <div className="admin-actions">
          <button className="admin-button admin-button-secondary" type="button" onClick={addNewCollection}>
            New collection
          </button>
          <button className="admin-button" type="button" onClick={handleSave}>
            Save changes
          </button>
        </div>
      </div>

      {status ? <p className="admin-save-status">{status}</p> : null}

      <div className="admin-records-layout">
        <aside className="admin-records-list">
          <div className="admin-panel-label">Collection list</div>
          <input
            className="admin-search"
            type="text"
            placeholder="Search collections…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="admin-record-items">
            {filteredCollections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                className={`admin-record-item ${collection.id === selectedCollection?.id ? 'is-active' : ''}`}
                onClick={() => setSelectedId(collection.id)}
              >
                <strong>{collection.title}</strong>
                <div className="admin-record-item-meta">
                  <span>{collection.region}</span>
                  <span>{collection.count} items</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="admin-records-form">
          {selectedCollection ? (
            <>
              <div className="admin-record-section">
                <div className="admin-panel-label">Core collection metadata</div>

                <label className="admin-field">
                  <span>Title</span>
                  <input
                    type="text"
                    value={selectedCollection.title}
                    onChange={(e) => updateCollection('title', e.target.value)}
                  />
                </label>

                <div className="admin-split-fields">
                  <label className="admin-field">
                    <span>Icon</span>
                    <input
                      type="text"
                      value={selectedCollection.icon}
                      onChange={(e) => updateCollection('icon', e.target.value)}
                    />
                  </label>

                  <label className="admin-field">
                    <span>Count</span>
                    <input
                      type="number"
                      value={selectedCollection.count}
                      onChange={(e) => updateCollection('count', Number(e.target.value) || 0)}
                    />
                  </label>
                </div>

                <label className="admin-field">
                  <span>Region</span>
                  <input
                    type="text"
                    value={selectedCollection.region}
                    onChange={(e) => updateCollection('region', e.target.value)}
                  />
                </label>
              </div>

              <div className="admin-record-section">
                <div className="admin-panel-label">Public description</div>

                <label className="admin-field">
                  <span>Description</span>
                  <textarea
                    rows={8}
                    value={selectedCollection.description}
                    onChange={(e) => updateCollection('description', e.target.value)}
                  />
                </label>

                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={selectedCollection.published}
                    onChange={(e) => updateCollection('published', e.target.checked)}
                  />
                  <span>Published</span>
                </label>
              </div>
            </>
          ) : (
            <div className="admin-empty-state">No collection selected.</div>
          )}
        </section>

        <aside className="admin-records-preview">
          <div className="admin-panel-label">Preview</div>
          {selectedCollection ? (
            <div className="admin-preview-card admin-preview-card-sticky">
              <p className="admin-preview-eyebrow">{selectedCollection.region}</p>
              <h2>{selectedCollection.icon} {selectedCollection.title}</h2>
              <p>{selectedCollection.description}</p>
              <div className="admin-preview-meta">
                <span>{selectedCollection.count} items</span>
                <span>{selectedCollection.region}</span>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}

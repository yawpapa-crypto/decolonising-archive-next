'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type ArchiveRecord = {
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

const blankRecord: ArchiveRecord = {
  id: '',
  title: '',
  type: '',
  creator: '',
  region: '',
  source: '',
  summary: '',
  tags: [],
  published: true,
  abstract: '',
  description: [],
  collection: '',
  institution: '',
  sourceUrl: '',
  sourceActionLabel: '',
  language: [],
  keywords: [],
  notes: [],
  archiveIdentifier: '',
  recordIdentifier: '',
}

export default function AdminRecordsPage() {
  const [records, setRecords] = useState<ArchiveRecord[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const skipQueryUrlSync = useRef(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setQuery(params.get('q') ?? '')
  }, [])

  useEffect(() => {
    if (skipQueryUrlSync.current) {
      skipQueryUrlSync.current = false
      return
    }
    const t = window.setTimeout(() => {
      const url = new URL(window.location.href)
      if (query.trim()) url.searchParams.set('q', query.trim())
      else url.searchParams.delete('q')
      window.history.replaceState(null, '', `${url.pathname}${url.search}`)
    }, 280)
    return () => window.clearTimeout(t)
  }, [query])

  useEffect(() => {
    async function loadRecords() {
      try {
        const response = await fetch('/api/records', { cache: 'no-store' })
        const data = await response.json()
        if (data?.ok && Array.isArray(data.records)) {
          setRecords(data.records)
          if (data.records[0]?.id) setSelectedId(data.records[0].id)
        }
      } catch (error) {
        console.error('Failed to load records:', error)
      }
    }
    loadRecords()
  }, [])

  const filteredRecords = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return records
    return records.filter((record) =>
      [
        record.title,
        record.creator,
        record.region,
        record.type,
        record.source,
        record.summary,
        record.abstract,
        record.collection,
        record.institution,
        (record.tags || []).join(' '),
        (record.keywords || []).join(' '),
      ].join(' ').toLowerCase().includes(term)
    )
  }, [records, query])

  const selectedRecord =
    records.find((record) => record.id === selectedId) ||
    filteredRecords[0] ||
    null

  useEffect(() => {
    if (!selectedRecord && filteredRecords[0]) setSelectedId(filteredRecords[0].id)
  }, [filteredRecords, selectedRecord])

  function updateRecord<K extends keyof ArchiveRecord>(field: K, value: ArchiveRecord[K]) {
    setRecords((current) =>
      current.map((record) =>
        record.id === selectedRecord?.id ? { ...record, [field]: value } : record
      )
    )
  }

  function updateListField(field: 'tags' | 'language' | 'keywords' | 'notes' | 'description', raw: string) {
    const values = raw
      .split(field === 'description' ? '\n' : ',')
      .map((item) => item.trim())
      .filter(Boolean)
    updateRecord(field, values)
  }

  function addNewRecord() {
    const newId = `l${String(Date.now()).slice(-6)}`
    const next = { ...blankRecord, id: newId, title: 'Untitled record' }
    setRecords((current) => [next, ...current])
    setSelectedId(newId)
  }

  async function handleSave() {
    setStatus('Saving...')
    try {
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
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
          <p className="admin-kicker">Records</p>
          <h1>Archive records</h1>
          <p className="admin-subtext">
            Search, review, and edit archive records, metadata, and public summaries.
          </p>
        </div>
        <div className="admin-actions">
          <button className="admin-button admin-button-secondary" type="button" onClick={addNewRecord}>
            New record
          </button>
          <button className="admin-button" type="button" onClick={handleSave}>
            Save changes
          </button>
        </div>
      </div>

      {status ? <p className="admin-save-status">{status}</p> : null}

      <div className="admin-records-layout">
        <aside className="admin-records-list">
          <div className="admin-panel-label">Record list</div>
          <input
            className="admin-search"
            type="text"
            placeholder="Search records…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="admin-record-items">
            {filteredRecords.map((record) => (
              <button
                key={record.id}
                type="button"
                className={`admin-record-item ${record.id === selectedRecord?.id ? 'is-active' : ''}`}
                onClick={() => setSelectedId(record.id)}
              >
                <strong>{record.title}</strong>
                <div className="admin-record-item-meta">
                  <span>{record.type}</span>
                  <span>{record.region}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="admin-records-form">
          {selectedRecord ? (
            <>
              <div className="admin-record-section">
                <div className="admin-panel-label">Core metadata</div>
                <label className="admin-field"><span>Title</span><input type="text" value={selectedRecord.title} onChange={(e) => updateRecord('title', e.target.value)} /></label>
                <label className="admin-field"><span>Creator</span><input type="text" value={selectedRecord.creator} onChange={(e) => updateRecord('creator', e.target.value)} /></label>
                <div className="admin-split-fields">
                  <label className="admin-field"><span>Type</span><input type="text" value={selectedRecord.type} onChange={(e) => updateRecord('type', e.target.value)} /></label>
                  <label className="admin-field"><span>Region</span><input type="text" value={selectedRecord.region} onChange={(e) => updateRecord('region', e.target.value)} /></label>
                </div>
                <label className="admin-field"><span>Source</span><input type="text" value={selectedRecord.source} onChange={(e) => updateRecord('source', e.target.value)} /></label>
                <label className="admin-field"><span>Collection</span><input type="text" value={selectedRecord.collection || ''} onChange={(e) => updateRecord('collection', e.target.value)} /></label>
                <label className="admin-field"><span>Institution</span><input type="text" value={selectedRecord.institution || ''} onChange={(e) => updateRecord('institution', e.target.value)} /></label>
              </div>

              <div className="admin-record-section">
                <div className="admin-panel-label">Narrative content</div>
                <label className="admin-field"><span>Abstract</span><textarea rows={4} value={selectedRecord.abstract || ''} onChange={(e) => updateRecord('abstract', e.target.value)} /></label>
                <label className="admin-field"><span>Summary</span><textarea rows={6} value={selectedRecord.summary} onChange={(e) => updateRecord('summary', e.target.value)} /></label>
                <label className="admin-field"><span>Description paragraphs</span><textarea rows={8} value={(selectedRecord.description || []).join('\n')} onChange={(e) => updateListField('description', e.target.value)} /></label>
              </div>

              <div className="admin-record-section">
                <div className="admin-panel-label">Discovery and linking</div>
                <label className="admin-field"><span>Tags</span><input type="text" value={(selectedRecord.tags || []).join(', ')} onChange={(e) => updateListField('tags', e.target.value)} /></label>
                <label className="admin-field"><span>Languages</span><input type="text" value={(selectedRecord.language || []).join(', ')} onChange={(e) => updateListField('language', e.target.value)} /></label>
                <label className="admin-field"><span>Keywords</span><input type="text" value={(selectedRecord.keywords || []).join(', ')} onChange={(e) => updateListField('keywords', e.target.value)} /></label>
                <label className="admin-field"><span>Source URL</span><input type="text" value={selectedRecord.sourceUrl || ''} onChange={(e) => updateRecord('sourceUrl', e.target.value)} /></label>
                <label className="admin-field"><span>Source action label</span><input type="text" value={selectedRecord.sourceActionLabel || ''} onChange={(e) => updateRecord('sourceActionLabel', e.target.value)} /></label>
              </div>

              <div className="admin-record-section">
                <div className="admin-panel-label">Editorial notes and identifiers</div>
                <label className="admin-field"><span>Notes</span><textarea rows={5} value={(selectedRecord.notes || []).join('\n')} onChange={(e) => updateListField('notes', e.target.value)} /></label>
                <div className="admin-split-fields">
                  <label className="admin-field"><span>Archive identifier</span><input type="text" value={selectedRecord.archiveIdentifier || ''} onChange={(e) => updateRecord('archiveIdentifier', e.target.value)} /></label>
                  <label className="admin-field"><span>Record identifier</span><input type="text" value={selectedRecord.recordIdentifier || ''} onChange={(e) => updateRecord('recordIdentifier', e.target.value)} /></label>
                </div>
                <label className="admin-check">
                  <input type="checkbox" checked={selectedRecord.published} onChange={(e) => updateRecord('published', e.target.checked)} />
                  <span>Published</span>
                </label>
              </div>
            </>
          ) : (
            <div className="admin-empty-state">No record selected.</div>
          )}
        </section>

        <aside className="admin-records-preview">
          <div className="admin-panel-label">Preview</div>
          {selectedRecord ? (
            <div className="admin-preview-card admin-preview-card-sticky">
              <p className="admin-preview-eyebrow">{selectedRecord.type}</p>
              <h2>{selectedRecord.title}</h2>
              <p>{selectedRecord.creator}</p>
              {selectedRecord.abstract ? <p>{selectedRecord.abstract}</p> : null}
              <p>{selectedRecord.summary}</p>
              <div className="admin-preview-meta">
                {selectedRecord.region ? <span>{selectedRecord.region}</span> : null}
                {selectedRecord.source ? <span>{selectedRecord.source}</span> : null}
                {(selectedRecord.tags || []).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
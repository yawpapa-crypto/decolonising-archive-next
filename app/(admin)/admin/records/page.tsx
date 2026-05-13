'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ACCESS_TYPES,
  COMMUNITY_GROUPS,
  COMMUNITY_REVIEW_STATUSES,
  CULTURAL_SENSITIVITIES,
  CURATED_COLLECTIONS,
  KNOWLEDGE_AREAS,
  LANGUAGES,
  LICENCES,
  PERIODS,
  RECORD_TYPES,
  REGIONS,
  REUSE_PERMISSIONS,
  RIGHTS_STATUSES,
  SCRIPTS,
  SOURCE_TYPES,
  VERIFICATION_STATUSES,
  canPublishRecord,
  getAdminMetadataIssues,
  normalizeArchiveRecord,
  type ArchiveRecord,
} from '@/lib/archive-metadata'

const blankRecord: ArchiveRecord = normalizeArchiveRecord({
  id: '',
  title: '',
  description: '',
  recordType: [],
  knowledgeAreas: [],
  region: [],
  sourceName: '',
  sourceUrl: '',
  citation: '',
  language: [],
  rightsStatus: 'Rights Unknown',
  accessType: 'Metadata Only',
  reusePermission: 'Check Original Source',
  culturalSensitivity: 'Public',
  communityReviewStatus: 'Not Required',
  verificationStatus: 'Provisional',
  dateAccessed: '',
  status: 'Draft',
  published: false,
})

type MultiField =
  | 'recordType'
  | 'knowledgeAreas'
  | 'curatedCollections'
  | 'region'
  | 'country'
  | 'communityOrCulturalGroup'
  | 'language'
  | 'script'
  | 'period'

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
          setRecords(data.records.map((record: unknown) => normalizeArchiveRecord(record)))
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
        record.region.join(' '),
        record.recordType.join(' '),
        record.sourceName,
        record.summary,
        record.description,
        record.curatedCollections?.join(' '),
        record.knowledgeAreas.join(' '),
        record.rightsStatus,
        record.accessType,
        record.culturalSensitivity,
        record.verificationStatus,
        (record.tags || []).join(' '),
      ].join(' ').toLowerCase().includes(term)
    )
  }, [records, query])

  const reviewStats = useMemo(() => {
    const counts = {
      missingRightsStatus: 0,
      missingSourceUrl: 0,
      missingCitation: 0,
      rightsUnknown: 0,
      culturalReviewNeeded: 0,
      aiAssisted: 0,
      provisional: 0,
      duplicateMetadataTerms: 0,
      missingLanguage: 0,
      missingDateAccessed: 0,
      externalCreativeCommons: 0,
      externalPublicDomain: 0,
      externalOpenAccessLicenceMissing: 0,
      externalRequiresSourceCheck: 0,
      externalNoRightsMetadata: 0,
    }
    records.forEach((record) => {
      const isExternalRecord = Boolean(
        record.sourceUrl &&
        !['Local Bank', 'Decolonising Archive local index', 'African Philosophy Working Library'].includes(record.sourceName || record.source || '')
      )
      if (!record.rightsStatus) counts.missingRightsStatus += 1
      if (!record.sourceUrl) counts.missingSourceUrl += 1
      if (!record.citation) counts.missingCitation += 1
      if (record.rightsStatus === 'Rights Unknown') counts.rightsUnknown += 1
      if (record.culturalSensitivity === 'Community Review Needed') counts.culturalReviewNeeded += 1
      if (record.aiAssisted || record.verificationStatus === 'AI-Assisted, Needs Review') counts.aiAssisted += 1
      if (record.verificationStatus === 'Provisional' || record.status === 'Provisional') counts.provisional += 1
      if (!record.language.length) counts.missingLanguage += 1
      if (!record.dateAccessed) counts.missingDateAccessed += 1
      const areaSlugs = record.knowledgeAreas.map((area) => area.toLowerCase())
      if (new Set(areaSlugs).size !== areaSlugs.length) counts.duplicateMetadataTerms += 1
      if (isExternalRecord && record.rightsStatus === 'Creative Commons') counts.externalCreativeCommons += 1
      if (isExternalRecord && record.rightsStatus === 'Public Domain') counts.externalPublicDomain += 1
      if (isExternalRecord && record.rightsStatus === 'Open Access' && (!record.licence || record.licence === 'Check source')) {
        counts.externalOpenAccessLicenceMissing += 1
      }
      if (isExternalRecord && record.rightsStatus === 'Check source') counts.externalRequiresSourceCheck += 1
      if (isExternalRecord && !record.rightsStatus && !record.licence && !record.rightsStatementUri) counts.externalNoRightsMetadata += 1
    })
    return counts
  }, [records])

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
        record.id === selectedRecord?.id ? normalizeArchiveRecord({ ...record, [field]: value }) : record
      )
    )
  }

  function updateListField(field: MultiField | 'tags' | 'notes' | 'alternativeTitles', raw: string) {
    const values = raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    updateRecord(field, values)
  }

  function updateDescription(raw: string) {
    updateRecord('description', raw)
  }

  function toggleListValue(field: MultiField, value: string) {
    const current = new Set(selectedRecord?.[field] || [])
    if (current.has(value)) current.delete(value)
    else current.add(value)
    updateRecord(field, Array.from(current) as ArchiveRecord[typeof field])
  }

  function addNewRecord() {
    const newId = `l${String(Date.now()).slice(-6)}`
    const next = normalizeArchiveRecord({ ...blankRecord, id: newId, title: 'Untitled record', createdAt: new Date().toISOString() })
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
      if (Array.isArray(data.records)) setRecords(data.records.map((record: unknown) => normalizeArchiveRecord(record)))
      setStatus('Saved')
      window.setTimeout(() => setStatus(''), 2000)
    } catch (error) {
      console.error(error)
      setStatus('Save failed')
    }
  }

  function renderCheckboxGroup(label: string, field: MultiField, options: readonly string[]) {
    if (!selectedRecord) return null
    const selected = new Set(selectedRecord[field] || [])
    return (
      <div className="admin-field admin-checkbox-group">
        <span>{label}</span>
        <div className="admin-checkbox-grid">
          {options.map((option) => (
            <label key={option} className="admin-check admin-check-compact">
              <input
                type="checkbox"
                checked={selected.has(option)}
                onChange={() => toggleListValue(field, option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }

  const publishCheck = selectedRecord ? canPublishRecord(selectedRecord) : { ok: false, missing: [] }
  const selectedIssues = selectedRecord ? getAdminMetadataIssues(selectedRecord) : []

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

      <section className="admin-review-dashboard" aria-label="Metadata review dashboard">
        {[
          ['Missing rights status', reviewStats.missingRightsStatus],
          ['Missing source URL', reviewStats.missingSourceUrl],
          ['Missing citation', reviewStats.missingCitation],
          ['Rights unknown', reviewStats.rightsUnknown],
          ['Cultural review needed', reviewStats.culturalReviewNeeded],
          ['AI-assisted', reviewStats.aiAssisted],
          ['Provisional', reviewStats.provisional],
          ['Duplicate metadata terms', reviewStats.duplicateMetadataTerms],
          ['Missing language', reviewStats.missingLanguage],
          ['Missing date accessed', reviewStats.missingDateAccessed],
          ['External Creative Commons licence', reviewStats.externalCreativeCommons],
          ['External Public Domain', reviewStats.externalPublicDomain],
          ['External OA, licence missing', reviewStats.externalOpenAccessLicenceMissing],
          ['External requiring source check', reviewStats.externalRequiresSourceCheck],
          ['External no rights metadata', reviewStats.externalNoRightsMetadata],
        ].map(([label, count]) => (
          <div className="admin-review-stat" key={label}>
            <strong>{count}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

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
                  <span>{record.recordType.join(', ')}</span>
                  <span>{record.region.join(', ')}</span>
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
                <label className="admin-field"><span>Creator</span><input type="text" value={selectedRecord.creator || ''} onChange={(e) => updateRecord('creator', e.target.value)} /></label>
                <label className="admin-field"><span>Alternative titles</span><input type="text" value={(selectedRecord.alternativeTitles || []).join(', ')} onChange={(e) => updateListField('alternativeTitles', e.target.value)} /></label>
                {renderCheckboxGroup('Record Type', 'recordType', RECORD_TYPES)}
                {renderCheckboxGroup('Knowledge Area', 'knowledgeAreas', KNOWLEDGE_AREAS)}
                {renderCheckboxGroup('Region', 'region', REGIONS)}
                <div className="admin-split-fields">
                  <label className="admin-field"><span>Country</span><input type="text" value={(selectedRecord.country || []).join(', ')} onChange={(e) => updateListField('country', e.target.value)} /></label>
                  <label className="admin-field"><span>Community / Cultural Group</span><input type="text" value={(selectedRecord.communityOrCulturalGroup || []).join(', ')} onChange={(e) => updateListField('communityOrCulturalGroup', e.target.value)} list="community-options" /></label>
                </div>
                <datalist id="community-options">{COMMUNITY_GROUPS.map((group) => <option key={group} value={group} />)}</datalist>
                {renderCheckboxGroup('Curated Collection', 'curatedCollections', CURATED_COLLECTIONS)}
              </div>

              <div className="admin-record-section">
                <div className="admin-panel-label">Narrative content</div>
                <label className="admin-field"><span>Summary</span><textarea rows={4} value={selectedRecord.summary || ''} onChange={(e) => updateRecord('summary', e.target.value)} /></label>
                <label className="admin-field"><span>Description</span><textarea rows={8} value={selectedRecord.description || ''} onChange={(e) => updateDescription(e.target.value)} /></label>
              </div>

              <div className="admin-record-section">
                <div className="admin-panel-label">Language, date and source</div>
                {renderCheckboxGroup('Language', 'language', LANGUAGES)}
                {renderCheckboxGroup('Script / Writing System', 'script', SCRIPTS)}
                {renderCheckboxGroup('Date / Period', 'period', PERIODS)}
                <div className="admin-split-fields">
                  <label className="admin-field"><span>Date created</span><input type="text" value={selectedRecord.dateCreated || ''} onChange={(e) => updateRecord('dateCreated', e.target.value)} /></label>
                  <label className="admin-field"><span>Date published</span><input type="text" value={selectedRecord.datePublished || ''} onChange={(e) => updateRecord('datePublished', e.target.value)} /></label>
                </div>
                <div className="admin-split-fields">
                  <label className="admin-field"><span>Date digitised</span><input type="text" value={selectedRecord.dateDigitised || ''} onChange={(e) => updateRecord('dateDigitised', e.target.value)} /></label>
                  <label className="admin-field"><span>Date accessed</span><input type="date" value={selectedRecord.dateAccessed || ''} onChange={(e) => updateRecord('dateAccessed', e.target.value)} /></label>
                </div>
                <label className="admin-field"><span>Source name</span><input type="text" value={selectedRecord.sourceName} onChange={(e) => updateRecord('sourceName', e.target.value)} /></label>
                <label className="admin-field"><span>Source URL</span><input type="url" value={selectedRecord.sourceUrl} onChange={(e) => updateRecord('sourceUrl', e.target.value)} /></label>
                <label className="admin-field"><span>Citation</span><textarea rows={3} value={selectedRecord.citation} onChange={(e) => updateRecord('citation', e.target.value)} /></label>
                <label className="admin-field"><span>Source Type</span><select value={selectedRecord.sourceType || ''} onChange={(e) => updateRecord('sourceType', e.target.value)}><option value="">Select source type</option>{SOURCE_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              </div>

              <div className="admin-record-section">
                <div className="admin-panel-label">Rights and access</div>
                <div className="admin-split-fields">
                  <label className="admin-field"><span>Rights Status</span><select value={selectedRecord.rightsStatus} onChange={(e) => updateRecord('rightsStatus', e.target.value)}>{RIGHTS_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                  <label className="admin-field"><span>Licence</span><select value={selectedRecord.licence || ''} onChange={(e) => updateRecord('licence', e.target.value)}><option value="">Select licence</option>{LICENCES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                </div>
                <div className="admin-split-fields">
                  <label className="admin-field"><span>Access Type</span><select value={selectedRecord.accessType} onChange={(e) => updateRecord('accessType', e.target.value)}>{ACCESS_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                  <label className="admin-field"><span>Reuse Permission</span><select value={selectedRecord.reusePermission || ''} onChange={(e) => updateRecord('reusePermission', e.target.value)}>{REUSE_PERMISSIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                </div>
                <label className="admin-field"><span>Rights holder</span><input type="text" value={selectedRecord.rightsHolder || ''} onChange={(e) => updateRecord('rightsHolder', e.target.value)} /></label>
                <label className="admin-field"><span>Rights statement URI</span><input type="url" value={selectedRecord.rightsStatementUri || ''} onChange={(e) => updateRecord('rightsStatementUri', e.target.value)} /></label>
                <label className="admin-field"><span>Copyright note</span><textarea rows={3} value={selectedRecord.copyrightNote || ''} onChange={(e) => updateRecord('copyrightNote', e.target.value)} /></label>
              </div>

              <div className="admin-record-section">
                <div className="admin-panel-label">Cultural protocol and review</div>
                <div className="admin-split-fields">
                  <label className="admin-field"><span>Cultural Sensitivity</span><select value={selectedRecord.culturalSensitivity} onChange={(e) => updateRecord('culturalSensitivity', e.target.value)}>{CULTURAL_SENSITIVITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                  <label className="admin-field"><span>Community Review Status</span><select value={selectedRecord.communityReviewStatus || ''} onChange={(e) => updateRecord('communityReviewStatus', e.target.value)}>{COMMUNITY_REVIEW_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                </div>
                <label className="admin-field"><span>Traditional owners or knowledge holders</span><input type="text" value={selectedRecord.traditionalOwnersOrKnowledgeHolders || ''} onChange={(e) => updateRecord('traditionalOwnersOrKnowledgeHolders', e.target.value)} /></label>
                <label className="admin-field"><span>Cultural protocol note</span><textarea rows={3} value={selectedRecord.culturalProtocolNote || ''} onChange={(e) => updateRecord('culturalProtocolNote', e.target.value)} /></label>
                <label className="admin-field"><span>Reparative description note</span><textarea rows={3} value={selectedRecord.reparativeDescriptionNote || ''} onChange={(e) => updateRecord('reparativeDescriptionNote', e.target.value)} /></label>
                <div className="admin-split-fields">
                  <label className="admin-field"><span>Local Contexts Label</span><input type="text" value={selectedRecord.localContextsLabel || ''} onChange={(e) => updateRecord('localContextsLabel', e.target.value)} /></label>
                  <label className="admin-field"><span>Local Contexts Notice</span><input type="text" value={selectedRecord.localContextsNotice || ''} onChange={(e) => updateRecord('localContextsNotice', e.target.value)} /></label>
                </div>
                <label className="admin-check">
                  <input type="checkbox" checked={Boolean(selectedRecord.colonialLanguageWarning)} onChange={(e) => updateRecord('colonialLanguageWarning', e.target.checked)} />
                  <span>Colonial language warning</span>
                </label>
              </div>

              <div className="admin-record-section">
                <div className="admin-panel-label">Verification and admin review</div>
                <div className="admin-split-fields">
                  <label className="admin-field"><span>Verification Status</span><select value={selectedRecord.verificationStatus} onChange={(e) => updateRecord('verificationStatus', e.target.value)}>{VERIFICATION_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                  <label className="admin-field"><span>Status</span><select value={selectedRecord.status || 'Draft'} onChange={(e) => updateRecord('status', e.target.value as ArchiveRecord['status'])}><option>Draft</option><option>Provisional</option><option>Needs Review</option><option>Published</option></select></label>
                </div>
                <div className="admin-check-row">
                  <label className="admin-check"><input type="checkbox" checked={Boolean(selectedRecord.sourceChecked)} onChange={(e) => updateRecord('sourceChecked', e.target.checked)} /><span>Source checked</span></label>
                  <label className="admin-check"><input type="checkbox" checked={Boolean(selectedRecord.rightsChecked)} onChange={(e) => updateRecord('rightsChecked', e.target.checked)} /><span>Rights checked</span></label>
                  <label className="admin-check"><input type="checkbox" checked={Boolean(selectedRecord.metadataReviewed)} onChange={(e) => updateRecord('metadataReviewed', e.target.checked)} /><span>Metadata reviewed</span></label>
                  <label className="admin-check"><input type="checkbox" checked={Boolean(selectedRecord.aiAssisted)} onChange={(e) => updateRecord('aiAssisted', e.target.checked)} /><span>AI-assisted record</span></label>
                </div>
                <label className="admin-field"><span>Tags</span><input type="text" value={(selectedRecord.tags || []).join(', ')} onChange={(e) => updateListField('tags', e.target.value)} /></label>
                <label className="admin-field"><span>Notes</span><textarea rows={5} value={(selectedRecord.notes || []).join('\n')} onChange={(e) => updateListField('notes', e.target.value)} /></label>
                <div className="admin-split-fields">
                  <label className="admin-field"><span>Identifier</span><input type="text" value={selectedRecord.identifier || ''} onChange={(e) => updateRecord('identifier', e.target.value)} /></label>
                  <label className="admin-field"><span>DOI</span><input type="text" value={selectedRecord.doi || ''} onChange={(e) => updateRecord('doi', e.target.value)} /></label>
                </div>
                <label className="admin-check">
                  <input type="checkbox" checked={selectedRecord.status === 'Published'} onChange={(e) => updateRecord('status', e.target.checked ? 'Published' : 'Needs Review')} />
                  <span>Request public publishing</span>
                </label>
                {!publishCheck.ok ? <div className="admin-warning">Cannot publish yet: {publishCheck.missing.join(', ')}</div> : null}
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
              <p className="admin-preview-eyebrow">{selectedRecord.recordType.join(', ')}</p>
              <h2>{selectedRecord.title}</h2>
              <p>{selectedRecord.creator}</p>
              <p>{selectedRecord.summary || selectedRecord.description}</p>
              <div className="admin-warning-list">
                {selectedIssues.map((issue) => <span key={issue}>{issue}</span>)}
              </div>
              <div className="admin-preview-meta">
                {selectedRecord.region.length ? <span>{selectedRecord.region.join(', ')}</span> : null}
                {selectedRecord.sourceName ? <span>{selectedRecord.sourceName}</span> : null}
                <span>{selectedRecord.rightsStatus}</span>
                <span>{selectedRecord.accessType}</span>
                <span>{selectedRecord.verificationStatus}</span>
                {selectedRecord.culturalSensitivity !== 'Public' ? <span>{selectedRecord.culturalSensitivity}</span> : null}
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

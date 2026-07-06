"use client";

import React, { useEffect, useState } from "react";

type Props = { projectId: string; recordId: string };

type ExtractionField = {
  id?: string;
  field_key?: string;
  name: string;
};

type ExtractionValue = {
  id: string;
  field_id?: string;
  field_key?: string;
  value?: string;
};

export default function ExtractionForm({ projectId, recordId }: Props) {
  const [fields, setFields] = useState<ExtractionField[]>([]);
  const [extractions, setExtractions] = useState<ExtractionValue[]>([]);
  const [saving, setSaving] = useState(false);

  async function save(fieldId: string, value: string) {
    setSaving(true);
      const optimistic: ExtractionValue = { id: `temp-${fieldId}`, field_id: fieldId, value };
    setExtractions((s) => [optimistic, ...s.filter((e) => e.field_id !== fieldId)]);
    try {
      const res = await fetch('/api/workbench/review/extractions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, fieldId, recordId, value }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed');
      // reload values
      const r = await fetch(`/api/workbench/review/extractions?projectId=${encodeURIComponent(projectId)}&recordId=${encodeURIComponent(recordId)}`);
      const d = await r.json();
      if (d.ok) setExtractions(d.extractions || []);
    } catch {
      // no-op; optimistic was already removed by reload attempt
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    fetch(`/api/workbench/review/fields?projectId=${encodeURIComponent(projectId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        if (data.ok) setFields(data.fields || []);
      })
      .catch(() => {});

    fetch(`/api/workbench/review/extractions?projectId=${encodeURIComponent(projectId)}&recordId=${encodeURIComponent(recordId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        if (data.ok) setExtractions(data.extractions || []);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [projectId, recordId]);

  return (
    <div className="workbench-extraction-form">
      <h4>Extraction</h4>
      <p>Project: {projectId}</p>
      <p>Record: {recordId}</p>
      {saving ? <p>Saving extraction value...</p> : null}
      <p>{fields.length ? `${fields.length} fields available` : "No extraction fields configured."}</p>
      <p>{extractions.length ? `${extractions.length} extracted values` : "No extractions yet."}</p>

      <div className="extraction-fields">
        {fields.map((f) => {
          const fieldId = f.id ?? f.field_key ?? "";
          const existing = extractions.find((e) => e.field_id === f.id || e.field_id === f.field_key || e.field_key === f.field_key);
          if (!fieldId) return null;
          return (
              <div key={fieldId} className="extraction-field">
                <label htmlFor={`field-${fieldId}`}>{f.name}</label>
                <input id={`field-${fieldId}`} aria-label={`Extraction ${f.name}`} className="workbench-input" defaultValue={existing?.value ?? ''} onBlur={(e) => save(fieldId, e.target.value)} />
              </div>
          );
        })}
      </div>
    </div>
  );
}

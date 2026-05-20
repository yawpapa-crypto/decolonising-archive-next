"use client";

import React, { useEffect, useState } from "react";

type Props = { projectId: string; recordId: string };

export default function ExtractionForm({ projectId, recordId }: Props) {
  const [fields, setFields] = useState<any[]>([]);
  const [extractions, setExtractions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  async function save(fieldId: string, value: string) {
    setSaving(true);
    const optimistic = { id: `temp-${fieldId}`, field_id: fieldId, value };
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
    } catch (err) {
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
      <p>{fields.length ? `${fields.length} fields available` : "No extraction fields configured."}</p>
      <p>{extractions.length ? `${extractions.length} extracted values` : "No extractions yet."}</p>

      <div className="extraction-fields">
        {fields.map((f) => {
          const existing = extractions.find((e) => e.field_id === f.id || e.field_id === f.field_key || e.field_key === f.field_key);
          return (
            <div key={f.id ?? f.field_key} className="extraction-field">
              <label>{f.name}</label>
              <input defaultValue={existing?.value ?? ''} onBlur={(e) => save(f.id ?? f.field_key, e.target.value)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

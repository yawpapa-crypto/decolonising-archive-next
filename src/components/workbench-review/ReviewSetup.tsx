"use client";

import React, { useEffect, useState } from "react";

type Props = { projectId: string };

export default function ReviewSetup({ projectId }: Props) {
  const [fields, setFields] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newType, setNewType] = useState("text");

  useEffect(() => {
    let mounted = true;
    fetch(`/api/workbench/review/fields?projectId=${encodeURIComponent(projectId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        if (data.ok) setFields(data.fields || []);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [projectId]);

  return (
    <div className="workbench-review-setup">
      <h3>Review Setup</h3>
      <p>Project: {projectId}</p>
      <p>{fields.length ? `${fields.length} extraction fields configured` : "No extraction fields yet."}</p>

      <div className="create-field">
        <h4>Add extraction field</h4>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Field name" />
        <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="Field key" />
        <select value={newType} onChange={(e) => setNewType(e.target.value)}>
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
        </select>
        <button
          disabled={creating || !newName || !newKey}
          onClick={async () => {
            setCreating(true);
            const optimistic = { id: `temp-${Date.now()}`, name: newName, field_key: newKey, field_type: newType };
            setFields((s) => [optimistic, ...s]);
            try {
              const res = await fetch('/api/workbench/review/fields', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, field: { fieldKey: newKey, name: newName, fieldType: newType } }),
              });
              const data = await res.json();
              if (!data.ok) throw new Error(data.error || 'Failed');
              // replace optimistic id with real id if returned
              setFields((s) => s.map((f) => (f.id === optimistic.id ? { ...f, id: data.fieldId ?? f.id } : f)));
              setNewName(''); setNewKey(''); setNewType('text');
            } catch (err) {
              setFields((s) => s.filter((f) => f.id !== optimistic.id));
            } finally {
              setCreating(false);
            }
          }}
        >
          Add field
        </button>
      </div>
    </div>
  );
}

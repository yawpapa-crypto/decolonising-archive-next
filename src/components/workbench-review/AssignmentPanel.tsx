"use client";

import React, { useEffect, useState } from "react";

type Props = { projectId: string };

export default function AssignmentPanel({ projectId }: Props) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [recordId, setRecordId] = useState('');
  const [assigneeUserId, setAssigneeUserId] = useState('');

  async function assign() {
    if (!recordId || !assigneeUserId) return;
    setAssigning(true);
    const optimistic = { id: `temp-${Date.now()}`, record_id: recordId, assignee_user_id: assigneeUserId };
    setAssignments((s) => [optimistic, ...s]);
    try {
      const res = await fetch('/api/workbench/review/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, recordId, assigneeUserId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed');
      const r = await fetch(`/api/workbench/review/assignments?projectId=${encodeURIComponent(projectId)}`);
      const d = await r.json();
      if (d.ok) setAssignments(d.assignments || []);
    } catch (err) {
      setAssignments((s) => s.filter((a) => a.id !== optimistic.id));
    } finally {
      setAssigning(false);
      setRecordId(''); setAssigneeUserId('');
    }
  }

  useEffect(() => {
    let mounted = true;
    fetch(`/api/workbench/review/assignments?projectId=${encodeURIComponent(projectId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        if (data.ok) setAssignments(data.assignments || []);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [projectId]);

  return (
    <div className="workbench-assignment-panel">
      <h4>Assignments</h4>
      <p>Project: {projectId}</p>
      <p>{assignments.length ? `${assignments.length} assignments` : "No assignments yet."}</p>

      <div className="assign-form">
        <input placeholder="Record ID" value={recordId} onChange={(e) => setRecordId(e.target.value)} />
        <input placeholder="Assignee user id" value={assigneeUserId} onChange={(e) => setAssigneeUserId(e.target.value)} />
        <button disabled={assigning} onClick={assign}>Assign</button>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";

type Props = { projectId: string };

type ReviewScreening = {
  id?: string;
  record_id: string;
  screening_status: string;
};

export default function ScreeningWorkspace({ projectId }: Props) {
  const [screenings, setScreenings] = useState<ReviewScreening[]>([]);

  async function decide(recordId: string, status: string) {
    // optimistic update
    setScreenings((s) => s.map((it) => (it.record_id === recordId ? { ...it, screening_status: status } : it)));
    try {
      const res = await fetch('/api/workbench/review/screenings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, recordId, screeningStatus: status }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed');
    } catch {
      // rollback by reloading
      const r = await fetch(`/api/workbench/review/screenings?projectId=${encodeURIComponent(projectId)}`);
      const d = await r.json();
      if (d.ok) setScreenings(d.screenings || []);
    }
  }

  useEffect(() => {
    let mounted = true;
    fetch(`/api/workbench/review/screenings?projectId=${encodeURIComponent(projectId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        if (data.ok) setScreenings(data.screenings || []);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [projectId]);

  return (
    <div className="workbench-screening-workspace">
      <h3>Screening Workspace</h3>
      <p>Project: {projectId}</p>
      <p>{screenings.length ? `${screenings.length} screenings` : "No screenings yet."}</p>
      <div className="screening-list">
        {screenings.map((s) => (
          <div key={s.record_id} className="screening-item">
            <div>{s.record_id}</div>
            <div>Status: <strong>{s.screening_status}</strong></div>
            <div>
              <button type="button" aria-label={`include-${s.record_id}`} className="workbench-button" onClick={() => decide(s.record_id, 'included')}>Include</button>
              <button type="button" aria-label={`exclude-${s.record_id}`} className="workbench-button workbench-button-secondary" onClick={() => decide(s.record_id, 'excluded')}>Exclude</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

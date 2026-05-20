"use client";

import React from "react";

type Comment = { id: string; userId: string; body: string; createdAt: string };

type Props = { projectId: string; recordId: string; comments?: Comment[] };

export default function CommentsThread({ projectId, recordId, comments = [] }: Props) {
  const [remoteComments, setRemoteComments] = React.useState<Comment[]>(comments);
  const [sending, setSending] = React.useState(false);
  const [text, setText] = React.useState('');

  async function post() {
    if (!text.trim()) return;
    setSending(true);
    const optimistic = { id: `temp-${Date.now()}`, userId: 'me', body: text.trim(), createdAt: new Date().toISOString() };
    setRemoteComments((c) => [optimistic, ...c]);
    try {
      const res = await fetch('/api/workbench/review/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, recordId, body: text }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed');
      const r = await fetch(`/api/workbench/review/comments?projectId=${encodeURIComponent(projectId)}&recordId=${encodeURIComponent(recordId)}`);
      const d = await r.json();
      if (d.ok) setRemoteComments(d.comments || []);
      setText('');
    } catch {
      setRemoteComments((c) => c.filter((x) => x.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  React.useEffect(() => {
    let mounted = true;
    fetch(`/api/workbench/review/comments?projectId=${encodeURIComponent(projectId)}&recordId=${encodeURIComponent(recordId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        if (data.ok) setRemoteComments(data.comments || []);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [projectId, recordId]);

  return (
    <div className="workbench-comments-thread">
      <h4>Comments</h4>
      <p>Project: {projectId} — Record: {recordId}</p>
      <div>
        {remoteComments.length ? (
          remoteComments.map((c) => (
            <div key={c.id} className="comment">
              <small>{c.userId} • {c.createdAt}</small>
              <div>{c.body}</div>
            </div>
          ))
        ) : (
          <div className="empty">No comments yet.</div>
        )}
      </div>
      <div className="comment-form">
        <label htmlFor="new-comment" className="workbench-card-label">Add a comment</label>
        <textarea id="new-comment" aria-label="New comment" value={text} onChange={(e) => setText(e.target.value)} className="workbench-textarea" />
        <div>
          <button type="button" className="workbench-button-primary" disabled={sending} onClick={post}>Post comment</button>
        </div>
      </div>
    </div>
  );
}

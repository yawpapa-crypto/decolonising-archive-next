"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CatalogueRecord } from "@/lib/catalogue/types";
import { evidenceStatusLabel, EVIDENCE_BADGE_CLASS } from "@/lib/catalogue/evidence-status";

export default function CatalogueVerificationAdminPage() {
  const [rows, setRows] = useState<CatalogueRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/catalogue-verification")
      .then((r) => r.json())
      .then((d) => setRows(d.records ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="admin-page" style={{ padding: "1.5rem" }}>
      <h1>Verified catalogue</h1>
      <p style={{ maxWidth: "60ch", color: "#555" }}>
        Public catalogue contains verified records only. Rebuild with{" "}
        <code>npx tsx scripts/rebuild-evidence-catalogue.ts</code>, then import with{" "}
        <code>npx tsx scripts/import-ghana-research-catalogue.ts</code>.
      </p>

      <p style={{ margin: "1rem 0" }}>
        <strong>{rows.length}</strong> verified public records
      </p>

      {loading && <p>Loading…</p>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: "0.82rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
              <th style={{ padding: "0.5rem" }}>ID</th>
              <th style={{ padding: "0.5rem" }}>Title</th>
              <th style={{ padding: "0.5rem" }}>Type</th>
              <th style={{ padding: "0.5rem" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "0.5rem" }}>{r.id}</td>
                <td style={{ padding: "0.5rem" }}>
                  <Link href={`/collections/ghana-graphic-design/${r.id}`}>{r.title}</Link>
                </td>
                <td style={{ padding: "0.5rem" }}>{r.recordType}</td>
                <td style={{ padding: "0.5rem" }}>
                  <span className={`ghana-evidence-badge ${EVIDENCE_BADGE_CLASS[r.evidenceStatus]}`}>
                    {evidenceStatusLabel(r.evidenceStatus)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: "1rem", fontSize: "0.82rem", color: "#666" }}>
        Private research: <code>unresolved-research-private.csv</code> · Excluded placeholders:{" "}
        <code>excluded-placeholder-records.csv</code>
      </p>
    </div>
  );
}

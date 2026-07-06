"use client";

import type { PrismaFlowCounts } from "@/lib/workbench-intelligence-types";

type Props = {
  counts: PrismaFlowCounts;
  embedded?: boolean;
};

export default function IntelligencePrismaSummary({ counts, embedded }: Props) {
  const rows = [
    { label: "Records identified", value: counts.recordsIdentified },
    { label: "Duplicates removed", value: counts.duplicatesRemoved },
    { label: "Records screened", value: counts.recordsScreened },
    { label: "Records excluded", value: counts.recordsExcluded },
    { label: "Full text assessed", value: counts.fullTextAssessed },
    { label: "Final included records", value: counts.finalIncluded },
  ];

  const content = (
    <>
      {!embedded ? (
        <div className="ri-dash-section__head">
          <div>
            <p className="ri-eyebrow">PRISMA-style flow</p>
            <h2 className="ri-section-title">Review screening counts</h2>
          </div>
        </div>
      ) : null}
      <div className="ri-prisma-grid">
        {rows.map((row) => (
          <div key={row.label} className="ri-prisma-card">
            <strong>{row.value}</strong>
            <span>{row.label}</span>
          </div>
        ))}
      </div>
    </>
  );

  if (embedded) return <div role="tabpanel">{content}</div>;

  return (
    <section className="ri-panel ri-dash-section" aria-label="PRISMA flow counts">
      {content}
    </section>
  );
}

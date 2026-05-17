"use client";

type ProvenanceStripProps = {
  folioLabel: string;
  archiveId: string;
  title: string;
  statusLabel: string;
  projectTitle: string | null;
  provenanceCount: number;
  saveLabel: string;
  saveTone: "idle" | "dirty" | "saving" | "error";
  lastEditedLabel: string;
};

function Sep() {
  return <span className="workbench-provenance-strip__sep" aria-hidden="true">·</span>;
}

export function ProvenanceStrip({
  folioLabel,
  archiveId,
  title,
  statusLabel,
  projectTitle,
  provenanceCount,
  saveLabel,
  saveTone,
  lastEditedLabel,
}: ProvenanceStripProps) {
  return (
    <header className="workbench-provenance-strip" aria-label="Document provenance">
      <span className="workbench-provenance-strip__item">{folioLabel}</span>
      <Sep />
      <span className="workbench-provenance-strip__item" title={archiveId}>
        {archiveId}
      </span>
      <Sep />
      <span className="workbench-provenance-strip__title" title={title}>
        {title || "Untitled"}
      </span>
      <Sep />
      <span className="workbench-provenance-strip__item">{statusLabel}</span>
      {projectTitle ? (
        <>
          <Sep />
          <span className="workbench-provenance-strip__item" title={projectTitle}>
            {projectTitle}
          </span>
        </>
      ) : null}
      <Sep />
      <span className="workbench-provenance-strip__item">
        {provenanceCount} provenance
      </span>
      <Sep />
      <span
        className={`workbench-provenance-strip__item workbench-provenance-strip__save is-${saveTone}`}
      >
        {saveLabel}
      </span>
      <Sep />
      <span className="workbench-provenance-strip__item">{lastEditedLabel}</span>
    </header>
  );
}

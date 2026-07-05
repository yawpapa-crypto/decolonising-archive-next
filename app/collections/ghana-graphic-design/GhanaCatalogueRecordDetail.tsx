import Link from "next/link";
import type { CatalogueRecord, CatalogueEvidence, CatalogueVerification } from "@/lib/catalogue/types";
import "@/app/styles/research-actions.css";
import type { RecordImageInfo } from "@/lib/catalogue/record-display";
import { recordCardBrief, recordInitial, recordMakerLabel, recordInterpretationDisplay } from "@/lib/catalogue/record-display";
import {
  EVIDENCE_BADGE_CLASS,
  EVIDENCE_STATUS_DESCRIPTIONS,
  evidenceStatusLabel,
} from "@/lib/catalogue/evidence-status";
import RecordResearchActions from "@/components/research/RecordResearchActions";
import { ghanaCatalogueResearchInput } from "@/lib/research/collection-record-research";

type MetaRow = { label: string; value: string };

type RailSection = {
  rail: string;
  rows: MetaRow[];
};

function EvidenceBadge({ status }: { status: CatalogueRecord["evidenceStatus"] }) {
  return (
    <span
      className={`ghana-record-evidence ${EVIDENCE_BADGE_CLASS[status]}`}
      title={EVIDENCE_STATUS_DESCRIPTIONS[status]}
    >
      {evidenceStatusLabel(status)}
    </span>
  );
}

function RecordImageBlock({
  image,
  record,
}: {
  image: RecordImageInfo;
  record: CatalogueRecord;
}) {
  if (image.access === "display" && image.url) {
    return (
      <figure className="ghana-record-figure">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.url} alt={image.alt} className="ghana-record-figure-img" />
      </figure>
    );
  }

  if (image.access === "source_only") {
    return (
      <div className="ghana-record-figure ghana-record-figure--source">
        <p className="ghana-record-source-only-label">{image.label}</p>
        {image.sourceUrl && (
          <a
            href={image.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ghana-record-source-only-link"
          >
            View at source →
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="ghana-record-figure ghana-record-figure--placeholder" aria-hidden="true">
      <span className="ghana-record-figure-initial">{recordInitial(record)}</span>
      <span className="ghana-record-figure-id">{record.rawCsvRow?.collection_number || record.id}</span>
    </div>
  );
}

function RailBlock({ section }: { section: RailSection }) {
  if (!section.rows.length) return null;
  return (
    <div className="ghana-record-rail-block">
      <div className="ghana-record-rail-label" aria-hidden="true">
        {section.rail}
      </div>
      <dl className="ghana-record-rail-dl">
        {section.rows.map((row) => (
          <div key={row.label} className="ghana-record-rail-row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function StorySection({
  kicker,
  title,
  children,
  variant = "default",
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
  variant?: "default" | "interpretation";
}) {
  return (
    <section className={`ghana-record-story${variant === "interpretation" ? " is-interpretation" : ""}`}>
      <div className="ghana-record-story-kicker">
        <span className="ghana-record-story-arrow" aria-hidden="true">
          ▶▶
        </span>
        {kicker}
      </div>
      <h2 className="ghana-record-story-title">{title}</h2>
      <div className="ghana-record-story-body">{children}</div>
    </section>
  );
}

export default function GhanaCatalogueRecordDetail({
  record,
  verification,
  evidence,
  imageInfo,
}: {
  record: CatalogueRecord;
  verification: CatalogueVerification | null;
  evidence: CatalogueEvidence[];
  imageInfo: RecordImageInfo;
}) {
  const raw = record.rawCsvRow;
  const maker = recordMakerLabel(record);
  const date =
    raw?.date_display ??
    (record.dateStart ? `${record.dateStart} – ${record.dateEnd ?? "present"}` : null);

  const placeRows: MetaRow[] = [
    record.region ? { label: "Region", value: record.region } : null,
    record.locality ? { label: "Locality", value: record.locality } : null,
    record.communityOrCulture ? { label: "Culture", value: record.communityOrCulture } : null,
  ].filter(Boolean) as MetaRow[];

  const collectionRows: MetaRow[] = [
    record.institutionOrCollection
      ? { label: "Institution", value: record.institutionOrCollection }
      : null,
    raw?.collection_number ? { label: "Accession", value: raw.collection_number } : null,
    record.sourceName ? { label: "Source", value: record.sourceName } : null,
  ].filter(Boolean) as MetaRow[];

  const recordRows: MetaRow[] = [
    { label: "ID", value: record.id },
    record.recordType ? { label: "Type", value: record.recordType } : null,
    record.objectOrRecordType ? { label: "Object", value: record.objectOrRecordType } : null,
    record.mediumOrFormat ? { label: "Medium", value: record.mediumOrFormat } : null,
    raw?.dimensions ? { label: "Dimensions", value: raw.dimensions } : null,
    record.rightsStatus ? { label: "Rights", value: record.rightsStatus } : null,
  ].filter(Boolean) as MetaRow[];

  const contextRows: MetaRow[] = [
    record.periodLabel ? { label: "Period", value: record.periodLabel } : null,
    record.visualSystemLabel ? { label: "Visual system", value: record.visualSystemLabel } : null,
    date ? { label: "Date", value: date } : null,
    record.creatorRole ? { label: "Role", value: record.creatorRole } : null,
  ].filter(Boolean) as MetaRow[];

  const railSections: RailSection[] = [
    { rail: "CONTEXT", rows: contextRows },
    { rail: "PLACE", rows: placeRows },
    { rail: "COLLECTION", rows: collectionRows },
    { rail: "RECORD", rows: recordRows },
  ];

  const sourceFacts = raw?.source_facts || record.description;
  const interpretation = recordInterpretationDisplay(record);
  const brief = recordCardBrief(record);
  const researchInput = ghanaCatalogueResearchInput(record);

  return (
    <main className="ghana-detail-page ghana-detail-page--editorial ghana-detail-page--monochrome">
      <div className="ghana-record-editorial">
        <aside className="ghana-record-panel">
          <div className="ghana-record-panel-top">
            <Link href="/collections/ghana-graphic-design" className="ghana-record-back">
              ← Collection
            </Link>
            <EvidenceBadge status={record.evidenceStatus} />
          </div>

          <div className="ghana-record-panel-titleblock">
            {maker && <p className="ghana-record-maker">{maker}</p>}
            <h1 className="ghana-record-title">{record.title}</h1>
            {record.visualSystemLabel && (
              <p className="ghana-record-subtitle">{record.visualSystemLabel}</p>
            )}
          </div>

          <RecordResearchActions input={researchInput} variant="bar" />

          <p className="ghana-record-evidence-note">
            {EVIDENCE_STATUS_DESCRIPTIONS[record.evidenceStatus]}
          </p>

          {railSections.map((section) => (
            <RailBlock key={section.rail} section={section} />
          ))}

          <div className="ghana-record-panel-actions">
            {record.sourceUrl && (
              <a
                href={record.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ghana-record-action-link"
              >
                Primary source ↗
              </a>
            )}
            {record.secondarySourceUrl && (
              <a
                href={record.secondarySourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ghana-record-action-link ghana-record-action-link--ghost"
              >
                Secondary source ↗
              </a>
            )}
          </div>

          {record.tags.length > 0 && (
            <div className="ghana-record-panel-tags">
              {record.tags.map((tag) => (
                <span key={tag} className="ghana-record-panel-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </aside>

        <div className="ghana-record-canvas">
          <nav className="ghana-record-crumb" aria-label="Breadcrumb">
            <Link href="/collections">Collections</Link>
            <span>/</span>
            <Link href="/collections/ghana-graphic-design">Ghana Graphic Design</Link>
          </nav>

          <RecordImageBlock image={imageInfo} record={record} />

          <StorySection kicker="OVERVIEW" title="Record abstract">
            <p>{brief.overview}</p>
          </StorySection>

          {brief.detailLines.length > 0 && (
            <StorySection kicker="DETAILS" title="Key catalogue fields">
              <dl className="ghana-record-detail-grid">
                {brief.detailLines.map((line) => (
                  <div key={line.label} className="ghana-record-detail-row">
                    <dt>{line.label}</dt>
                    <dd>{line.value}</dd>
                  </div>
                ))}
              </dl>
            </StorySection>
          )}

          {sourceFacts && (
            <StorySection kicker="SOURCE FACTS" title="What the source states">
              <p>{sourceFacts}</p>
            </StorySection>
          )}

          {interpretation && (
            <StorySection kicker="ARED INTERPRETATION" title="Research analysis" variant="interpretation">
              <p>{interpretation}</p>
            </StorySection>
          )}

          {brief.analysis && brief.analysis !== interpretation && (
            <StorySection kicker="CONTEXT" title="Contextual reading">
              <p>{brief.analysis}</p>
            </StorySection>
          )}

          {record.historicalSignificance && (
            <StorySection kicker="SIGNIFICANCE" title="Historical context">
              <p>{record.historicalSignificance}</p>
            </StorySection>
          )}

          {raw?.uncertainties && (
            <StorySection kicker="UNCERTAINTIES" title="Open questions in the source">
              <p>{raw.uncertainties}</p>
            </StorySection>
          )}

          {record.provenanceOrCustodyNote && (
            <StorySection kicker="PROVENANCE" title="Custody and acquisition">
              <p>{record.provenanceOrCustodyNote}</p>
            </StorySection>
          )}

          {record.rightsNote && (
            <div className="ghana-record-rights-banner">
              <strong>Rights note.</strong> {record.rightsNote}
            </div>
          )}

          {verification?.verificationNotes && (
            <blockquote className="ghana-record-verification-note">{verification.verificationNotes}</blockquote>
          )}

          {evidence.length > 0 && (
            <StorySection kicker="EVIDENCE" title="Linked source material">
              <ul className="ghana-record-evidence-list">
                {evidence.map((e) => (
                  <li key={e.id}>
                    {e.sourceUrl ? (
                      <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer">
                        {e.sourceTitle ?? e.sourceUrl}
                      </a>
                    ) : (
                      e.sourceTitle
                    )}
                    {e.notes ? ` — ${e.notes}` : ""}
                  </li>
                ))}
              </ul>
            </StorySection>
          )}

          <section className="ghana-record-contribute">
            <div className="ghana-record-story-kicker">
              <span className="ghana-record-story-arrow" aria-hidden="true">
                ▶▶
              </span>
              CONTRIBUTE
            </div>
            <h2 className="ghana-record-story-title">Help establish this record</h2>
            <p>
              Submit evidence, corrections, maker names, dates, photographs, source links, oral
              histories, rights information, or community interpretation.
            </p>
            <Link
              href={`/sources/request?record=${encodeURIComponent(record.id)}&title=${encodeURIComponent(record.title)}`}
              className="ghana-record-contribute-btn"
            >
              Submit evidence or correction →
            </Link>
          </section>
        </div>
      </div>

      <RecordResearchActions input={researchInput} variant="sticky" />
    </main>
  );
}

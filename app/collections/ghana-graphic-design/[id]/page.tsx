import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import {
  CATEGORY_LABELS,
  getGhanaItem,
} from "@/lib/data/ghana-collection";
import { generateItemJsonLd } from "@/lib/data/ghana-rdf";
import { enrichGhanaItem } from "@/lib/data/ghana-taxonomy-bridge";
import GhanaLivePanel from "@/app/collections/ghana-graphic-design/GhanaLivePanel";
import GhanaCatalogueRecordDetail from "@/app/collections/ghana-graphic-design/GhanaCatalogueRecordDetail";
import {
  catalogueDataExists,
  getCatalogueRecord,
  getEvidenceForRecord,
  getVerificationForRecord,
} from "@/lib/catalogue/store";
import { resolveServerRecordImage } from "@/lib/catalogue/record-image-server";
import "@/app/styles/ghana-collection.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const catalogue = catalogueDataExists() ? getCatalogueRecord(id) : null;
  const legacy = getGhanaItem(id);
  const title = catalogue?.title ?? legacy?.title;
  if (!title) return { title: "Item not found | ARED" };
  return {
    title: `${title} | Ghana Graphic Design | ARED`,
    description: (catalogue?.description ?? legacy?.description ?? "").slice(0, 160),
  };
}

export default async function GhanaItemDetailPage({ params }: Props) {
  const { id } = await params;

  const catalogueRecord = catalogueDataExists() ? getCatalogueRecord(id) : null;
  const legacyItem = getGhanaItem(id);

  if (catalogueRecord?.publicVisibility) {
    const verification = getVerificationForRecord(id);
    const evidence = getEvidenceForRecord(id);
    const imageInfo = resolveServerRecordImage(catalogueRecord);

    return (
      <PageShell>
        <GhanaCatalogueRecordDetail
          record={catalogueRecord}
          verification={verification}
          evidence={evidence}
          imageInfo={imageInfo}
        />
      </PageShell>
    );
  }

  if (!legacyItem) notFound();

  const enriched = enrichGhanaItem(legacyItem);
  const jsonLd = generateItemJsonLd(legacyItem);
  const canShowImage =
    legacyItem.rights_status === "open_ingest" || legacyItem.rights_status === "permission_granted";

  const fields = [
    { label: "Creator / artist", value: legacyItem.creator },
    { label: "Date", value: legacyItem.date_display },
    { label: "Format", value: legacyItem.format },
    { label: "Category", value: CATEGORY_LABELS[legacyItem.category] },
    { label: "Visual system", value: enriched.visual_system },
    { label: "Source", value: legacyItem.source_name },
  ].filter((f) => f.value);

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="ghana-detail-page ghana-detail-page--monochrome">
        <div className="ghana-detail-inner">
          <nav className="ghana-breadcrumb" aria-label="Breadcrumb">
            <Link href="/collections">Collections</Link>
            <span className="ghana-breadcrumb-sep">›</span>
            <Link href="/collections/ghana-graphic-design">History of Graphic Design in Ghana</Link>
            <span className="ghana-breadcrumb-sep">›</span>
            <span>{legacyItem.title}</span>
          </nav>
          <Link href="/collections/ghana-graphic-design" className="ghana-detail-back">
            ← Back to collection
          </Link>
          <div className="ghana-detail-grid">
            <div>
              <div className="ghana-detail-image-wrap">
                {canShowImage && legacyItem.image_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={legacyItem.image_url} alt={legacyItem.title} />
                ) : (
                  <div className="ghana-detail-image-placeholder">
                    <span className="ghana-detail-placeholder-icon">📋</span>
                    <p className="ghana-detail-placeholder-text">Metadata record</p>
                  </div>
                )}
              </div>
            </div>
            <div className="ghana-detail-meta">
              <h1>{legacyItem.title}</h1>
              <p className="ghana-detail-desc">{legacyItem.description}</p>
              <div className="ghana-detail-fields">
                {fields.map((f) => (
                  <div key={f.label} className="ghana-detail-field">
                    <span className="ghana-detail-field-label">{f.label}</span>
                    <span className="ghana-detail-field-value">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <GhanaLivePanel
            itemTitle={legacyItem.title}
            itemCategory={legacyItem.category}
            itemTags={legacyItem.tags}
          />
        </div>
      </main>
    </PageShell>
  );
}

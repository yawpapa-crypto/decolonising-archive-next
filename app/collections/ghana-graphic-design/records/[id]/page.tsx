import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  catalogueDataExists,
  getCatalogueRecord,
  getEvidenceForRecord,
  getVerificationForRecord,
} from "@/lib/catalogue/store";
import { resolveServerRecordImage } from "@/lib/catalogue/record-image-server";
import { GHANA_COLLECTION_SLUG } from "@/lib/research/collection-record-research";
import GhanaCatalogueRecordDetail from "@/app/collections/ghana-graphic-design/GhanaCatalogueRecordDetail";
import PageShell from "@/src/components/layout/PageShell";
import { GHANA_COLLECTION_TITLE } from "@/lib/data/ghana-subcollections";
import "@/app/styles/ghana-collection.css";
import "@/app/styles/research-actions.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const record = catalogueDataExists() ? getCatalogueRecord(id) : null;
  if (!record?.publicVisibility) return { title: "Record not found | ARED" };

  const canonicalPath = `/collections/${GHANA_COLLECTION_SLUG}/records/${encodeURIComponent(record.id)}`;

  return {
    title: `${record.title} | ${GHANA_COLLECTION_TITLE} | ARED`,
    description: record.description.slice(0, 160),
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: record.title,
      description: record.description.slice(0, 200),
      type: "article",
      url: canonicalPath,
    },
    other: {
      "record:id": record.id,
      "record:type": record.recordType,
    },
  };
}

export default async function GhanaCatalogueRecordCanonicalPage({ params }: Props) {
  const { id } = await params;
  const record = catalogueDataExists() ? getCatalogueRecord(id) : null;

  if (!record?.publicVisibility) notFound();

  const verification = getVerificationForRecord(id);
  const evidence = getEvidenceForRecord(id);
  const imageInfo = resolveServerRecordImage(record);

  return (
    <PageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            "@id": `https://ared.design/collections/${GHANA_COLLECTION_SLUG}/records/${record.id}`,
            identifier: record.id,
            name: record.title,
            description: record.description,
            creator: record.creatorOrAuthority || undefined,
            dateCreated: record.dateStart || undefined,
            isPartOf: {
              "@type": "Collection",
              name: GHANA_COLLECTION_TITLE,
            },
            url: `https://ared.design/collections/${GHANA_COLLECTION_SLUG}/records/${record.id}`,
          }),
        }}
      />
      <GhanaCatalogueRecordDetail
        record={record}
        verification={verification}
        evidence={evidence}
        imageInfo={imageInfo}
      />
    </PageShell>
  );
}


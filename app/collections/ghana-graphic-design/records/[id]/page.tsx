import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  catalogueDataExists,
  getCatalogueRecord,
} from "@/lib/catalogue/store";
import { GHANA_COLLECTION_TITLE } from "@/lib/data/ghana-subcollections";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const record = catalogueDataExists() ? getCatalogueRecord(id) : null;
  if (!record?.publicVisibility) return { title: "Record not found | ARED" };

  const canonicalPath = `/home-next/explore?record=${encodeURIComponent(record.id)}`;

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
  redirect(`/home-next/explore?record=${encodeURIComponent(id)}`);
}

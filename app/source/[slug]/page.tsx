import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EntityPage from "@/src/components/kgo/EntityPage";
import { getEntity, listEntities } from "@/lib/kgo/entities";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const entities = await listEntities("source");
  return entities.map((entity) => ({ slug: entity.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entity = await getEntity("source", slug);
  if (!entity) return { title: "Source not found | ARED" };
  return {
    title: `${entity.label} | Sources | ARED`,
    description: entity.description.slice(0, 160),
    alternates: { canonical: `/source/${entity.slug}` },
    openGraph: {
      title: entity.label,
      description: entity.description.slice(0, 200),
      url: `/source/${entity.slug}`,
      type: "article",
    },
  };
}

export default async function SourceEntityRoute({ params }: Props) {
  const { slug } = await params;
  const entity = await getEntity("source", slug);
  if (!entity) notFound();
  return <EntityPage entity={entity} />;
}

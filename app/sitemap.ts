import type { MetadataRoute } from "next";
import { buildEntityIndex, entityPath } from "@/lib/kgo/entities";
import { buildProgrammaticHubs } from "@/lib/kgo/programmatic";
import { getPublicArchiveRecords } from "@/lib/kgo/records";
import { SITE_URL } from "@/lib/kgo/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const records = await getPublicArchiveRecords();
  const entities = await buildEntityIndex();
  const hubs = await buildProgrammaticHubs();

  const staticRoutes: MetadataRoute.Sitemap = [
    "/",
    "/library",
    "/about",
    "/sources",
    "/collections",
    "/collections/ghana-graphic-design",
    "/how-ared-classifies-records",
    "/explore",
    "/knowledge",
    "/knowledge-areas",
    "/communities",
    "/language",
    "/region",
    "/country",
    "/source",
    "/community",
    "/cultural-care",
    "/support",
    "/partners",
  ].map((path, index) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "/library" ? "daily" : "weekly",
    priority: index === 0 ? 1 : path === "/library" ? 0.95 : 0.7,
  }));

  const recordRoutes: MetadataRoute.Sitemap = records.map((record) => ({
    url: `${SITE_URL}/records/${encodeURIComponent(record.id)}`,
    lastModified: record.updatedAt ? new Date(record.updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const entityRoutes: MetadataRoute.Sitemap = entities.map((entity) => ({
    url: `${SITE_URL}${entityPath(entity.kind, entity.slug)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.75,
  }));

  const exploreRoutes: MetadataRoute.Sitemap = hubs.map((hub) => ({
    url: `${SITE_URL}/explore/${encodeURIComponent(hub.slug)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...recordRoutes, ...entityRoutes, ...exploreRoutes];
}

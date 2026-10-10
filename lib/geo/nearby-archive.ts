/**
 * Archival material with genuine coordinates near a point, for the AR/D Fieldnotes Map.
 *
 * AR/D's own catalogue records carry only country/region metadata, so they are never placed
 * on the map as points. These results come from partner archives that publish coordinates,
 * and every result says what its coordinates mean:
 *   - Wikimedia Commons: the file's primary coordinates (normally where the photograph was taken).
 *   Europeana is deliberately NOT used here: its spatial index matched items whose first place
 *   coordinate was unrelated to the subject (e.g. Graz objects returned for Amsterdam), so its
 *   coordinates cannot be presented as where a record was made or what it depicts.
 * Results are live discovery, not catalogued AR/D records. IDs use the same namespaces as
 * `/api/v1/records/{id}` so source, rights and citations resolve through one service.
 */
export type NearbyArchiveRecord = {
  id: string;
  title: string;
  image: string | null;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  provider: "Wikimedia Commons";
  institution: string | null;
  date: string | null;
  locationBasis: "camera_location";
};

export type ProviderStatus = { provider: string; status: "ok" | "unavailable" | "not_configured"; count: number };

const UA = { "User-Agent": "ARED/1.0 (https://ared.design)", Accept: "application/json" };

function distance(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371e3, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

const strip = (s: unknown) => (typeof s === "string" ? s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim() || null : null);

async function commons(lat: number, lng: number, radius: number, limit: number): Promise<NearbyArchiveRecord[]> {
  // generator=geosearch over the File namespace returns geotagged media with their primary coordinates.
  const params = new URLSearchParams({
    action: "query", format: "json", generator: "geosearch", ggscoord: `${lat}|${lng}`,
    ggsradius: String(Math.min(10000, radius)), ggslimit: String(Math.min(50, limit)), ggsnamespace: "6",
    prop: "imageinfo|coordinates", iiprop: "url|extmetadata", iiurlwidth: "640", colimit: "max",
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: UA, signal: AbortSignal.timeout(8000), next: { revalidate: 3600 } } as RequestInit);
  if (!res.ok) throw new Error(`commons ${res.status}`);
  const pages = Object.values(((await res.json()) as any).query?.pages ?? {}) as any[];
  return pages.flatMap((p) => {
    const c = p.coordinates?.[0];
    const info = p.imageinfo?.[0];
    if (!c || !info || !/\.(jpe?g|png|tiff?|webp)$/i.test(p.title ?? "")) return [];
    const meta = info.extmetadata ?? {};
    return [{
      id: `wc-${p.pageid}`,
      title: strip(meta.ObjectName?.value) || String(p.title).replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, ""),
      image: info.thumburl || info.url || null,
      latitude: c.lat, longitude: c.lon, distanceMeters: distance(lat, lng, c.lat, c.lon),
      provider: "Wikimedia Commons" as const,
      institution: strip(meta.Credit?.value) && !/own work/i.test(meta.Credit.value) ? strip(meta.Credit.value) : null,
      date: strip(meta.DateTimeOriginal?.value),
      locationBasis: "camera_location" as const,
    }];
  });
}

function yearOf(date: string | null): number | null {
  const m = date?.match(/\b(1[5-9]\d\d|20\d\d)\b/);
  return m ? Number(m[1]) : null;
}
const isHistoric = (r: NearbyArchiveRecord) => (yearOf(r.date) ?? 9999) < 1970;

export async function nearbyArchive(input: { lat: number; lng: number; radius: number; limit: number }) {
  const { lat, lng, radius, limit } = input;
  const status: ProviderStatus[] = [];
  const [c] = await Promise.allSettled([commons(lat, lng, radius, limit)]);
  const records: NearbyArchiveRecord[] = [];
  if (c.status === "fulfilled") { records.push(...c.value); status.push({ provider: "Wikimedia Commons", status: "ok", count: c.value.length }); }
  else status.push({ provider: "Wikimedia Commons", status: "unavailable", count: 0 });

  // The same image is often published by several aggregators: keep one per normalised title + rounded point.
  const seen = new Set<string>();
  const unique = records
    .filter((r) => r.distanceMeters <= radius)
    // Historical material first (dated before 1970), then by distance.
    .sort((a, b) => Number(!isHistoric(a)) - Number(!isHistoric(b)) || a.distanceMeters - b.distanceMeters)
    .filter((r) => {
      const key = `${r.title.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 40)}|${r.latitude.toFixed(3)}|${r.longitude.toFixed(3)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
  return { center: { lat, lng }, radius, records: unique, providers: status, retrievedAt: new Date().toISOString() };
}

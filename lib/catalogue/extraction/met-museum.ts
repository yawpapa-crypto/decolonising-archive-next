import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import type { MetObject } from "./types";

const CACHE_DIR = join(process.cwd(), "data", "catalogue", "cache", "met");
const USER_AGENT = "ARED-Catalogue-Extractor/1.0 (research; mailto:archive@ared.design)";

export const MET_SEARCH_TERMS = [
  "Ghana",
  "Gold Coast",
  "Ghanaian",
  "Akan peoples",
  "nsodie",
  "Ghana textile",
  "textile wrapper Ghana",
  "Ewe kente",
  "Ashanti gold",
  "gold weight Akan",
  "goldweight Akan",
  "Adinkra Ghana",
  "kente Ghana",
  "Fante Ghana",
  "Asafo flag Ghana",
  "James Barnor",
  "Ghana advertisement",
  "Tema Ghana",
  "Accra Ghana",
];

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson<T>(url: string, retries = 4): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(45000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(1500 * (i + 1));
    }
  }
  throw new Error("unreachable");
}

export async function collectMetObjectIds(): Promise<number[]> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const idPath = join(CACHE_DIR, "object-ids-v3.json");
  const ids = new Set<number>(
    existsSync(idPath) ? (JSON.parse(readFileSync(idPath, "utf8")) as number[]) : [],
  );
  const before = ids.size;

  for (const term of MET_SEARCH_TERMS) {
    const url = `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encodeURIComponent(term)}&hasImages=true`;
    try {
      const data = await fetchJson<{ objectIDs?: number[] }>(url);
      for (const id of data.objectIDs ?? []) ids.add(id);
      process.stdout.write(`Met search "${term}": ${data.objectIDs?.length ?? 0} (total unique ${ids.size})\n`);
      await sleep(300);
    } catch (e) {
      process.stdout.write(`Met search failed "${term}": ${e instanceof Error ? e.message : e}\n`);
    }
  }

  const list = [...ids].sort((a, b) => a - b);
  if (list.length !== before) {
    writeFileSync(idPath, JSON.stringify(list, null, 2));
    process.stdout.write(`Met object ID list updated: ${before} → ${list.length}\n`);
  }
  return list;
}

export async function fetchMetObject(objectId: number): Promise<MetObject | null> {
  mkdirSync(CACHE_DIR, { recursive: true });
  const cachePath = join(CACHE_DIR, `${objectId}.json`);
  if (existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, "utf8")) as MetObject;
  }

  try {
    const obj = await fetchJson<MetObject>(
      `https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectId}`,
    );
    writeFileSync(cachePath, JSON.stringify(obj, null, 2));
    await sleep(120);
    return obj;
  } catch {
    return null;
  }
}

export async function fetchAllMetObjects(
  ids: number[],
  onProgress?: (done: number, total: number) => void,
): Promise<MetObject[]> {
  const results: MetObject[] = [];
  const concurrency = 12;
  let done = 0;

  for (let i = 0; i < ids.length; i += concurrency) {
    const batch = ids.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((id) => fetchMetObject(id)));
    for (const obj of batchResults) {
      if (obj) results.push(obj);
    }
    done += batch.length;
    onProgress?.(done, ids.length);
  }

  return results;
}

/** Process all cached Met object JSON files (resume without API calls) */
export function loadAllCachedMetObjects(): MetObject[] {
  mkdirSync(CACHE_DIR, { recursive: true });
  const files = readdirSync(CACHE_DIR).filter((f) => /^\d+\.json$/.test(f));
  const objects: MetObject[] = [];
  for (const f of files) {
    try {
      objects.push(JSON.parse(readFileSync(join(CACHE_DIR, f), "utf8")) as MetObject);
    } catch {
      /* skip corrupt cache */
    }
  }
  return objects;
}

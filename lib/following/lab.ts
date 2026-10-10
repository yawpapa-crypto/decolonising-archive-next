import "server-only";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { LabItem } from "./lab-merge";

const FILE = path.join(process.cwd(), "data", "recommendation-lab", "candidates.json");
const MAX_AGE_MS = 14 * 24 * 3600e3;
let cache: { mtime: number; users: Record<string, LabItem[]> } | null = null;

/** Candidates written by lab/recommendation/run_lab.py. Missing, malformed or stale files return nothing. */
export function labCandidates(userId: string): LabItem[] {
  try {
    const st = statSync(FILE);
    if (Date.now() - st.mtimeMs > MAX_AGE_MS) return [];
    if (!cache || cache.mtime !== st.mtimeMs) {
      const raw = JSON.parse(readFileSync(FILE, "utf8")) as { users?: Record<string, { item: string; score: number }[]> };
      cache = { mtime: st.mtimeMs, users: raw.users ?? {} };
    }
    const list = cache.users[userId];
    return Array.isArray(list) ? list.filter((c) => typeof c?.item === "string") : [];
  } catch {
    return [];
  }
}

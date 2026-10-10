/** Client-safe onboarding types and rules. The taxonomy itself is loaded on the server. */

export const MIN_INTERESTS = 3;

export const DIMENSIONS = ["visualSystems", "knowledgeAreas", "regions", "periods", "communities", "formats"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export type Interests = Record<Dimension, string[]> & { context?: string };

export const emptyInterests = (): Interests => ({
  visualSystems: [],
  knowledgeAreas: [],
  regions: [],
  periods: [],
  communities: [],
  formats: [],
});

export const countInterests = (i: Interests) => DIMENSIONS.reduce((n, d) => n + (i[d]?.length ?? 0), 0);

export const CONTEXTS = ["Designer", "Researcher", "Educator", "Student", "Curator or archivist", "Artist or maker", "Writer", "Just curious"] as const;

export interface InterestGroup {
  dim: Dimension;
  label: string;
  options: string[];
}

const RESERVED = new Set(
  "admin administrator ared archive decolonising decolonisingarchive support help api auth login logout signin signup register settings profile profiles library explore foryou for_you home about sources collections community communities records record workspace curator moderator staff team root system null undefined anonymous www mail email".split(" "),
);

export function normaliseUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

/** Returns a human message when the username cannot be used, otherwise null. */
export function validateUsername(u: string): string | null {
  if (u.length < 3) return "Use at least 3 characters.";
  if (u.length > 24) return "Use 24 characters or fewer.";
  if (!/^[a-z0-9_]+$/.test(u)) return "Use lowercase letters, numbers and underscores only.";
  if (!/[a-z]/.test(u)) return "Include at least one letter.";
  if (u.startsWith("_") || u.endsWith("_") || u.includes("__")) return "Underscores cannot start, end or repeat.";
  if (RESERVED.has(u)) return "That name is reserved.";
  return null;
}

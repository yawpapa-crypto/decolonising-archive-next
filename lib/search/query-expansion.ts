export const QUERY_EXPANSION_MAP: Record<string, string[]> = {
  freire: ["paulo freire", "pedagogy of the oppressed", "critical consciousness", "liberation pedagogy"],
  "paulo freire": ["freire", "pedagogy of the oppressed", "critical consciousness"],
  "critical consciousness": ["paulo freire", "freire", "pedagogy of the oppressed", "conscientization"],
  "pedagogy of the oppressed": ["paulo freire", "freire", "critical consciousness"],
  conscientization: ["critical consciousness", "paulo freire", "freire"],
  fanon: ["frantz fanon", "wretched of the earth", "black skin white masks", "anti-colonial"],
  "frantz fanon": ["fanon", "anti-colonial theory", "decolonization"],
  "black consciousness": ["steve biko", "biko", "liberation"],
  biko: ["steve biko", "black consciousness", "anti-apartheid"],
  ubuntu: ["african ethics", "communal personhood", "molefe", "ramose"],
  nkrumah: ["kwame nkrumah", "pan-africanism", "consciencism"],
  cabral: ["amilcar cabral", "national liberation", "anti-colonial"],
  "oral history": ["testimony", "community archiving", "memory"],
  restitution: ["repatriation", "museum", "provenance"],
  decolonial: ["decolonization", "colonial critique", "epistemic justice"],
  "african philosophy": ["wiredu", "hountondji", "ubuntu", "epistemology"],
};

/** Concept queries → author surname tokens to boost when the concept matches. */
export const SEMINAL_AUTHOR_BOOSTS: Record<string, string[]> = {
  "critical consciousness": ["freire", "paulo freire"],
  "liberation pedagogy": ["freire", "paulo freire"],
  conscientization: ["freire", "paulo freire"],
  "black consciousness": ["biko", "steve biko"],
  "anti-colonial": ["fanon", "frantz fanon"],
  "anti colonial": ["fanon", "frantz fanon"],
  decolonial: ["fanon", "mbembe", "mignolo"],
  decolonization: ["fanon", "ngugi", "mbembe"],
  ubuntu: ["molefe", "muade", "ramose", "metz"],
  "pan-africanism": ["nkrumah", "padmore", "du bois"],
  sankofa: ["ofosu-asare", "asare"],
  "african philosophy": ["wiredu", "hountondji", "gyekye"],
};

function foldText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizeComparable(value: unknown): string {
  return foldText(value).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenPrefixMatches(queryToken: string, keyToken: string): boolean {
  if (!queryToken || !keyToken) return false;
  if (keyToken.includes(queryToken) || queryToken.includes(keyToken)) return true;
  if (queryToken.length >= 4 && keyToken.startsWith(queryToken)) return true;
  if (keyToken.length >= 4 && queryToken.startsWith(keyToken)) return true;
  return false;
}

export function queryMatchesExpansionKey(
  normalized: string,
  tokens: string[],
  key: string,
): boolean {
  const keyNorm = normalizeComparable(key);
  if (!keyNorm) return false;
  if (normalized.includes(keyNorm) || keyNorm.includes(normalized)) return true;

  const keyTokens = keyNorm.split(/\s+/).filter(Boolean);
  if (!keyTokens.length) return false;

  if (keyTokens.length >= 2 && keyTokens.every((token) => tokens.includes(token))) return true;

  if (tokens.length >= 2) {
    const overlap = tokens.filter((token) => keyTokens.includes(token)).length;
    if (overlap >= Math.min(tokens.length, keyTokens.length)) return true;

    const prefixOverlap = tokens.filter((token, index) => {
      const keyToken = keyTokens[index] ?? keyTokens.find((kt) => tokenPrefixMatches(token, kt));
      return keyToken ? tokenPrefixMatches(token, keyToken) : false;
    }).length;
    if (prefixOverlap >= Math.min(tokens.length, keyTokens.length)) return true;
  }

  if (tokens.length === 1 && tokens[0].length >= 4) {
    if (keyNorm.startsWith(tokens[0])) return true;
    if (keyTokens.some((kt) => tokenPrefixMatches(tokens[0], kt))) return true;
  }

  return false;
}

export function expandQueryTerms(normalized: string, tokens: string[]) {
  const expandedPhrases: string[] = [];
  const expandedTerms = new Set<string>(tokens);

  Object.entries(QUERY_EXPANSION_MAP).forEach(([key, values]) => {
    if (!queryMatchesExpansionKey(normalized, tokens, key)) return;
    values.forEach((value) => {
      expandedPhrases.push(value);
      normalizeComparable(value)
        .split(/\s+/)
        .filter(Boolean)
        .forEach((token) => expandedTerms.add(token));
    });
  });

  return {
    expandedPhrases,
    expandedTerms: Array.from(expandedTerms),
  };
}

export function getAuthorBoostsForQuery(normalized: string, tokens: string[]): string[] {
  const boosts = new Set<string>();
  Object.entries(SEMINAL_AUTHOR_BOOSTS).forEach(([concept, authors]) => {
    if (!queryMatchesExpansionKey(normalized, tokens, concept)) return;
    authors.forEach((author) => boosts.add(normalizeComparable(author)));
  });
  return Array.from(boosts);
}

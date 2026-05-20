import {
  dedupeScholarlyResults,
  formatApaCitationLine,
  searchOpenAlexWorks,
  type ScholarlySearchResult,
} from "@/lib/scholarly-search";

export type GeminiSuggestionDraft = {
  title: string;
  creator: string;
  year: string;
  journal?: string;
  publisher?: string;
  doi?: string;
  url?: string;
  rationale?: string;
};

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

function resolveApiKey() {
  return readEnv("GEMINI_API_KEY") || readEnv("AI_API_KEY") || readEnv("OPENAI_API_KEY");
}

function resolveModel() {
  return readEnv("AI_MODEL") || "gemini-2.5-flash";
}

function buildGeminiUrl(model: string) {
  const modelId = model.replace(/^models\//, "");
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
}

function stripJsonFence(text: string) {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeDoi(value: string) {
  return value.replace(/^https?:\/\/doi\.org\//i, "").trim();
}

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titlesLikelyMatch(a: string, b: string) {
  const left = normalizeTitle(a);
  const right = normalizeTitle(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const shorter = left.length < right.length ? left : right;
  const longer = left.length < right.length ? right : left;
  return longer.includes(shorter) && shorter.length >= Math.min(left.length, right.length) * 0.72;
}

function isExcludedTitle(title: string, excludeTitles: string[]) {
  const normalized = normalizeTitle(title);
  return excludeTitles.some((entry) => {
    const candidate = normalizeTitle(entry);
    return candidate && (candidate === normalized || candidate.includes(normalized) || normalized.includes(candidate));
  });
}

function draftFromRow(row: Record<string, unknown>): GeminiSuggestionDraft | null {
  const title = String(row.title ?? "").trim();
  const creator = String(row.creator ?? row.authors ?? row.author ?? "").trim();
  if (!title || !creator) return null;
  return {
    title,
    creator,
    year: String(row.year ?? row.date ?? "").trim(),
    journal: String(row.journal ?? "").trim() || undefined,
    publisher: String(row.publisher ?? "").trim() || undefined,
    doi: row.doi ? normalizeDoi(String(row.doi)) : undefined,
    url: String(row.url ?? row.link ?? "").trim() || undefined,
    rationale: String(row.rationale ?? row.reason ?? "").trim() || undefined,
  };
}

function unescapeJsonString(value: string) {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value.replace(/\\"/g, '"').replace(/\\n/g, "\n").trim();
  }
}

function parseSuggestionObjectsFromPartial(text: string): GeminiSuggestionDraft[] {
  const drafts: GeminiSuggestionDraft[] = [];
  const seen = new Set<string>();
  const slice = text.includes('"suggestions"') ? text.slice(text.indexOf('"suggestions"')) : text;
  let depth = 0;
  let start = -1;

  for (let i = 0; i < slice.length; i += 1) {
    const char = slice[i];
    if (char === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        try {
          const obj = JSON.parse(slice.slice(start, i + 1)) as Record<string, unknown>;
          const draft = draftFromRow(obj);
          if (draft && !seen.has(draft.title.toLowerCase())) {
            seen.add(draft.title.toLowerCase());
            drafts.push(draft);
          }
        } catch {
          // ignore incomplete trailing object
        }
        start = -1;
      }
    }
  }

  if (drafts.length > 0) return drafts;

  function extractField(field: string) {
    const pattern = new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "gi");
    const values: string[] = [];
    let match = pattern.exec(slice);
    while (match) {
      values.push(unescapeJsonString(match[1]));
      match = pattern.exec(slice);
    }
    return values;
  }

  const titles = extractField("title");
  const creators = extractField("creator");
  const years = extractField("year");
  const rationales = extractField("rationale");
  const count = Math.min(titles.length, creators.length);

  for (let i = 0; i < count; i += 1) {
    const title = titles[i]?.trim();
    const creator = creators[i]?.trim();
    if (!title || !creator) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    drafts.push({
      title,
      creator,
      year: years[i]?.trim() || "",
      rationale: rationales[i]?.trim() || undefined,
    });
  }

  return drafts;
}

function parseGeminiSuggestions(raw: string): GeminiSuggestionDraft[] {
  const joined = stripJsonFence(raw);
  if (!joined) return [];

  const jsonStart = joined.indexOf("{");
  const jsonEnd = joined.lastIndexOf("}");
  const candidates = [
    joined,
    jsonStart >= 0 && jsonEnd > jsonStart ? joined.slice(jsonStart, jsonEnd + 1) : joined,
  ];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as { suggestions?: unknown[] };
      if (!Array.isArray(parsed.suggestions)) continue;
      const drafts: GeminiSuggestionDraft[] = [];
      for (const item of parsed.suggestions) {
        const draft = draftFromRow(item as Record<string, unknown>);
        if (draft) drafts.push(draft);
      }
      if (drafts.length > 0) return drafts;
    } catch {
      // try next candidate or partial extraction
    }
  }

  return parseSuggestionObjectsFromPartial(joined);
}

function extractModelText(data: {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: { webSearchQueries?: string[] };
    finishReason?: string;
  }>;
}) {
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const text = parts.map((part) => String(part.text ?? "")).join("").trim();
  const webQueries = candidate?.groundingMetadata?.webSearchQueries ?? [];
  return { text, webQueries, finishReason: candidate?.finishReason ?? "" };
}

function modelCandidates() {
  const preferred = resolveModel();
  const fallbacks = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];
  return [preferred, ...fallbacks.filter((model) => model !== preferred)];
}

async function callGemini(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; text: string; webQueries: string[]; finishReason: string; error?: string }> {
  let lastError = "";

  for (const model of modelCandidates()) {
    const response = await fetch(buildGeminiUrl(model), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      let detail = "";
      try {
        const parsed = JSON.parse(errorText) as { error?: { message?: string } };
        detail = parsed.error?.message?.trim() ?? "";
      } catch {
        detail = errorText.slice(0, 160);
      }
      lastError = detail;
      if (/quota|429|RESOURCE_EXHAUSTED/i.test(detail)) continue;
      return { ok: false, text: "", webQueries: [], finishReason: "", error: detail };
    }

    const data = (await response.json()) as Parameters<typeof extractModelText>[0];
    const extracted = extractModelText(data);
    if (!extracted.text && extracted.finishReason === "SAFETY") {
      lastError = "Gemini blocked this query for safety reasons.";
      continue;
    }
    return { ok: true, ...extracted };
  }

  if (/quota|429|RESOURCE_EXHAUSTED/i.test(lastError)) {
    return {
      ok: false,
      text: "",
      webQueries: [],
      finishReason: "",
      error:
        "Gemini free-tier quota exceeded for today. Wait a few minutes and try again, or enable billing in Google AI Studio.",
    };
  }

  return {
    ok: false,
    text: "",
    webQueries: [],
    finishReason: "",
    error: lastError || "Gemini request failed.",
  };
}

function buildPrompt(trimmed: string, excludedBlock: string, maxSuggestions: number) {
  return `Research question: ${trimmed}
${excludedBlock}

Suggest exactly ${maxSuggestions} real published scholarly sources (books or journal articles) relevant to decolonising studies, indigenous knowledges, or African/Global South scholarship when applicable.

Return compact JSON only — no markdown, no prose outside JSON:
{"suggestions":[{"title":"Full title","creator":"Family, Initial.","year":"2019","journal":"Journal or leave empty","publisher":"Publisher","doi":"10.xxxx/yyyy or empty","url":"https://...","rationale":"One short sentence"}]}`;
}

export async function fetchGeminiScholarlySuggestions(
  query: string,
  options: { excludeTitles?: string[]; maxSuggestions?: number } = {},
): Promise<{ suggestions: GeminiSuggestionDraft[]; webQueries: string[]; warning?: string }> {
  const apiKey = resolveApiKey();
  const trimmed = query.trim();
  const excludeTitles = (options.excludeTitles ?? []).map((title) => title.trim()).filter(Boolean);
  const maxSuggestions = Math.min(Math.max(options.maxSuggestions ?? 5, 1), 6);

  if (!trimmed) return { suggestions: [], webQueries: [] };
  if (!apiKey) {
    return {
      suggestions: [],
      webQueries: [],
      warning: "Gemini is not configured. Add GEMINI_API_KEY to .env.local and restart the dev server.",
    };
  }

  const excludedBlock =
    excludeTitles.length > 0
      ? `\nDo not suggest any of these local archive titles:\n${excludeTitles.slice(0, 30).map((title) => `- ${title}`).join("\n")}`
      : "";

  const prompt = buildPrompt(trimmed, excludedBlock, maxSuggestions);

  try {
    const grounded = await callGemini(apiKey, {
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 8192,
      },
    });

    if (!grounded.ok) {
      return {
        suggestions: [],
        webQueries: [],
        warning: grounded.error
          ? `Gemini suggestions failed: ${grounded.error}`
          : "Gemini suggestions unavailable for this query.",
      };
    }

    let suggestions = parseGeminiSuggestions(grounded.text).filter(
      (item) => !isExcludedTitle(item.title, excludeTitles),
    );
    let webQueries = grounded.webQueries;

    if (suggestions.length === 0 && grounded.text) {
      const jsonOnly = await callGemini(apiKey, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      });

      if (jsonOnly.ok) {
        suggestions = parseGeminiSuggestions(jsonOnly.text).filter(
          (item) => !isExcludedTitle(item.title, excludeTitles),
        );
        webQueries = [...webQueries, ...jsonOnly.webQueries];
      } else if (jsonOnly.error && !grounded.error) {
        return {
          suggestions: [],
          webQueries,
          warning: jsonOnly.error,
        };
      }
    }

    if (suggestions.length === 0 && !grounded.text && grounded.error) {
      return {
        suggestions: [],
        webQueries,
        warning: grounded.error,
      };
    }

    return {
      suggestions: suggestions.slice(0, maxSuggestions),
      webQueries,
      warning:
        suggestions.length === 0
          ? "Gemini returned no parseable suggestions. Try a shorter or more specific query."
          : grounded.finishReason === "MAX_TOKENS"
            ? "Some Gemini suggestions may have been truncated; results shown are partial."
            : undefined,
    };
  } catch {
    return {
      suggestions: [],
      webQueries: [],
      warning: "Gemini suggestions could not be loaded.",
    };
  }
}

export async function resolveGeminiSuggestions(
  drafts: GeminiSuggestionDraft[],
): Promise<ScholarlySearchResult[]> {
  const resolved: ScholarlySearchResult[] = [];

  for (const [index, draft] of drafts.entries()) {
    const lookupQuery = [draft.title, draft.creator.split(",")[0], draft.year]
      .filter(Boolean)
      .join(" ");
    const openAlexHits = await searchOpenAlexWorks(lookupQuery, 3);
    const match = openAlexHits.find((hit) => titlesLikelyMatch(hit.title, draft.title)) ?? null;

    if (match) {
      resolved.push({
        ...match,
        id: `gemini-verified-${match.id}-${index}`,
        source: "Gemini",
        verified: true,
        rationale: draft.rationale,
        outsideArchive: true,
      });
      continue;
    }

    const doi = draft.doi ? normalizeDoi(draft.doi) : undefined;
    const url =
      draft.url?.trim() ||
      (doi ? `https://doi.org/${doi}` : "") ||
      `https://scholar.google.com/scholar?q=${encodeURIComponent(`${draft.title} ${draft.creator}`)}`;

    const fallback: ScholarlySearchResult = {
      id: `gemini-${index}-${normalizeTitle(draft.title).slice(0, 48)}`,
      title: draft.title,
      creator: draft.creator,
      year: draft.year || "n.d.",
      publisher: draft.publisher,
      journal: draft.journal,
      doi,
      url,
      source: "Gemini",
      verified: false,
      rationale: draft.rationale,
      outsideArchive: true,
      citationLine: "",
    };
    fallback.citationLine = formatApaCitationLine(fallback);
    resolved.push(fallback);
  }

  return resolved;
}

export async function searchGeminiScholarlySuggestions(
  query: string,
  options: { excludeTitles?: string[]; maxSuggestions?: number } = {},
) {
  const fetched = await fetchGeminiScholarlySuggestions(query, options);
  const results = await resolveGeminiSuggestions(fetched.suggestions);
  return {
    results: dedupeScholarlyResults(results, options.maxSuggestions ?? 6),
    webQueries: fetched.webQueries,
    warning: fetched.warning,
  };
}

import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/src/lib/auth";
import {
  buildCitationCatalog,
  buildCitationPicks,
  rankCitationCatalog,
  resolveRecommendedIds,
} from "@/lib/workbench-ai-citation";

export const runtime = "nodejs";

type CandidateInput = {
  id: string;
  title?: string;
  creator?: string | null;
  date?: string | null;
  sourceLabel?: string | null;
  institution?: string | null;
  sourceUrl?: string | null;
  recordType?: string | null;
  citationText?: string | null;
};

function readEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

function resolveApiKey() {
  return readEnv("GEMINI_API_KEY") || readEnv("AI_API_KEY") || readEnv("OPENAI_API_KEY");
}

function resolveProvider(apiKey: string) {
  const configured = readEnv("AI_PROVIDER").toLowerCase();
  if (configured) return configured;
  if (readEnv("GEMINI_API_KEY") || apiKey.startsWith("AIza")) return "gemini";
  return "openai";
}

function resolveModel(provider: string) {
  const configured = readEnv("AI_MODEL") || readEnv("OPENAI_MODEL");
  if (configured) return configured.replace(/^models\//, "");
  return provider === "gemini" ? "gemini-2.5-flash" : "gpt-3.5-turbo";
}

function buildGeminiUrl(model: string) {
  const modelId = model.replace(/^models\//, "");
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
}

function extractGeminiText(data: unknown) {
  const payload = data as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  return String(payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
}

function extractOpenAIText(data: unknown) {
  const payload = data as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return String(payload?.choices?.[0]?.message?.content ?? "").trim();
}

function parseProviderError(status: number, errorText: string) {
  try {
    const parsed = JSON.parse(errorText) as {
      error?: { message?: string; status?: string };
    };
    const message = parsed.error?.message?.trim();
    if (message) {
      if (parsed.error?.status === "INVALID_ARGUMENT" && /api key/i.test(message)) {
        return "Gemini API key is invalid. Create a new key at aistudio.google.com/apikey and update GEMINI_API_KEY in .env.local, then restart the dev server.";
      }
      if (status === 404 && /not found/i.test(message)) {
        return `Gemini model unavailable (${message}). Set AI_MODEL=gemini-2.5-flash in .env.local.`;
      }
      if (status === 429 || /quota/i.test(message)) {
        return "Gemini quota exceeded for this model. Try AI_MODEL=gemini-2.5-flash in .env.local or enable billing in Google AI Studio.";
      }
      return message;
    }
  } catch {
    // ignore
  }
  return `AI provider request failed (${status}).`;
}

function stripJsonFence(text: string) {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractExplanationFromBrokenJson(text: string) {
  const match = text.match(/"explanation"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (!match?.[1]) return "";
  return match[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").trim();
}

type ParsedAssistantPayload = {
  explanation: string;
  recommendedCandidateIds: string[];
  searchTerms: string[];
  themes: string[];
};

function parseAssistantPayload(rawContent: string): ParsedAssistantPayload {
  let recommendedCandidateIds: string[] = [];
  let searchTerms: string[] = [];
  let themes: string[] = [];
  let explanation = stripJsonFence(rawContent);

  const jsonText = explanation;
  const tryParse = (input: string) => {
    const parsed = JSON.parse(input) as {
      explanation?: string;
      result?: string;
      recommended_candidate_ids?: unknown[];
      recommendedCandidateIds?: unknown[];
      suggestions?: unknown[];
      search_terms?: unknown[];
      searchTerms?: unknown[];
      themes?: unknown[];
    };
    explanation = String(parsed.explanation ?? parsed.result ?? "").trim();
    const ids = parsed.recommended_candidate_ids ?? parsed.recommendedCandidateIds;
    if (Array.isArray(ids)) {
      recommendedCandidateIds = ids.map(String).filter(Boolean);
    }
    if (Array.isArray(parsed.suggestions)) {
      recommendedCandidateIds = [
        ...recommendedCandidateIds,
        ...parsed.suggestions.map(String).filter(Boolean),
      ];
    }
    const terms = parsed.search_terms ?? parsed.searchTerms;
    if (Array.isArray(terms)) {
      searchTerms = terms.map(String).filter(Boolean);
    }
    if (Array.isArray(parsed.themes)) {
      themes = parsed.themes.map(String).filter(Boolean);
    }
  };

  try {
    tryParse(jsonText);
  } catch {
    const jsonStart = jsonText.indexOf("{");
    const jsonEnd = jsonText.lastIndexOf("}");
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      try {
        tryParse(jsonText.slice(jsonStart, jsonEnd + 1));
      } catch {
        const partial = extractExplanationFromBrokenJson(jsonText);
        if (partial) explanation = partial;
      }
    } else {
      const partial = extractExplanationFromBrokenJson(jsonText);
      if (partial) explanation = partial;
    }
  }

  if (!explanation || explanation.startsWith("{")) {
    explanation =
      "Selected archive sources that match your research focus. Use a pick below to insert a citation, or refine your prompt.";
  }

  return { explanation, recommendedCandidateIds, searchTerms, themes };
}

function buildCatalogLines(
  catalog: ReturnType<typeof buildCitationCatalog>,
) {
  return catalog.map((entry, index) => {
    const meta = [
      entry.creator,
      entry.date,
      entry.recordType,
      entry.sourceLabel,
      entry.institution,
    ]
      .filter(Boolean)
      .join(" · ");
    const topics = entry.topics.length ? ` | themes: ${entry.topics.join(", ")}` : "";
    return `${index + 1}. id=${entry.id} | ${entry.citationLine}${meta ? ` | ${meta}` : ""}${topics}`;
  });
}

const SYSTEM_MESSAGE = `You are a citation assistant for a decolonising research archive.

Rules:
- Choose ONLY from the numbered archive catalog (use exact id values in recommended_candidate_ids).
- Prioritise indigenous knowledges, African and Global South epistemologies, decolonisation, material culture, Pan-Africanism, and critiques of colonial archives when relevant to the user's task.
- The user's task/prompt is the primary signal. If the note draft is placeholder text (e.g. Lorem Ipsum), ignore it and still recommend catalog items.
- Do not mention Lorem Ipsum or placeholder text in your explanation.
- Do not invent external journal articles or URLs.
- Return 4–8 recommended_candidate_ids when the catalog has matches; fewer only if nothing fits.
- explanation: 2–3 sentences in plain English about why these sources fit (no IDs, no JSON).
- search_terms: optional strings for refining archive search (scholarly keywords, not full sentences).
- themes: 2–4 short labels (e.g. "Indigenous knowledge systems", "African epistemologies").

Reply with JSON only:
{
  "recommended_candidate_ids": ["exact-id-from-catalog"],
  "search_terms": ["keyword"],
  "themes": ["theme label"],
  "explanation": "plain English"
}`;

export async function POST(request: NextRequest) {
  try {
    await requireMember("/my/workbench");
  } catch {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  let body: {
    noteId?: string;
    prompt?: string;
    noteContentHtml?: string;
    candidates?: CandidateInput[];
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (!body.prompt?.trim()) {
    return NextResponse.json({ ok: false, error: "Prompt is required." }, { status: 400 });
  }

  const apiKey = resolveApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "AI provider is not configured. Set GEMINI_API_KEY, AI_API_KEY, or OPENAI_API_KEY.",
      },
      { status: 501 },
    );
  }

  const provider = resolveProvider(apiKey);
  const model = resolveModel(provider);
  const noteHtml = body.noteContentHtml?.trim() || "";
  const prompt = body.prompt.trim();

  const fullCatalog = buildCitationCatalog(
    (body.candidates ?? []).map((candidate) => ({
      id: candidate.id,
      title: candidate.title ?? candidate.id,
      creator: candidate.creator,
      date: candidate.date,
      institution: candidate.institution,
      recordType: candidate.recordType,
      sourceLabel: candidate.sourceLabel,
      citationText: candidate.citationText,
    })),
  );

  const rankedCatalog = rankCitationCatalog(fullCatalog, prompt, noteHtml, 48);
  const catalogLines = buildCatalogLines(rankedCatalog);

  const userMessage = `Research task:\n${prompt}\n\nArchive catalog (${rankedCatalog.length} sources, ranked for relevance):\n${catalogLines.join("\n") || "(empty — return helpful search_terms and themes only)"}`;

  const isGemini =
    provider === "gemini" ||
    readEnv("AI_API_BASE_URL").includes("generativelanguage.googleapis.com");

  try {
    let response: Response;

    if (isGemini) {
      const geminiUrl = readEnv("AI_API_BASE_URL") || buildGeminiUrl(model);
      response = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_MESSAGE }],
          },
          contents: [
            {
              parts: [{ text: userMessage }],
            },
          ],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 1536,
            responseMimeType: "application/json",
          },
        }),
      });
    } else {
      const baseUrl =
        readEnv("OPENAI_API_BASE_URL") ||
        readEnv("AI_API_BASE_URL") ||
        "https://api.openai.com/v1/chat/completions";
      response = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: SYSTEM_MESSAGE },
            { role: "user", content: userMessage },
          ],
          max_tokens: 768,
          temperature: 0.35,
          response_format: { type: "json_object" },
        }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          ok: false,
          error: parseProviderError(response.status, errorText),
        },
        { status: 502 },
      );
    }

    const data = await response.json();
    const rawContent = isGemini ? extractGeminiText(data) : extractOpenAIText(data);

    if (!rawContent) {
      return NextResponse.json({ ok: false, error: "AI returned no response." }, { status: 502 });
    }

    const parsed = parseAssistantPayload(rawContent);
    const recommendedCandidateIds = resolveRecommendedIds(
      parsed.recommendedCandidateIds,
      fullCatalog,
    );

    const picks = buildCitationPicks(recommendedCandidateIds, fullCatalog);
    const suggestions = picks.map((pick) => pick.citationLine);
    const themes =
      parsed.themes.length > 0
        ? parsed.themes
        : rankedCatalog
            .flatMap((entry) => entry.topics)
            .filter((value, index, list) => list.indexOf(value) === index)
            .slice(0, 4);

    return NextResponse.json({
      ok: true,
      result: parsed.explanation,
      recommendedCandidateIds,
      picks,
      suggestions,
      searchTerms: parsed.searchTerms,
      themes,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Unable to contact AI provider." }, { status: 502 });
  }
}

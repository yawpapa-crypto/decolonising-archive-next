import { NextRequest, NextResponse } from "next/server";
import type {
  ArchiveGuideApiResponse,
  ArchiveGuideArea,
  ArchiveGuideContextItem,
  ArchiveGuideMode,
  ArchiveGuideNextAction,
  ArchiveGuideState,
  ArchiveGuideStructuredContext,
  ArchiveGuideSuccess,
} from "@/src/lib/archive-guide-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Allow-lists ──────────────────────────────────────────────────────────────

const ALLOWED_AREAS = new Set<ArchiveGuideArea>([
  "library", "record", "reading_list",
  "workbench_document", "workbench_board", "workbench_canvas", "community",
]);

const ALLOWED_MODES = new Set<ArchiveGuideMode>([
  "expand_search", "ask_better_questions", "compare_sources",
  "what_am_i_missing", "build_reading_path", "cultural_care_check",
  "reflect_on_process", "suggest_next_step",
]);

const ALLOWED_STATES = new Set<ArchiveGuideState>([
  "idle", "listening", "thinking", "curious", "encouraging",
  "pointing", "celebrating", "careful", "sleeping",
]);

// ─── Query interpretation ─────────────────────────────────────────────────────

type QueryType =
  | "person"
  | "concept"
  | "object_material"
  | "place_community"
  | "institution"
  | "method"
  | "event"
  | "unknown";

type Sensitivity = "ordinary" | "cultural_care" | "colonial_archive_possible";

type QueryInterpretation = {
  queryType: QueryType;
  sensitivity: Sensitivity;
  confidence: "low" | "medium" | "high";
  notes: string;
};

const PERSON_SIGNALS = /^[A-Z][a-z]+ [A-Z][a-z]+|^[A-Z][a-z]+ [A-Z][a-z]+-[A-Z][a-z]+/;
const CONCEPT_SIGNALS = /\b(theory|framework|method|approach|epistemol|ontolog|decolon|postcolonial|critical|pedagog|praxis|philosophy|philosophi|ethics)\b/i;
const OBJECT_SIGNALS = /\b(mask|textile|cloth|kente|fabric|vessel|ceramic|pottery|sculpture|painting|carving|artifact|artefact|object|material|jewel|bead|drum|instrument|garment|weav)\b/i;
const PLACE_SIGNALS = /\b(Ghana|Nigeria|Kenya|Zimbabwe|Senegal|Mali|Congo|Uganda|Tanzania|Ethiopia|South Africa|Cameroon|Accra|Lagos|Nairobi|Harare|Dakar|African|West Africa|East Africa|Southern Africa|North Africa|Sahel|Sahara|community|indigenous|local|village|region)\b/i;
const INSTITUTION_SIGNALS = /\b(university|museum|gallery|institute|college|school|foundation|archive|library|council|ministry|NGO|organisation|organization)\b/i;
const METHOD_SIGNALS = /\b(method|methodology|approach|practice|process|technique|tool|strategy|protocol|model|system|framework|design|ethnograph|qualitative|quantitative|participat|co-design|co-creat)\b/i;
const CULTURAL_CARE_SIGNALS = /\b(sacred|ritual|ceremony|burial|ancestor|spirit|initiation|shrine|secret|restricted|custodian|protocol|indigenous|traditional|knowledge holder|elder)\b/i;
const COLONIAL_ARCHIVE_SIGNALS = /\b(colonial|collected|collection|museum|provenance|repatri|looted|stolen|ethnographic|expedition|missionary)\b/i;

function interpretGuideQuery(
  query: string | undefined,
  context: ArchiveGuideStructuredContext,
): QueryInterpretation {
  if (!query) {
    return { queryType: "unknown", sensitivity: "ordinary", confidence: "low", notes: "No query provided." };
  }

  const q = query.trim();
  const providers = (context.results ?? []).map((r) => r.provider ?? "").join(" ").toLowerCase();

  // Sensitivity check first — independent of type
  let sensitivity: Sensitivity = "ordinary";
  if (CULTURAL_CARE_SIGNALS.test(q)) sensitivity = "cultural_care";
  else if (COLONIAL_ARCHIVE_SIGNALS.test(q) || /museum/i.test(providers)) sensitivity = "colonial_archive_possible";

  // Type inference
  if (PERSON_SIGNALS.test(q) && q.split(" ").length <= 4) {
    return { queryType: "person", sensitivity, confidence: "high", notes: `"${q}" matches a personal name pattern.` };
  }
  if (OBJECT_SIGNALS.test(q)) {
    const sens = sensitivity === "ordinary" ? "cultural_care" : sensitivity;
    return { queryType: "object_material", sensitivity: sens, confidence: "high", notes: "Query references a material or cultural object." };
  }
  if (PLACE_SIGNALS.test(q) && !CONCEPT_SIGNALS.test(q)) {
    return { queryType: "place_community", sensitivity, confidence: "medium", notes: "Query references a place or community." };
  }
  if (INSTITUTION_SIGNALS.test(q)) {
    return { queryType: "institution", sensitivity, confidence: "medium", notes: "Query references an institution." };
  }
  if (METHOD_SIGNALS.test(q)) {
    return { queryType: "method", sensitivity, confidence: "medium", notes: "Query references a method or practice." };
  }
  if (CONCEPT_SIGNALS.test(q)) {
    return { queryType: "concept", sensitivity, confidence: "high", notes: "Query references a concept or theoretical frame." };
  }

  // Fallback heuristic: multiple capitalised words → likely person or institution
  const caps = q.split(/\s+/).filter((w) => /^[A-Z]/.test(w));
  if (caps.length >= 2 && q.split(" ").length <= 5) {
    return { queryType: "person", sensitivity, confidence: "low", notes: "Multiple capitalised words — possibly a person or institution name." };
  }

  return { queryType: "unknown", sensitivity, confidence: "low", notes: "Query type could not be inferred with confidence." };
}

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Archive Guide beta, an intelligent guided learning companion for Decolonising Archive.

You help researchers learn through questions, comparison, reflection and careful interpretation. You are not a generic chatbot and you do not give final answers.

CORE RULE — NEVER produce search suggestions by appending generic academic labels to the query.
BAD: "Yaw Ofosu-Asare overview introduction"
BAD: "Kwasi Wiredu primary source"
BAD: "African masks critique response"
Each search suggestion must be a plausible query a real user would type, meaningfully different from the original, and explained by what it helps the learner discover.

Your pedagogy is asset-based. Treat every search as evidence of the learner's direction. Infer what kind of understanding they are building, not just what keywords they used.

Structured context (query, results, providers, previous searches) is provided. Use it. Refer to visible result titles when comparing. Notice source positions (authored, institutional, archival, community-held, colonial-collected).

Do not invent sources. Do not claim certainty. Do not treat restricted or community-held knowledge as open data.

Return JSON only with this exact shape:
{
  "response": "short warm acknowledgement — 1–2 sentences that show you read the context",
  "learningMove": "3–6 word name for this learning move",
  "guidingQuestions": ["question 1", "question 2", "question 3"],
  "suggestedSearches": ["plausible search phrase 1", "plausible search phrase 2"],
  "searchReasons": ["why this search helps — one sentence", "why this one helps"],
  "nextActions": [{"label": "specific action label", "action": "action_id", "payload": {}}],
  "characterState": "curious"
}`;

// ─── Mode-specific instructions ───────────────────────────────────────────────

const MODE_INSTRUCTIONS: Record<ArchiveGuideMode, string> = {
  expand_search: `MODE: Expand Search
Read the query and interpret what type of thing the user is searching for (person, concept, object, place, institution, method).
Produce FOUR meaningfully different search paths:
1. A broader path — zooms out to the field, tradition, or context around the query
2. A narrower path — zooms into a specific aspect, text, or angle
3. An adjacent path — moves sideways to a related concept, figure, or practice
4. A source-position path — finds authored work, interviews, talks, or community-held sources

For a person query: suggest authored works, institutional profiles, interviews/talks, and citation/reception.
For a concept query: suggest theoretical origins, applied examples, critiques, and cross-cultural variants.
For an object query: suggest material, region, maker/community voice, and collecting context.

searchReasons must explain what each path reveals, not just restate it.
guidingQuestions must ask about the learner's angle, intent and source need — not just repeat the query.
characterState: "curious"`,

  ask_better_questions: `MODE: Ask Better Questions
Help the learner form 3–4 open-ended research questions from their current search.
Questions must be specific enough to guide evidence-gathering but open enough to stay non-prescriptive.
For a person query: ask about their intellectual contribution, how others have received them, the traditions they work within, and what their work cannot tell us.
For a concept query: ask about origin, application, critique, and what it excludes.
For an object query: ask about maker, material, use, collection context, and whose voice is authoritative.

suggestedSearches should help begin addressing one of the questions, not restate the query.
searchReasons must explain which question each search begins to address.
guidingQuestions ARE the research questions here — make them the core of the response.
characterState: "curious"`,

  compare_sources: `MODE: Compare Sources
Help the learner compare visible results using meaningful dimensions.
If result titles and providers are available, refer to them directly.
If fewer than two results are visible, say so and explain comparison dimensions for when sources are found.
Compare by: source position (authored vs about), institutional location, date, disciplinary lens, language, and what each source lets the learner say with care.
guidingQuestions must ask which source is closest to the original voice, which interprets from outside, which gives historical context, and what the difference between them reveals.
suggestedSearches: paths that would surface a contrasting or missing source type.
characterState: "pointing"`,

  what_am_i_missing: `MODE: What Am I Missing?
Identify likely gaps in the learner's current path without claiming certainty.
For a person query: consider authored works vs profile pages vs citations vs interviews/talks vs community sources vs non-Western indexes.
For a concept query: consider origins, debates, applications, local-language variants, and practice-based sources.
For an object query: consider maker/community voice, material practice, colonial collecting context, local terminology, and contemporary use.
Frame everything as possibility: "What may be less visible is...", "You might not yet have seen...", "A possible gap is..."
guidingQuestions ask whose voice is most visible, what source type is absent, what language or region might be missing.
suggestedSearches target one or two specific absences with plausible queries.
characterState: "careful"`,

  build_reading_path: `MODE: Build a Reading Path
Create an intelligent 3–4 layer reading sequence based on the query type.
NEVER produce layers by appending "overview", "primary source", "critique response" to the query.
Each layer must be described as a SOURCE TYPE with an explanation of what it gives the learner.

For a person query:
Layer 1: Orientation — institutional profile or biography to establish role and research area
Layer 2: Authored voice — a text, talk, or article written by the person
Layer 3: Reception — how others cite, respond to, or extend the work
Layer 4: Conceptual connection — the key ideas that recur across the work

For a concept query:
Layer 1: Theoretical grounding — where the concept originates
Layer 2: Primary articulation — the key text that defines the concept
Layer 3: Application — how the concept appears in practice or fieldwork
Layer 4: Critique or extension — challenges to the concept or directions it opens

For an object query:
Layer 1: Material and region — what the object is and where it comes from
Layer 2: Maker or community voice — sources authored from within the tradition
Layer 3: Collection context — how and when it entered institutional collections
Layer 4: Contemporary relevance — how the object is understood today

guidingQuestions ask what kind of source the learner needs first and what each layer would give them.
suggestedSearches should target one source per layer — and the reason must explain what the layer reveals.
characterState: "pointing"`,

  cultural_care_check: `MODE: Cultural Care Check
Slow down interpretation and check cultural, ethical and epistemic context.
This is not about blocking inquiry — it is about responsible reading.

For a person query: be careful about summarising a living scholar through fragments. Distinguish authored voice from institutional description. Avoid reducing the person to one theme.
For a cultural object query: ask who has authority to interpret. Ask whether knowledge may be sacred, restricted, or community-held. Ask whether museum metadata reflects colonial collection logics.
For a concept query: ask who coined the concept, in what tradition, and what is lost when it is extracted from that context.

guidingQuestions must ask: who is speaking vs who is being spoken about, what is being translated between traditions, what should not be treated as open data.
suggestedSearches: paths that surface community-held, practitioner-authored, or non-institutional sources.
characterState: "careful"`,

  reflect_on_process: `MODE: Reflect on Process
Help the learner reflect on their own research process using available evidence.
Use the current query, previous queries, result count, and any saved records to identify a pattern in the learner's moves.
If no history is available, say so plainly and help the learner identify what stage of inquiry they are at.
Do not fake history. Do not pretend to know what the learner has not shared.

Recognise what they have already done. Name a possible direction or pattern. Ask metacognitive questions.
guidingQuestions: what keeps drawing them to this topic, what have they already ruled out, what kind of source helped them think better, what would count as progress now.
suggestedSearches: one search that follows logically from the observed pattern.
characterState: "encouraging"`,

  suggest_next_step: `MODE: Suggest Next Step
Identify one concrete, useful next action given the current context.
This could be a search refinement, opening a specific result, saving a source, broadening the query, or pausing to write a note.
Base the suggestion on the query type and what seems most likely to move the inquiry forward.
guidingQuestions: what is the learner trying to decide, what information would help, what is the smallest useful move.
characterState: "pointing"`,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readEnv(name: string) { return process.env[name]?.trim() ?? ""; }
function resolveApiKey() { return readEnv("GEMINI_API_KEY"); }
function resolveModel() {
  return (readEnv("ARCHIVE_GUIDE_GEMINI_MODEL") || readEnv("AI_MODEL") || "gemini-2.5-flash").replace(/^models\//, "");
}
function buildGeminiUrl(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

function cleanText(value: unknown, maxLength = 320) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : undefined;
}

function cleanList(value: unknown, maxItems: number, maxLength = 160) {
  if (!Array.isArray(value)) return undefined;
  const items = value.map((i) => cleanText(i, maxLength)).filter((i): i is string => Boolean(i)).slice(0, maxItems);
  return items.length ? items : undefined;
}

function cleanItem(value: unknown): ArchiveGuideContextItem | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const title = cleanText(row.title, 180);
  if (!title) return null;
  return {
    id: cleanText(row.id, 80),
    title,
    snippet: cleanText(row.snippet, 260),
    provider: cleanText(row.provider, 90),
    creator: cleanText(row.creator, 120),
    date: cleanText(row.date, 60),
    type: cleanText(row.type, 80),
  };
}

function cleanItems(value: unknown, maxItems = 8) {
  if (!Array.isArray(value)) return undefined;
  const items = value.map(cleanItem).filter((i): i is ArchiveGuideContextItem => Boolean(i)).slice(0, maxItems);
  return items.length ? items : undefined;
}

function sanitizeContext(area: ArchiveGuideArea, rawContext: unknown): ArchiveGuideStructuredContext {
  const raw = rawContext && typeof rawContext === "object" ? (rawContext as Record<string, unknown>) : {};
  const context: ArchiveGuideStructuredContext = {
    area,
    title: cleanText(raw.title, 160),
    query: cleanText(raw.query, 180),
    previousQueries: cleanList(raw.previousQueries, 6, 120),
    resultCount: typeof raw.resultCount === "number" && Number.isFinite(raw.resultCount)
      ? Math.max(0, Math.min(500, Math.round(raw.resultCount)))
      : undefined,
    filters: cleanList(raw.filters, 8, 80),
    results: cleanItems(raw.results, 8),
    savedRecords: cleanItems(raw.savedRecords, 8),
    readingListItems: cleanItems(raw.readingListItems, 8),
    boardCards: cleanItems(raw.boardCards, 10),
    boardLayout: cleanText(raw.boardLayout, 80),
    canvasObjects: cleanItems(raw.canvasObjects, 10),
    privacyNote: "Private Workbench bodies, board card bodies, canvas object text and drafts are not included by default.",
  };
  if (raw.publicThread && typeof raw.publicThread === "object") {
    const thread = raw.publicThread as Record<string, unknown>;
    context.publicThread = {
      title: cleanText(thread.title, 160),
      bodySnippet: cleanText(thread.bodySnippet, 320),
      commentSnippets: cleanList(thread.commentSnippets, 4, 220),
    };
  }
  return context;
}

function stripJsonFence(text: string) {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function extractGeminiText(data: unknown) {
  const payload = data as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return String(
    payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "",
  ).trim();
}

function parseModelPayload(text: string, mode: ArchiveGuideMode): ArchiveGuideSuccess | null {
  const raw = stripJsonFence(text);
  const candidates = [raw];
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) candidates.push(raw.slice(start, end + 1));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Record<string, unknown>;
      const response = cleanText(parsed.response, 900);
      if (!response) continue;

      const characterState = ALLOWED_STATES.has(parsed.characterState as ArchiveGuideState)
        ? (parsed.characterState as ArchiveGuideState)
        : "curious";

      const nextActions = Array.isArray(parsed.nextActions)
        ? parsed.nextActions.slice(0, 4).map((item): ArchiveGuideNextAction | null => {
            if (!item || typeof item !== "object") return null;
            const row = item as Record<string, unknown>;
            const label = cleanText(row.label, 80);
            const action = cleanText(row.action, 80);
            if (!label || !action) return null;
            return { label, action, payload: row.payload && typeof row.payload === "object" ? (row.payload as Record<string, unknown>) : undefined };
          }).filter((i): i is ArchiveGuideNextAction => Boolean(i))
        : [];

      return {
        ok: true,
        mode,
        response,
        learningMove: cleanText(parsed.learningMove, 120) ?? "Guided inquiry",
        guidingQuestions: cleanList(parsed.guidingQuestions, 5, 200) ?? [],
        suggestedSearches: cleanList(parsed.suggestedSearches, 4, 140) ?? [],
        searchReasons: cleanList(parsed.searchReasons, 4, 180),
        nextActions,
        characterState,
      };
    } catch {
      // try next candidate
    }
  }
  return null;
}

// ─── Intelligent fallback responses ───────────────────────────────────────────
//
// These are generated without Gemini. They use query interpretation to produce
// genuinely different content per (mode × queryType) combination. They must
// NEVER produce template phrases like "${query} overview introduction".

function makeFallback(
  area: ArchiveGuideArea,
  mode: ArchiveGuideMode,
  query: string | undefined,
  interp: QueryInterpretation,
): ArchiveGuideSuccess {
  const q = query ?? "";
  const hasQuery = Boolean(q);
  const isLib = area === "library";

  // ── expand_search ──────────────────────────────────────────────────────────
  if (mode === "expand_search") {
    if (interp.queryType === "person" && hasQuery) {
      return {
        ok: true, mode, isFallback: true,
        response: `Searching for a person opens several different paths depending on what you need: their own writing and thinking, institutional descriptions of their work, how others have cited or responded to them, and where their ideas connect to broader conversations.`,
        learningMove: "Search expansion — person",
        guidingQuestions: [
          "Are you looking for sources authored by this person, sources about them, or sources that cite them?",
          "Do you want their scholarly writing, their institutional profile, an interview or talk, or a critical engagement with their work?",
          "What field or practice is most central to what you are trying to understand — their ideas, their methods, or their cultural context?",
        ],
        suggestedSearches: isLib ? [
          `${q} authored work`,
          `${q} interview lecture talk`,
          `${q} cited reception scholarship`,
        ] : [],
        searchReasons: [
          "Finds sources where this person is the author, not just the subject.",
          "Surfaces interviews, lectures and recorded talks — often the most direct access to a thinker's voice.",
          "Shows how other scholars and practitioners cite or respond to the work.",
        ],
        nextActions: [{ label: "Try one authored and one external source", action: "focus_search" }],
        characterState: "curious",
      };
    }
    if (interp.queryType === "concept" && hasQuery) {
      return {
        ok: true, mode, isFallback: true,
        response: `This search points toward a concept or theoretical frame. Concepts usually have an origin, a primary articulation, a set of applications, and a body of critique. Moving across these gives a much fuller picture than a single search.`,
        learningMove: "Search expansion — concept",
        guidingQuestions: [
          "Where does this concept originate, and who introduced it into the conversation you are following?",
          "Is this concept more useful as a theoretical tool, a historical description, or a political claim?",
          "Where does this concept appear in practice, and what tension or contradiction does it produce there?",
        ],
        suggestedSearches: isLib ? [
          `${q} origins theory`,
          `${q} practice application case study`,
          `${q} critique limitations`,
        ] : [],
        searchReasons: [
          "Grounds the concept in its intellectual origins and key thinkers.",
          "Shows how the concept operates in concrete situations rather than in theory alone.",
          "Surfaces pushback, limitations and debates — essential for using the concept critically.",
        ],
        nextActions: [{ label: "Try one theoretical and one practice-based search", action: "focus_search" }],
        characterState: "curious",
      };
    }
    if (interp.queryType === "object_material" && hasQuery) {
      return {
        ok: true, mode, isFallback: true,
        response: `Material and object searches open in several directions: the object's material properties and regional origin, the community or tradition that made and uses it, its collecting and institutional history, and its contemporary significance.`,
        learningMove: "Search expansion — object",
        guidingQuestions: [
          "Are you approaching this object through its material properties, its cultural function, or its collecting history?",
          "Whose knowledge tradition is this object connected to, and are there sources authored from within that tradition?",
          "Has this object moved through colonial or institutional collections, and does that collecting history shape how it is described?",
        ],
        suggestedSearches: isLib ? [
          `${q} region community tradition`,
          `${q} maker community voice`,
          `${q} colonial collection provenance`,
        ] : [],
        searchReasons: [
          "Situates the object within the place and tradition it comes from.",
          "Prioritises sources authored from within the knowledge tradition rather than about it.",
          "Surfaces the collecting history, which often shapes how the object is named and described in archives.",
        ],
        nextActions: [{ label: "Try one community-authored and one institutional source", action: "focus_search" }],
        characterState: "careful",
      };
    }
    // Generic expand fallback
    return {
      ok: true, mode, isFallback: true,
      response: hasQuery
        ? `Your search for "${q}" gives us a starting direction. We can move outward toward the broader field, inward toward a specific angle, sideways toward related concepts, or toward different source positions.`
        : "Let's move the search in four directions: broader, narrower, adjacent, and toward a different source position.",
      learningMove: "Search expansion",
      guidingQuestions: [
        "What angle are you approaching this from — historical, conceptual, material, or community-based?",
        "Are you looking for a particular kind of source — authored text, archive record, interview, visual record?",
        "What related concept or figure sits just outside what you have already searched?",
      ],
      suggestedSearches: isLib && hasQuery ? [`${q} African context`, `${q} community knowledge systems`] : [],
      searchReasons: ["Broadens the search toward the cultural and political context.", "Prioritises community-held and practitioner knowledge over institutional description."],
      nextActions: [{ label: "Try one broader and one narrower search", action: "focus_search" }],
      characterState: "curious",
    };
  }

  // ── ask_better_questions ───────────────────────────────────────────────────
  if (mode === "ask_better_questions") {
    if (interp.queryType === "person" && hasQuery) {
      return {
        ok: true, mode, isFallback: true,
        response: `A name search is the beginning of a question, not the question itself. Let's turn "${q}" into research questions that can guide evidence-gathering.`,
        learningMove: "Question formation — person",
        guidingQuestions: [
          `What is the central intellectual or creative contribution of ${q}, and how would you find evidence for that claim?`,
          `Which sources are authored by ${q}, and which are institutional descriptions or external assessments of the work?`,
          `How has ${q}'s work been received, cited, or challenged by others in the field?`,
          `What traditions, communities or intellectual lineages does the work connect to, and are those connections visible in the current results?`,
        ],
        suggestedSearches: isLib ? [`${q} scholarly contribution`, `${q} intellectual lineage`] : [],
        searchReasons: [
          "Finds sources that position the person's contribution within a scholarly conversation.",
          "Surfaces connections to the traditions, schools or communities the work draws on.",
        ],
        nextActions: [{ label: "Choose one question to anchor your next search", action: "focus_search" }],
        characterState: "curious",
      };
    }
    if (interp.queryType === "concept" && hasQuery) {
      return {
        ok: true, mode, isFallback: true,
        response: `"${q}" is a conceptual term that carries a history, a set of applications, and a body of debate. Let's form questions that take that seriously.`,
        learningMove: "Question formation — concept",
        guidingQuestions: [
          `Who introduced "${q}" into the intellectual conversation you are following, and what problem were they trying to solve?`,
          `How does "${q}" differ across the traditions or disciplines that use it — does the same term mean different things in different contexts?`,
          `What does "${q}" make visible that other frameworks do not, and what does it leave out?`,
          `Where has "${q}" been applied in practice, and what tensions or contradictions appeared there?`,
        ],
        suggestedSearches: isLib ? [`${q} intellectual origins`, `${q} applied practice`] : [],
        searchReasons: [
          "Grounds the concept in its origins and in the problem it was designed to address.",
          "Surfaces how the concept has been applied in concrete contexts — where its limits appear.",
        ],
        nextActions: [{ label: "Choose one question to guide the next search", action: "focus_search" }],
        characterState: "curious",
      };
    }
    // Generic
    return {
      ok: true, mode, isFallback: true,
      response: hasQuery
        ? `Let's turn "${q}" into open research questions that can actually guide your evidence-gathering.`
        : "A search term is the beginning of a question. Let's turn it into questions that stay open and specific enough to guide evidence-gathering.",
      learningMove: "Question formation",
      guidingQuestions: [
        "What problem or tension is your search circling around?",
        "Whose perspective or voice is most important to understand this topic well?",
        "What would you need to find — what kind of source — to feel you understood this more deeply?",
        "What angle — historical, conceptual, material, political, cultural — would shift your understanding most?",
      ],
      suggestedSearches: isLib && hasQuery ? [`${q} scholarship`, `${q} cultural context`] : [],
      searchReasons: ["Surfaces scholarly engagement with the topic.", "Provides cultural and historical grounding."],
      nextActions: [{ label: "Choose one question to anchor your next search", action: "focus_search" }],
      characterState: "curious",
    };
  }

  // ── compare_sources ────────────────────────────────────────────────────────
  if (mode === "compare_sources") {
    return {
      ok: true, mode, isFallback: true,
      response: hasQuery
        ? `Before choosing one source for "${q}", it is worth comparing what each result lets you see. Sources differ by who authored them, where they were produced, and what they are designed to do.`
        : "Comparison is one of the most productive research moves. Before committing to one source, compare source positions — who authored it, from where, and for what purpose.",
      learningMove: "Source comparison",
      guidingQuestions: [
        "Which result is authored by the person or community being discussed, and which is authored about them?",
        "Which result is scholarly, which is institutional, and which might be archival or community-based?",
        "Which source gives the most evidence, and which gives the most context?",
        "What does the difference in source position tell you about who controls this knowledge and how it is framed?",
      ],
      suggestedSearches: isLib && hasQuery ? [`${q} community authored`, `${q} critical scholarly response`] : [],
      searchReasons: [
        "Surfaces sources authored from within the relevant community or tradition.",
        "Finds scholarly sources that engage critically with the subject rather than only describing it.",
      ],
      nextActions: [{ label: "Open two results and compare their source positions", action: "open_record" }],
      characterState: "pointing",
    };
  }

  // ── what_am_i_missing ──────────────────────────────────────────────────────
  if (mode === "what_am_i_missing") {
    if (interp.queryType === "person" && hasQuery) {
      return {
        ok: true, mode, isFallback: true,
        response: `A search for a person can quickly fill up with institutional descriptions and profile pages. What may be harder to find — and more valuable — are sources where the person is speaking in their own voice.`,
        learningMove: "Gap identification — person",
        guidingQuestions: [
          `Are you finding sources authored by ${q}, or mainly sources describing or profiling them?`,
          "Are there interviews, recorded talks, or lectures that give more direct access to the person's thinking?",
          "Are there sources from outside the institutional or Western academic context that position the work differently?",
          "What key ideas or projects appear in the work that you have not yet followed up as independent search terms?",
        ],
        suggestedSearches: isLib ? [`${q} talk lecture keynote`, `${q} interview own words`] : [],
        searchReasons: [
          "Prioritises recorded talks and lectures — closer to the person's own voice than institutional profiles.",
          "Surfaces interviews and first-person sources rather than third-person descriptions.",
        ],
        nextActions: [{ label: "Search for one authored or first-person source", action: "focus_search" }],
        characterState: "careful",
      };
    }
    if (interp.queryType === "object_material" && hasQuery) {
      return {
        ok: true, mode, isFallback: true,
        response: `Material culture searches often surface institutional or museum descriptions first. What may be less visible are sources authored from within the community or tradition the object comes from.`,
        learningMove: "Gap identification — material culture",
        guidingQuestions: [
          "Are the current results describing the object from an institutional position, or from within the community that made and uses it?",
          "Is there a local language term for this object that would surface different sources?",
          "Are there sources about the collecting or acquisition history of this object?",
          "What contemporary significance does this object carry, and is that visible in any current result?",
        ],
        suggestedSearches: isLib ? [`${q} community knowledge tradition`, `${q} colonial collection history`] : [],
        searchReasons: [
          "Surfaces sources that position the object within living cultural knowledge rather than museum classification.",
          "Finds sources about how and when the object entered institutional collections — context that shapes its current description.",
        ],
        nextActions: [{ label: "Search for one community-authored source", action: "focus_search" }],
        characterState: "careful",
      };
    }
    // Generic
    return {
      ok: true, mode, isFallback: true,
      response: hasQuery
        ? `Every search path has edges. For "${q}", what may be less visible are community-authored sources, non-Western indexes, practice-based knowledge, and sources in languages other than English.`
        : "Every search path has edges. The most common gaps are: community voice, non-English sources, practice-based knowledge, and sources from outside dominant institutional archives.",
      learningMove: "Gap identification",
      guidingQuestions: [
        "Whose voice is most present in the results you have seen, and whose is absent?",
        "Is there a local language term or regional index that might surface different sources?",
        "Are there practice-based or community-held sources that would not appear in an academic database?",
        "What source type — archive record, interview, visual document, oral account — have you not yet tried?",
      ],
      suggestedSearches: isLib && hasQuery ? [`${q} community perspective local`, `${q} African knowledge systems`] : [],
      searchReasons: [
        "Prioritises community and local perspectives that may not appear in academic databases.",
        "Surfaces sources connected to African knowledge traditions rather than only Western academic framing.",
      ],
      nextActions: [{ label: "Search for one missing source type or perspective", action: "focus_search" }],
      characterState: "careful",
    };
  }

  // ── build_reading_path ─────────────────────────────────────────────────────
  if (mode === "build_reading_path") {
    if (interp.queryType === "person" && hasQuery) {
      return {
        ok: true, mode, isFallback: true,
        response: `A reading path for a person should move from orientation toward their own voice, and then outward toward how others receive and extend the work.`,
        learningMove: "Reading path — person",
        guidingQuestions: [
          "What do you need to understand about the person's context and role before their work makes full sense?",
          "What would give you the most direct access to their own thinking — a key text, a talk, an interview?",
          "How have others in the field cited, challenged or extended this work?",
        ],
        suggestedSearches: isLib ? [
          `${q} profile biography research area`,
          `${q} authored article chapter talk`,
          `${q} cited reviewed extended`,
        ] : [],
        searchReasons: [
          "Layer 1: Establishes who the person is, what field they work in, and what their central questions are.",
          "Layer 2: Gets closest to their own voice — authored texts and recorded talks are more direct than institutional descriptions.",
          "Layer 3: Shows how the work is received, cited and challenged — essential for understanding its significance.",
        ],
        nextActions: [{ label: "Save one authored source and one external source", action: "bookmark" }],
        characterState: "pointing",
      };
    }
    if (interp.queryType === "concept" && hasQuery) {
      return {
        ok: true, mode, isFallback: true,
        response: `A reading path for a concept should move from its origins to its primary articulation, then to how it has been applied and contested.`,
        learningMove: "Reading path — concept",
        guidingQuestions: [
          "Where does this concept originate, and what intellectual tradition does it emerge from?",
          "Which text or thinker gives the clearest and most authoritative articulation of the concept?",
          "Where has the concept been applied, and what tensions or limits appeared in practice?",
        ],
        suggestedSearches: isLib ? [
          `${q} origins intellectual tradition`,
          `${q} key text primary articulation`,
          `${q} applied critique contested`,
        ] : [],
        searchReasons: [
          "Layer 1: Grounds the concept in the problem it was designed to address and who introduced it.",
          "Layer 2: Finds the foundational text — the best place to understand the concept on its own terms.",
          "Layer 3: Surfaces how the concept has been tested, challenged and extended in practice or later scholarship.",
        ],
        nextActions: [{ label: "Save one foundational and one applied source", action: "bookmark" }],
        characterState: "pointing",
      };
    }
    if (interp.queryType === "object_material" && hasQuery) {
      return {
        ok: true, mode, isFallback: true,
        response: `A reading path for a material culture object should move from the object's context of origin, toward the community voice, and then into its institutional and contemporary reception.`,
        learningMove: "Reading path — material culture",
        guidingQuestions: [
          "What do you need to know about the region, tradition and material before you can read the object well?",
          "Are there sources authored from within the community that made this object?",
          "How has the object been described, collected and interpreted by institutions — and how does that framing compare with community knowledge?",
        ],
        suggestedSearches: isLib ? [
          `${q} origin region tradition community`,
          `${q} community knowledge maker voice`,
          `${q} museum collection institutional description`,
        ] : [],
        searchReasons: [
          "Layer 1: Situates the object in its material and cultural context before institutional framing.",
          "Layer 2: Prioritises community-authored sources — the most direct access to the knowledge the object carries.",
          "Layer 3: Surfaces how institutions have described and collected the object — often revealing collecting biases.",
        ],
        nextActions: [{ label: "Find one community-authored and one institutional source", action: "focus_search" }],
        characterState: "pointing",
      };
    }
    // Generic
    return {
      ok: true, mode, isFallback: true,
      response: hasQuery
        ? `A reading path for "${q}" should move in layers: first establish context, then find the key voice or text, then look for how it has been received or challenged.`
        : "A reading path works in layers: orientation first, then a primary or foundational source, then a critical or contextual source that complicates or extends the picture.",
      learningMove: "Reading path",
      guidingQuestions: [
        "What context do you need before the primary sources make full sense?",
        "What kind of source would give you the most direct access to the core idea or voice?",
        "What kind of critical or contextual source would challenge or extend your initial reading?",
      ],
      suggestedSearches: isLib && hasQuery ? [`${q} foundational context`, `${q} critical response`] : [],
      searchReasons: [
        "Establishes the context and background needed to read primary sources well.",
        "Surfaces critical engagement — essential for using any source with intellectual care.",
      ],
      nextActions: [{ label: "Save one source per layer of the path", action: "bookmark" }],
      characterState: "pointing",
    };
  }

  // ── cultural_care_check ────────────────────────────────────────────────────
  if (mode === "cultural_care_check") {
    if (interp.queryType === "object_material" && hasQuery) {
      return {
        ok: true, mode, isFallback: true,
        response: `Before interpreting "${q}", let's slow down. Material culture objects often carry knowledge, protocol and community significance that may not be visible in institutional descriptions. A care check asks what might be lost or flattened in how this object has been archived, named and described.`,
        learningMove: "Cultural care — material culture",
        guidingQuestions: [
          "Does this object carry sacred, ritual or restricted significance in its community of origin?",
          "Who named and described this object in the archive or museum, and are they from the community that made it?",
          "What may be lost when the object moves from its context of origin into an institutional collection?",
          "Is there community guidance or cultural protocol around how this object should be discussed or shared?",
        ],
        suggestedSearches: isLib ? [`${q} community cultural protocol`, `${q} repatriation provenance decolonise`] : [],
        searchReasons: [
          "Surfaces community guidance, cultural protocols and knowledge-holder perspectives.",
          "Finds sources about the object's collecting history and current repatriation or decolonisation conversations.",
        ],
        nextActions: [{ label: "Write one note on source position before saving", action: "add_note" }],
        characterState: "careful",
      };
    }
    if (interp.queryType === "person" && hasQuery) {
      return {
        ok: true, mode, isFallback: true,
        response: `A care check for a person search asks you to be careful about summarising a living scholar through fragments. Distinguish what the person has said in their own voice from what institutions and others say about them.`,
        learningMove: "Cultural care — person",
        guidingQuestions: [
          `Which sources let ${q} speak in their own voice, and which position or describe the work from outside?`,
          "Are you drawing primarily from institutional profiles, which may simplify or decontextualise the work?",
          "What would be lost if you reduced the person's contribution to a single theme or search term?",
          "Are there aspects of this person's work connected to community, tradition or place that deserve particular care?",
        ],
        suggestedSearches: isLib ? [`${q} own words first person`, `${q} community tradition knowledge`] : [],
        searchReasons: [
          "Prioritises first-person sources — the closest access to the person's own framing.",
          "Surfaces connections to community and tradition that may be lost in institutional description.",
        ],
        nextActions: [{ label: "Before saving, write one note on source position", action: "add_note" }],
        characterState: "careful",
      };
    }
    // Generic
    return {
      ok: true, mode, isFallback: true,
      response: hasQuery
        ? `Before moving forward with "${q}", let's slow down and check the cultural and epistemic context. Who is speaking in the current results, and who is being spoken about?`
        : "Let's slow down. A cultural care check asks who is speaking, who is being spoken about, what is being translated, and what should be held carefully rather than extracted.",
      learningMove: "Cultural care check",
      guidingQuestions: [
        "Who is speaking in the current sources, and who is the subject of that speaking?",
        "What concepts or knowledge are being translated between traditions, and what may be lost in that translation?",
        "Is this source speaking from within the knowledge tradition or about it from outside?",
        "What would need to be named or acknowledged carefully before you use or share this source?",
      ],
      suggestedSearches: isLib && hasQuery ? [`${q} community authored practitioner`, `${q} Indigenous knowledge protocol`] : [],
      searchReasons: [
        "Prioritises community-authored sources over institutional descriptions.",
        "Surfaces sources connected to Indigenous knowledge protocols and community-held understanding.",
      ],
      nextActions: [{ label: "Write one note on source position before saving", action: "add_note" }],
      characterState: "careful",
    };
  }

  // ── reflect_on_process ─────────────────────────────────────────────────────
  if (mode === "reflect_on_process") {
    return {
      ok: true, mode, isFallback: true,
      response: hasQuery
        ? `You have been searching for "${q}". That is already evidence of a direction — you are circling around something. The goal now is to name that direction clearly enough to make the next move deliberately.`
        : "You are at an early stage of this inquiry. The most useful move now is to decide what kind of source you need and what kind of question you are trying to answer.",
      learningMove: "Process reflection",
      guidingQuestions: [
        "What pattern do you notice in the searches and results you have engaged with so far?",
        "What have you already ruled out, and why — and was that a considered choice or a default?",
        "What kind of source — authored text, archive record, interview, visual document — would move your thinking forward most?",
        "What would count as meaningful progress in the next five minutes of searching?",
      ],
      suggestedSearches: isLib && hasQuery ? [`${q} direction next step`] : [],
      searchReasons: ["Follows the direction your searches have been pointing toward."],
      nextActions: [{ label: "Name your current inquiry in one sentence", action: "add_note" }],
      characterState: "encouraging",
    };
  }

  // ── suggest_next_step ──────────────────────────────────────────────────────
  return {
    ok: true, mode, isFallback: true,
    response: hasQuery
      ? `Based on "${q}", the most useful next move is probably one specific action rather than a broader search. Focus before widening.`
      : "The most useful next step is usually the smallest one that gives the most useful information.",
    learningMove: "Next step",
    guidingQuestions: [
      "What are you trying to decide with your next search — which source to read, which path to follow, or which question to answer?",
      "What information would help you make that decision?",
      "What is the smallest move that would give you the most useful signal?",
    ],
    suggestedSearches: isLib && hasQuery ? [`${q} key source`] : [],
    searchReasons: ["A focused search to find the most useful single next source."],
    nextActions: [{ label: "Take one focused next step", action: "focus_search" }],
    characterState: "pointing",
  };
}

// ─── Gemini user payload ──────────────────────────────────────────────────────

function buildUserPayload(input: {
  area: ArchiveGuideArea;
  mode: ArchiveGuideMode;
  userMessage?: string;
  context: ArchiveGuideStructuredContext;
  interpretation: QueryInterpretation;
}) {
  return JSON.stringify(
    {
      modeInstruction: MODE_INSTRUCTIONS[input.mode],
      queryInterpretation: input.interpretation,
      area: input.area,
      userMessage: cleanText(input.userMessage, 500),
      structuredContext: input.context,
      antiTemplateRule: "CRITICAL: Do NOT produce search suggestions by appending generic labels like 'overview introduction', 'primary source', or 'critique response' to the query. Every search suggestion must be a plausible query a real user would type, meaningfully different from the original query, and explained by a searchReasons entry that says what it helps the learner discover.",
      responseRules: [
        "Use the queryInterpretation to tailor the response to the inferred type of thing being searched (person, concept, object, place).",
        "guidingQuestions must be specific to this query — if they could apply to any query, they are too generic.",
        "suggestedSearches must be plausible search phrases, not descriptions or labels.",
        "Each item in searchReasons must explain what the corresponding search path helps the learner discover or distinguish.",
        "Use asset-based language. Treat the search as evidence of the learner's direction.",
        "Do not invent sources. Do not claim certainty. Keep responses concise for a small companion panel.",
      ],
    },
    null,
    2,
  );
}

// ─── Gemini call ──────────────────────────────────────────────────────────────

async function callGemini(apiKey: string, payload: string) {
  const models = [resolveModel(), "gemini-2.0-flash", "gemini-2.0-flash-lite"];
  let lastError = "";

  for (const model of [...new Set(models)]) {
    const response = await fetch(buildGeminiUrl(model), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: payload }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 1600, responseMimeType: "application/json" },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      try {
        const parsed = JSON.parse(text) as { error?: { message?: string } };
        lastError = parsed.error?.message ?? text.slice(0, 180);
      } catch { lastError = text.slice(0, 180); }
      if (/quota|429|RESOURCE_EXHAUSTED|not found|404/i.test(lastError)) continue;
      return { ok: false as const, error: lastError };
    }
    return { ok: true as const, text: extractGeminiText(await response.json()) };
  }
  return { ok: false as const, error: lastError || "Gemini request failed." };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: { area?: ArchiveGuideArea; mode?: ArchiveGuideMode; userMessage?: string; context?: unknown };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json<ArchiveGuideApiResponse>({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const area = body.area;
  const mode = body.mode;

  if (!area || !ALLOWED_AREAS.has(area)) {
    return NextResponse.json<ArchiveGuideApiResponse>({ ok: false, error: "Unsupported Archive Guide area." }, { status: 400 });
  }
  if (!mode || !ALLOWED_MODES.has(mode)) {
    return NextResponse.json<ArchiveGuideApiResponse>({ ok: false, error: "Unsupported Archive Guide mode." }, { status: 400 });
  }

  const context = sanitizeContext(area, body.context);
  const interpretation = interpretGuideQuery(context.query, context);

  if (process.env.NODE_ENV !== "production") {
    console.log("[ArchiveGuide] mode:", mode, "| query:", context.query ?? "(none)", "| interpretation:", interpretation);
  }

  const apiKey = resolveApiKey();
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[ArchiveGuide] GEMINI_API_KEY not set — using intelligent fallback for mode:", mode, "queryType:", interpretation.queryType);
    }
    return NextResponse.json<ArchiveGuideApiResponse>(
      makeFallback(area, mode, context.query, interpretation),
      { status: 200 },
    );
  }

  const payload = buildUserPayload({ area, mode, userMessage: body.userMessage, context, interpretation });

  try {
    const result = await callGemini(apiKey, payload);
    if (!result.ok) {
      console.error("[ArchiveGuide] Gemini failed:", result.error);
      return NextResponse.json<ArchiveGuideApiResponse>(makeFallback(area, mode, context.query, interpretation), { status: 200 });
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[ArchiveGuide] Gemini response (first 400 chars):", result.text.slice(0, 400));
    }

    const parsed = parseModelPayload(result.text, mode);
    return NextResponse.json<ArchiveGuideApiResponse>(
      parsed ?? makeFallback(area, mode, context.query, interpretation),
      { status: 200 },
    );
  } catch (error) {
    console.error("[ArchiveGuide] request failed:", error);
    return NextResponse.json<ArchiveGuideApiResponse>(makeFallback(area, mode, context.query, interpretation), { status: 200 });
  }
}

import { CANVAS_PALETTE as P } from "./workbench-canvas-palette";
import type { CanvasObject, CanvasObjectType } from "./workbench-canvas-types";
import {
  TPL_FRAME_GAP,
  TPL_MARGIN,
  finalizeTemplate,
  type TemplateCardRole,
  tplConnector,
  tplHeader,
  tplHorizontalFlow,
  tplSection,
  tplCard,
} from "./workbench-canvas-template-layout";

export type CanvasTemplateId =
  | "blank"
  | "research-project-plan"
  | "research-question"
  | "source-argument"
  | "literature"
  | "citation-trail"
  | "provenance"
  | "methodology"
  | "timeline"
  | "concept-cluster"
  | "paper-outline"
  | "exhibition"
  | "course-design"
  | "grant-proposal"
  | "decolonial-analysis"
  | "moodboard"
  | "brand-visual"
  | "fieldwork-planning"
  | "stakeholder"
  | "evidence"
  | "thematic-analysis"
  | "visual-essay";

export type CanvasTemplate = {
  id: CanvasTemplateId;
  label: string;
  description: string;
  category: string;
  accentColor: string;
  previewSwatches: string[];
  build: () => CanvasObject[];
};

const warmFrame = {
  fill: "rgba(246, 243, 236, 0.75)",
  stroke: "rgba(114, 117, 126, 0.22)",
};
const blueFrame = {
  fill: "rgba(142, 197, 255, 0.14)",
  stroke: "rgba(142, 197, 255, 0.45)",
};
const lineBlue = "rgba(142, 197, 255, 0.72)";
const lineLavender = "rgba(221, 214, 255, 0.85)";

function buildResearchProjectPlan(): CanvasObject[] {
  const ox = TPL_MARGIN + 20;
  const objects: CanvasObject[] = [
    tplHeader(
      "Research Project Plan",
      "Sources, evidence, visuals, tasks, and argument direction",
      ox,
      TPL_MARGIN,
      { fill: P.lemon, stroke: "rgba(47, 45, 56, 0.18)", width: 520 },
    ),
    ...tplSection(
      "Research question",
      ox,
      260,
      360,
      {
        type: "question",
        title: "Central question",
        body: "What are you investigating?",
        patch: { fill: "#f3f7ff" },
      },
      warmFrame,
    ),
    ...tplSection(
      "Key sources",
      ox + 400,
      260,
      420,
      {
        type: "source",
        title: "Archive source",
        body: "Add a linked record or catalogue entry",
        patch: { fill: P.paper },
      },
      blueFrame,
    ),
    ...tplSection(
      "Quotes and evidence",
      ox + 860,
      260,
      420,
      {
        type: "quote",
        title: "Key quotation",
        body: "Evidence excerpt supporting your reading",
        patch: { fill: "#faf8f3", role: "quote" },
      },
      warmFrame,
    ),
    ...tplSection(
      "Visual references",
      ox + 1320,
      260,
      420,
      {
        type: "image",
        title: "Visual reference",
        body: "Mood, artefact, or reference image",
        patch: { width: 320, height: 260 },
      },
      {
        fill: "rgba(255, 214, 223, 0.15)",
        stroke: "rgba(255, 107, 74, 0.25)",
      },
    ),
    ...tplSection(
      "Argument direction",
      ox,
      620,
      820,
      {
        type: "sticky",
        title: "Emerging argument",
        body: "Synthesis moving toward your thesis",
        patch: { fill: P.yellow, width: 360, height: 150 },
      },
      {
        fill: "rgba(223, 255, 47, 0.14)",
        stroke: "rgba(223, 255, 47, 0.5)",
      },
    ),
    ...tplSection(
      "Tasks",
      ox + 860,
      620,
      420,
      {
        type: "task",
        title: "Next step",
        body: "Reading, visit, or draft milestone",
        patch: { fill: "#f5fff8", role: "task" },
      },
      {
        fill: "rgba(114, 117, 126, 0.08)",
        stroke: "rgba(114, 117, 126, 0.28)",
      },
    ),
  ];
  const source = objects[4];
  const quote = objects[6];
  const argument = objects[10];
  objects.push(
    tplConnector(source.id, quote.id, objects, "evidence", lineBlue),
    tplConnector(quote.id, argument.id, objects, "supports", lineBlue),
  );
  return finalizeTemplate(objects, "research-project-plan");
}

function buildSourceArgumentMap(): CanvasObject[] {
  const colW = 340;
  const gap = 50;
  const y = TPL_MARGIN;
  let x = TPL_MARGIN;
  const objects: CanvasObject[] = [];
  const columns: Array<{
    title: string;
    card: {
      type: CanvasObjectType;
      title: string;
      body: string;
      patch?: Partial<CanvasObject> & { role?: TemplateCardRole };
    };
    style: { fill: string; stroke: string };
  }> = [
    {
      title: "Sources",
      card: {
        type: "source",
        title: "Archive source",
        body: "Linked record or catalogue entry",
        patch: { fill: P.paper },
      },
      style: blueFrame,
    },
    {
      title: "Key quotes",
      card: {
        type: "quote",
        title: "Key quotation",
        body: "Excerpt supporting your reading",
        patch: { fill: "#faf8f3", role: "quote" },
      },
      style: { fill: "rgba(255, 255, 255, 0.72)", stroke: "rgba(47, 45, 56, 0.12)" },
    },
    {
      title: "Emerging themes",
      card: {
        type: "sticky",
        title: "Emerging theme",
        body: "Pattern, tension, or concept",
        patch: { fill: P.lavender, role: "sticky" },
      },
      style: {
        fill: "rgba(221, 214, 255, 0.2)",
        stroke: "rgba(221, 214, 255, 0.5)",
      },
    },
    {
      title: "Argument claim",
      card: {
        type: "text",
        title: "Argument claim",
        body: "Synthesis moving toward your thesis",
        patch: { fill: P.lemon, textSize: 17, width: 300, height: 170 },
      },
      style: {
        fill: "rgba(223, 255, 47, 0.18)",
        stroke: "rgba(223, 255, 47, 0.55)",
      },
    },
  ];
  const cards: CanvasObject[] = [];
  for (const col of columns) {
    const pair = tplSection(col.title, x, y, colW, col.card, col.style, 2);
    objects.push(...pair);
    cards.push(pair[1]);
    x += colW + gap;
  }
  objects.push(
    tplConnector(cards[0].id, cards[1].id, objects, "supports", lineBlue),
    tplConnector(cards[1].id, cards[2].id, objects, "", lineBlue),
    tplConnector(cards[2].id, cards[3].id, objects, "builds", lineBlue),
  );
  return finalizeTemplate(objects, "source-argument");
}

function buildCitationTrail(): CanvasObject[] {
  return finalizeTemplate(
    tplHorizontalFlow(
      [
        {
          type: "source",
          title: "Archive source",
          body: "Primary archive or publication",
          patch: { fill: P.paper, stroke: "rgba(47, 45, 56, 0.14)" },
        },
        {
          type: "quote",
          title: "Extracted quote",
          body: "Passage to cite",
          patch: { fill: "#faf8f3", role: "quote" },
          label: "extract",
        },
        {
          type: "citation",
          title: "Citation format",
          body: "In-text or endnote placeholder",
          patch: { fill: P.lemon, stroke: P.charcoal },
          label: "cite",
        },
        {
          type: "text",
          title: "Used in document",
          body: "Where this enters your writing",
          patch: { fill: "rgba(47, 45, 56, 0.06)", textSize: 15 },
          label: "flows to",
        },
        {
          type: "task",
          title: "Verify citation",
          body: "Check source, page, and wording before publish",
          patch: { fill: "#f5fff8", role: "task" },
          label: "verify",
        },
      ],
      TPL_MARGIN + 40,
      TPL_MARGIN + 60,
      TPL_FRAME_GAP,
      lineLavender,
    ),
    "citation-trail",
  );
}

function buildMoodboard(): CanvasObject[] {
  const ox = TPL_MARGIN + 40;
  const objects: CanvasObject[] = [
    tplHeader("Visual direction", "Moodboard — colour, type, and feeling", ox, TPL_MARGIN, {
      fill: P.coral,
      stroke: "rgba(47, 45, 56, 0.2)",
      width: 480,
      height: 110,
    }),
    tplCard("image", "Hero visual", "Large reference image", ox, 220, 3, {
      width: 420,
      height: 340,
    }),
    tplCard("image", "Reference A", "Supporting visual", ox + 460, 220, 4, {
      width: 200,
      height: 160,
    }),
    tplCard("image", "Reference B", "Supporting visual", ox + 680, 220, 5, {
      width: 200,
      height: 160,
    }),
    tplCard("image", "Reference C", "Detail or texture", ox + 900, 220, 6, {
      width: 200,
      height: 160,
    }),
    tplCard("sticky", "Coral accent", "Warm, urgent, human", ox + 460, 400, 7, {
      width: 140,
      height: 120,
      fill: P.pink,
    }),
    tplCard("sticky", "Lemon pulse", "Archive highlight", ox + 620, 400, 8, {
      width: 140,
      height: 120,
      fill: P.yellow,
    }),
    tplCard("sticky", "Sky calm", "Trust and clarity", ox + 780, 400, 9, {
      width: 140,
      height: 120,
      fill: P.sky,
    }),
    tplCard("text", "Typography", "Headline + body pairing", ox, 590, 10, {
      fill: P.lavender,
      width: 360,
      height: 130,
      textSize: 18,
    }),
    tplCard("comment", "Feeling note", "What should this evoke for viewers?", ox + 400, 590, 11, {
      fill: "rgba(255, 245, 166, 0.55)",
      width: 320,
      height: 130,
    }),
    tplCard("source", "Inspiration source", "Archive or web reference", ox + 760, 590, 12, {
      fill: P.paper,
      width: 300,
      height: 130,
    }),
  ];
  return finalizeTemplate(objects, "moodboard");
}

function buildPaperOutline(): CanvasObject[] {
  const y = TPL_MARGIN + 40;
  const objects: CanvasObject[] = [
    tplHeader("Paper outline", "From thesis to sections and closing", TPL_MARGIN, TPL_MARGIN, {
      fill: P.green,
      width: 480,
      height: 110,
    }),
    ...tplSection(
      "Introduction",
      TPL_MARGIN,
      y,
      300,
      {
        type: "text",
        title: "Thesis",
        body: "State your main claim clearly",
        patch: { textSize: 18, fill: P.lemon, width: 260, height: 150 },
      },
      {
        fill: "rgba(84, 199, 138, 0.12)",
        stroke: "rgba(84, 199, 138, 0.38)",
      },
    ),
    ...tplSection(
      "Body",
      TPL_MARGIN + 340,
      y,
      520,
      {
        type: "text",
        title: "Section 1",
        body: "Supporting argument and evidence",
        patch: { fill: P.paper, width: 300, height: 150 },
      },
      {
        fill: "rgba(223, 255, 47, 0.12)",
        stroke: "rgba(223, 255, 47, 0.45)",
      },
    ),
    ...tplSection(
      "Conclusion",
      TPL_MARGIN + 900,
      y,
      300,
      {
        type: "text",
        title: "Closing",
        body: "Implications and future work",
        patch: { fill: P.paper, width: 260, height: 150 },
      },
      warmFrame,
    ),
  ];
  objects.push(
    tplConnector(objects[2].id, objects[4].id, objects, "develops", P.green),
    tplConnector(objects[4].id, objects[6].id, objects, "resolves", P.green),
  );
  return finalizeTemplate(objects, "paper-outline");
}

function buildLiteratureMap(): CanvasObject[] {
  const y = TPL_MARGIN + 40;
  const objects: CanvasObject[] = [
    ...tplSection(
      "Corpus",
      TPL_MARGIN,
      y,
      400,
      {
        type: "source",
        title: "Key text",
        body: "Seminal work in the field",
        patch: { fill: P.paper },
      },
      blueFrame,
    ),
    ...tplSection(
      "Debates",
      TPL_MARGIN + 440,
      y,
      400,
      {
        type: "sticky",
        title: "Debate",
        body: "Competing interpretations",
        patch: { fill: P.coral, width: 280, height: 150 },
      },
      {
        fill: "rgba(255, 107, 74, 0.1)",
        stroke: "rgba(255, 107, 74, 0.35)",
      },
    ),
    ...tplSection(
      "Gaps",
      TPL_MARGIN + 880,
      y,
      400,
      {
        type: "question",
        title: "Gap",
        body: "What remains under-explored?",
        patch: { fill: P.lavender },
      },
      {
        fill: "rgba(221, 214, 255, 0.22)",
        stroke: "rgba(221, 214, 255, 0.5)",
      },
    ),
    ...tplSection(
      "Methods",
      TPL_MARGIN + 440,
      y + 340,
      400,
      {
        type: "sticky",
        title: "Method lens",
        body: "How you will approach the gap",
        patch: { fill: P.green, width: 280, height: 140 },
      },
      {
        fill: "rgba(84, 199, 138, 0.12)",
        stroke: "rgba(84, 199, 138, 0.38)",
      },
    ),
  ];
  objects.push(
    tplConnector(objects[2].id, objects[4].id, objects, "debates", lineBlue),
    tplConnector(objects[4].id, objects[6].id, objects, "gap", lineBlue),
    tplConnector(objects[6].id, objects[8].id, objects, "method", P.green),
  );
  return finalizeTemplate(objects, "literature");
}

function buildMethodologyMap(): CanvasObject[] {
  const cx = 520;
  const cy = 280;
  const objects: CanvasObject[] = [
    tplCard("text", "Research question", "What is the central problem?", cx - 140, cy - 90, 2, {
      fill: P.lemon,
      width: 360,
      height: 130,
      textSize: 20,
    }),
    ...tplSection(
      "Methods",
      TPL_MARGIN,
      TPL_MARGIN + 40,
      360,
      {
        type: "text",
        title: "Method",
        body: "Approach and rationale",
        patch: { fill: "#f5fff8" },
      },
      {
        fill: "rgba(84, 199, 138, 0.14)",
        stroke: "rgba(84, 199, 138, 0.42)",
      },
    ),
    ...tplSection(
      "Data",
      cx + 200,
      TPL_MARGIN + 40,
      360,
      {
        type: "source",
        title: "Data source",
        body: "Archive, field, or corpus",
        patch: { fill: P.paper },
      },
      warmFrame,
    ),
    ...tplSection(
      "Analysis",
      cx + 200,
      cy + 120,
      360,
      {
        type: "sticky",
        title: "Analysis",
        body: "Coding or interpretation",
        patch: { fill: P.green, role: "sticky" },
      },
      blueFrame,
    ),
    ...tplSection(
      "Ethics",
      TPL_MARGIN,
      cy + 120,
      360,
      {
        type: "question",
        title: "Ethics",
        body: "Permissions, reciprocity, care",
        patch: { fill: "#f3f7ff" },
      },
      {
        fill: "rgba(255, 214, 223, 0.12)",
        stroke: "rgba(255, 107, 74, 0.3)",
      },
    ),
  ];
  const hub = objects[0];
  const methods = objects[2];
  const data = objects[4];
  const analysis = objects[6];
  const ethics = objects[8];
  objects.push(
    tplConnector(hub.id, methods.id, objects, "guides", P.green),
    tplConnector(methods.id, data.id, objects, "", P.green),
    tplConnector(data.id, analysis.id, objects, "", P.green),
    tplConnector(ethics.id, methods.id, objects, "care", P.coral),
    tplConnector(ethics.id, data.id, objects, "protect", P.coral),
  );
  return finalizeTemplate(objects, "methodology");
}

function buildTimeline(): CanvasObject[] {
  const ox = TPL_MARGIN + 20;
  const lineY = 340;
  const objects: CanvasObject[] = [
    tplHeader("Timeline", "Key periods, sources, and turning points", ox, TPL_MARGIN, {
      fill: "rgba(47, 45, 56, 0.08)",
      stroke: P.charcoal,
      width: 400,
      height: 100,
    }),
    tplCard("text", "Timeline axis", "Drag milestones along your chronology", ox, lineY - 8, 2, {
      width: 1080,
      height: 24,
      fill: "rgba(47, 45, 56, 0.06)",
      stroke: P.charcoal,
      textSize: 12,
      body: "",
    }),
  ];
  const fills = [P.yellow, "#f0f6d8", P.lavender, P.pink];
  let x = ox + 40;
  const milestones: CanvasObject[] = [];
  for (let i = 0; i < 4; i += 1) {
    const above = i % 2 === 0;
    const card = tplCard(
      "sticky",
      `Milestone ${i + 1}`,
      "Event or turning point",
      x,
      above ? lineY - 170 : lineY + 40,
      3 + i,
      {
        fill: fills[i] ?? P.yellow,
        width: 220,
        height: 130,
      },
    );
    milestones.push(card);
    objects.push(card);
    const source = tplCard("source", `Source ${i + 1}`, "Archive record for this period", x, above ? lineY + 40 : lineY - 170, 10 + i, {
      fill: P.paper,
      width: 220,
      height: 120,
    });
    objects.push(source);
    objects.push(tplConnector(card.id, source.id, objects, "documents", P.charcoal));
    if (i > 0) {
      objects.push(tplConnector(milestones[i - 1].id, card.id, objects, "", P.charcoal));
    }
    x += 260;
  }
  return finalizeTemplate(objects, "timeline");
}

function buildDecolonialAnalysis(): CanvasObject[] {
  const ox = TPL_MARGIN;
  const rowY = 240;
  const colW = 320;
  const gap = TPL_FRAME_GAP;
  const sections = [
    { title: "Dominant framing", fill: "rgba(47, 45, 56, 0.06)", stroke: P.charcoal, card: { type: "quote" as const, title: "Dominant narrative", body: "What the archive foregrounds" } },
    { title: "Silenced voices", fill: "rgba(255, 107, 74, 0.1)", stroke: "rgba(255, 107, 74, 0.38)", card: { type: "sticky" as const, title: "Silenced voice", body: "Who is absent or reduced?" } },
    { title: "Counter-archive", fill: "rgba(223, 255, 47, 0.14)", stroke: "rgba(223, 255, 47, 0.5)", card: { type: "source" as const, title: "Counter-archive", body: "Materials outside institutional canon" } },
    { title: "Local / Indigenous knowledge", fill: "rgba(142, 197, 255, 0.12)", stroke: "rgba(142, 197, 255, 0.4)", card: { type: "comment" as const, title: "Community knowledge", body: "Protocols, place, and voice" } },
  ];
  const objects: CanvasObject[] = [
    tplHeader(
      "Decolonial analysis",
      "Power, voice, archives — critique and reconstruction",
      ox,
      TPL_MARGIN,
      { fill: P.coral, stroke: P.charcoal, width: 520 },
    ),
  ];
  let x = ox;
  const cards: CanvasObject[] = [];
  for (const sec of sections) {
    const pair = tplSection(sec.title, x, rowY, colW, {
      type: sec.card.type,
      title: sec.card.title,
      body: sec.card.body,
      patch:
        sec.card.type === "sticky"
          ? { fill: P.lemon, width: 280, height: 150 }
          : sec.card.type === "quote"
            ? { fill: "#faf8f3", role: "quote" }
            : { fill: P.paper },
    }, { fill: sec.fill, stroke: sec.stroke });
    objects.push(...pair);
    cards.push(pair[1]);
    x += colW + gap;
  }
  const implication = tplSection(
    "Design implication",
    ox + 80,
    rowY + 320,
    720,
    {
      type: "text",
      title: "Design implication",
      body: "How will your work redistribute authority and care?",
      patch: { fill: P.lemon, textSize: 18, width: 400, height: 170 },
    },
    { fill: "rgba(255, 214, 223, 0.14)", stroke: P.coral },
  );
  objects.push(...implication);
  for (let i = 0; i < cards.length - 1; i += 1) {
    objects.push(tplConnector(cards[i].id, cards[i + 1].id, objects, "re-read", P.coral));
  }
  objects.push(tplConnector(cards[cards.length - 1].id, implication[1].id, objects, "reshape", P.charcoal));
  return finalizeTemplate(objects, "decolonial-analysis");
}

function buildProvenanceMap(): CanvasObject[] {
  return finalizeTemplate(
    tplHorizontalFlow(
      [
        {
          type: "source",
          title: "Origin",
          body: "Where the material came from",
          patch: { fill: P.canvasWarm },
          label: "from",
        },
        {
          type: "source",
          title: "Movement",
          body: "Custody, transfer, or travel",
          patch: { fill: P.paper },
          label: "moved",
        },
        {
          type: "comment",
          title: "Archive record",
          body: "Catalogue entry and holding",
          patch: { fill: "rgba(142, 197, 255, 0.12)" },
          label: "held",
        },
        {
          type: "question",
          title: "Missing context",
          body: "Gaps, silences, or disputed lineage",
          patch: { fill: P.lavender, width: 300, height: 150 },
          label: "questions",
        },
        {
          type: "text",
          title: "Interpretation",
          body: "How you read and mobilise this source",
          patch: { fill: P.paper, textSize: 16 },
          label: "use",
        },
      ],
      TPL_MARGIN,
      TPL_MARGIN + 80,
      TPL_FRAME_GAP + 10,
      "rgba(142, 197, 255, 0.65)",
    ),
    "provenance",
  );
}

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: "blank",
    label: "Blank Canvas",
    description: "Empty dotted workspace",
    category: "Start",
    accentColor: P.muted,
    previewSwatches: [P.canvasWarm, P.paper],
    build: () => [],
  },
  {
    id: "research-project-plan",
    label: "Research Project Plan",
    description: "Brief, sources, quotes, visuals, tasks, argument",
    category: "Planning",
    accentColor: P.lemon,
    previewSwatches: [P.lemon, P.canvasWarm, P.sky, P.muted],
    build: buildResearchProjectPlan,
  },
  {
    id: "research-question",
    label: "Research Question Map",
    description: "Question, sub-questions, and methods",
    category: "Planning",
    accentColor: P.sky,
    previewSwatches: [P.sky, P.lavender, P.yellow],
    build: () =>
      finalizeTemplate(
        [
          tplHeader("Research question", "What is the central question?", 200, TPL_MARGIN + 40, {
            textSize: 22,
            fill: P.lemon,
            width: 420,
            height: 120,
          }),
          ...tplSection("Sub-question A", TPL_MARGIN, 280, 320, {
            type: "question",
            title: "Sub-question A",
            body: "Probe one angle",
            patch: { fill: "#f3f7ff" },
          }, blueFrame),
          ...tplSection("Sub-question B", TPL_MARGIN + 360, 280, 320, {
            type: "question",
            title: "Sub-question B",
            body: "Probe another angle",
            patch: { fill: "#f3f7ff" },
          }, blueFrame),
          ...tplSection("Methods", TPL_MARGIN + 720, 280, 320, {
            type: "sticky",
            title: "Methods",
            body: "How will you investigate?",
            patch: { fill: P.green, role: "sticky" },
          }, warmFrame),
        ],
        "research-question",
      ),
  },
  {
    id: "source-argument",
    label: "Source-to-Argument Map",
    description: "Sources → quotes → themes → claim",
    category: "Mapping",
    accentColor: P.sky,
    previewSwatches: [P.sky, P.lemon, P.lavender, P.paper],
    build: buildSourceArgumentMap,
  },
  {
    id: "moodboard",
    label: "Moodboard",
    description: "Visual direction, colour, typography, inspiration",
    category: "Visual",
    accentColor: P.coral,
    previewSwatches: [P.coral, P.pink, P.yellow, P.lavender],
    build: buildMoodboard,
  },
  {
    id: "brand-visual",
    label: "Brand / Visual Identity Research",
    description: "Identity research for design-led projects",
    category: "Visual",
    accentColor: P.pink,
    previewSwatches: [P.pink, P.coral, P.yellow],
    build: () =>
      finalizeTemplate(
        [
          tplHeader("Brand research", "Identity, references, constraints", 180, TPL_MARGIN, {
            textSize: 20,
            fill: P.pink,
            width: 440,
          }),
          ...tplSection("References", TPL_MARGIN, 200, 400, {
            type: "image",
            title: "Reference",
            body: "Visual anchor",
            patch: { width: 320, height: 220 },
          }, {
            fill: "rgba(255, 214, 223, 0.12)",
            stroke: "rgba(255, 107, 74, 0.3)",
          }),
          ...tplSection("Constraints", TPL_MARGIN + 440, 200, 400, {
            type: "sticky",
            title: "Values",
            body: "Keywords that define the work",
            patch: { fill: P.yellow, width: 280, height: 150 },
          }, warmFrame),
        ],
        "brand-visual",
      ),
  },
  {
    id: "fieldwork-planning",
    label: "Fieldwork Planning Board",
    description: "Sites, contacts, logistics, ethics",
    category: "Planning",
    accentColor: P.green,
    previewSwatches: [P.green, P.sky, P.canvasWarm],
    build: () =>
      finalizeTemplate(
        [
          ...tplSection("Sites", TPL_MARGIN, TPL_MARGIN + 40, 360, {
            type: "task",
            title: "Visit / interview",
            body: "Schedule and prepare",
            patch: { fill: "#f5fff8", role: "task" },
          }, {
            fill: "rgba(84, 199, 138, 0.12)",
            stroke: "rgba(84, 199, 138, 0.4)",
          }),
          ...tplSection("Contacts", TPL_MARGIN + 400, TPL_MARGIN + 40, 360, {
            type: "source",
            title: "Community archive",
            body: "Holding or partner site",
          }, blueFrame),
          ...tplSection("Logistics", TPL_MARGIN + 800, TPL_MARGIN + 40, 360, {
            type: "question",
            title: "Ethics check",
            body: "Permissions and reciprocity",
            patch: { fill: "#f3f7ff" },
          }, warmFrame),
        ],
        "fieldwork-planning",
      ),
  },
  {
    id: "literature",
    label: "Literature / Source Map",
    description: "Corpus, gaps, and debates",
    category: "Mapping",
    accentColor: P.sky,
    previewSwatches: [P.sky, P.lavender, P.coral],
    build: buildLiteratureMap,
  },
  {
    id: "citation-trail",
    label: "Citation Trail",
    description: "Source → quote → citation → writing → verify",
    category: "Writing",
    accentColor: P.lavender,
    previewSwatches: [P.lavender, P.charcoal, P.lemon],
    build: buildCitationTrail,
  },
  {
    id: "provenance",
    label: "Archive Provenance Map",
    description: "Origin → movement → record → gaps → interpretation",
    category: "Archive",
    accentColor: P.canvasWarm,
    previewSwatches: [P.canvasWarm, P.sky, P.muted],
    build: buildProvenanceMap,
  },
  {
    id: "methodology",
    label: "Methodology Map",
    description: "Methods, data, analysis, ethics",
    category: "Methods",
    accentColor: P.green,
    previewSwatches: [P.green, P.canvasWarm, P.sky],
    build: buildMethodologyMap,
  },
  {
    id: "timeline",
    label: "Timeline",
    description: "Chronological research events",
    category: "Planning",
    accentColor: P.charcoal,
    previewSwatches: [P.charcoal, P.yellow, P.muted],
    build: buildTimeline,
  },
  {
    id: "concept-cluster",
    label: "Concept Cluster Map",
    description: "Themes and relations",
    category: "Mapping",
    accentColor: P.lavender,
    previewSwatches: [P.lavender, P.yellow, P.sky, P.green],
    build: () =>
      finalizeTemplate(
        [
          tplCard("sticky", "Core concept", "Central idea", 480, 220, 3, {
            fill: P.lemon,
            width: 260,
            height: 170,
          }),
          tplCard("sticky", "Related A", "Association", 200, 140, 4, { fill: P.sky, width: 220, height: 140 }),
          tplCard("sticky", "Related B", "Association", 760, 140, 5, { fill: P.pink, width: 220, height: 140 }),
          tplCard("sticky", "Related C", "Association", 200, 360, 6, { fill: P.green, width: 220, height: 140 }),
          tplCard("sticky", "Related D", "Association", 760, 360, 7, { fill: P.lavender, width: 220, height: 140 }),
        ],
        "concept-cluster",
      ),
  },
  {
    id: "paper-outline",
    label: "Paper Outline Map",
    description: "Sections and claims",
    category: "Writing",
    accentColor: P.green,
    previewSwatches: [P.green, P.lemon, P.paper],
    build: buildPaperOutline,
  },
  {
    id: "exhibition",
    label: "Exhibition Planning Board",
    description: "Rooms, objects, narrative",
    category: "Visual",
    accentColor: P.coral,
    previewSwatches: [P.coral, P.canvasWarm, P.paper],
    build: () =>
      finalizeTemplate(
        [
          ...tplSection("Gallery A", TPL_MARGIN, TPL_MARGIN + 40, 380, {
            type: "source",
            title: "Object",
            body: "Collection item",
          }, {
            fill: "rgba(255, 214, 223, 0.14)",
            stroke: "rgba(255, 107, 74, 0.3)",
          }),
          ...tplSection("Gallery B", TPL_MARGIN + 420, TPL_MARGIN + 40, 380, {
            type: "text",
            title: "Narrative thread",
            body: "Visitor journey",
            patch: { fill: P.lemon, textSize: 17 },
          }, warmFrame),
        ],
        "exhibition",
      ),
  },
  {
    id: "course-design",
    label: "Course Design Board",
    description: "Outcomes, weeks, assessments",
    category: "Teaching",
    accentColor: P.green,
    previewSwatches: [P.green, P.sky, P.yellow],
    build: () =>
      finalizeTemplate(
        tplHorizontalFlow(
          [
            {
              type: "text",
              title: "Learning outcomes",
              body: "What students will demonstrate",
              patch: { fill: P.green, textSize: 18 },
            },
            {
              type: "task",
              title: "Week 1",
              body: "Reading + activity",
              patch: { fill: "#f5fff8", role: "task" },
            },
            {
              type: "task",
              title: "Assessment",
              body: "Major task",
              patch: { fill: P.yellow, role: "task" },
            },
          ],
          TPL_MARGIN,
          TPL_MARGIN + 60,
        ),
        "course-design",
      ),
  },
  {
    id: "grant-proposal",
    label: "Grant Proposal Board",
    description: "Aims, methods, impact",
    category: "Planning",
    accentColor: P.lemon,
    previewSwatches: [P.lemon, P.sky, P.green],
    build: () =>
      finalizeTemplate(
        tplHorizontalFlow(
          [
            { type: "text", title: "Aims", body: "What the project will achieve", patch: { fill: P.lemon } },
            { type: "text", title: "Methods", body: "How you will do it", patch: { fill: "#f3f7ff" } },
            { type: "text", title: "Impact", body: "Who benefits and how", patch: { fill: "#f5fff8" } },
          ],
          TPL_MARGIN,
          TPL_MARGIN + 60,
        ),
        "grant-proposal",
      ),
  },
  {
    id: "decolonial-analysis",
    label: "Decolonial Analysis Board",
    description: "Power, voice, archives — critique and reconstruction",
    category: "Critical",
    accentColor: P.coral,
    previewSwatches: [P.coral, P.charcoal, P.lemon],
    build: buildDecolonialAnalysis,
  },
  {
    id: "stakeholder",
    label: "Stakeholder / Collaborator Map",
    description: "People, roles, relationships",
    category: "Planning",
    accentColor: P.sky,
    previewSwatches: [P.sky, P.lavender, P.yellow],
    build: () =>
      finalizeTemplate(
        [
          tplCard("text", "Lead researcher", "Role and responsibilities", 400, 200, 3, {
            fill: P.lemon,
            textSize: 17,
            width: 320,
            height: 140,
          }),
          tplCard("sticky", "Community partner", "Relationship and reciprocity", TPL_MARGIN, 340, 4, {
            fill: P.pink,
            width: 280,
            height: 150,
          }),
          tplCard("sticky", "Institution", "Formal structures", 680, 340, 5, {
            fill: P.sky,
            width: 280,
            height: 150,
          }),
        ],
        "stakeholder",
      ),
  },
  {
    id: "evidence",
    label: "Evidence Map",
    description: "Claim and supporting proof",
    category: "Writing",
    accentColor: P.lemon,
    previewSwatches: [P.lemon, "#faf8f3", P.paper],
    build: () =>
      finalizeTemplate(
        [
          tplCard("text", "Claim", "Argument to test", 480, 180, 3, {
            fill: P.lemon,
            textSize: 20,
            width: 340,
            height: 130,
          }),
          tplCard("quote", "Evidence A", "Supporting passage", 160, 340, 4, {
            fill: "#faf8f3",
            role: "quote",
          }),
          tplCard("quote", "Evidence B", "Supporting passage", 480, 380, 5, {
            fill: "#faf8f3",
            role: "quote",
          }),
          tplCard("source", "Source C", "Archive record", 800, 340, 6, { fill: P.paper }),
        ],
        "evidence",
      ),
  },
  {
    id: "thematic-analysis",
    label: "Thematic Analysis Map",
    description: "Codes → themes → interpretation",
    category: "Methods",
    accentColor: P.lavender,
    previewSwatches: [P.lavender, P.yellow, P.green],
    build: () =>
      finalizeTemplate(
        [
          ...tplSection("Codes", TPL_MARGIN, TPL_MARGIN + 40, 320, {
            type: "sticky",
            title: "Code",
            body: "Raw label",
            patch: { fill: P.yellow },
          }, {
            fill: "rgba(255, 245, 166, 0.35)",
            stroke: "rgba(223, 255, 47, 0.45)",
          }),
          ...tplSection("Themes", TPL_MARGIN + 360, TPL_MARGIN + 40, 320, {
            type: "sticky",
            title: "Theme",
            body: "Grouped meaning",
            patch: { fill: P.lavender, role: "sticky" },
          }, {
            fill: "rgba(221, 214, 255, 0.25)",
            stroke: "rgba(221, 214, 255, 0.5)",
          }),
          ...tplSection("Interpretation", TPL_MARGIN + 720, TPL_MARGIN + 40, 360, {
            type: "text",
            title: "Interpretation",
            body: "Scholarly reading",
            patch: { fill: "#f5fff8" },
          }, {
            fill: "rgba(84, 199, 138, 0.12)",
            stroke: "rgba(84, 199, 138, 0.38)",
          }),
        ],
        "thematic-analysis",
      ),
  },
  {
    id: "visual-essay",
    label: "Visual Essay Plan",
    description: "Panels, images, captions",
    category: "Visual",
    accentColor: P.pink,
    previewSwatches: [P.pink, P.coral, P.paper],
    build: () =>
      finalizeTemplate(
        [
          ...tplSection("Panel 1", TPL_MARGIN, TPL_MARGIN + 40, 360, {
            type: "image",
            title: "Visual",
            body: "Image placeholder",
            patch: { width: 300, height: 220 },
          }, {
            fill: "rgba(255, 214, 223, 0.12)",
            stroke: "rgba(255, 107, 74, 0.28)",
          }),
          ...tplSection("Panel 2", TPL_MARGIN + 420, TPL_MARGIN + 40, 360, {
            type: "text",
            title: "Caption",
            body: "Voice for this panel",
            patch: { fill: P.lavender, width: 280, height: 150 },
          }, blueFrame),
        ],
        "visual-essay",
      ),
  },
];

export function getCanvasTemplate(id: CanvasTemplateId): CanvasTemplate | undefined {
  return CANVAS_TEMPLATES.find((t) => t.id === id);
}

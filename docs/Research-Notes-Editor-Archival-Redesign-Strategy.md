# Research Notes Document Editor — Archival Redesign Strategy

A full structural, visual, and systems‑level audit and reframing brief, prepared against the uploaded Figma Make export (`Research Notes Document Editor.zip`, 74 files) and the Figma project at `figma.com/make/Irid8TVZelighwlVMMReJ2`.

The Figma Dev Mode MCP requires Dev Mode enabled in the Figma desktop app for live node reads; the analysis below is grounded in the exported source (App, components, theme tokens, guidelines) which is the authoritative artefact of the current design state.

The objective is to move the project from a *Notion‑adjacent document editor* into a **computational archival interface and editorial research environment**, in line with the existing Decolonising Archive Next codebase.

---

## 1. Full interface critique

The current build is a competent but generic shadcn/ui document scaffold. The structural skeleton is:

- `DocumentHeader` — title, subtitle, segmented control (Document / Canvas / Board), "New note" button. Lemon‑yellow accent on the active mode.
- `ProjectMetadata` — strip of selects (project, status, visibility).
- `LeftFloatingMenu` — fixed left panel ≈260 px wide, scroll area, six collapsible sections (File / Edit / View / Insert / References / Help), shadow card.
- `DocumentActionBar` — secondary row of dropdown menus (File / Edit / View / Insert / Format / Tools).
- `FormattingToolbar` — third row: style select, B / I / U / S, lists, alignment, link, quote, image, table, divider.
- `DocumentSurface` — A4‑style white page on `--archive-paper` (#FAFAF8), 850 px max width, 64 px padding, drop shadow.
- `RightInspectorPanel` — 320 px right rail, tabs: Outline / Sources / Citations / Tasks.
- Modals: `CitationModal`, `ExportModal`.

What it currently *says* aesthetically:

> "I am a productivity app. I let you write a document, attach citations, switch to a kanban, and export PDF/DOCX."

What it needs to *say*:

> "You are inside a relational archive. Everything you write is provisioned with provenance, lineage, uncertainty, and other voices. The document is not the output — it is a reading of the archive that the archive can read back."

The current build leaks four conventions that contradict that ambition:

1. **Four bars of chrome on top** (header + project bar + action bar + formatting toolbar) before a single word is written. Editorial environments need calm. This is Microsoft Word's chrome density on Notion's tokens.
2. **A floating left menu** that duplicates the action bar. Two ways to reach "Export as PDF" without semantic differentiation. Cognitive overhead with no archival payoff.
3. **A right inspector flat tab set** (Outline / Sources / Citations / Tasks). Sources and citations are not parallel to a task list — they are *constitutive* of the document. Putting them on a tab makes them dismissable.
4. **A "page" metaphor with hard A4 pagination + drop shadow** placed on archive paper. This reproduces the print‑document mental model that decolonial archive work explicitly resists (the document as singular, bounded, paginated authority).

Notable wins to preserve:

- `archive-paper` token (#FAFAF8) is the right instinct.
- The three‑mode pivot (Document / Canvas / Board) is structurally good — it just needs to be a continuum not three siloed apps. Canvas and Board are currently placeholders.
- Citation modal and Export modal exist as concepts; with re‑authored language they can become Provenance and Publish surfaces.

---

## 2. Systems diagnosis

### 2.1 Design system consistency

`src/styles/theme.css` is the unmodified shadcn defaults plus three additions (`--lemon`, `--archive-paper`, `--lemon-foreground`). There is no semantic token layer, no editorial type system, and `src/styles/fonts.css` is empty (zero bytes). `globals.css` is also zero bytes. The Tailwind ramp is doing the design work, which guarantees a generic feel.

### 2.2 Component hierarchy

Forty‑seven shadcn primitives shipped, of which `App.tsx` consumes nine. The codebase carries menubar, navigation‑menu, carousel, command, drawer, resizable, sidebar (21 KB) — none used. Dead weight that biases future work toward Notion / SaaS conventions because the parts are available.

### 2.3 Interaction architecture

Three competing surfaces for the same actions:

| Action     | LeftFloatingMenu | DocumentActionBar | FormattingToolbar |
|------------|------------------|-------------------|--------------------|
| New note   | ✔                | ✔                 | —                  |
| Save / Save as | ✔            | ✔                 | —                  |
| Export PDF / DOCX / MD / HTML | ✔ | ✔               | —                  |
| Insert image | ✔              | ✔                 | ✔                  |
| Insert citation | ✔           | ✔                 | ✔ (Quote/Cite)     |

This is structural entropy. Three menus for the same noun is the *opposite* of editorial calm.

### 2.4 Visual rhythm and spatial density

Top chrome stack measures roughly `96 + 56 + 32 + 44 = 228 px` before the canvas. The document canvas then enforces another 64 px page padding. Effective reading column begins ≈300 px down the page. There is no vertical rhythm grid — heights are heuristic.

### 2.5 Cognitive load

Six collapsible sections in the left menu, six dropdowns in the action bar, twelve formatting buttons, four inspector tabs. Roughly **48 visible interactive surfaces** before the writer types a word. The target for a scholarly reading/writing environment is 6–9.

### 2.6 Affordance clarity

Lemon yellow (#F4E836) is the only accent. It currently signals "active mode", "hover on a menu item", and (in the broader Workbench code) emphasised system buttons. The same colour means three different things. Affordance grammar has not been authored.

### 2.7 Token consistency

```css
--radius: 0.625rem;            /* 10 px — startup convention */
--font-size: 16px;             /* generic */
--primary: #030213;            /* near-black with a blue undertone */
--lemon: #F4E836;              /* high-saturation accent */
--archive-paper: #FAFAF8;      /* correct instinct */
--border: rgba(0, 0, 0, 0.1);  /* opaque-on-paper bug */
```

The border token uses transparent black on a coloured archive surface — this drifts to grey on `--archive-paper` and to mud on a dark theme. Borders should be semantic, not algorithmic.

### 2.8 Grid discipline

There is no grid. The document is centred at 850 px; the left menu is 260 px fixed at `left-4`; the inspector is 320 px on the right. The relationship between them is coincidental, not composed.

### 2.9 Anti‑patterns currently present

- Three menus for one action set (left menu + action bar + toolbar).
- A right‑rail tab pattern that treats sources as one of four equal categories.
- A paginated "Page 2 — Continue writing…" placeholder that fakes Word.
- A Document/Canvas/Board segmented control where Canvas and Board return "Canvas view coming soon" placeholders.
- Lemon‑yellow accent borrowed from startup design language. (Reads as the Workbench's "primary" colour but is jarring against archive paper.)
- shadcn dropdown menus with default rounded corners and white popovers — does not match an archival material.
- An empty `globals.css` and `fonts.css` — typography is happening implicitly, which is the largest single failure for an editorial system.

---

## 3. Design philosophy reframing

The product is not a document editor. It is a **reading and writing surface that sits inside a relational archive**. The intellectual model is the *desk* of a humanities scholar working with primary sources — partial, marginal, provisional. Three reframings drive everything below.

**Reframe 1 — From "the document" to "the reading."** The artefact in the centre of the screen is one *reading* of the archive made by one researcher at one moment. It accumulates marginalia, comparisons, uncertainty, and citations as it is built. It is provisional by default, citable by request, publishable by intention. We retire the word *document* in user‑facing language; we introduce *reading*, *trail*, *field note*, *codex*, *folio*.

**Reframe 2 — From productivity to provenance.** No archival environment can hide where things come from. Every fragment that lands on the page carries a small, persistent provenance tag — origin (bookmark / reading list / saved record / project / fieldwork), confidence, custody, and rights status. This replaces the right‑rail "Sources" tab with a *constitutive* margin column.

**Reframe 3 — From three modes to one continuum.** Document / Canvas / Board are not separate apps. They are three projections of the same reading: *spatial* (Canvas), *relational* (Board), and *linear* (Reading). The mode switch is a lens, not a context change. Notes, sources, annotations are the same objects in each.

The interface should communicate quietness, intellectual seriousness, slowness, plural authorship, and material density. It should refuse the dashboard impulse: no metrics on first load, no notifications, no progress bars for "writing 23% complete".

---

## 4. Complete redesign direction

The shell is three vertical strata, not three concentric chrome rings.

```
┌────────────────────────────────────────────────────────────────┐
│  PROVENANCE STRIP   18 px, monospace, archive number, status  │
├────────────┬───────────────────────────────────┬───────────────┤
│            │                                   │               │
│  ARCHIVE   │            READING                │   MARGIN      │
│  GAZETTEER │            SURFACE                │   COLUMN      │
│  (left,    │            (centre,               │   (right,     │
│   240 px,  │             measure-locked        │    260 px,    │
│   index)   │             prose column)         │    annotation │
│            │                                   │     + cite +  │
│            │                                   │     provenance│
│            │                                   │     trail)    │
│            │                                   │               │
├────────────┴───────────────────────────────────┴───────────────┤
│   FIELD BAR   32 px, contextual, monospaced caption status     │
└────────────────────────────────────────────────────────────────┘
```

**Left — Archive Gazetteer.** A type‑led index of fragments, artefacts, oral records, reading trails. Not a tree; a *register*. Items are listed by call‑number and short title, grouped by typology, scrollable. No icons. Hovering reveals provenance and last‑touched.

**Centre — Reading Surface.** A single 640 px measure column, top‑justified, set in editorial serif. No page break. No drop shadow. No "page 1 / page 2". The surface is one continuous scroll, broken by editorial *foliations* (numbered editorial divisions, ~3000 words apart) rendered as folio marks in the margin. Pagination becomes an *export* concern.

**Right — Margin Column.** Three stacked panes, each able to fully expand: *Annotations* (this reading's marginalia, by line), *Provenance* (every source touched by the current paragraph, with custody, year, rights), *Trail* (citation lineage of this reading: what cites what, what is cited from where, with a small graph view). This replaces the four‑tab inspector entirely.

**Top — Provenance Strip.** A single 18 px monospace bar replacing both header and project metadata. Contents: archive number ▪ short title ▪ last edited ▪ rights status ▪ provenance count. No buttons. Clicking the bar opens a Codex panel.

**Bottom — Field Bar.** A 32 px contextual bar for the active selection: word count of selection, source attached, uncertainty tag, mode pivot (Reading / Canvas / Board), focus toggle. Replaces the formatting toolbar; formatting moves to a contextual selection popover.

**Mode pivots.**

- *Reading* — the layout above.
- *Canvas* — same three strata, centre becomes an infinite paper field; fragments are positioned in 2D with provenance lines drawn between them. The margin column persists; left becomes a "stack" of unlocated fragments.
- *Board* — same three strata, centre becomes the immersive board (this codebase already has a strong board). The margin column persists.

Switching modes never changes which fragments belong to the reading. The right‑hand margin column is the *constant*. This is the architectural difference between this product and a Notion clone.

---

## 5. Information architecture proposal

Replace the noun set entirely.

| Current noun        | New noun                | Behaviour                                                   |
|---------------------|-------------------------|-------------------------------------------------------------|
| Document            | Reading / Codex         | A composed reading of the archive                           |
| Note                | Fragment                | A single annotation, quote, image, observation, question    |
| Source              | Artefact                | A record in the archive (file, oral, image, transcript)     |
| Citation            | Cite                    | A reference made *in* a reading, with style + provenance    |
| Bibliography        | Trail                   | The ordered lineage of cites for a reading                  |
| Bookmark            | Marker                  | A non‑annotated reference to an artefact                    |
| Reading list        | Course / Curriculum     | An editorial selection of artefacts                         |
| Project             | Folio                   | A bounded research enquiry containing readings + trails     |
| Task                | Field note              | A research action recorded against an artefact or reading   |
| Tag                 | Theme / Concept         | Concept‑level grouping with definitions                     |
| Comment             | Marginal                | An annotation in the margin column                          |
| Export              | Publish                 | A typeset rendering of a reading for circulation            |

Top‑level navigation becomes a *register*, not a sidebar of apps. Six entries, no icons:

1. **Folios** — research enquiries
2. **Readings** — composed readings inside folios
3. **Artefacts** — the archive itself, browsable as a register
4. **Trails** — citation lineages across all readings
5. **Concepts** — theme/topic graph
6. **Field notes** — research actions and uncertainty log

Cross‑cutting traversal patterns:

- *Provenance traversal* — from any cite, click to its artefact, then to every reading that has touched that artefact (lineage).
- *Trail traversal* — from any reading, see its citation graph as a list or a small DAG.
- *Concept traversal* — from any concept, see every reading and every artefact tagged with it.
- *Temporal traversal* — slide a time control; readings, fragments, and artefacts hide/show by created/edited date. Useful for showing how a reading accumulated.
- *Uncertainty traversal* — filter readings by uncertainty tag (verified / interpretive / contested / speculative).

These five traversals are the *primary* navigation grammar. The current four‑tab inspector collapses all of them into one card stack and loses the relational structure.

---

## 6. Typography system

`fonts.css` is empty. This is the highest‑leverage fix. A typographic system *is* the design system in a reading environment.

### 6.1 Typeface stack

```
Display & editorial body : Suisse Works (preferred) → Source Serif 4 → Charter, Cambria, Georgia, serif
UI & metadata             : Suisse Intl (preferred) → Inter Tight → Söhne → -apple-system, sans-serif
Mono (provenance, archive number, caption) : IBM Plex Mono → Geist Mono → ui-monospace
```

Suisse pair is the editorial first choice for this brief; Source Serif 4 + Inter Tight + IBM Plex Mono is the open‑source production fallback, also used by Stanford UP, MIT Press, and Decolonial.

Avoid: Geist Sans as a body face, all‑caps geometric sans (Manrope, Plus Jakarta), and any rounded grotesque.

### 6.2 Optical sizing

Two reading sizes plus one display size, optically tuned:

- **Display** — 32 / 38 / 46 px, Suisse Works Medium, tracking −0.012em, leading 1.05.
- **Editorial body** — 17 px on desktop, 16 px on narrow, Suisse Works Regular, leading 1.62, ligatures on, old‑style figures, single‑space sentences.
- **Compact body** — 14 px, Suisse Intl Regular, leading 1.5 — used in margin column, lists, inspectors.

### 6.3 Vertical rhythm and measure

- Baseline grid: **8 px**, body leading aligned to multiples (`17 × 1.62 ≈ 27.5` → use `27` px exactly to lock the grid).
- Reading measure: locked between **62 and 75 characters** (CSS: `max-width: clamp(36rem, 38vw, 44rem)`).
- Margin column measure: 28–34 characters.
- The reading surface uses *only* paragraph spacing, never blank lines.

### 6.4 Editorial hierarchy

| Role            | Family       | Size  | Weight | Leading | Tracking | Notes                              |
|-----------------|--------------|-------|--------|---------|----------|------------------------------------|
| Reading title   | Suisse Works | 38    | 500    | 1.05    | −0.012em | Set once, no second display title  |
| Folio prefix    | IBM Plex Mono| 11    | 500    | 1.0     | +0.06em  | Above title, ALL‑CAPS, faded ink   |
| Section (H2)    | Suisse Works | 22    | 500    | 1.2     | −0.008em | Roman numerals in marginalia opt.  |
| Sub‑section     | Suisse Works | 18    | 500    | 1.25    | 0        |                                    |
| Body            | Suisse Works | 17    | 400    | 1.62    | 0        | Old‑style figs, single‑space       |
| Lede / pull     | Suisse Works | 21    | 400    | 1.45    | −0.008em | Italic permitted                   |
| Marginal note   | Suisse Intl  | 13    | 400    | 1.45    | 0        | Right column                       |
| Footnote        | Suisse Works | 13    | 400    | 1.45    | 0        | Footnoted at the end of foliation  |
| Citation        | Suisse Intl  | 12    | 500    | 1.4     | 0        | Hanging indent                     |
| Archive caption | IBM Plex Mono| 11    | 400    | 1.35    | +0.04em  | Provenance, custody, rights        |
| Index entry     | Suisse Intl  | 13    | 500    | 1.35    | 0        | Left gazetteer                     |
| UI control      | Suisse Intl  | 12    | 500    | 1.25    | +0.01em  |                                    |
| System status   | IBM Plex Mono| 11    | 400    | 1.2     | +0.04em  | Provenance strip, field bar        |

### 6.5 Responsive behaviour

Two breakpoints only.

- **≤ 920 px** — gazetteer collapses to a sheet; margin column collapses to inline footnotes; body drops to 16 px, leading `26 px`.
- **≥ 1400 px** — both rails expand by 24 px, measure stays locked. Never widen the reading column.

### 6.6 Token form

```css
--type-display: 38px / 1.05 / "Suisse Works", serif;
--type-h2:      22px / 1.20 / "Suisse Works", serif;
--type-h3:      18px / 1.25 / "Suisse Works", serif;
--type-body:    17px / 1.62 / "Suisse Works", serif;
--type-lede:    21px / 1.45 / "Suisse Works", serif;
--type-margin:  13px / 1.45 / "Suisse Intl", sans-serif;
--type-cite:    12px / 1.40 / "Suisse Intl", sans-serif;
--type-caption: 11px / 1.35 / "IBM Plex Mono", monospace;
--type-system:  11px / 1.20 / "IBM Plex Mono", monospace;
--type-index:   13px / 1.35 / "Suisse Intl", sans-serif;
--type-ui:      12px / 1.25 / "Suisse Intl", sans-serif;
```

---

## 7. Colour and material system

### 7.1 Palette

A restrained archival palette of nine ink and paper values, plus four semantic accents.

```css
/* Paper — three warm grounds */
--paper-foxed:  #F6F2EA;   /* aged, light */
--paper-leaf:   #FAF7F1;   /* default reading surface */
--paper-vellum: #FDFCF8;   /* highlight / modal ground */

/* Ink — five neutral inks */
--ink-deep:     #14110D;   /* body text                 — 18:1 on leaf */
--ink-body:     #2A2620;   /* default body              — 13:1 on leaf */
--ink-quiet:    #585149;   /* secondary text            — 6.5:1         */
--ink-faint:    #908779;   /* metadata                  — 3.3:1         */
--ink-veil:     #C7BFB0;   /* faded marks, rules        — decorative    */

/* Rules and borders */
--rule-hair:    rgba(20, 17, 13, 0.10);
--rule-quiet:   rgba(20, 17, 13, 0.18);
--rule-firm:    rgba(20, 17, 13, 0.32);

/* Semantic accents, all desaturated */
--accent-oxide: #8B4A2B;   /* annotation, marginalia ink */
--accent-verdigris: #3F6B5A; /* provenance, custody       */
--accent-indigo: #284B6E;   /* citation links             */
--accent-vermilion: #8E2A2A; /* uncertainty, rights flag  */
```

The current `--lemon` is retired from the reading surface. A single restrained yellow may persist as a *highlight* (annotation marker) at 18% opacity, never as a UI accent.

### 7.2 Dark adaptation — "Night Archive"

```css
--paper-foxed:  #15120E;
--paper-leaf:   #1A1713;
--paper-vellum: #221E18;
--ink-deep:     #F2EBDF;
--ink-body:     #DCD3C5;
--ink-quiet:    #A39A8C;
--ink-faint:    #6E6557;
--ink-veil:     #4A4438;
```

Both palettes share the *same* tokens; only their values flip. No component should reference colour by hex.

### 7.3 Elevation

Materiality replaces drop shadow. Three elevation modes:

- **Inlaid** — no shadow, 1 px inset rule of `--rule-hair`. Default for cards.
- **Pressed** — a 2 px lower paper warp, achieved by `box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 0 rgba(20,17,13,0.04)`.
- **Lifted** — only on modals and popovers, `box-shadow: 0 24px 60px rgba(20,17,13,0.18)`.

Cards on the reading surface are *inlaid*. The current build's universal `shadow-lg` reads as Notion/Linear; remove it from the editor.

### 7.4 Hover, focus, selection

- Hover — `background: color-mix(in oklab, currentColor 4%, transparent)`. No transitions over 120 ms.
- Focus — 2 px outline of `--accent-indigo`, 2 px offset. Never use ring with shadow; rings on paper read wrong.
- Selection — `background: color-mix(in oklab, var(--accent-oxide) 18%, transparent)`. Marginalia‑coloured.
- Annotation highlight — `background: linear-gradient(transparent 60%, color-mix(in oklab, var(--accent-oxide) 22%, transparent) 60%)` (the "underline highlight" — feels written).

### 7.5 Texture

Use a *single*, very faint paper noise behind the reading surface (`background-image` SVG, 4% opacity). Do not use noise on UI chrome. Texture appears only where the user reads.

---

## 8. Interaction and motion philosophy

This is a calm interface. Motion exists only to communicate causality and provenance, never to delight.

### 8.1 Motion principles

1. **No motion under 60 ms is real motion.** Use instant transitions for state toggles.
2. **Motion of paper** — opens, closes, expansions use easing `cubic-bezier(0.22, 1, 0.36, 1)` (out‑expo, paper‑settling) at 220–280 ms.
3. **Motion of ink** — appearance of annotations, citations, marginalia uses fade‑in at 140 ms, no transform.
4. **Motion of trail** — the citation/provenance graph uses spring with low stiffness (Framer Motion `stiffness: 70, damping: 18`). Lines draw at 1.2× normal speed so they read as causal.
5. **No bounce, ever.** No scale > 1.02. No parallax.
6. **Respect `prefers-reduced-motion`** at the application root and disable all non‑essential motion.

### 8.2 Interaction patterns to introduce

- **Margin click‑through.** Click a provenance chip in the right margin; the corresponding sentence in the body lights faintly (oxide highlight) for 1.2 s, then fades.
- **Mark‑up gesture.** Select text; a small, monospaced selection bar appears (Cite, Mark, Question, Compare). No floating B/I/U toolbar — those live in the field bar.
- **Footnote peek.** Hover any cite number; a card‑less popover appears in the margin column (not over the text). Click pins it.
- **Foliation jump.** The left gazetteer treats a reading as a list of foliations (numbered editorial divisions). Clicking jumps; the scroll uses paper easing.
- **Mode pivot.** Reading → Canvas → Board cross‑fades the centre column over 280 ms; the margin column never disappears.
- **Provenance breath.** Once a minute, the provenance strip pulses at 1.5% opacity for 600 ms — a near‑imperceptible signal that the archive is live.

### 8.3 Interactions to remove

- Floating action button (none today, but the current "New note" button on the header drifts toward FAB language — relocate to the gazetteer).
- Toast notifications (use the field bar).
- Skeleton shimmer on the reading surface (use a single text line "loading reading…" in faint ink).
- Tooltip pile‑ups on every icon (the new system has fewer icons).

---

## 9. Advanced archival feature roadmap

These are the features that distinguish an archival research environment from a document editor. Each is named, scoped, and assigned a phase.

| # | Capability                  | Description                                                                                     | Phase |
|---|-----------------------------|-------------------------------------------------------------------------------------------------|-------|
| 1 | **Provenance ledger**       | Per‑fragment append‑only record of where it came from, who touched it, custody chain, rights.   | 1     |
| 2 | **Cite‑with‑context**       | A cite captures not only the artefact but the *passage* of the artefact and its surrounding 80 words. | 1 |
| 3 | **Trail view**              | Per‑reading DAG of citations, navigable as list or small graph. Used as both navigation and proof. | 1 |
| 4 | **Concept graph**           | Author‑authored concept nodes that link readings, artefacts, and quotes. Renderable as a small Force diagram. | 2 |
| 5 | **Temporal cursor**         | A timeline slider that shows the reading and archive at any prior date. Used for audit, teaching, and writing about archive change. | 2 |
| 6 | **Fragment clustering**     | Quiet ML clustering of fragments by concept/topic. Surfaces "you may want to compare these" without pushing. | 3 |
| 7 | **Oral archive ingestion**  | Audio‑first artefacts with transcript view, marginalia anchored to timecodes, speaker provenance. | 2 |
| 8 | **Uncertainty tagging**     | Every fragment can be tagged verified / interpretive / contested / speculative. Filter and visualise. | 1 |
| 9 | **Custody and rights flags**| Any fragment from a culturally sensitive collection is flagged with custody, access tier, and citation requirement. | 1 |
| 10 | **Interpretive layers**    | A reading can show *other readings*' annotations on the same passages, as ghosted marginalia. Plural authorship made visible. | 3 |
| 11 | **Citation lineage**       | "Cited by" and "Cites" graph per artefact across all readings in the folio. | 2 |
| 12 | **Provenance‑aware export**| Publish produces a typeset PDF *and* a JSON-LD provenance manifest. Both shareable. | 1 |
| 13 | **Fieldwork ingestion**    | Drop a folder of field notes / photographs / audio; system creates draft fragments with extracted provenance. | 3 |
| 14 | **AI‑assisted contextual linking** | A *quiet* assist: hovering a paragraph offers up to 3 archive artefacts the system thinks are relevant. No auto‑insert. | 3 |
| 15 | **Reading trails (course mode)** | Author a sequence of readings as a curriculum; share with read‑only marginalia. | 3 |

Phase 1 establishes the archival baseline (provenance, trail, cite‑with‑context, uncertainty, custody, publish). Phase 2 adds *relational depth* (concept graph, temporal cursor, oral, lineage). Phase 3 adds *plural authorship and assistive layers*.

---

## 10. Technical implementation architecture

The Decolonising Archive Next repository (Next 16 App Router, Supabase, TS, custom CSS) is the platform; the Figma Make export is the design surface. The path is to bring the design *into* that codebase, not the other way round.

### 10.1 Stack confirmation

- **Next.js 16 App Router** (already in repo) — route groups for `(reading)`, `(archive)`, `(folio)`.
- **TypeScript strict** — already on.
- **Server Components by default** — every page renders the reading static; client islands for the editor and the margin column.
- **Tiptap 2.x** as the editor engine (ProseMirror under the hood). Reasoning: extension model lets us model *Fragment*, *Cite*, *Marginal*, *Provenance* as schema nodes/marks; collaborative editing later via `y-prosemirror`.
- **Radix primitives** selectively (`Popover`, `Dialog`, `DropdownMenu`, `Tooltip`, `Toast` only). No Radix sidebar, navigation‑menu, accordion in the editor.
- **shadcn** only for `Button`, `Input`, `Select`, `Dialog`. Re‑skinned to the editorial token system. Discard menubar, navigation‑menu, sidebar, drawer, carousel, command — they push the project back toward generic SaaS.
- **Framer Motion** only for two surfaces: the margin column expand/collapse and the trail graph drawing. Nothing else.
- **CSS layer architecture**:
  ```
  @layer reset, tokens, type, editorial, components, utilities;
  ```
  All editorial work lives in `editorial`. The current generic Tailwind utilities live in `utilities` and are *forbidden* inside the reading surface (use class names, not utility‑pile).

### 10.2 Token system

A two‑file token architecture replaces the current single `theme.css`.

```
src/styles/tokens/colour.css   /* paper, ink, rule, accents, dark twin */
src/styles/tokens/type.css     /* the table from §6.6                  */
src/styles/tokens/space.css    /* 4 px base, 6 step scale              */
src/styles/tokens/motion.css   /* 4 easings, 5 durations               */
src/styles/tokens/elevation.css/* inlaid / pressed / lifted             */
```

Components reference only tokens. No hex in components. No `text-sm`, `text-base`, `text-lg` inside the editorial layer.

### 10.3 Component taxonomy

Five layers, named after the editorial role they play. This replaces the current shadcn‑flat structure.

```
01 primitives/     Button, Input, Select, Popover, Dialog, Toast, Tooltip, ScrollArea
02 marks/          Cite, Marginal, ProvenanceChip, ConceptTag, UncertaintyFlag
03 fragments/      QuoteFragment, ImageFragment, AudioFragment, NoteFragment,
                   QuestionFragment, LinkFragment, SourceFragment, TaskFragment
04 surfaces/       ReadingSurface, MarginColumn, GazetteerRegister, ProvenanceStrip,
                   FieldBar, CanvasSurface, BoardSurface, TrailGraph, ConceptGraph
05 codices/        FolioCodex, ReadingCodex, ArtefactCodex, CourseCodex
```

The current `LeftFloatingMenu`, `DocumentActionBar`, `FormattingToolbar`, `DocumentHeader`, `ProjectMetadata` collapse into `ProvenanceStrip + FieldBar + GazetteerRegister`. The current `RightInspectorPanel` becomes `MarginColumn`. The current `DocumentSurface` becomes `ReadingSurface`. The current `CitationModal` becomes a margin‑column primary action with a small `Dialog` as fallback. The current `ExportModal` becomes a `PublishCodex` panel.

### 10.4 State architecture

- **Per‑reading store** — Tiptap document + selection + open marginalia. Client. Persisted on idle to the existing Supabase `workbench_notes`/`workbench_annotations` tables.
- **Per‑folio store** — selected reading, gazetteer filters, mode (Reading/Canvas/Board), temporal cursor. URL‑backed via App Router search params, so every state is shareable.
- **Per‑archive store** — server query cache for artefacts; React Query (`@tanstack/react-query` already in the wider ecosystem) only if we add live updates, otherwise plain RSC fetch.
- **Provenance ledger** — server‑authoritative append‑only table `workbench_provenance` with one row per touch (fragment created / cited / annotated / moved). Never client‑editable.

### 10.5 Rendering considerations

- The reading surface is a server‑rendered HTML skeleton plus a client editor island. Renders the first paragraph server‑side for perceived speed; Tiptap hydrates.
- Margin column is RSC for "already‑saved" marginalia, client island for the live editor.
- Trail graph and concept graph render server‑side as `<svg>`; client adds interactivity on idle.
- Images are next/image with `placeholder="blur"` only when artefact has a thumbprint, else a neutral paper rectangle.

### 10.6 Search and indexing

- **Two indices** — `artefacts_idx` (titles, creators, transcripts) and `readings_idx` (full‑text of all readings the current user can see). Both Postgres full‑text + trigram, no external dependency in Phase 1.
- **Search surface** — opened from the provenance strip (`⌘K`). One field, two registers tabs: *Archive* and *Readings*. No "everything everywhere" command palette; it dilutes the editorial register.
- **Search result** is always an artefact register row or a reading register row, never a generic search hit card.

### 10.7 Accessibility

- All marginalia are real `<aside>` elements anchored to the paragraph they comment on with `aria-describedby`; screen readers receive a reading + its margin column in coherent order.
- Reading surface satisfies WCAG 2.2 AA at body 17 px on `--paper-leaf` (`--ink-body` 13:1).
- Focus ring of 2 px is the *only* hover‑independent affordance; the interface is keyboard‑first.
- Reduced motion disables the trail graph draw animation and the provenance strip breath.
- The mark‑up selection bar is reachable by `⌘E` (the canonical edit shortcut) without selection by surfacing it on the current cursor caret.

### 10.8 Performance budget

- LCP target ≤ 1.8 s on cable; reading surface server‑rendered first paragraph hits LCP.
- Total client JS in `/reading/[id]` ≤ 180 KB gzip (Tiptap is ≈ 90 KB, the rest is our island code).
- Margin column lazy‑loads after first paint; trail graph lazy‑loads on tab activation.

---

## 11. Component‑level redesign strategy

The following table maps every component in the current export to its archival successor. Components without successors are *removed*.

| Current component        | Successor                              | Change summary                                                                 |
|--------------------------|----------------------------------------|--------------------------------------------------------------------------------|
| `App.tsx`                | `app/(reading)/[id]/page.tsx`          | Routes by reading id, RSC shell, client editor island                          |
| `DocumentHeader`         | `surfaces/ProvenanceStrip`             | Replaces title block + segmented control with monospace status bar             |
| `ProjectMetadata`        | merged into `ProvenanceStrip`          | Project, status, visibility become provenance facets                           |
| `LeftFloatingMenu`       | `surfaces/GazetteerRegister`           | No menus. Left becomes a type‑led index of fragments and foliations            |
| `DocumentActionBar`      | removed                                | Menubar duplication. File ops move to `⌘` shortcuts + `PublishCodex` panel    |
| `FormattingToolbar`      | `surfaces/FieldBar` + selection popover| Top bar dies. Formatting is per‑selection, contextual, monospaced              |
| `DocumentSurface`        | `surfaces/ReadingSurface`              | Single continuous reading column, foliated, no page metaphor                   |
| `RightInspectorPanel`    | `surfaces/MarginColumn`                | Three stacked panes (Annotations / Provenance / Trail), not 4 flat tabs       |
| `CitationModal`          | margin‑column primary + `Dialog`       | Cite is mostly inline in the margin; modal exists only for first‑time setup    |
| `ExportModal`            | `codices/PublishCodex`                 | A panel, not a modal; produces PDF + JSON‑LD provenance manifest               |
| shadcn `menubar`         | removed                                | Not used; would push to SaaS menubar pattern                                   |
| shadcn `sidebar` (21 KB) | removed                                | Replaced by GazetteerRegister and MarginColumn                                 |
| shadcn `command`         | replaced by minimal `⌘K` search        | Reduced to two registers tabs (Archive, Readings)                              |
| shadcn `carousel`        | removed                                | Wrong metaphor for archival material                                           |
| shadcn `drawer`          | removed (use Dialog)                   | Drawers feel mobile/social; not editorial                                      |
| shadcn `accordion`       | replaced by `details` HTML element     | Native foldout is calmer and lighter                                           |
| `Tabs` (4‑tab inspector) | removed                                | Three stacked, not tabbed, panes in MarginColumn                              |
| Document/Canvas/Board segmented control | `FieldBar` lens toggle      | Same data, three projections; never a "mode switch" copy                       |

Two components to *introduce* explicitly:

- **`marks/Cite`** — ProseMirror inline mark that wraps the citation reference. Stores citation key, captured passage, capture date, citation style at render time. Renders as the cite number, links to margin.
- **`fragments/SourceFragment`** — block node that holds a quotation block, attribution, archive number, custody, and a "Compare" affordance that opens the artefact in a split view.

---

## 12. UI / UX anti‑patterns to remove

Concrete, prioritised, named.

1. **Three menus for the same actions.** Remove `LeftFloatingMenu` and `DocumentActionBar`. Keep one selection popover for inline formatting and a minimal `⌘K` for nav. Saves ≈ 22 KB of UI code and 60% of the perceived chrome.
2. **A4 page metaphor with hard pagination.** Remove `viewMode: paginated`. Continuous foliated reading is the only mode; pagination is an *export* concern.
3. **Drop shadow on the reading surface.** Replace `shadow-lg` with an inlaid 1 px hair rule.
4. **Lemon yellow as a primary UI accent.** Demote to optional annotation highlight at 18% opacity.
5. **Right‑rail tab inspector.** Remove `Tabs` in `RightInspectorPanel`; replace with three stacked panes that can each fully expand.
6. **`bg-card border rounded-lg shadow-lg` Tailwind tile pattern** used by `LeftFloatingMenu`. This is the canonical SaaS card. Replace with paper inlay (1 px rule, no shadow).
7. **A "Document / Canvas / Board" segmented control that returns "coming soon" for two of three.** Always ship a working continuum; placeholder modes communicate the opposite of editorial seriousness.
8. **Empty `globals.css`, `fonts.css`.** Land typography first, before any further visual work.
9. **shadcn defaults left as the design system** (`--radius: 0.625rem`, OKLCH greys). Replace with the archival token set in §7 and §10.
10. **Iconography overload** in `LeftFloatingMenu` (20+ icons in 240 px). The new gazetteer uses *no* icons; type carries the hierarchy.
11. **`focus:outline-none` plus generic ring** — replace with a 2 px solid `--accent-indigo` outline + 2 px offset.
12. **Toasts and "Save" labels** — autosave silently; surface autosave status in the field bar, never as a toast.
13. **Decorative cards used to wrap simple text** (the `Card` component in shadcn applied to small lists). Remove; use type and rules.
14. **Generic "Untitled Research Note"** placeholder. Editorial systems use a *folio number* placeholder ("Folio 037 / untitled reading"), authored.
15. **Inspector renaming sources as a "tab".** Sources are constitutive — they live in the margin column, always visible, never tabbed.

---

## 13. Production‑ready recommendations

A six‑step, two‑week sequencing for a small team. Each step is independently shippable and each is measurable.

**Week 1**

1. *Day 1–2.* Land the token system (`colour.css`, `type.css`, `space.css`, `motion.css`, `elevation.css`). Wire up Suisse Works + Suisse Intl + IBM Plex Mono (or the open‑source fallback). Replace all `text-*`, `bg-*`, `border-*` usage inside `app/(app)/my/workbench` with token‑aware classes. Net effect: the existing UI becomes editorial without changing structure. This makes the rest tractable.

2. *Day 3.* Strip the four‑bar chrome. Replace `DocumentHeader + ProjectMetadata + DocumentActionBar + FormattingToolbar` with one `ProvenanceStrip` and one `FieldBar`. Move formatting into a selection‑triggered monospaced popover. Remove `LeftFloatingMenu` outright; the gazetteer takes its place in step 4.

3. *Day 4–5.* Introduce Tiptap as the editor engine for the centre column. Implement the `Cite` mark and the `Marginal` block as first‑class nodes. Persist into the existing `workbench_annotations` table with a small schema migration.

**Week 2**

4. *Day 6–7.* Build the `MarginColumn` with three stacked panes (Annotations / Provenance / Trail). Implement margin click‑through and the foliation jump. The right rail is the *constant* across mode pivots.

5. *Day 8.* Build the `GazetteerRegister` on the left. Type‑led, no icons. Indexes fragments and foliations of the current reading; switches to artefacts at folio level.

6. *Day 9–10.* Implement `PublishCodex` (PDF + JSON‑LD provenance manifest), `Cite‑with‑context` capture, and `Uncertainty` tags. These are the three Phase‑1 features that justify the system existing.

After week 2, the product reads as an archival editorial environment, the chrome is calm, the structure is editorial, and the system is ready for the Phase 2 / 3 archival features in §9.

**Measurable outcomes to track**

- Visible interactive surfaces before first keystroke: from ≈48 to ≤9.
- Vertical chrome before reading surface: from ≈228 px to ≤72 px.
- Total client JS in editor route: ≤180 KB gzip.
- Components reused from shadcn: from 9 to ≤4 (re‑skinned).
- Distinct CSS hex values in the editor route: from ~24 to ≤14 (the tokens in §7.1).
- Lighthouse text contrast on the reading surface: 18:1 deep, 13:1 body.

---

## Appendix A — Mapping table from current code to the new architecture

| Current file                              | Disposition                                              |
|-------------------------------------------|----------------------------------------------------------|
| `src/app/App.tsx`                         | Refactor → `app/(reading)/[id]/page.tsx` (RSC shell)     |
| `src/app/components/DocumentHeader.tsx`   | Delete → `surfaces/ProvenanceStrip.tsx`                  |
| `src/app/components/ProjectMetadata.tsx`  | Merge into `ProvenanceStrip`                              |
| `src/app/components/LeftFloatingMenu.tsx` | Delete → `surfaces/GazetteerRegister.tsx`                |
| `src/app/components/DocumentActionBar.tsx`| Delete (replaced by `⌘K` + `PublishCodex`)               |
| `src/app/components/FormattingToolbar.tsx`| Delete → `surfaces/FieldBar.tsx` + selection popover     |
| `src/app/components/DocumentSurface.tsx`  | Rewrite → `surfaces/ReadingSurface.tsx` on Tiptap        |
| `src/app/components/RightInspectorPanel.tsx` | Rewrite → `surfaces/MarginColumn.tsx` (3 stacked panes) |
| `src/app/components/CitationModal.tsx`    | Re‑frame → margin‑column primary + small `Dialog`        |
| `src/app/components/ExportModal.tsx`      | Rewrite → `codices/PublishCodex.tsx`                     |
| `src/styles/theme.css`                    | Split → `tokens/{colour,type,space,motion,elevation}.css` |
| `src/styles/fonts.css`                    | Populate with Suisse pair + IBM Plex Mono                |
| `src/styles/globals.css`                  | Establish `@layer reset, tokens, type, editorial, components, utilities` |
| Unused shadcn primitives (menubar, sidebar, navigation‑menu, carousel, drawer, command, accordion) | Delete from `components/ui/` |

## Appendix B — Words to retire from product copy

`Document`, `Note`, `Source`, `Project`, `Task`, `Bookmark`, `Reading list`, `Bibliography`, `Export`, `Workspace`, `Dashboard`, `Untitled`, `Save`, `Productivity`, `AI assistant`, `Workspace`, `Card`, `Item`.

## Appendix C — Words to introduce

`Reading`, `Codex`, `Folio`, `Fragment`, `Artefact`, `Cite`, `Trail`, `Marker`, `Course`, `Concept`, `Field note`, `Marginal`, `Provenance`, `Custody`, `Lineage`, `Uncertainty`, `Foliation`, `Publish`, `Register`, `Gazetteer`.

---

*Audit and reframing prepared against the Figma Make export `Research Notes Document Editor.zip` and the route shell of `decolonising-archive-next`. The Figma Dev Mode MCP was attempted; live node reads require Dev Mode enabled in the Figma desktop app — the analysis is grounded in the export, which is the production artefact.*

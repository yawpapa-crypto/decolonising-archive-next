export type WorkbenchNoteTemplateId =
  | "blank"
  | "source_annotation"
  | "research_reflection"
  | "citation_note"
  | "meeting_note"
  | "project_decision_log"
  | "reading_summary"
  | "ethics_cultural_care";

export type WorkbenchNoteTemplate = {
  id: WorkbenchNoteTemplateId;
  label: string;
  title: string;
  html: string;
};

const BLANK_HTML = "<p></p>";

export const WORKBENCH_NOTE_TEMPLATES: WorkbenchNoteTemplate[] = [
  { id: "blank", label: "Blank note", title: "Untitled note", html: BLANK_HTML },
  {
    id: "source_annotation",
    label: "Source annotation",
    title: "Source annotation",
    html: `<h2>Source annotation</h2>
<h3>Source details</h3>
<p></p>
<h3>Key argument</h3>
<p></p>
<h3>Useful quotes</h3>
<p></p>
<h3>Relevance to project</h3>
<p></p>
<h3>Cultural / ethical considerations</h3>
<p></p>
<h3>Follow-up tasks</h3>
<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Check source context</p></div></li></ul>`,
  },
  {
    id: "research_reflection",
    label: "Research reflection",
    title: "Research reflection",
    html: `<h2>Research reflection</h2>
<h3>What stood out</h3>
<p></p>
<h3>Questions raised</h3>
<p></p>
<h3>Connections to other material</h3>
<p></p>
<h3>Next steps</h3>
<p></p>`,
  },
  {
    id: "citation_note",
    label: "Citation note",
    title: "Citation note",
    html: `<h2>Citation note</h2>
<h3>Source</h3>
<p></p>
<h3>Quotation or paraphrase</h3>
<p></p>
<h3>Page / location</h3>
<p></p>
<h3>How to use in writing</h3>
<p></p>`,
  },
  {
    id: "meeting_note",
    label: "Meeting note",
    title: "Meeting note",
    html: `<h2>Meeting note</h2>
<h3>Attendees</h3>
<p></p>
<h3>Agenda</h3>
<p></p>
<h3>Discussion</h3>
<p></p>
<h3>Decisions</h3>
<p></p>
<h3>Actions</h3>
<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p></p></div></li></ul>`,
  },
  {
    id: "project_decision_log",
    label: "Project decision log",
    title: "Project decision log",
    html: `<h2>Project decision log</h2>
<h3>Decision</h3>
<p></p>
<h3>Reasoning</h3>
<p></p>
<h3>Risks or concerns</h3>
<p></p>
<h3>People / records affected</h3>
<p></p>
<h3>Next action</h3>
<p></p>`,
  },
  {
    id: "reading_summary",
    label: "Reading summary",
    title: "Reading summary",
    html: `<h2>Reading summary</h2>
<h3>Source</h3>
<p></p>
<h3>Main points</h3>
<p></p>
<h3>Evidence or examples</h3>
<p></p>
<h3>Gaps or questions</h3>
<p></p>`,
  },
  {
    id: "ethics_cultural_care",
    label: "Ethics / cultural care note",
    title: "Ethics and cultural care note",
    html: `<h2>Ethics and cultural care note</h2>
<h3>Material or record context</h3>
<p></p>
<h3>Possible sensitivities</h3>
<p></p>
<h3>Community, rights, or access considerations</h3>
<p></p>
<h3>Recommended handling</h3>
<p></p>
<h3>Follow-up</h3>
<p></p>`,
  },
];

export function getWorkbenchNoteTemplate(id: WorkbenchNoteTemplateId) {
  return WORKBENCH_NOTE_TEMPLATES.find((t) => t.id === id) ?? WORKBENCH_NOTE_TEMPLATES[0];
}

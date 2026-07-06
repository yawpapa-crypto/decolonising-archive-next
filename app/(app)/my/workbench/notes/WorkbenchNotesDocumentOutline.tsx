"use client";

import type { NoteHeading } from "@/lib/workbench-note-headings";

type Props = {
  headings: NoteHeading[];
  onSelect: (heading: NoteHeading) => void;
};

export default function WorkbenchNotesDocumentOutline({ headings, onSelect }: Props) {
  if (!headings.length) {
    return <p className="workbench-muted">Headings in your note appear here for quick navigation.</p>;
  }

  return (
    <nav className="workbench-notes-outline" aria-label="Document outline">
      <ul>
        {headings.map((heading) => (
          <li key={heading.id} className={`is-h${heading.level}`}>
            <button type="button" onClick={() => onSelect(heading)}>
              {heading.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

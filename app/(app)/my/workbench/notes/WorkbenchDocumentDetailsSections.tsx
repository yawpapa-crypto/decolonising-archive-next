"use client";

import type { NoteHeading } from "@/lib/workbench-note-headings";
import type { WorkbenchLinkableRecord } from "@/lib/workbench-data";
import WorkbenchNotesDocumentOutline from "./WorkbenchNotesDocumentOutline";
import WorkbenchNotesLinkedRecords, { type LinkedRecordView } from "./WorkbenchNotesLinkedRecords";

type Props = {
  open: boolean;
  headings: NoteHeading[];
  onSelectHeading: (heading: NoteHeading) => void;
  noteId: string;
  canEdit: boolean;
  linkedRecords: LinkedRecordView[];
  linkableRecords: WorkbenchLinkableRecord[];
  onLinksChange: (recordIds: string[]) => void;
  onInsertBlock: (record: LinkedRecordView) => void;
  onError: (message: string) => void;
};

export default function WorkbenchDocumentDetailsSections({
  open,
  headings,
  onSelectHeading,
  noteId,
  canEdit,
  linkedRecords,
  linkableRecords,
  onLinksChange,
  onInsertBlock,
  onError,
}: Props) {
  if (!open) return null;

  return (
    <div className="workbench-document-drawer-details">
      <section className="workbench-document-drawer-details__section">
        <h3 className="workbench-document-drawer-details__title">Outline</h3>
        <WorkbenchNotesDocumentOutline headings={headings} onSelect={onSelectHeading} />
      </section>
      <section className="workbench-document-drawer-details__section">
        <h3 className="workbench-document-drawer-details__title">Archive links</h3>
        <WorkbenchNotesLinkedRecords
          noteId={noteId}
          canEdit={canEdit}
          linkedRecords={linkedRecords}
          linkableRecords={linkableRecords}
          onLinksChange={onLinksChange}
          onInsertBlock={onInsertBlock}
          onError={onError}
        />
      </section>
    </div>
  );
}

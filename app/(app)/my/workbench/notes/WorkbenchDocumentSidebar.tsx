"use client";

import type { ReactNode } from "react";
import type { DocumentSidebarTab } from "./WorkbenchDocumentTopBar";

type Props = {
  tab: DocumentSidebarTab;
  formatPanel: ReactNode;
  documentPanel: ReactNode;
};

export default function WorkbenchDocumentSidebar({ tab, formatPanel, documentPanel }: Props) {
  return (
    <aside className="workbench-pages-sidebar" aria-label="Document sidebar">
      <div
        id="workbench-document-sidebar-format"
        className="workbench-pages-sidebar__panel"
        hidden={tab !== "format"}
        aria-hidden={tab !== "format"}
      >
        <p className="workbench-pages-sidebar__title">Text</p>
        {formatPanel}
      </div>
      <div
        id="workbench-document-sidebar-document"
        className="workbench-pages-sidebar__panel"
        hidden={tab !== "document"}
        aria-hidden={tab !== "document"}
      >
        <p className="workbench-pages-sidebar__title">Document</p>
        {documentPanel}
      </div>
    </aside>
  );
}

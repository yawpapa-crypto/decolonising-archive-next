/**
 * Notes route stylesheet load order (intentional — later files win on equal specificity).
 *
 * 1. Board immersive — portal fullscreen board UI
 * 2. Document shell — Figma reading layout, mode chrome
 * 3. Research canvas — scoped to .workbench-research-canvas (not legacy .workbench-note-canvas)
 * 4. Mobile — notes page breakpoints; canvas uses immersive portal selectors
 * 5. Citation picker — modal / popover for references
 * 6. Document scroll fix — body.workbench-notes-document-mode only (editorial reading)
 */

import "@/app/workbench-board-immersive.css";
import "@/app/styles/archive/notes-figma.css";
import "./workbench-research-canvas/index.css";
import "@/app/styles/archive/notes-mobile.css";
import "@/app/styles/archive/citation-picker.css";
import "@/app/styles/archive/notes-scroll-fix.css";
import "@/app/styles/workbench-share-modal.css";
import "@/app/styles/workbench-collaboration-bar.css";
import "@/app/styles/archive/document-taskbar-ui.css";
import type { CSSProperties } from "react";

const workbenchDocumentFontVariables = {
  "--font-workbench-inter": '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  "--font-workbench-roboto": '"Roboto", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  "--font-workbench-open-sans": '"Open Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  "--font-workbench-lato": '"Lato", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  "--font-workbench-montserrat": '"Montserrat", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  "--font-workbench-poppins": '"Poppins", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  "--font-workbench-source-sans-3": '"Source Sans 3", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  "--font-workbench-nunito-sans": '"Nunito Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  "--font-workbench-merriweather": '"Merriweather", Georgia, "Times New Roman", serif',
  "--font-workbench-ibm-plex-sans": '"IBM Plex Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
} as CSSProperties;

export default function WorkbenchNotesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...workbenchDocumentFontVariables, display: "contents" }}>
      {children}
    </div>
  );
}

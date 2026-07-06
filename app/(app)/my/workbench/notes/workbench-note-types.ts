export type NoteMode = "document" | "canvas" | "board";

export const WORKBENCH_LAST_NOTE_MODE_KEY = "workbench:lastNoteMode";

export function isWorkbenchNoteMode(value: unknown): value is NoteMode {
  return value === "document" || value === "canvas" || value === "board";
}

/** Server preference first, then localStorage, then document. */
export function resolveWorkbenchNoteMode(sources: {
  serverPreferred?: string | null;
  localStorageValue?: string | null;
}): NoteMode {
  if (isWorkbenchNoteMode(sources.serverPreferred)) return sources.serverPreferred;
  if (isWorkbenchNoteMode(sources.localStorageValue)) return sources.localStorageValue;
  return "document";
}

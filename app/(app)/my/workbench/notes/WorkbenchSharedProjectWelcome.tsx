"use client";

import type { WorkbenchProjectAccessRole } from "@/lib/workbench-collaboration";

type Props = {
  role: WorkbenchProjectAccessRole;
  projectTitle: string;
  noteModes: ReadonlyArray<{ id: string; label: string }>;
  activeMode: string;
  onModeChange: (mode: string) => void;
};

export function WorkbenchSharedProjectWelcome({
  role,
  projectTitle,
  noteModes,
  activeMode,
  onModeChange,
}: Props) {
  if (role === "none" || role === "owner") return null;

  return (
    <section className="workbench-shared-welcome" aria-label="Collaboration welcome">
      <p className="workbench-shared-welcome__eyebrow">Shared project</p>
      <h2>You&apos;ve been invited to collaborate on {projectTitle}</h2>
      <p className="workbench-shared-welcome__lead">
        {role === "viewer"
          ? "You can view this project. Editing is disabled."
          : "You can edit the document, board and canvas for this project."}
      </p>
      <p className="workbench-shared-welcome__role">
        Your role: <strong>{role === "editor" ? "Editor" : "View only"}</strong>
      </p>
      <div className="workbench-shared-welcome__actions" role="group" aria-label="Open workbench mode">
        {noteModes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`workbench-shared-welcome__mode${activeMode === mode.id ? " is-active" : ""}`}
            onClick={() => onModeChange(mode.id)}
          >
            Open {mode.label}
          </button>
        ))}
      </div>
    </section>
  );
}

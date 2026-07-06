"use client";

import WorkbenchCollaboratorPanel from "@/app/(app)/my/workbench/WorkbenchCollaboratorPanel";
import { inviteReviewCollaborator } from "@/lib/workbench-review-actions";
import type { WorkbenchCollaboratorRole } from "@/lib/workbench-collaborator-actions";
import type { WorkbenchReviewSnapshot } from "@/lib/workbench-review-module";

export default function ReviewCollaboratorsSection({
  snapshot,
  compact = false,
}: {
  snapshot: WorkbenchReviewSnapshot;
  compact?: boolean;
}) {
  const project = snapshot.activeProject;
  if (!project?.projectId) {
    return (
      <section className="workbench-review-card workbench-review-collaborators">
        <div className="workbench-review-card-header">
          <div>
            <h2>Screening team</h2>
            <p>Collaborators can be invited once this review is linked to a Workbench project.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="workbench-review-card workbench-review-collaborators">
      <div className="workbench-review-card-header">
        <div>
          <h2>Screening team</h2>
          <p>
            Invite reviewers to screen independently. Conflicts appear when reviewers disagree on include,
            exclude, or maybe.
          </p>
        </div>
      </div>
      <WorkbenchCollaboratorPanel
        projectId={project.projectId}
        collaborators={snapshot.collaborators}
        canManage={snapshot.canManageCollaborators}
        compact={compact}
        variant="premium"
        defaultRole="reviewer"
        inviteAction={async ({ email, role }) =>
          inviteReviewCollaborator({
            reviewProjectId: project.id,
            email,
            role: role as WorkbenchCollaboratorRole,
          })
        }
      />
    </section>
  );
}

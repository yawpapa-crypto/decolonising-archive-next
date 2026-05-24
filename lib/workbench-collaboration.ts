/** Workbench project collaboration helpers (Stage 1). */

export const WORKBENCH_MAX_COLLABORATORS = 10;

export const WORKBENCH_COLLABORATOR_INVITE_ROLES = ["editor", "viewer"] as const;
export type WorkbenchCollaboratorInviteRole = (typeof WORKBENCH_COLLABORATOR_INVITE_ROLES)[number];

export type WorkbenchProjectAccessRole = "owner" | "editor" | "viewer" | "none";

export function normalizeCollaboratorEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isActiveCollaboratorStatus(status: string | null | undefined): boolean {
  const value = (status ?? "accepted").toLowerCase();
  return !["removed", "declined", "suspended"].includes(value);
}

export function isAcceptedCollaboratorStatus(status: string | null | undefined): boolean {
  const value = (status ?? "accepted").toLowerCase();
  return ["accepted", "active"].includes(value) || Boolean(status && status === "pending" && false);
}

export function displayCollaboratorStatus(row: {
  user_id: string | null;
  status?: string | null;
}): string {
  const raw = (row.status ?? "").toLowerCase();
  if (raw === "removed") return "removed";
  if (raw === "declined") return "declined";
  if (row.user_id || raw === "accepted" || raw === "active") return "accepted";
  if (raw === "invited" || raw === "pending") return "invited";
  return raw || "invited";
}

export function displayCollaboratorStatusLabel(status: string): string {
  if (status === "invited") return "Invited";
  if (status === "accepted") return "Accepted";
  if (status === "declined") return "Declined";
  if (status === "removed") return "Removed";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function countsTowardCollaboratorLimit(status: string | null | undefined): boolean {
  const value = displayCollaboratorStatus({ user_id: null, status });
  return value === "invited" || value === "accepted";
}

export function workbenchInviteUrl(collaboratorId: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/my/workbench/invite/${collaboratorId}`;
  }
  return `/my/workbench/invite/${collaboratorId}`;
}

export type WorkbenchProjectPermissions = {
  role: WorkbenchProjectAccessRole;
  canEdit: boolean;
  canManageCollaborators: boolean;
  canInviteCollaborators: boolean;
  canDeleteProject: boolean;
  canRenameProject: boolean;
};

export function deriveProjectPermissions(
  role: WorkbenchProjectAccessRole,
): WorkbenchProjectPermissions {
  return {
    role,
    canEdit: canEditWorkbenchProject(role),
    canManageCollaborators: canManageWorkbenchCollaborators(role),
    canInviteCollaborators: role === "owner",
    canDeleteProject: role === "owner",
    canRenameProject: role === "owner",
  };
}

export function resolveProjectAccessRole(input: {
  projectId: string | null | undefined;
  projectOwnerId: string | null | undefined;
  currentUserId: string | null | undefined;
  membershipRole?: string | null;
  isProjectMember?: boolean;
}): WorkbenchProjectAccessRole {
  if (!input.projectId || !input.currentUserId) return "none";
  if (input.projectOwnerId && input.projectOwnerId === input.currentUserId) return "owner";
  const role = input.membershipRole?.toLowerCase();
  if (role === "editor") return "editor";
  if (role === "viewer" || role === "reviewer") return "viewer";
  if (input.isProjectMember) return "viewer";
  return "none";
}

export function canEditWorkbenchProject(role: WorkbenchProjectAccessRole): boolean {
  return role === "owner" || role === "editor";
}

export function canManageWorkbenchCollaborators(role: WorkbenchProjectAccessRole): boolean {
  return role === "owner";
}

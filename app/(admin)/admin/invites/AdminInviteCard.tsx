"use client";

import { useState } from "react";
import CopyInviteLinkButton from "./CopyInviteLinkButton";
import {
  deleteAdminInvite,
  resendAdminInvite,
  revokeAdminInvite,
  updateAdminInvite,
} from "./actions";

type AdminInviteCardProps = {
  invite: {
    id: string;
    email: string | null;
    role: "admin" | "curator";
    label: string | null;
    used_at: string | null;
    revoked_at: string | null;
    expires_at: string | null;
    resent_at: string | null;
  };
  link: string;
  status: string;
  statusClassName: string;
  expiresLabel: string;
  resentLabel: string | null;
  expiresValue: string;
  canEdit: boolean;
};

export default function AdminInviteCard({
  invite,
  link,
  status,
  statusClassName,
  expiresLabel,
  resentLabel,
  expiresValue,
  canEdit,
}: AdminInviteCardProps) {
  const [editing, setEditing] = useState(false);
  const isAccepted = Boolean(invite.used_at);
  const isRevoked = Boolean(invite.revoked_at);
  const actionsDisabled = isAccepted || isRevoked;

  return (
    <article className="admin-invite-card">
      <div className="admin-invite-main">
        <div className="admin-invite-primary">
          <strong>{invite.email || invite.label || "Open invite"}</strong>
          <p className="admin-invite-url" title={link}>
            {link}
          </p>
          <p className="admin-muted">Expires: {expiresLabel}</p>
          {resentLabel ? <p className="admin-muted">Last resent: {resentLabel}</p> : null}
        </div>

        <div className="admin-invite-badges" aria-label="Invite role and status">
          <span className="admin-status-badge is-role">{invite.role}</span>
          <span className={`admin-status-badge is-${statusClassName}`}>{status}</span>
        </div>

        <div className="admin-invite-actions">
          <CopyInviteLinkButton link={link} />
          <form action={resendAdminInvite}>
            <input type="hidden" name="invite_id" value={invite.id} />
            <button
              type="submit"
              className="admin-small-button admin-secondary-button"
              disabled={actionsDisabled}
            >
              Resend
            </button>
          </form>
          <button
            type="button"
            className="admin-small-button admin-secondary-button"
            disabled={!canEdit}
            aria-expanded={editing}
            onClick={() => setEditing((open) => !open)}
          >
            Edit
          </button>
          <form action={revokeAdminInvite}>
            <input type="hidden" name="invite_id" value={invite.id} />
            <button
              type="submit"
              className="admin-small-button admin-danger-button"
              disabled={actionsDisabled}
            >
              Revoke
            </button>
          </form>
          <form action={deleteAdminInvite}>
            <input type="hidden" name="invite_id" value={invite.id} />
            <button
              type="submit"
              className="admin-small-button admin-danger-button"
              disabled={actionsDisabled}
            >
              Delete
            </button>
          </form>
        </div>
      </div>

      {editing ? (
        <div className="admin-invite-edit-panel">
          <form action={updateAdminInvite} className="admin-invite-edit-form">
            <input type="hidden" name="invite_id" value={invite.id} />
            <label className="admin-field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                defaultValue={invite.email ?? ""}
                disabled={!canEdit}
              />
            </label>
            <label className="admin-field">
              <span>Role</span>
              <select name="role" defaultValue={invite.role} disabled={!canEdit}>
                <option value="admin">Admin</option>
                <option value="curator">Curator</option>
              </select>
            </label>
            <label className="admin-field">
              <span>Label</span>
              <input name="label" defaultValue={invite.label ?? ""} disabled={!canEdit} />
            </label>
            <label className="admin-field">
              <span>Expires</span>
              <input
                type="date"
                name="expires_at"
                defaultValue={expiresValue}
                disabled={!canEdit}
              />
            </label>
            <div className="admin-invite-edit-actions">
              <button
                type="submit"
                className="admin-small-button admin-primary-button"
                disabled={!canEdit}
              >
                Save
              </button>
              <button
                type="button"
                className="admin-small-button admin-secondary-button"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </article>
  );
}

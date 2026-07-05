"use client";

import { useState } from "react";
import { deleteUserAccount, updateUserStatus } from "./actions";

type Props = {
  userId: string;
  email: string | null;
  status: "active" | "blocked";
  isSelf?: boolean;
};

export default function AdminUserRowActions({ userId, email, status, isSelf }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isBlocked = status === "blocked";

  if (isSelf) {
    return (
      <div className="admin-user-actions">
        <p className="admin-user-actions__hint">Your account</p>
      </div>
    );
  }

  return (
    <div className="admin-user-actions">
      <form action={updateUserStatus} className="admin-user-actions__block">
        <input type="hidden" name="user_id" value={userId} />
        <input type="hidden" name="status" value={isBlocked ? "active" : "blocked"} />
        <button
          type="submit"
          className={
            isBlocked
              ? "admin-small-button admin-secondary-button"
              : "admin-small-button admin-danger-button admin-danger-button--solid"
          }
        >
          {isBlocked ? "Unblock" : "Block"}
        </button>
      </form>

      {!confirmOpen ? (
        <button
          type="button"
          className="admin-small-button admin-danger-button admin-danger-button--outline"
          onClick={() => setConfirmOpen(true)}
        >
          Delete…
        </button>
      ) : (
        <form action={deleteUserAccount} className="admin-user-actions__delete">
          <input type="hidden" name="user_id" value={userId} />
          <label className="admin-user-actions__delete-label">
            <span>Type DELETE to remove {email ?? "this user"}</span>
            <input
              className="admin-filter admin-delete-confirm"
              name="confirm"
              placeholder="DELETE"
              autoComplete="off"
              aria-label={`Confirm deleting ${email ?? userId}`}
            />
          </label>
          <div className="admin-user-actions__delete-buttons">
            <button
              type="button"
              className="admin-small-button admin-secondary-button"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="admin-small-button admin-danger-button admin-danger-button--solid"
            >
              Delete
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

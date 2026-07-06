"use client";

import {
  deleteReadingList,
  deleteReadingListItem,
} from "@/app/(app)/workspace/actions";
import ConfirmSubmitButton from "@/app/(app)/workspace/ConfirmSubmitButton";

type DeleteReadingListFormProps = {
  listId: string;
};

type RemoveReadingListItemFormProps = {
  itemId: string;
};

export function DeleteReadingListForm({ listId }: DeleteReadingListFormProps) {
  return (
    <form action={deleteReadingList}>
      <input type="hidden" name="id" value={listId} />
      <input type="hidden" name="redirectTo" value="/my/lists" />
      <input type="hidden" name="confirm" value="yes" />
      <ConfirmSubmitButton
        className="workspace-link workspace-link-danger"
        message="Delete this reading list? This cannot be undone."
        pendingLabel="Deleting…"
      >
        Delete list
      </ConfirmSubmitButton>
    </form>
  );
}

export function RemoveReadingListItemForm({
  itemId,
}: RemoveReadingListItemFormProps) {
  return (
    <form action={deleteReadingListItem}>
      <input type="hidden" name="id" value={itemId} />
      <input type="hidden" name="redirectTo" value="/my/lists" />
      <ConfirmSubmitButton
        className="workspace-link workspace-link-danger"
        message="Remove this record from the reading list?"
        pendingLabel="Removing…"
      >
        Remove
      </ConfirmSubmitButton>
    </form>
  );
}

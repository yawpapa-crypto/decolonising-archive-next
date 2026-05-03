"use client";

import {
  deleteReadingList,
  deleteReadingListItem,
} from "@/app/(app)/workspace/actions";

type DeleteReadingListFormProps = {
  listId: string;
};

type RemoveReadingListItemFormProps = {
  itemId: string;
};

export function DeleteReadingListForm({ listId }: DeleteReadingListFormProps) {
  return (
    <form
      action={deleteReadingList}
      onSubmit={(event) => {
        if (!window.confirm("Delete this reading list? This cannot be undone.")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={listId} />
      <input type="hidden" name="redirectTo" value="/my/lists" />
      <input type="hidden" name="confirm" value="yes" />
      <button type="submit" className="workspace-link workspace-link-danger">
        Delete list
      </button>
    </form>
  );
}

export function RemoveReadingListItemForm({
  itemId,
}: RemoveReadingListItemFormProps) {
  return (
    <form
      action={deleteReadingListItem}
      onSubmit={(event) => {
        if (!window.confirm("Remove this record from the reading list?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={itemId} />
      <input type="hidden" name="redirectTo" value="/my/lists" />
      <button type="submit" className="workspace-link workspace-link-danger">
        Remove
      </button>
    </form>
  );
}

import Link from "next/link";
import {
  formatWorkspaceDate,
  getMemberWorkspaceData,
  workspaceRecordTitle,
} from "@/src/lib/member-workspace";
import { getRecordHref, isExternalHref } from "@/src/lib/record-links";
import { deleteBookmark, updateBookmark } from "@/app/(app)/workspace/actions";

export default async function WorkbenchSavedRecordsPage() {
  const { bookmarks, recordsById } = await getMemberWorkspaceData("/my/workbench/saved-records");

  return (
    <>
      <p className="workbench-kicker">Saved records</p>
      <h1 className="workbench-page-title">Bookmarks</h1>
      <p className="workbench-lede">
        Records saved from the library. Add them to a Workbench project from the library card
        or from each project page.
      </p>
      <section className="workbench-panel">
        <ul className="workbench-list">
          {bookmarks.map((b) => {
            const openHref = getRecordHref(b);
            return (
              <li key={b.id}>
                <strong>{b.record_title || workspaceRecordTitle(recordsById, b.record_id)}</strong>
                <div style={{ fontSize: 12, color: "#525252", marginTop: 4 }}>
                  {formatWorkspaceDate(b.created_at)}
                </div>
                <form action={updateBookmark} style={{ marginTop: 10 }}>
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="redirectTo" value="/my/workbench/saved-records" />
                  <input className="workbench-input" name="note" defaultValue={b.note ?? ""} placeholder="Note" />
                  <button type="submit" className="workbench-btn workbench-btn-secondary" style={{ marginTop: 8 }}>
                    Save note
                  </button>
                </form>
                <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {openHref ? (
                    <a
                      className="workbench-link"
                      href={openHref}
                      {...(isExternalHref(openHref) ? { target: "_blank", rel: "noreferrer" } : {})}
                    >
                      Open record
                    </a>
                  ) : null}
                  <Link className="workbench-link" href="/my/workbench/projects">
                    Add to project →
                  </Link>
                  <form action={deleteBookmark} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="confirm" value="yes" />
                    <input type="hidden" name="redirectTo" value="/my/workbench/saved-records" />
                    <button type="submit" className="workbench-link" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
        {!bookmarks.length ? <p>No bookmarks yet.</p> : null}
      </section>
    </>
  );
}

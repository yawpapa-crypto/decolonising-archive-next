import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/src/components/layout/PageShell";
import { createClient } from "@/src/lib/supabase/server";
import { readRecords } from "@/lib/records";
import { workspaceRecordTitle } from "@/src/lib/member-workspace";
import CopyRecordLinkButton from "@/app/(app)/my/lists/CopyRecordLinkButton";
import { getRecordHref, isExternalHref } from "@/src/lib/record-links";

type PageProps = {
  params: Promise<{ id: string }>;
};

type ReadingListItemRow = {
  id: string;
  record_id: string;
  record_title: string | null;
  record_source: string | null;
  record_source_url: string | null;
  record_type: string | null;
  record_metadata: Record<string, unknown> | null;
  added_at: string;
};

export default async function CommunityReadingListPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: list, error } = await supabase
    .from("reading_lists")
    .select("id, title, description, is_public, created_at")
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle();

  if (error || !list) notFound();

  const { data: attachment } = await supabase
    .from("community_post_attachments")
    .select("id")
    .eq("attachment_type", "reading_list")
    .eq("reading_list_id", id)
    .limit(1)
    .maybeSingle();

  if (!attachment) {
    const { data: legacyShare } = await supabase
      .from("submitted_content")
      .select("id")
      .eq("content_type", "shared_reading_list")
      .eq("related_reading_list_id", id)
      .in("review_status", ["accepted", "approved", "resolved"])
      .limit(1)
      .maybeSingle();
    if (!legacyShare) notFound();
  }

  const itemsResult = await supabase
    .from("reading_list_items")
    .select(
      "id, record_id, record_title, record_source, record_source_url, record_type, record_metadata, added_at",
    )
    .eq("reading_list_id", id)
    .order("added_at", { ascending: false });
  const recordsById = new Map((await readRecords()).map((record) => [record.id, record]));
  const items = (itemsResult.data ?? []) as ReadingListItemRow[];

  return (
    <PageShell>
      <main className="community-page community-reading-list-page">
        <section className="community-header community-card">
          <div>
            <p className="community-eyebrow">Community reading list</p>
            <h1>{list.title}</h1>
            <p>{list.description || "No description added."}</p>
          </div>
          <div className="community-header-actions">
            <span className="community-status-pill is-public">Public</span>
            <Link href="/community/reading-lists" className="community-button community-button-secondary">
              Shared lists
            </Link>
          </div>
        </section>

        <section className="community-card">
          <div className="community-card-header">
            <p className="community-eyebrow">Records</p>
            <h2>{items.length} {items.length === 1 ? "record" : "records"}</h2>
          </div>
          <div className="community-submission-list">
            {items.length ? (
              items.map((item) => {
                const title = item.record_title || workspaceRecordTitle(recordsById, item.record_id);
                const href = getRecordHref(item);
                const sourceUrl = item.record_source_url?.trim() || "";
                const showSourceLink = Boolean(sourceUrl) && (!isExternalHref(href || "") || sourceUrl !== href);
                return (
                  <article className="community-submission-item" key={item.id}>
                    <div>
                      <div className="community-submission-topline">
                        <strong>{title}</strong>
                        {item.record_type ? <span className="community-status-pill">{item.record_type}</span> : null}
                      </div>
                      <div className="community-submission-meta">
                        {item.record_source ? <span>{item.record_source}</span> : null}
                        <span>Record {item.record_id}</span>
                      </div>
                      <div className="community-record-actions community-reading-list-item-actions">
                        <div className="community-record-actions-row">
                          {href ? (
                            <a
                              href={href}
                              className="community-button community-button-secondary"
                              {...(isExternalHref(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                            >
                              Open record
                            </a>
                          ) : (
                            <span className="community-button community-button-secondary community-button-disabled" aria-disabled>
                              Record link unavailable
                            </span>
                          )}
                          <CopyRecordLinkButton
                            recordHref={href}
                            recordTitle={title}
                            className="community-button community-button-secondary"
                            disabledClassName="community-button community-button-secondary community-button-disabled"
                          />
                        </div>
                        {showSourceLink ? (
                          <a
                            href={sourceUrl}
                            className="community-button community-button-secondary"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open source
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="community-empty">This shared reading list has no records yet.</div>
            )}
          </div>
        </section>
      </main>
    </PageShell>
  );
}

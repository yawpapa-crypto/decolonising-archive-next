import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/src/components/layout/PageShell";
import { requireMember } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";
import { readRecords } from "@/lib/records";
import { workspaceRecordTitle } from "@/src/lib/member-workspace";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ReadingListItemRow = {
  id: string;
  record_id: string;
  record_title: string | null;
  record_source: string | null;
  record_source_url: string | null;
  record_type: string | null;
  added_at: string;
};

export default async function CommunityReadingListPage({ params }: PageProps) {
  await requireMember("/community");
  const { id } = await params;
  const supabase = await createClient();

  const { data: list, error } = await supabase
    .from("reading_lists")
    .select("id, title, description, is_public, created_at")
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle();

  if (error || !list) notFound();

  const approvedShare = await supabase
    .from("submitted_content")
    .select("id")
    .eq("content_type", "shared_reading_list")
    .eq("related_reading_list_id", id)
    .in("review_status", ["accepted", "approved", "resolved"])
    .maybeSingle();

  if (approvedShare.error || !approvedShare.data) notFound();

  const itemsResult = await supabase
    .from("reading_list_items")
    .select(
      "id, record_id, record_title, record_source, record_source_url, record_type, added_at",
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
            <Link href="/community" className="community-button community-button-secondary">
              Back to community
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
                const title =
                  item.record_title || workspaceRecordTitle(recordsById, item.record_id);
                return (
                  <article className="community-submission-item" key={item.id}>
                    <div>
                      <div className="community-submission-topline">
                        <strong>{title}</strong>
                        {item.record_type ? (
                          <span className="community-status-pill">{item.record_type}</span>
                        ) : null}
                      </div>
                      <div className="community-submission-meta">
                        {item.record_source ? <span>{item.record_source}</span> : null}
                        <span>Record {item.record_id}</span>
                      </div>
                      <div className="community-record-actions">
                        <Link
                          href={`/#/record/${encodeURIComponent(item.record_id)}`}
                          className="community-button community-button-secondary"
                        >
                          Open record
                        </Link>
                        {item.record_source_url ? (
                          <a
                            href={item.record_source_url}
                            className="community-button community-button-secondary"
                            target="_blank"
                            rel="noreferrer"
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

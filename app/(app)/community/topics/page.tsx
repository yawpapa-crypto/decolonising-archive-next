import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import { getCommunityTopics } from "@/src/lib/community-reading-commons";

export default async function CommunityTopicsPage() {
  const topics = await getCommunityTopics();

  return (
    <PageShell>
      <main className="community-page">
        <section className="community-header community-card">
          <div>
            <p className="community-eyebrow">Community topics</p>
            <h1>Trace the themes people are reading with.</h1>
            <p>
              Topics are generated from member posts and keep the Commons organised around
              research questions, sources, places, methods, and teaching paths.
            </p>
          </div>
          <Link href="/community" className="community-button community-button-secondary">
            Back to Commons
          </Link>
        </section>

        <section className="community-topic-grid">
          {topics.length ? (
            topics.map((topic) => (
              <Link
                key={topic.id}
                href={`/community/topics?tag=${topic.slug}`}
                className="community-topic-card"
              >
                <span className="community-eyebrow">Topic</span>
                <strong>{topic.label}</strong>
                <p>
                  {topic.postCount} {topic.postCount === 1 ? "thread" : "threads"}
                </p>
              </Link>
            ))
          ) : (
            <div className="community-empty">No topics yet. Add tags when sharing a post.</div>
          )}
        </section>
      </main>
    </PageShell>
  );
}

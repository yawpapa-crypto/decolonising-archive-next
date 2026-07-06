import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/src/components/layout/PageShell";
import { getCurrentProfile } from "@/src/lib/auth";
import {
  getCommunityFeed,
  getCommunitySpaces,
  getCommunityTopics,
  getMyCommunitySpaces,
} from "@/src/lib/community-reading-commons";
import CommunityPostCard from "../CommunityPostCard";
import CommunityShell from "../CommunityShell";

type SearchParams = Promise<{ tag?: string }>;

export default async function CommunityTopicsPage({ searchParams }: { searchParams: SearchParams }) {
  const [sp, profile] = await Promise.all([searchParams, getCurrentProfile()]);
  const userId = profile?.id ?? null;
  const tagSlug = sp.tag?.trim() || null;

  const [topics, spaces, mySpaces] = await Promise.all([
    getCommunityTopics(),
    getCommunitySpaces(userId),
    userId ? getMyCommunitySpaces(userId) : Promise.resolve([]),
  ]);

  const activeTopic = tagSlug ? topics.find((topic) => topic.slug === tagSlug) : null;
  if (tagSlug && !activeTopic) notFound();

  const posts = tagSlug ? await getCommunityFeed(userId, { tagSlug }) : [];

  return (
    <PageShell>
      <main className="community-page community-commons">
        <section className="community-header community-card">
          <div>
            <p className="community-eyebrow">Community topics</p>
            <h1>{activeTopic ? `#${activeTopic.label}` : "Trace the themes people are reading with."}</h1>
            <p>
              {activeTopic
                ? `${activeTopic.postCount} ${activeTopic.postCount === 1 ? "thread" : "threads"} tagged with this theme.`
                : "Topics are generated from member posts and keep the Commons organised around research questions, sources, places, methods, and teaching paths."}
            </p>
          </div>
          <Link href="/community" className="community-button community-button-secondary">
            Back to Commons
          </Link>
        </section>

        {activeTopic ? (
          <CommunityShell spaces={spaces} mySpaces={mySpaces} signedIn={Boolean(profile)}>
            <section className="community-feed community-feed--wide">
              {posts.length ? (
                posts.map((post) => (
                  <CommunityPostCard key={post.id} post={post} signedIn={Boolean(profile)} />
                ))
              ) : (
                <div className="community-empty">No posts with this topic yet.</div>
              )}
            </section>
          </CommunityShell>
        ) : (
          <CommunityShell spaces={spaces} mySpaces={mySpaces} signedIn={Boolean(profile)}>
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
          </CommunityShell>
        )}
      </main>
    </PageShell>
  );
}

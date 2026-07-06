import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import { getCurrentProfile } from "@/src/lib/auth";
import { getCommunityReadingListPosts } from "@/src/lib/community-reading-commons";
import CommunityPostCard from "../CommunityPostCard";

export default async function CommunityReadingListsPage() {
  const profile = await getCurrentProfile();
  const posts = await getCommunityReadingListPosts(profile?.id ?? null);

  return (
    <PageShell>
      <main className="community-page">
        <section className="community-header community-card">
          <div>
            <p className="community-eyebrow">Community reading lists</p>
            <h1>Shared paths through the archive.</h1>
            <p>
              Member-curated reading lists for teaching, review, project building, and
              reflective archive practice.
            </p>
          </div>
          <div className="community-header-actions">
            <Link href="/community" className="community-button community-button-secondary">
              Back to Commons
            </Link>
            <Link href="/my/lists" className="community-button community-button-primary">
              Publish a list
            </Link>
          </div>
        </section>

        <section className="community-feed community-feed--wide">
          {posts.length ? (
            posts.map((post) => (
              <CommunityPostCard key={post.id} post={post} signedIn={Boolean(profile)} />
            ))
          ) : (
            <div className="community-empty">
              No reading lists have been shared through the Commons yet.
            </div>
          )}
        </section>
      </main>
    </PageShell>
  );
}

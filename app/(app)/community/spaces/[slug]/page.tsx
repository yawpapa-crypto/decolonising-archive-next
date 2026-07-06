import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/src/components/layout/PageShell";
import { getCurrentProfile } from "@/src/lib/auth";
import {
  getCommunityAttachmentOptions,
  getCommunityFeed,
  getCommunitySpaceBySlug,
  getCommunitySpaces,
  getMyCommunitySpaces,
  type CommunityFeedView,
} from "@/src/lib/community-reading-commons";
import { joinCommunitySpace, leaveCommunitySpace } from "../../actions";
import CommunityCreatePostForm from "../../CommunityCreatePostForm";
import CommunityFeedTabs from "../../CommunityFeedTabs";
import CommunityPostCard from "../../CommunityPostCard";
import CommunityShell from "../../CommunityShell";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ view?: string; updated?: string; error?: string }>;

const FEED_VIEWS = new Set<CommunityFeedView>([
  "for-you",
  "recent",
  "questions",
  "sources",
  "lists",
]);

function parseView(value: string | undefined): CommunityFeedView {
  return FEED_VIEWS.has(value as CommunityFeedView) ? (value as CommunityFeedView) : "for-you";
}

export default async function CommunitySpacePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ slug }, sp, profile] = await Promise.all([params, searchParams, getCurrentProfile()]);
  const userId = profile?.id ?? null;
  const view = parseView(sp.view);

  const space = await getCommunitySpaceBySlug(slug, userId);
  if (!space) notFound();

  const [posts, options, spaces, mySpaces] = await Promise.all([
    getCommunityFeed(userId, { view, spaceId: space.id }),
    getCommunityAttachmentOptions(userId),
    getCommunitySpaces(userId),
    userId ? getMyCommunitySpaces(userId) : Promise.resolve([]),
  ]);

  const sidebar = (
    <>
      <div className="community-card community-sidebar-panel community-space-panel">
        <div className="community-space-panel__icon" aria-hidden="true">
          {space.emoji}
        </div>
        <h2>{space.name}</h2>
        {space.description ? <p className="community-help">{space.description}</p> : null}
        <div className="community-space-stats">
          <span>{space.member_count} member{space.member_count === 1 ? "" : "s"}</span>
          <span>{space.post_count} post{space.post_count === 1 ? "" : "s"}</span>
        </div>
        {profile ? (
          space.current_user_joined ? (
            <form action={leaveCommunitySpace}>
              <input type="hidden" name="space_id" value={space.id} />
              <input type="hidden" name="return_to" value={`/community/spaces/${space.slug}`} />
              <button type="submit" className="community-button community-button-secondary community-button-block">
                Leave circle
              </button>
            </form>
          ) : (
            <form action={joinCommunitySpace}>
              <input type="hidden" name="space_id" value={space.id} />
              <input type="hidden" name="return_to" value={`/community/spaces/${space.slug}`} />
              <button type="submit" className="community-button community-button-primary community-button-block">
                Join circle
              </button>
            </form>
          )
        ) : (
          <Link href={`/auth/sign-in?next=/community/spaces/${space.slug}`} className="community-button community-button-primary community-button-block">
            Sign in to join
          </Link>
        )}
      </div>

      <div className="community-card community-sidebar-panel community-care-panel">
        <p className="community-eyebrow">Circle norms</p>
        <p>
          Read with care. Name uncertainty, cite sources, and respect that some material needs community context.
        </p>
        <Link href="/about" className="community-sidebar-link">
          Read guidelines
        </Link>
      </div>
    </>
  );

  return (
    <PageShell>
      <main className="community-page community-commons">
        <section className="community-hero community-card community-hero--compact community-space-hero">
          <div>
            <p className="community-eyebrow">Reading circle</p>
            <h1>
              <span aria-hidden="true">{space.emoji}</span> {space.name}
            </h1>
            <p>{space.description || "A space for archive members to read and discuss together."}</p>
          </div>
          <div className="community-header-actions">
            <Link href="/community/spaces" className="community-button community-button-secondary">
              All circles
            </Link>
            <Link href="/community" className="community-button community-button-secondary">
              Commons home
            </Link>
          </div>
        </section>

        {sp.updated ? <div className="community-success">{sp.updated}</div> : null}
        {sp.error ? <div className="community-error">{sp.error}</div> : null}

        <CommunityShell
          spaces={spaces}
          mySpaces={mySpaces}
          activeSpaceSlug={space.slug}
          activeView={view}
          signedIn={Boolean(profile)}
          sidebar={sidebar}
        >
          <div className="community-feed">
            {profile ? (
              <CommunityCreatePostForm
                signedIn
                options={options}
                spaces={spaces}
                defaultSpaceId={space.id}
              />
            ) : null}

            <div className="community-section-heading">
              <div>
                <p className="community-eyebrow">{space.name}</p>
                <h2>Circle discussions</h2>
              </div>
              <CommunityFeedTabs activeView={view} spaceSlug={space.slug} />
            </div>

            {posts.length ? (
              posts.map((post) => (
                <CommunityPostCard key={post.id} post={post} signedIn={Boolean(profile)} />
              ))
            ) : (
              <div className="community-empty">
                {space.current_user_joined
                  ? "Be the first to post in this circle. Share a source, question, or reading path."
                  : "No posts in this circle yet. Join to follow discussions and share your own reading."}
              </div>
            )}
          </div>
        </CommunityShell>
      </main>
    </PageShell>
  );
}

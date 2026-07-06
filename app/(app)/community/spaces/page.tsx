import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import { getCurrentProfile } from "@/src/lib/auth";
import { getCommunitySpaces, getMyCommunitySpaces } from "@/src/lib/community-reading-commons";
import CommunityShell from "../CommunityShell";

export default async function CommunitySpacesPage() {
  const profile = await getCurrentProfile();
  const userId = profile?.id ?? null;
  const [spaces, mySpaces] = await Promise.all([
    getCommunitySpaces(userId),
    userId ? getMyCommunitySpaces(userId) : Promise.resolve([]),
  ]);

  return (
    <PageShell>
      <main className="community-page community-commons">
        <section className="community-hero community-card community-hero--compact">
          <div>
            <p className="community-eyebrow">Reading circles</p>
            <h1>Find your reading community</h1>
            <p>
              Circles are small groups for focused discussion — teaching, methods, place-based reading, and more.
            </p>
          </div>
          <div className="community-header-actions">
            <Link href="/community" className="community-button community-button-secondary">
              Back to Commons
            </Link>
            {profile ? (
              <Link href="/community/spaces/new" className="community-button community-button-primary">
                Start a circle
              </Link>
            ) : null}
          </div>
        </section>

        <CommunityShell
          spaces={spaces}
          mySpaces={mySpaces}
          signedIn={Boolean(profile)}
        >
          <section className="community-space-grid">
            {spaces.map((space) => (
              <Link key={space.id} href={`/community/spaces/${space.slug}`} className="community-space-card">
                <span className="community-space-card__emoji" aria-hidden="true">
                  {space.emoji}
                </span>
                <div>
                  <strong>{space.name}</strong>
                  <p>{space.description || "A reading circle in the Commons."}</p>
                  <span className="community-space-card__meta">
                    {space.member_count} member{space.member_count === 1 ? "" : "s"} · {space.post_count} post
                    {space.post_count === 1 ? "" : "s"}
                    {space.current_user_joined ? " · Joined" : ""}
                  </span>
                </div>
              </Link>
            ))}
            {!spaces.length ? (
              <div className="community-empty">Reading circles will appear here once they are created.</div>
            ) : null}
          </section>
        </CommunityShell>
      </main>
    </PageShell>
  );
}

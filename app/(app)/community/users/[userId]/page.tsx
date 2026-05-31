import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";

type Params = Promise<{ userId: string }>;

type PublicProfile = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  short_bio: string | null;
  affiliation: string | null;
  organisation: string | null;
  website: string | null;
  profile_visibility: string | null;
  created_at: string | null;
};

type PublicPost = {
  id: string;
  title: string;
  body: string;
  post_type: string;
  created_at: string;
  comment_count: number;
};

function fmt(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-AU", { dateStyle: "medium" }).format(new Date(value));
}

function excerpt(body: string) {
  const s = body.replace(/\s+/g, " ").trim();
  return s.length > 300 ? `${s.slice(0, 297)}…` : s;
}

function initials(profile: PublicProfile): string {
  const name = profile.display_name || profile.full_name || profile.email || "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function displayName(profile: PublicProfile): string {
  return profile.display_name || profile.full_name || "Archive member";
}

export default async function CommunityUserProfilePage({ params }: { params: Params }) {
  const { userId } = await params;

  if (!userId || userId.length < 8) notFound();

  const supabase = await createClient();

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, display_name, full_name, avatar_url, short_bio, affiliation, organisation, website, profile_visibility, created_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profileData) notFound();

  const profile = profileData as PublicProfile;

  const visibility = profile.profile_visibility;

  if (visibility === "private") {
    return (
      <main className="community-layout">
        <div className="community-profile-hidden">
          <p className="community-muted">This profile is not public.</p>
          <Link href="/community" className="community-button community-button-secondary">
            Back to community
          </Link>
        </div>
      </main>
    );
  }

  // Fetch public posts by this user
  const { data: postsData } = await supabase
    .from("community_posts")
    .select("id, title, body, post_type, created_at, comment_count")
    .eq("user_id", userId)
    .eq("status", "published")
    .in("visibility", ["public", "community"])
    .order("created_at", { ascending: false })
    .limit(20);

  const posts = (postsData ?? []) as PublicPost[];

  // Fetch shared reading lists (community_posts of type reading_list)
  const sharedLists = posts.filter((p) => p.post_type === "reading_list");
  const otherPosts = posts.filter((p) => p.post_type !== "reading_list");

  const name = displayName(profile);

  return (
    <main className="community-layout">
      <div className="community-profile-page">
        {/* Profile header */}
        <header className="community-profile-header">
          <div className="community-profile-avatar" aria-hidden="true">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={name} width={64} height={64} />
            ) : (
              <span>{initials(profile)}</span>
            )}
          </div>
          <div className="community-profile-meta">
            <h1 className="community-profile-name">{name}</h1>
            {profile.affiliation || profile.organisation ? (
              <p className="community-muted">
                {[profile.affiliation, profile.organisation].filter(Boolean).join(", ")}
              </p>
            ) : null}
            {profile.short_bio ? (
              <p className="community-profile-bio">{profile.short_bio}</p>
            ) : null}
            {profile.website ? (
              <a
                href={profile.website}
                className="community-profile-website"
                target="_blank"
                rel="noopener noreferrer"
              >
                {profile.website.replace(/^https?:\/\//, "")}
              </a>
            ) : null}
            <p className="community-muted community-profile-joined">
              Member since {fmt(profile.created_at)}
            </p>
          </div>
        </header>

        {/* Stats */}
        <div className="community-profile-stats">
          <div className="community-profile-stat">
            <strong>{posts.length}</strong>
            <span>Posts</span>
          </div>
          <div className="community-profile-stat">
            <strong>{sharedLists.length}</strong>
            <span>Reading lists</span>
          </div>
        </div>

        {/* Posts */}
        <section className="community-profile-section">
          <h2>Community posts</h2>
          {otherPosts.length === 0 ? (
            <p className="community-muted">No public posts yet.</p>
          ) : (
            <ul className="community-profile-post-list">
              {otherPosts.map((post) => (
                <li key={post.id} className="community-profile-post-item">
                  <Link href={`/community/posts/${post.id}`} className="community-profile-post-title">
                    {post.title}
                  </Link>
                  <p className="community-profile-post-excerpt">{excerpt(post.body)}</p>
                  <span className="community-muted">
                    {fmt(post.created_at)} · {post.comment_count} comment
                    {post.comment_count !== 1 ? "s" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {sharedLists.length > 0 ? (
          <section className="community-profile-section">
            <h2>Shared reading lists</h2>
            <ul className="community-profile-post-list">
              {sharedLists.map((post) => (
                <li key={post.id} className="community-profile-post-item">
                  <Link
                    href={`/community/posts/${post.id}`}
                    className="community-profile-post-title"
                  >
                    {post.title}
                  </Link>
                  <span className="community-muted">{fmt(post.created_at)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="community-profile-footer">
          <Link href="/community" className="community-button community-button-secondary">
            ← Back to community
          </Link>
        </div>
      </div>
    </main>
  );
}

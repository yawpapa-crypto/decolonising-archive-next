import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import { getCurrentProfile } from "@/src/lib/auth";
import { createCommunitySpace } from "../../actions";

export default async function NewCommunitySpacePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <PageShell>
        <main className="community-page">
          <div className="community-empty">
            <p>Sign in to start a reading circle.</p>
            <Link href="/auth/sign-in?next=/community/spaces/new" className="community-button community-button-primary">
              Sign in
            </Link>
          </div>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <main className="community-page community-commons">
        <section className="community-header community-card">
          <div>
            <p className="community-eyebrow">New reading circle</p>
            <h1>Start a focused space for archive reading</h1>
            <p>
              Circles work best with a clear topic — a method, region, teaching context, or research question.
            </p>
          </div>
          <Link href="/community/spaces" className="community-button community-button-secondary">
            Cancel
          </Link>
        </section>

        <form action={createCommunitySpace} className="community-form community-card community-space-form">
          <div className="community-field-grid">
            <div className="community-field">
              <label htmlFor="space-name">Circle name</label>
              <input id="space-name" name="name" required maxLength={80} placeholder="e.g. Pacific archives reading group" />
            </div>
            <div className="community-field">
              <label htmlFor="space-emoji">Emoji</label>
              <input id="space-emoji" name="emoji" maxLength={4} defaultValue="📖" />
            </div>
          </div>

          <div className="community-field">
            <label htmlFor="space-description">Description</label>
            <textarea
              id="space-description"
              name="description"
              rows={4}
              maxLength={500}
              placeholder="What will members read and discuss here?"
            />
          </div>

          <div className="community-composer__actions">
            <span>Public circles are visible to all archive members.</span>
            <button type="submit" className="community-button community-button-primary">
              Create circle
            </button>
          </div>
        </form>
      </main>
    </PageShell>
  );
}

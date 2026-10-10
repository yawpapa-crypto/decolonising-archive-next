import { notFound } from "next/navigation";
import Shell from "../Shell";
import FollowingFeed from "../FollowingFeed";
import PublicArchive from "../PublicArchive";
import FollowButton from "../FollowButton";
import { loadCatalogueRecords } from "@/lib/catalogue/store";
import { publicRecords, type Activity } from "@/lib/following/server";
export const dynamic = "force-dynamic";
/** Development-only visual fixture. No database rows or invented public curator are published. */
export default function VisualCheck() {
  if (process.env.NODE_ENV !== "development") notFound();
  const records = publicRecords(loadCatalogueRecords().map((r) => r.id));
  const images = records.filter((r) => r.image).slice(0, 18);
  const collection = {
    id: "20000000-0000-0000-0000-000000000001",
    user_id: "10000000-0000-0000-0000-000000000001",
    title: "Visual QA · public catalogue selection",
    description: null,
    created_at: "2026-10-04T00:00:00Z",
    updated_at: "2026-10-04T00:00:00Z",
  };
  const fixture: Activity[] = [
    {
      id: "visual-multi",
      action: "added",
      occurred_at: "2026-10-04T00:00:00Z",
      actor: null,
      collection,
      items: images.slice(0, 5),
    },
    {
      id: "visual-single",
      action: "published",
      occurred_at: "2026-10-03T00:00:00Z",
      actor: null,
      collection,
      items: images.slice(5, 6),
    },
  ];
  return (
    <Shell active="following">
      <main className="cf-profile cf-profile--wall">
        <p role="note">
          Development visual check. Example activity uses real public catalogue
          records; it is not a live curator feed.
        </p>
        <div className="cf-page" style={{paddingTop:0}}><div className="cf-main"><FollowingFeed initial={fixture} next={null} /></div></div>
        <header>
          <h1>Public archive · visual check</h1>
          <p>Real catalogue material in the profile masonry layout.</p>
          <FollowButton
            id={collection.user_id}
            kind="profile"
            signedIn={false}
          />
        </header>
        <PublicArchive items={images} />
      </main>
    </Shell>
  );
}

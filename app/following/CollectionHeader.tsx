import Link from "next/link";
import { ShareButton, MoreButton } from "./ProfileActions";

/** Centred collection header: title, handle and followers, curator avatar, follow, share, more. */
export default function CollectionHeader({ title, handle, followers, curator, curatorHref, avatar, follow, moreKey, note }: {
  title: string; handle: string; followers?: number; curator?: string; curatorHref?: string; avatar?: string | null;
  follow: React.ReactNode; moreKey: string; note?: string;
}) {
  return (
    <header className="cf-chead">
      <h1>{title}</h1>
      <p className="cf-chead__meta">@{handle}{typeof followers === "number" ? ` · ${followers.toLocaleString("en-AU")} ${followers === 1 ? "Follower" : "Followers"}` : ""}{note ? ` · ${note}` : ""}</p>
      {curator && (
        <Link className="cf-chead__av" href={curatorHref ?? "#"} aria-label={`Curated by ${curator}`} title={curator}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" />
          ) : (
            <span aria-hidden>{curator[0]}</span>
          )}
        </Link>
      )}
      <div className="cf-chead__bar">{follow}<ShareButton title={title} /><MoreButton handle={moreKey} kind="collection" canvasHref={`/home-next/c/${moreKey}/canvas`} /></div>
    </header>
  );
}

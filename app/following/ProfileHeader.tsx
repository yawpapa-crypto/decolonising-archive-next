import Link from "next/link";
import { ShareButton, MoreButton } from "./ProfileActions";

/** Shared profile header: avatar, name, handle, bio, follow control, Profile and Collections tabs, share and more. */
export default function ProfileHeader({ name, handle, bio, avatar, base, tab, records, collections, follow, moreKey, website, stats }: {
  stats?: { followers: number; following: number };
  name: string; handle: string; bio?: string | null; avatar?: string | null; base: string; tab: "profile" | "collections";
  records: number; collections: number; follow: React.ReactNode; moreKey: string; website?: string | null;
}) {
  return (
    <>
      <header className="cf-phead">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="cf-phead__av" src={avatar} alt="" />
        ) : (
          <span className="cf-phead__av" aria-hidden>{name[0]}</span>
        )}
        <div>
          <h1>{name}</h1>
          <span className="cf-phead__handle">@{handle}</span>
        </div>
        {stats && (
          <div className="cf-phead__stats">
            <span><b>{stats.followers.toLocaleString("en-AU")}</b> {stats.followers === 1 ? "Follower" : "Followers"}</span>
            <span><b>{stats.following.toLocaleString("en-AU")}</b> Following</span>
          </div>
        )}
        {bio && <p className="cf-phead__bio">{bio}</p>}
        {website && /^https?:\/\//i.test(website) && <a className="cf-phead__site" href={website} rel="noopener noreferrer" target="_blank">{website.replace(/^https?:\/\//, "")}</a>}
      </header>
      <div className="cf-bar">
        <div className="cf-bar__l">{follow}</div>
        <nav className="cf-tabs" aria-label="Profile sections">
          {records > 0 && <Link href={base} aria-current={tab === "profile" ? "page" : undefined}>Profile <b>{records}</b></Link>}
          <Link href={`${base}?tab=collections`} aria-current={tab === "collections" ? "page" : undefined}>Collections <b>{collections}</b></Link>
        </nav>
        <div className="cf-bar__r"><ShareButton title={name} /><MoreButton handle={moreKey} /></div>
      </div>
    </>
  );
}

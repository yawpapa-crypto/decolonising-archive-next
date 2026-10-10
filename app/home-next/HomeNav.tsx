import { Suspense } from "react";
import AuthLinks from "./AuthLinks";
import Link from "next/link";
import AredLogo from "./AredLogo";
import AccountMenu from "./AccountMenu";
import NavSmoke from "./NavSmoke";
import NavSearch from "./NavSearch";
import NewsletterTab from "./NewsletterTab";
import NavFit from "./NavFit";

/** Until For You replaces the old pages it lives under the preview route. */
export const FOR_YOU_HREF = "/for-you";

type Active = "following" | "for-you" | "explore" | "library" | "sources" | "about" | "fieldnotes";

const P = (d: string) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="ared-nav__ico"><path d={d} /></svg>
);
const LINKS: Array<{ id: Active; href: string; label: string; icon: React.ReactNode }> = [
  { id: "for-you", href: FOR_YOU_HREF, label: "For You", icon: P("M12 3l2.4 5.6L20 9.5l-4.2 3.9 1.2 5.8L12 16.3 7 19.2l1.2-5.8L4 9.5l5.6-.9z") },
  { id: "following", href: "/following", label: "Following", icon: P("M16 20v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1M10 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM20 8v6M17 11h6") },
  { id: "explore", href: "/explore", label: "Explore", icon: P("M12 21a9 9 0 100-18 9 9 0 000 18zM15.5 8.5l-2 5-5 2 2-5z") },
  { id: "fieldnotes", href: "/fieldnotes", label: "Fieldnotes", icon: P("M5 4h11l3 3v13H5zM9 11h6M9 15h6") },
];

/**
 * Small, quiet navigation. The home page lets it scroll away; the feed pins it
 * (variant="feed"), as the reference's is.
 */
export default function HomeNav({
  signedIn,
  active,
}: {
  signedIn: boolean;
  variant?: "feed";
  active?: Active;
}) {
  return (
    <><header className="ared-nav ared-nav--feed"><NavSmoke />
      <div className="ared-nav__left">
        <Link href="/" className="ared-nav__logo" aria-label="Decolonising Archive home">
          <AredLogo size={28} />
        </Link>
        <nav className="ared-nav__links" aria-label="Primary">
          {LINKS.map((l) => (
            <Link key={l.id} href={l.href} aria-current={active === l.id ? "page" : undefined} aria-label={l.label} title={l.label}>
              {l.icon}<span className="ared-nav__lbl">{l.label}</span>
            </Link>
          ))}
        </nav>
      </div>
      <NavSearch />
      <div className="ared-nav__right">
        <NavFit signedIn={signedIn} dests={LINKS.map((l) => ({ href: l.href, label: l.label, current: active === l.id }))} />
        <Link href="/help" className="ared-nav__login ared-nav__help">Help</Link>
        {signedIn ? (
          <AccountMenu />
        ) : (
          <Suspense fallback={null}><AuthLinks /></Suspense>
        )}
      </div>
    </header>
    <nav className="ared-tabbar" aria-label="Primary">
      {LINKS.map((l) => (
        <Link key={l.id} href={l.href} aria-current={active === l.id ? "page" : undefined} aria-label={l.label}>
          <span className="ared-tabbar__pill">{l.icon}</span>
          <span className="ared-tabbar__lbl">{l.label}</span>
        </Link>
      ))}
    </nav>
    <NewsletterTab /></>
  );
}

import Link from "next/link";
import { AncestralAcknowledgementButton } from "@/src/components/site/AncestralAcknowledgement";
import DonateDialog from "./DonateDialog";
import AredLogo from "./AredLogo";

const GROUPS = [
  { label: "Platform", links: [["/home-next/explore", "Explore"], ["/home-next/for-you", "For You"], ["/home-next/explore?q=Indigenous%20knowledge", "Knowledge systems"], ["/home-next/explore?q=Indigenous%20communities", "Communities"], ["/about", "About"]] },
  { label: "Community", links: [["https://www.instagram.com/afr_rd_/", "Community"], ["/community-guidelines", "Guidelines"], ["/sources/request", "Suggest a source"], ["/feedback", "Report a concern"]] },
  { label: "Trust and care", links: [["/cultural-care", "Cultural care"], ["/takedown", "Takedown"], ["/privacy", "Privacy"], ["/terms", "Terms"]] },
  { label: "Support", links: [["/partners", "Partner with us"], ["/changelog", "Changelog"]] },
] as const;

/** Linen, small type, wide spacing; the identity is a cropped graphic event at the very end. */
export default function HomeFooter() {
  return (
    <div className="ared-footer" role="contentinfo" aria-label="Site footer">
      <div className="ared-endrow">
        <nav aria-label="Archive">
          <Link href="/home-next/explore">Explore</Link>
          <Link href="/home-next/for-you">For You</Link>
          <Link href="/home-next/explore">Explore</Link>
          <Link href="/about">About</Link>
        </nav>
        <Link href="/" aria-label="Decolonising Archive home" className="ared-endrow__logo">
          <AredLogo size={40} />
        </Link>
        <nav aria-label="Support and legal">
          <DonateDialog className="ared-link-btn">Donate</DonateDialog>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
      </div>

      <div className="ared-fine">
        {GROUPS.map((g) => (
          <nav key={g.label} aria-label={g.label}>
            <span>{g.label}</span>
            {g.links.map(([href, label]) => (
              <Link key={href} href={href}>{label}</Link>
            ))}
          </nav>
        ))}
        <p>
          <span>© 2026 Decolonising Archive</span>
          <AncestralAcknowledgementButton className="ared-bottom__ack" />
          <Link href="/llms.txt">llms.txt</Link>
        </p>
      </div>

      <div className="ared-giant-wrap" aria-hidden="true">
        <p className="ared-giant">ARED</p>
      </div>
    </div>
  );
}

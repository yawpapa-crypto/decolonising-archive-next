import Link from "next/link";
import { AncestralAcknowledgementButton } from "@/src/components/site/AncestralAcknowledgement";

const POLICY_LINKS = [
  { href: "/cultural-care", label: "Cultural Care" },
  { href: "/community-guidelines", label: "Community Guidelines" },
  { href: "/takedown", label: "Takedown" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/copyright", label: "Copyright" },
] as const;

const PLATFORM_LINKS = [
  { href: "/support", label: "Support" },
  { href: "/changelog", label: "Changelog" },
  { href: "/partners", label: "Partners" },
] as const;

export default function Footer() {
  return (
    <footer className="site-disclaimer site-footer-premium">
      <div className="site-footer-premium__inner">
        <div className="site-footer-premium__brand">
          <span className="site-footer-premium__mark" aria-hidden="true">
            N
          </span>
          <span className="site-footer-premium__name">Decolonising Archive</span>
          <span className="beta-pill" aria-label="Platform status: free public beta">
            Free public beta
          </span>
        </div>

        <nav className="site-footer-premium__links" aria-label="Policy links">
          <AncestralAcknowledgementButton className="site-footer-premium__acknowledgement" />
          {POLICY_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <nav className="site-footer-premium__links" aria-label="Platform links">
          {PLATFORM_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          <Link href="/feedback" className="site-footer-premium__feedback-link">
            Give feedback
          </Link>
        </nav>

        <a
          className="site-footer-premium__site"
          href="https://yofosuasare.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          yofosuasare.com
        </a>
      </div>
    </footer>
  );
}

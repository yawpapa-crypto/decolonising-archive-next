import Link from "next/link";
import { AncestralAcknowledgementButton } from "@/src/components/site/AncestralAcknowledgement";
import NewsletterSignupForm from "@/components/newsletter/NewsletterSignupForm";

// ─── Link data ────────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: "Platform",
    links: [
      { href: "/library", label: "Library" },
      { href: "/sources", label: "Sources" },
      { href: "/about", label: "About" },
      { href: "/changelog", label: "Changelog" },
    ],
  },
  {
    label: "Workbench",
    links: [
      { href: "/my/workbench", label: "My Workbench" },
      { href: "/my/workbench/notes", label: "Notes" },
      { href: "/my/workbench/reading-lists", label: "Reading Lists" },
    ],
  },
  {
    label: "Community",
    links: [
      { href: "/community", label: "Reading Commons" },
      { href: "/community-guidelines", label: "Community Guidelines" },
      { href: "/sources/request", label: "Suggest a Source" },
      { href: "/feedback", label: "Report a Concern" },
    ],
  },
  {
    label: "Trust & Care",
    links: [
      { href: "/cultural-care", label: "Cultural Care" },
      { href: "/takedown", label: "Takedown" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/copyright", label: "Copyright" },
    ],
  },
  {
    label: "Support",
    links: [
      { href: "/support", label: "Support this work" },
      { href: "/partners", label: "Partner with us" },
      { href: "/feedback", label: "Contact" },
      {
        href: "https://ko-fi.com/areddesign",
        label: "Ko-fi",
        external: true,
        ariaLabel: "Support Decolonising Archive on Ko-fi",
      },
    ],
  },
] as const;

const BOTTOM_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/takedown", label: "Takedown" },
  { href: "/copyright", label: "Copyright" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SiteFooter() {
  return (
    <footer className="site-footer" aria-label="Site footer">
      <div className="site-footer__inner site-container">

        {/* Top row: brand + support card */}
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <div className="site-footer__brand-lockup">
              <span className="site-footer__mark" aria-hidden="true">N</span>
              <span className="site-footer__name">Decolonising Archive</span>
            </div>
            <span className="beta-pill site-footer__beta-pill" aria-label="Platform status: public beta">
              Public beta
            </span>
            <p className="site-footer__description">
              A public beta platform for searching, saving, reading and working
              with sources across design, culture, education and decolonial
              knowledge.
            </p>
          </div>

          <aside className="site-footer__support-card" aria-label="Support this work">
            <p className="site-footer__support-title">Support this work</p>
            <p className="site-footer__support-copy">
              Help keep Decolonising Archive open while we improve source
              discovery, Archive Guide beta, Workbench tools and community
              features.
            </p>
            <a
              href="https://ko-fi.com/areddesign"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Support Decolonising Archive on Ko-fi"
              className="site-footer__kofi-btn"
            >
              Support on Ko-fi
            </a>
            <p className="site-footer__support-note">
              Support is voluntary. Core beta access remains open.
            </p>
            <NewsletterSignupForm variant="footer" />
          </aside>
        </div>

        {/* Desktop navigation columns */}
        <nav className="site-footer__desktop-nav" aria-label="Footer navigation">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="site-footer__col">
              <p className="site-footer__col-heading">{group.label}</p>
              <ul className="site-footer__col-links">
                {group.links.map((link) => (
                  <li key={link.href + link.label}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={"ariaLabel" in link ? link.ariaLabel : undefined}
                        className="site-footer__link"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="site-footer__link">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Mobile accordion navigation */}
        <nav className="site-footer__mobile-nav" aria-label="Footer navigation">
          {NAV_GROUPS.map((group) => (
            <details key={group.label} className="site-footer__mobile-group">
              <summary className="site-footer__mobile-summary">
                <span>{group.label}</span>
                <span className="site-footer__mobile-chevron" aria-hidden="true">›</span>
              </summary>
              <ul className="site-footer__mobile-links">
                {group.links.map((link) => (
                  <li key={link.href + link.label}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={"ariaLabel" in link ? link.ariaLabel : undefined}
                        className="site-footer__link"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="site-footer__link">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </nav>

        {/* Bottom bar */}
        <div className="site-footer__bottom">
          <div className="site-footer__bottom-left">
            <span className="site-footer__copyright">© 2026 Decolonising Archive</span>
            <span className="site-footer__bottom-note">
              Public beta · Built for learning, archives and decolonial knowledge work.
            </span>
          </div>
          <div className="site-footer__legal">
            <AncestralAcknowledgementButton className="site-footer__bottom-link" />
            {BOTTOM_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="site-footer__bottom-link">
                {link.label}
              </Link>
            ))}
            <a
              href="https://yofosuasare.com"
              target="_blank"
              rel="noopener noreferrer"
              className="site-footer__bottom-link"
            >
              yofosuasare.com
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}

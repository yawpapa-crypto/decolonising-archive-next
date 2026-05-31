import { AncestralAcknowledgementButton } from "@/src/components/site/AncestralAcknowledgement";
import FooterTrackedLink from "@/src/components/site/FooterTrackedLink";
import SupportLink from "@/src/components/site/SupportLink";
import { FOOTER_BOTTOM_LINKS, FOOTER_LINK_GROUPS } from "@/src/lib/footer-links";

type FooterProps = {
  className?: string;
};

export default function Footer({ className = "" }: FooterProps) {
  const footerClassName = ["site-disclaimer", "site-footer-premium", className]
    .filter(Boolean)
    .join(" ");

  return (
    <footer className={footerClassName}>
      <div className="site-footer-premium__inner">

        {/* ── Top row: brand + support card ── */}
        <div className="site-footer-premium__top">
          <div className="site-footer-premium__brand">
            {/* DA mark removed per design decision */}
            <div>
              <p className="site-footer-premium__eyebrow">Public beta</p>
              <h2 className="site-footer-premium__name">Decolonising Archive</h2>
              <p className="site-footer-premium__description">
                A public beta archive for searching, saving, reading and working with sources
                across design, culture, education and decolonial knowledge.
              </p>
            </div>
          </div>

          <section className="site-footer-premium__support-card" aria-labelledby="footer-support-title">
            <p className="site-footer-premium__eyebrow">Support</p>
            <h3 id="footer-support-title">Support this work</h3>
            {/* Full copy visible on desktop, short copy on mobile via CSS */}
            <p className="site-footer-premium__support-full">
              Help keep Decolonising Archive open while we improve source discovery, Archive Guide
              beta, Workbench tools and community features.
            </p>
            <p className="site-footer-premium__support-short" aria-hidden="true">
              Help keep the public beta open and improving.
            </p>
            <SupportLink area="footer" className="site-footer-premium__kofi-button">
              Support on Ko-fi
            </SupportLink>
          </section>
        </div>

        {/* ── Desktop nav: 5-column grid, hidden on mobile ── */}
        <div className="site-footer-premium__columns site-footer-premium__desktop-nav" aria-label="Footer navigation">
          {FOOTER_LINK_GROUPS.map((group) => (
            <nav
              key={group.title}
              className="site-footer-premium__column"
              aria-label={`${group.title} links`}
            >
              <h3>{group.title}</h3>
              <ul>
                {group.links.map((link) => (
                  <li key={`${group.title}-${link.href}-${link.label}`}>
                    <FooterTrackedLink
                      href={link.href}
                      label={link.label}
                      title={link.title}
                      external={link.external}
                    >
                      {link.label}
                    </FooterTrackedLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* ── Mobile nav: accordion groups, hidden on desktop ── */}
        <nav className="site-footer-premium__mobile-nav" aria-label="Footer navigation">
          {FOOTER_LINK_GROUPS.map((group) => (
            <details key={group.title} className="site-footer-premium__mobile-group">
              <summary className="site-footer-premium__mobile-summary">
                <span>{group.title}</span>
                {/* CSS-only chevron via ::after */}
              </summary>
              <ul className="site-footer-premium__mobile-links">
                {group.links.map((link) => (
                  <li key={`mob-${group.title}-${link.href}-${link.label}`}>
                    <FooterTrackedLink
                      href={link.href}
                      label={link.label}
                      title={link.title}
                      external={link.external}
                    >
                      {link.label}
                    </FooterTrackedLink>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </nav>

        {/* ── Bottom bar ── */}
        <div className="site-footer-premium__bottom">
          <p>
            <span className="site-footer-premium__beta-pill">Public beta</span>
            Built for learning, archives and decolonial knowledge work.
          </p>
          <nav className="site-footer-premium__legal" aria-label="Footer legal links">
            <AncestralAcknowledgementButton className="site-footer-premium__acknowledgement" />
            {FOOTER_BOTTOM_LINKS.map((link) => (
              <FooterTrackedLink key={link.href} href={link.href} label={link.label}>
                {link.label}
              </FooterTrackedLink>
            ))}
            <FooterTrackedLink
              href="https://yofosuasare.com"
              label="yofosuasare.com"
              external
              className="site-footer-premium__site site-footer-premium__site--desktop"
            >
              yofosuasare.com
            </FooterTrackedLink>
          </nav>
          {/* Mobile-only copyright line */}
          <p className="site-footer-premium__mobile-copy">© 2026 Decolonising Archive</p>
        </div>

      </div>
    </footer>
  );
}

import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/copyright", label: "Copyright" },
  { href: "/privacy", label: "Privacy" },
  { href: "/takedown", label: "Takedown" },
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
        </div>

        <nav className="site-footer-premium__links" aria-label="Legal and rights links">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
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

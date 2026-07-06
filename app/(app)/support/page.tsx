import Link from "next/link";
import SiteFooter from "@/src/components/layout/SiteFooter";

export const metadata = {
  title: "Support Decolonising Archive",
  description:
    "Help keep Decolonising Archive open during public beta — support source discovery, Workbench tools and community features.",
};

export default function SupportPage() {
  return (
    <>
      <main className="legal-page">
        <div className="legal-wrap">
          <p className="legal-eyebrow">Support</p>
          <h1>Support Decolonising Archive</h1>
          <p className="legal-updated">
            Decolonising Archive is currently in public beta. Support helps keep access
            open while we improve source discovery, maintain the Workbench, develop Archive
            Guide beta, and build tools for researchers, students, educators and community users.
          </p>

          <section className="support-kofi-section">
            <a
              href="https://ko-fi.com/areddesign"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Support Decolonising Archive on Ko-fi"
              className="support-kofi-btn"
            >
              Support on Ko-fi
            </a>
            <p className="support-kofi-note">
              Support is voluntary. Core beta access remains open while the platform is
              being tested and improved.
            </p>
          </section>

          <section>
            <h2>What support covers</h2>
            <p>
              Contributions help cover hosting and infrastructure, source search and
              integration work, Archive Guide beta and AI usage, Workbench development,
              accessibility and usability improvements, community features and moderation,
              and ongoing research and maintenance.
            </p>
          </section>

          <section>
            <h2>Other ways to help</h2>
            <p>
              You can also support the archive by{" "}
              <Link href="/sources/request">suggesting a source</Link> for inclusion,{" "}
              <Link href="/community">participating in the Reading Commons</Link>, sharing
              the platform with researchers and educators, or{" "}
              <Link href="/partners">partnering with us</Link> if you represent an
              institution or collection.
            </p>
          </section>

          <section>
            <h2>Technical support</h2>
            <p>
              If something is not working, use the{" "}
              <Link href="/feedback">feedback page</Link> with a short description of what
              you were trying to do, the page you were on, and any error message you saw.
            </p>
            <p>
              For records, provenance, rights, or cultural care concerns, use the{" "}
              <Link href="/takedown">takedown and rights contact</Link> process so the
              request can be reviewed with the right context.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

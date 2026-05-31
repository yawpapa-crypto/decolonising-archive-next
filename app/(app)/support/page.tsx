import Link from "next/link";
import PageShell from "@/src/components/layout/PageShell";
import SupportLink from "@/src/components/site/SupportLink";

export default function SupportPage() {
  return (
    <PageShell>
      <main className="legal-page">
        <div className="legal-wrap">
          <p className="legal-eyebrow">Support</p>
          <h1>Support Decolonising Archive</h1>
          <p className="legal-updated">
            Help sustain the public beta, or get support with access, records, rights, and
            Workbench issues.
          </p>

        <section className="support-kofi-card" aria-labelledby="support-kofi-title">
          <div>
            <p className="support-kofi-card__eyebrow">Public beta support</p>
            <h2 id="support-kofi-title">Support Decolonising Archive</h2>
            <p>
              Decolonising Archive is currently in public beta. Your support helps keep the
              platform open while we improve source discovery, maintain the Workbench, develop
              Archive Guide beta, and build tools for researchers, students, educators and
              community users.
            </p>
          </div>
          <SupportLink area="support" className="support-kofi-card__button">
            Support on Ko-fi
          </SupportLink>
          <p className="support-kofi-card__note">
            Support is voluntary. Core beta access remains open while the platform is being tested
            and improved.
          </p>
        </section>

        <section>
          <h2>What support helps cover</h2>
          <ul>
            <li>Hosting and infrastructure.</li>
            <li>Source search and integration work.</li>
            <li>Archive Guide beta and AI usage.</li>
            <li>Workbench development.</li>
            <li>Accessibility and usability improvements.</li>
            <li>Community features and moderation.</li>
            <li>Ongoing research and maintenance.</li>
          </ul>
        </section>

        <section>
          <h2>How to get help</h2>
          <p>
            If something is not working, start with a short description of what you were
            trying to do, the page you were on, and any error message you saw. This keeps
            support requests useful without asking you to share more than needed.
          </p>
          <p>
            For records, provenance, rights, restrictions, or cultural care concerns, use
            the takedown and rights contact process so the request can be reviewed with
            the right context.
          </p>
        </section>

        <section>
          <h2>Common paths</h2>
          <ul>
            <li>
              <Link href="/library">Return to Library search</Link> if a search result or
              source page failed to load.
            </li>
            <li>
              <Link href="/my/workbench">Open your Workbench</Link> for saved records,
              reading lists, notes, review projects, and exports.
            </li>
            <li>
              <Link href="/takedown">Contact us about rights, correction, or removal</Link>
              {" "}for sensitive material or provenance issues.
            </li>
            <li>
              <Link href="/community">Open the Reading Commons</Link> for community posts,
              reading paths, and source questions.
            </li>
          </ul>
        </section>

        <section>
          <h2>What to include</h2>
          <p>
            Please include the page URL, browser/device, the rough time the issue happened,
            and whether you were signed in. Do not include passwords, private keys, or
            sensitive personal information.
          </p>
        </section>
        </div>
      </main>
    </PageShell>
  );
}

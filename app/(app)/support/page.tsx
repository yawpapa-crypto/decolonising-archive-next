import Link from "next/link";

export default function SupportPage() {
  return (
    <main className="legal-page">
      <div className="legal-wrap">
        <p className="legal-eyebrow">Support</p>
        <h1>Support</h1>
        <p className="legal-updated">Help with access, records, rights, and Workbench issues.</p>

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
  );
}

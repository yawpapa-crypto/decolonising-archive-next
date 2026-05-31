export const metadata = {
  title: "Community Guidelines | Decolonising Archive",
  description: "How members of Decolonising Archive are expected to participate.",
};

export default function CommunityGuidelinesPage() {
  return (
    <main className="legal-page">
      <div className="legal-wrap">
        <p className="legal-eyebrow">Community</p>
        <h1>Community Guidelines</h1>
        <p className="legal-updated">Last updated: 30 May 2026</p>

        <section>
          <h2>1. Purpose</h2>
          <p>
            The Decolonising Archive Community Reading Commons is a space for researchers,
            archivists, educators, students, and members of the public to share notes, reflections,
            questions, and reading paths connected to archival knowledge.
          </p>
          <p>
            These guidelines exist to ensure that this space remains productive, respectful, and
            grounded in the platform&apos;s core commitments to decolonial knowledge practice.
          </p>
        </section>

        <section>
          <h2>2. Expected Conduct</h2>
          <p>All members are expected to:</p>
          <ul>
            <li>Engage respectfully with other members and their contributions</li>
            <li>Share notes, reflections, and questions in good faith</li>
            <li>Acknowledge the communities, scholars, and traditions their work draws on</li>
            <li>
              Avoid reproducing harmful, racist, or culturally disrespectful language, even when
              quoting archival sources
            </li>
            <li>Disclose conflicts of interest or institutional affiliations where relevant</li>
          </ul>
        </section>

        <section>
          <h2>3. What Is Not Permitted</h2>
          <p>The following are not permitted in community spaces:</p>
          <ul>
            <li>Harassment, abuse, or targeted attacks on individuals or communities</li>
            <li>Discriminatory language based on race, ethnicity, gender, sexuality, religion, disability, or nationality</li>
            <li>Spam, promotional content, or repetitive posting</li>
            <li>Sharing personal data about third parties without consent</li>
            <li>Misrepresenting the views of other members or scholars</li>
            <li>Reproducing copyrighted material without permission</li>
            <li>Posts that violate applicable law</li>
          </ul>
        </section>

        <section>
          <h2>4. Reporting and Moderation</h2>
          <p>
            If you encounter content that violates these guidelines, use the report button on any
            post or comment. Reports are reviewed by the moderation team. We aim to respond to
            reports within 5 business days.
          </p>
          <p>
            Moderation decisions may include: content removal, warning, temporary restriction of
            posting access, or permanent account suspension. We will endeavour to explain moderation
            decisions to affected members.
          </p>
        </section>

        <section>
          <h2>5. Beta Moderation</h2>
          <p>
            During the public beta period, moderation capacity is limited. We rely on community
            reporting and reserve the right to act on reports at our discretion. These guidelines
            will be updated as the platform matures.
          </p>
        </section>

        <section>
          <h2>6. Contact</h2>
          <p>
            Questions about these guidelines can be directed to{" "}
            <a href="mailto:hello@ared.design">hello@ared.design</a> or via the{" "}
            <a href="/feedback">feedback page</a>.
          </p>
        </section>
      </div>
    </main>
  );
}

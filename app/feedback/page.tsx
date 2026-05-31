import FeedbackModal from "@/src/components/feedback/FeedbackModal";
import PageShell from "@/src/components/layout/PageShell";

export const metadata = {
  title: "Give Feedback | Decolonising Archive",
};

export default function FeedbackPage() {
  return (
    <PageShell>
      <main className="legal-page">
        <div className="legal-wrap">
          <p className="legal-eyebrow">Beta</p>
          <h1>Give Feedback</h1>
          <p>
            Decolonising Archive is in public beta. Use the form below to report a bug, suggest a
            feature, flag a content issue, or share anything that could improve the platform.
          </p>
          <p>
            Your feedback is read by the small team building this archive. We cannot always reply
            individually, but every report shapes what we fix and build next.
          </p>
          <div style={{ marginTop: "2rem" }}>
            <FeedbackModal />
          </div>
        </div>
      </main>
    </PageShell>
  );
}

import { submitSourceRequest } from "@/lib/source-request-actions";

export const metadata = {
  title: "Suggest a Source | Decolonising Archive",
  description: "Suggest an archival source, institution, or collection for inclusion.",
};

type SearchParams = Promise<{ submitted?: string; error?: string }>;

export default async function SourceRequestPage(props: { searchParams: SearchParams }) {
  const params = await props.searchParams;
  const errorMsg = params.error ? decodeURIComponent(params.error) : null;

  return (
    <main className="legal-page">
      <div className="legal-wrap">
        <p className="legal-eyebrow">Archive</p>
        <h1>Suggest a Source</h1>
        <p>
          Know of an archive, institution, collection, or resource that should be represented in
          Decolonising Archive? Use this form to suggest it. We review all suggestions and aim to
          respond within 4–6 weeks.
        </p>

        {params.submitted ? (
          <div
            className="admin-success"
            role="status"
            style={{ margin: "2rem 0", padding: "1rem 1.25rem", borderRadius: "0.5rem" }}
          >
            <strong>Request received.</strong> Thank you for your suggestion. We will review it and
            may follow up if we need more information.
          </div>
        ) : (
          <>
          {errorMsg && (
            <p role="alert" style={{ color: "var(--color-error, #c0392b)", marginBottom: "1rem" }}>
              {errorMsg}
            </p>
          )}
          <form
            action={submitSourceRequest}
            style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "38rem", marginTop: "2rem" }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span>
                Source / collection title <span aria-hidden="true">*</span>
              </span>
              <input
                name="title"
                required
                minLength={3}
                maxLength={300}
                placeholder="Name of the archive, collection, or resource"
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span>URL (if available)</span>
              <input
                name="source_url"
                type="url"
                maxLength={500}
                placeholder="https://…"
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span>Holding institution</span>
              <input
                name="institution"
                maxLength={200}
                placeholder="University, national archive, museum, etc."
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span>Additional notes</span>
              <textarea
                name="notes"
                rows={4}
                maxLength={2000}
                placeholder="Why is this source relevant? Any context about its significance?"
              />
            </label>

            <button type="submit" className="admin-button" style={{ alignSelf: "flex-start" }}>
              Submit suggestion
            </button>
          </form>
          </>
        )}
      </div>
    </main>
  );
}

import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import PageShell from "@/src/components/layout/PageShell";

export default async function LibraryPage() {
  const records = await prisma.record.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <PageShell>
      <section className="about-body">
        <div className="hero-eyebrow" style={{ marginBottom: "12px" }}>
          Database-backed archive
        </div>

        <h1>Library</h1>

        <p style={{ marginTop: "12px", marginBottom: "24px" }}>
          This library page is now reading records from Prisma instead of the
          old in-memory archive layer.
        </p>

        <div style={{ display: "grid", gap: "16px" }}>
          {records.length === 0 ? (
            <div className="info-block">
              <p>No records found in the database yet.</p>
            </div>
          ) : (
            records.map((record) => (
              <article
                key={record.id}
                style={{
                  border: "1px solid #ddd",
                  padding: "16px",
                  borderRadius: "8px",
                  background: "#fff",
                }}
              >
                <h2 style={{ margin: "0 0 8px 0" }}>{record.title}</h2>

                {record.summary ? (
                  <p style={{ margin: "0 0 8px 0" }}>{record.summary}</p>
                ) : null}

                <p style={{ margin: 0, fontSize: "14px", color: "#555" }}>
                  {record.recordType || "Record"} ·{" "}
                  {record.creator || "Unknown creator"}
                </p>

                <div style={{ marginTop: "12px" }}>
                  <Link href={`/records/${record.id}`}>Open record</Link>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </PageShell>
  );
}

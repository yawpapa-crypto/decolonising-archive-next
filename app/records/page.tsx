import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import PageShell from "@/src/components/layout/PageShell";

export default async function RecordsPage() {
  const records = await prisma.record.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <PageShell>
      <section className="about-body">
        <h1>Archive Records</h1>
        <p>This is the first database-backed records page.</p>

        <div style={{ display: "grid", gap: "16px", marginTop: "24px" }}>
          {records.map((record) => (
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
                {record.recordType || "Record"} · {record.creator || "Unknown creator"}
              </p>

              <div style={{ marginTop: "12px" }}>
                <Link href={`/records/${record.id}`}>Open record</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

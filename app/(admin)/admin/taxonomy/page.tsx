import fs from "node:fs";
import path from "node:path";

type TaxonomyRow = {
  level: string;
  term: string;
  definition: string;
  source: string;
};

function readTaxonomyRows(): TaxonomyRow[] {
  const csvPath = path.join(process.cwd(), "data/catalogue/taxonomy.csv");
  if (!fs.existsSync(csvPath)) return [];
  const lines = fs.readFileSync(csvPath, "utf8").split(/\r?\n/).filter(Boolean);
  const rows = lines.slice(1).map((line) => {
    const [level = "", term = "", definition = "", source = ""] = line.split(",");
    return {
      level: level.trim(),
      term: term.trim(),
      definition: definition.trim(),
      source: source.trim(),
    };
  });
  return rows;
}

export default function AdminTaxonomyPage() {
  const rows = readTaxonomyRows();
  const byLevel = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.level || "Unspecified"] = (acc[row.level || "Unspecified"] || 0) + 1;
    return acc;
  }, {});

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px 64px" }}>
      <h1 style={{ fontSize: 34, marginBottom: 8 }}>Taxonomy admin</h1>
      <p style={{ color: "#5f625d", marginBottom: 20 }}>
        Review and maintain Knowledge areas, Concepts and Tags. Preview changes before publishing.
      </p>

      <section style={{ marginBottom: 20, border: "1px solid #dedfd9", borderRadius: 12, padding: 16 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Audit snapshot</h2>
        <ul style={{ display: "grid", gap: 6, paddingLeft: 20 }}>
          {Object.entries(byLevel).map(([level, count]) => (
            <li key={level}>{level}: {count}</li>
          ))}
        </ul>
      </section>

      <section style={{ marginBottom: 20, border: "1px solid #dedfd9", borderRadius: 12, padding: 16 }}>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Term operations</h2>
        <p style={{ color: "#5f625d", marginBottom: 12 }}>
          Use these controls to merge, rename, move levels, add definitions, add alternative labels, and mark deprecated terms.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button">Merge terms</button>
          <button type="button">Rename term</button>
          <button type="button">Move between levels</button>
          <button type="button">Add definition</button>
          <button type="button">Add alternative label</button>
          <button type="button">Mark deprecated</button>
          <button type="button">Preview affected records</button>
          <button type="button">Publish changes</button>
        </div>
      </section>

      <section style={{ border: "1px solid #dedfd9", borderRadius: 12, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eceee8" }}>Level</th>
              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eceee8" }}>Term</th>
              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eceee8" }}>Definition</th>
              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eceee8" }}>Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 250).map((row, idx) => (
              <tr key={`${row.term}-${idx}`}>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f2ef" }}>{row.level || "Information unavailable"}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f2ef" }}>{row.term || "Information unavailable"}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f2ef" }}>{row.definition || "Information unavailable"}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f2ef" }}>{row.source || "Information unavailable"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

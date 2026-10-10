import { createClient } from "@/src/lib/supabase/server";
import { notFound } from "next/navigation";
import {
  rankCandidates,
  diagnostics,
  CONFIG,
} from "@/lib/recommendations/engine";
import { catalogueCandidates } from "@/lib/recommendations/catalogue";
import { readProfile } from "@/lib/recommendations/server";
export const dynamic = "force-dynamic";
export default async function Inspector({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { scenario = "current" } = await searchParams;
  const { p, userId } = await readProfile();
  const candidates = catalogueCandidates();
  if (scenario !== "current") {
    p.explicit = [];
    p.saved = [];
    p.collections = [];
    p.followed = [];
    p.session = [];
    p.behaviour = [];
    p.negative = [];
    p.seen.clear();
    p.savedIds.clear();
    const e = {
      features: candidates[0]?.features || {},
      weight: CONFIG.explicitWeight,
      reason: "Development scenario using real catalogue metadata",
    };
    if (scenario !== "cold") p.explicit = [e];
    if (scenario === "saved")
      p.saved = Array.from({ length: 20 }, () => ({
        ...e,
        weight: CONFIG.weights.save,
      }));
    if (scenario === "session")
      p.session = [
        {
          ...e,
          features: candidates.at(-1)?.features || {},
          weight: CONFIG.weights.repeated_search,
        },
      ];
    if (scenario === "negative")
      p.negative = [
        { ...e, id: candidates[0]?.id, weight: CONFIG.weights.more },
      ];
  }
  const ranked = rankCandidates(candidates, p, 36);
  let metrics: unknown = null;
  if (userId) {
    try {
      metrics = (await (await createClient()).rpc("recommendation_metrics"))
        .data;
    } catch {}
  }

  return (
    <main
      style={{
        padding: 32,
        fontFamily: "system-ui",
        color: "#1d1d1f",
        background: "#fff",
        overflowX: "auto",
      }}
    >
      <h1>Recommendation inspector</h1>
      <p>
        Development only. Current account:{" "}
        {userId ? "signed in (own history only)" : "guest"}. Scenarios change no
        production users or events. Gorse is not installed.
      </p>
      <nav>
        {["current", "cold", "interest", "saved", "session", "negative"].map(
          (s) => (
            <a key={s} href={`?scenario=${s}`} style={{ marginRight: 16 }}>
              {s}
            </a>
          ),
        )}
      </nav>
      <pre>
        {JSON.stringify(
          { quality: diagnostics(ranked), actionCounts: metrics },
          null,
          2,
        )}
      </pre>
      <p>
        Action counts are scoped to the signed-in account and 90 days. Delivered
        responses are not viewed impressions; rates require an agreed exposure
        denominator.
      </p>
      <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            {[
              "Position",
              "ID",
              "Candidate source",
              "Preference",
              "Saved",
              "Collection",
              "Followed",
              "Session",
              "Behaviour",
              "Novelty",
              "Negative",
              "Diversity",
              "Total",
              "Gorse",
              "Bucket",
              "Reason",
            ].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: 8,
                  borderBottom: "1px solid #ddd",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ranked.map((r) => (
            <tr key={r.candidate.id}>
              {[
                r.position,
                r.candidate.id,
                r.candidate.candidateSource,
                r.components.preference,
                r.components.saved,
                r.components.collection,
                r.components.followed,
                r.components.session,
                r.components.behaviour,
                r.components.novelty,
                r.components.negative,
                r.diversityAdjustment,
                r.score + r.diversityAdjustment,
                "—",
                r.bucket,
                r.why,
              ].map((value, i) => (
                <td
                  key={i}
                  style={{ padding: 8, borderBottom: "1px solid #eee" }}
                >
                  {typeof value === "number"
                    ? Math.round(value * 100) / 100
                    : value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

import { ImageResponse } from "next/og";
import { getPublicArchiveRecord } from "@/lib/kgo/records";

export const alt = "ARED record";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** A share card for each record: its title and source on the ARED palette. */
export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getPublicArchiveRecord(id).catch(() => null);
  const title = (r?.title || "Decolonising Archive").slice(0, 150);
  const meta = [r?.creator, r?.sourceName].filter(Boolean).join(" · ").slice(0, 120);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#f3efe8", color: "#1a1815" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, letterSpacing: 4 }}>
          <div style={{ width: 22, height: 22, borderRadius: 11, background: "#1a1815" }} />ARED
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: title.length > 80 ? 52 : 68, lineHeight: 1.1, fontWeight: 600, letterSpacing: -1.5 }}>{title}</div>
          {meta ? <div style={{ fontSize: 30, color: "#6c675d" }}>{meta}</div> : null}
        </div>
        <div style={{ fontSize: 24, color: "#7a756a" }}>ared.design · Decolonising Archive</div>
      </div>
    ),
    size,
  );
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getCurrentProfile, hasRole } from "@/src/lib/auth";

const allowedTargetTypes = new Set([
  "record",
  "dossier",
  "collection",
  "pathway",
  "archive_note",
  "featured_record",
]);

const allowedRelationTypes = new Set([
  "attachment",
  "gallery",
  "reference",
  "cover",
]);

export async function POST(request: NextRequest) {
  // Curator-only — Members must not be able to attach media to records.
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!hasRole(profile, "curator")) {
    return NextResponse.json(
      { error: "Curator access required." },
      { status: 403 },
    );
  }

  const supabase = await createClient();

  const body = await request.json();

  const mediaId = String(body.mediaId || "").trim();
  const targetType = String(body.targetType || "").trim();
  const targetId = String(body.targetId || "").trim();
  const relationType = String(body.relationType || "attachment").trim();
  const caption = String(body.caption || "").trim();

  if (!mediaId || !targetType || !targetId) {
    return NextResponse.json(
      { error: "mediaId, targetType, and targetId are required" },
      { status: 400 },
    );
  }

  if (!allowedTargetTypes.has(targetType)) {
    return NextResponse.json({ error: "Unsupported target type" }, { status: 400 });
  }

  if (!allowedRelationTypes.has(relationType)) {
    return NextResponse.json({ error: "Unsupported relation type" }, { status: 400 });
  }

  if (relationType === "cover") {
    await supabase
      .from("media_links")
      .delete()
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .eq("relation_type", "cover");
  }

  const { data, error } = await supabase
    .from("media_links")
    .insert({
      media_id: mediaId,
      target_type: targetType,
      target_id: targetId,
      relation_type: relationType,
      caption: caption || null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Could not save media link", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ mediaLink: data });
}

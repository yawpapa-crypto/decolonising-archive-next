// Curator media upload route.
//
// Pattern: signed direct uploads.
//   * Browser asks the server for a signed upload URL (POST).
//   * Server validates kind / MIME / size, requires curator role,
//     creates a Storage signed-upload URL via the service-role client,
//     and inserts a `media` row in `pending` state.
//   * Browser PUTs the file directly to Supabase Storage using the
//     signed URL — bypassing the Next.js function entirely, so 100 MB
//     videos don't hit any serverless body-size limit.
//   * Browser then PATCHes back to mark the media row `ready`.
//
// DELETE removes both the storage object and the media row.

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { getCurrentProfile, hasRole } from "@/src/lib/auth";
import {
  MEDIA_BUCKET,
  buildMediaPath,
  validateMediaInput,
} from "@/src/lib/media";

function jsonError(message: string, status = 400, field?: string) {
  return NextResponse.json({ ok: false, error: message, field }, { status });
}

export async function POST(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return jsonError("Sign in required.", 401);
  if (!hasRole(profile, "curator"))
    return jsonError("Curator access required.", 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.");
  }
  const input = (body ?? {}) as Record<string, unknown>;

  const validation = validateMediaInput({
    kind: input.kind,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    title: input.title,
  });
  if (!validation.ok) {
    return jsonError(validation.message, 400, validation.field);
  }

  const fileName = String(input.fileName ?? "").trim() || "file";
  const description = String(input.description ?? "").trim() || null;

  const admin = createAdminClient();

  // 1. Insert pending row first so we have a stable id for the path.
  const { data: row, error: insertError } = await admin
    .from("media")
    .insert({
      kind: validation.kind,
      status: "pending",
      title: validation.title,
      description,
      file_path: "pending", // placeholder until we have the row id
      mime_type: validation.mimeType,
      size_bytes: validation.sizeBytes,
      uploaded_by: profile.id,
    })
    .select("id")
    .single();
  if (insertError || !row) {
    return jsonError(insertError?.message ?? "Failed to create media row.", 500);
  }

  const path = buildMediaPath({
    kind: validation.kind,
    fileName,
    uuid: row.id,
  });

  // 2. Update with the real path now that we know the id.
  const { error: pathError } = await admin
    .from("media")
    .update({ file_path: path })
    .eq("id", row.id);
  if (pathError) {
    await admin.from("media").delete().eq("id", row.id);
    return jsonError(pathError.message, 500);
  }

  // 3. Create the signed upload URL. Browser will PUT to this directly.
  const { data: signed, error: signError } = await admin.storage
    .from(MEDIA_BUCKET)
    .createSignedUploadUrl(path);
  if (signError || !signed) {
    await admin.from("media").delete().eq("id", row.id);
    return jsonError(signError?.message ?? "Failed to sign upload URL.", 500);
  }

  return NextResponse.json({
    ok: true,
    mediaId: row.id,
    bucket: MEDIA_BUCKET,
    path,
    token: signed.token,
    signedUrl: signed.signedUrl,
  });
}

export async function PATCH(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return jsonError("Sign in required.", 401);
  if (!hasRole(profile, "curator"))
    return jsonError("Curator access required.", 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.");
  }
  const id = String((body as { id?: unknown })?.id ?? "").trim();
  if (!id) return jsonError("Missing id.");

  const supabase = await createClient();

  // Confirm the underlying object actually exists in storage before
  // marking the row ready — defends against half-completed uploads.
  const { data: row, error: rowError } = await supabase
    .from("media")
    .select("id, file_path, kind, size_bytes")
    .eq("id", id)
    .single();
  if (rowError || !row) return jsonError("Media row not found.", 404);

  const admin = createAdminClient();
  const folder = row.file_path.split("/").slice(0, -1).join("/");
  const fileName = row.file_path.split("/").slice(-1)[0];
  const { data: list, error: listError } = await admin.storage
    .from(MEDIA_BUCKET)
    .list(folder, { search: fileName });
  if (listError) return jsonError(listError.message, 500);
  const exists = (list ?? []).some((item) => item.name === fileName);
  if (!exists) return jsonError("Upload did not complete.", 409);

  const { error: updateError } = await admin
    .from("media")
    .update({ status: "ready" })
    .eq("id", id);
  if (updateError) return jsonError(updateError.message, 500);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return jsonError("Sign in required.", 401);
  if (!hasRole(profile, "curator"))
    return jsonError("Curator access required.", 403);

  const id = (request.nextUrl.searchParams.get("id") ?? "").trim();
  if (!id) return jsonError("Missing id.");

  const admin = createAdminClient();
  const { data: row, error: rowError } = await admin
    .from("media")
    .select("id, file_path")
    .eq("id", id)
    .single();
  if (rowError || !row) return jsonError("Media row not found.", 404);

  // Best-effort: remove from storage first. If that fails, we still allow
  // the row to be removed so the curator UI doesn't get stuck.
  const { error: storageError } = await admin.storage
    .from(MEDIA_BUCKET)
    .remove([row.file_path]);

  const { error: deleteError } = await admin
    .from("media")
    .delete()
    .eq("id", id);
  if (deleteError) return jsonError(deleteError.message, 500);

  return NextResponse.json({ ok: true, storageError: storageError?.message });
}

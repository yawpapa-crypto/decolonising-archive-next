import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getCurrentProfile, hasRole } from "@/src/lib/auth";

export const runtime = "nodejs";

function safeFileName(name: string) {
  const extension = name.includes(".") ? name.split(".").pop() : "";
  const base = name
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${base || "media"}-${Date.now()}${extension ? `.${extension}` : ""}`;
}

export async function POST(request: NextRequest) {
  // Role gate. RLS on media_library + the storage bucket also enforces this,
  // but checking here avoids burning an upload round-trip for a Member.
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
  const user = { id: profile.id };

  const formData = await request.formData();

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const altText = String(formData.get("alt_text") || "").trim();
  const credit = String(formData.get("credit") || "").trim();
  const rightsNote = String(formData.get("rights_note") || "").trim();
  const mediaType = String(formData.get("media_type") || "other").trim();

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const fileName = safeFileName(file.name);
  const filePath = `${user.id}/${fileName}`;

  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("media-library")
    .upload(filePath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "Could not upload file", details: uploadError.message },
      { status: 500 },
    );
  }

  const { data: publicUrlData } = supabase.storage
    .from("media-library")
    .getPublicUrl(filePath);

  const { data: mediaItem, error: insertError } = await supabase
    .from("media_library")
    .insert({
      user_id: user.id,
      title,
      description: description || null,
      alt_text: altText || null,
      credit: credit || null,
      rights_note: rightsNote || null,
      media_type: mediaType || null,
      file_name: file.name,
      file_path: filePath,
      public_url: publicUrlData.publicUrl,
      mime_type: file.type || null,
      file_size: file.size,
    })
    .select("*")
    .single();

  if (insertError) {
    await supabase.storage.from("media-library").remove([filePath]);

    return NextResponse.json(
      { error: "Could not save media metadata", details: insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ mediaItem });
}

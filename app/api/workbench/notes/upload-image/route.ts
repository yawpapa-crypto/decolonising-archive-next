import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/src/lib/auth";
import { createClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

const BUCKET = "workbench-note-images";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"]);

function safeFileName(name: string) {
  const extension = name.includes(".") ? (name.split(".").pop() ?? "").toLowerCase() : "";
  const base = name
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "image"}-${Date.now()}${extension ? `.${extension}` : ""}`;
}

async function canEditNote(
  supabase: Awaited<ReturnType<typeof createClient>>,
  noteId: string,
  userId: string,
) {
  const { data: note, error } = await supabase
    .from("workbench_notes")
    .select("id, user_id, project_id")
    .eq("id", noteId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !note) return false;
  if (note.user_id === userId) return true;
  if (!note.project_id) return false;

  const { data: project } = await supabase
    .from("workbench_projects")
    .select("owner_id")
    .eq("id", note.project_id)
    .maybeSingle();
  if (project?.owner_id === userId) return true;

  const { data: membership } = await supabase
    .from("workbench_collaborators")
    .select("role")
    .eq("project_id", note.project_id)
    .eq("user_id", userId)
    .maybeSingle();

  return membership?.role === "editor";
}

export async function POST(request: NextRequest) {
  try {
    await requireMember("/my/workbench");
  } catch {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const noteId = String(formData.get("noteId") || "temp").trim() || "temp";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use PNG, JPG, GIF, or WebP." },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 5MB or smaller." }, { status: 400 });
  }

  if (noteId !== "temp") {
    const allowed = await canEditNote(supabase, noteId, user.id);
    if (!allowed) {
      return NextResponse.json({ error: "You cannot edit this note." }, { status: 403 });
    }
  }

  const fileName = safeFileName(file.name);
  const filePath = `notes/${user.id}/${noteId}/${fileName}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, arrayBuffer, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    // Bucket missing until migration 0018 is applied.
    return NextResponse.json(
      {
        error: "Could not upload image.",
        details: uploadError.message,
        hint:
          "Apply supabase migration 0018_workbench_notes_document.sql and ensure the workbench-note-images bucket exists.",
      },
      { status: 500 },
    );
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

  return NextResponse.json({ url: publicUrlData.publicUrl });
}

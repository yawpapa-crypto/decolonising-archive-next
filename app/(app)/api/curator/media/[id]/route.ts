import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getCurrentProfile, hasRole } from "@/src/lib/auth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

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

  const { data: mediaItem, error: fetchError } = await supabase
    .from("media_library")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !mediaItem) {
    return NextResponse.json({ error: "Media item not found" }, { status: 404 });
  }

  // Admins can delete any media; curators only their own.
  const isAdmin = hasRole(profile, "admin");
  if (!isAdmin && mediaItem.user_id !== profile.id) {
    return NextResponse.json(
      { error: "Only the uploader or an admin can delete this media." },
      { status: 403 },
    );
  }

  const { error: storageError } = await supabase.storage
    .from("media-library")
    .remove([mediaItem.file_path]);

  if (storageError) {
    return NextResponse.json(
      { error: "Could not delete file", details: storageError.message },
      { status: 500 },
    );
  }

  const { error: deleteError } = await supabase
    .from("media_library")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      { error: "Could not delete media metadata", details: deleteError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

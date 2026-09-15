import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
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

  const { data: mediaLinks, error: mediaLinksError } = await supabase
    .from("media_links")
    .select("*")
    .eq("media_id", id);

  if (mediaLinksError) {
    return NextResponse.json(
      { error: "Could not prepare media deletion", details: mediaLinksError.message },
      { status: 500 },
    );
  }

  const { error: deleteError } = await supabase
    .from("media_library")
    .delete()
    .eq("id", id)
    .select("id")
    .single();

  if (deleteError) {
    return NextResponse.json(
      { error: "Could not delete media metadata", details: deleteError.message },
      { status: 500 },
    );
  }

  const { error: storageError } = await supabase.storage
    .from("media-library")
    .remove([mediaItem.file_path]);

  if (storageError) {
    const adminClient = createAdminClient();
    const restoreMedia = await adminClient.from("media_library").insert(mediaItem);
    if (!restoreMedia.error && mediaLinks?.length) {
      await adminClient.from("media_links").insert(mediaLinks);
    }

    return NextResponse.json(
      {
        error: "Could not delete file",
        details: storageError.message,
        restored: !restoreMedia.error,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

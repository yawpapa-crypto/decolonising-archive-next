import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { isTombstoneReadingList } from "@/src/lib/member-workspace";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

async function owner(id: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { supabase, error: NextResponse.json({ error: "Sign in first." }, { status: 401 }) } as const;
  const { data: list } = await supabase.from("reading_lists").select("id, title, description, is_public").eq("id", id).eq("user_id", auth.user.id).maybeSingle();
  if (!list || isTombstoneReadingList(list)) return { supabase, error: NextResponse.json({ error: "Collection not found." }, { status: 404 }) } as const;
  return { supabase, list: list as { id: string; title: string; description: string | null; is_public: boolean }, userId: auth.user.id } as const;
}

/** One collection with its records. */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const o = await owner(id);
  if ("error" in o) return o.error;
  const { data } = await o.supabase
    .from("reading_list_items")
    .select("record_id, record_title, record_source, record_source_url, record_type, record_year, record_metadata, position")
    .eq("reading_list_id", id)
    .order("position", { ascending: true });
  return NextResponse.json({ list: o.list, items: data ?? [] });
}

/** Rename. */
export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const o = await owner(id);
  if ("error" in o) return o.error;
  const body = await request.json().catch(() => null);
  if (!body || (body.is_public !== undefined && typeof body.is_public !== "boolean")) return NextResponse.json({ error: "Invalid collection update." }, { status: 400 });
  const changes: { title?: string; description?: string; is_public?: boolean } = {};
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) return NextResponse.json({ error: "Give the collection a name." }, { status: 400 });
    changes.title = body.title.trim().slice(0, 120);
  }
  if (body.description !== undefined) {
    if (typeof body.description !== "string") return NextResponse.json({ error: "Invalid description." }, { status: 400 });
    changes.description = body.description.trim().slice(0, 2000);
  }
  if (body.is_public !== undefined) changes.is_public = body.is_public;
  if (!Object.keys(changes).length) return NextResponse.json({ error: "No changes supplied." }, { status: 400 });
  const { error } = await o.supabase.from("reading_lists").update(changes).eq("id", id).eq("user_id", o.userId);
  if (error) return NextResponse.json({ error: "Could not update the collection." }, { status: 500 });
  return NextResponse.json({ ok: true, title: changes.title ?? o.list.title, is_public: changes.is_public ?? o.list.is_public });
}

/** Delete the collection (its records stay saved), or with ?record=ID take one record out of it. */
export async function DELETE(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const o = await owner(id);
  if ("error" in o) return o.error;
  const record = new URL(request.url).searchParams.get("record");
  if (record) {
    const { error } = await o.supabase.from("reading_list_items").delete().eq("reading_list_id", id).eq("record_id", record);
    if (error) return NextResponse.json({ error: "Could not remove that record." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  const { error: e1 } = await o.supabase.from("reading_list_items").delete().eq("reading_list_id", id);
  if (e1) return NextResponse.json({ error: "Could not delete the collection." }, { status: 500 });
  const { error: e2 } = await o.supabase.from("reading_lists").update({ description: "[field-tombstone:deleted]", is_public: false }).eq("id", id).eq("user_id", o.userId);
  if (e2) return NextResponse.json({ error: "Could not delete the collection." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

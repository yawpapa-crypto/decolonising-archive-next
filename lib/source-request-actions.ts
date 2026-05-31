"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { createAdminNotification } from "@/lib/admin-notifications";

export async function submitSourceRequest(formData: FormData): Promise<void> {
  const title = String(formData.get("title") ?? "").trim();
  const source_url = String(formData.get("source_url") ?? "").trim() || null;
  const institution = String(formData.get("institution") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (title.length < 3) {
    redirect("/sources/request?error=Please+provide+a+title+of+at+least+3+characters");
  }
  if (title.length > 300) {
    redirect("/sources/request?error=Title+is+too+long");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("source_requests").insert({
    user_id: user?.id ?? null,
    title,
    source_url,
    institution,
    notes,
    status: "pending",
  });

  if (error) {
    console.error("[source-request] insert error", error.message);
    redirect("/sources/request?error=Could+not+submit+your+request");
  }

  // Notify admins
  void createAdminNotification({
    type: "source_request_received",
    title: "New source request submitted",
    body: `"${title.slice(0, 120)}"`,
    severity: "info",
    targetType: "source_request",
    metadata: { title, source_url: source_url ?? undefined },
  });

  redirect("/sources/request?submitted=1");
}

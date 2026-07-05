"use server";

import { createClient } from "@/src/lib/supabase/server";
import {
  buildAlertEmail,
  createAdminNotification,
  sendAdminEmail,
} from "@/lib/admin-notifications";

const CURATOR_EMAIL =
  process.env.COLLECTION_CURATOR_EMAIL?.trim() || "papayawofosu@gmail.com";

export type CollectionSuggestionInput = {
  title: string;
  source: string;
  url?: string;
  notes?: string;
  collectionSlug?: string;
  submitterName?: string;
  submitterEmail?: string;
};

export type CollectionSuggestionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function submitCollectionSuggestion(
  input: CollectionSuggestionInput,
): Promise<CollectionSuggestionResult> {
  const title = input.title.trim();
  const source = input.source.trim();
  const url = input.url?.trim() || null;
  const notes = input.notes?.trim() || null;
  const collectionSlug = input.collectionSlug?.trim() || "ghana-graphic-design";

  if (title.length < 3) {
    return { ok: false, error: "Please provide a title (at least 3 characters)." };
  }
  if (title.length > 300) {
    return { ok: false, error: "Title is too long." };
  }
  if (source.length < 2) {
    return { ok: false, error: "Please name the source." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const detailLines = [
    `Collection: ${collectionSlug}`,
    `Source: ${source}`,
    url ? `URL: ${url}` : null,
    notes ? `Rights / notes: ${notes}` : null,
    input.submitterName ? `Submitted by: ${input.submitterName}` : null,
    input.submitterEmail ? `Contact: ${input.submitterEmail}` : null,
    user?.email ? `Account: ${user.email}` : null,
  ].filter(Boolean);

  const { error } = await supabase.from("source_requests").insert({
    user_id: user?.id ?? null,
    title,
    source_url: url,
    institution: source,
    notes: detailLines.join("\n"),
    status: "pending",
  });

  if (error) {
    console.error("[collection-suggest] insert error", error.message);
    return { ok: false, error: "Could not save your suggestion. Please try again." };
  }

  const bodyPreview = detailLines.join(" · ").slice(0, 240);

  void createAdminNotification({
    type: "collection_item_suggested",
    title: `Collection suggestion: ${title.slice(0, 80)}`,
    body: bodyPreview,
    severity: "info",
    targetType: "source_request",
    metadata: {
      collection_slug: collectionSlug,
      source,
      url: url ?? undefined,
      submitter_email: input.submitterEmail ?? user?.email ?? undefined,
    },
  });

  void sendAdminEmail(
    buildAlertEmail(
      {
        type: "collection_item_suggested",
        title: `New collection suggestion — ${title.slice(0, 80)}`,
        body: bodyPreview,
        severity: "info",
        metadata: { collection_slug: collectionSlug, url: url ?? undefined },
      },
      CURATOR_EMAIL,
    ),
    undefined,
    "immediate_alert",
  );

  return { ok: true };
}

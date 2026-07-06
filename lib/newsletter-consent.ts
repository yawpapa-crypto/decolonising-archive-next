import "server-only";

import { createAdminClient } from "@/src/lib/supabase/admin";
import { subscribeNewsletter, type NewsletterSource } from "@/lib/brevo";

export async function recordNewsletterOptIn(input: {
  userId: string;
  email: string;
  firstName?: string | null;
  source: NewsletterSource;
}) {
  await subscribeNewsletter({
    email: input.email,
    firstName: input.firstName,
    source: input.source,
  });

  const admin = createAdminClient();
  const { data: existing } = await admin.auth.admin.getUserById(input.userId);
  const metadata = (existing.user?.user_metadata ?? {}) as Record<string, unknown>;

  await admin.auth.admin.updateUserById(input.userId, {
    user_metadata: {
      ...metadata,
      newsletter_opt_in: true,
      newsletter_subscribed_at: new Date().toISOString(),
      newsletter_source: input.source,
    },
  });
}

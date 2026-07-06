import "server-only";

export type NewsletterSource = "signup" | "signin" | "footer";

export type SubscribeNewsletterInput = {
  email: string;
  firstName?: string | null;
  source: NewsletterSource;
};

export type SubscribeNewsletterResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
};

function brevoConfigured() {
  return Boolean(process.env.BREVO_API_KEY?.trim());
}

export function isNewsletterConfigured() {
  return brevoConfigured();
}

export async function subscribeNewsletter(
  input: SubscribeNewsletterInput,
): Promise<SubscribeNewsletterResult> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    console.warn("[brevo] BREVO_API_KEY not set — skipping newsletter subscription");
    return { ok: true, skipped: true };
  }

  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Valid email is required." };
  }

  const listIdRaw = process.env.BREVO_NEWSLETTER_LIST_ID?.trim();
  const listId = listIdRaw ? Number(listIdRaw) : NaN;

  const body: Record<string, unknown> = {
    email,
    updateEnabled: true,
    attributes: {
      FIRSTNAME: input.firstName?.trim() || undefined,
      SOURCE: input.source,
    },
  };

  if (!Number.isNaN(listId)) {
    body.listIds = [listId];
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok || res.status === 204) {
      return { ok: true };
    }

    const data = (await res.json().catch(() => ({}))) as { message?: string };
    const message = String(data.message ?? res.statusText ?? "Brevo request failed");
    if (
      res.status === 400 &&
      message.toLowerCase().includes("contact already exist")
    ) {
      return { ok: true };
    }

    console.error("[brevo] subscribe failed", res.status, message);
    return { ok: false, error: message };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Brevo request failed";
    console.error("[brevo] subscribe error", message);
    return { ok: false, error: message };
  }
}

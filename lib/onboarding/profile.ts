import "server-only";
import { emptyInterests, type Interests } from "./shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sb = any;

export interface OnboardingState {
  /** False when the migration has not been applied: callers must then not gate anything. */
  available: boolean;
  name: string;
  username: string;
  interests: Interests;
  step: number;
  completedAt: string | null;
}

type AccountMeta = {
  full_name?: string;
  username?: string;
  interests?: Partial<Interests>;
  onboarding_step?: number;
  onboarding_completed_at?: string;
};

function fromAccount(user: { user_metadata?: AccountMeta } | null | undefined) {
  const meta = (user?.user_metadata ?? {}) as AccountMeta;
  const step = Number(meta.onboarding_step ?? 0);
  const completed = typeof meta.onboarding_completed_at === "string" && meta.onboarding_completed_at ? meta.onboarding_completed_at : null;
  return {
    name: String(meta.full_name ?? ""),
    username: String(meta.username ?? ""),
    interests: { ...emptyInterests(), ...(meta.interests ?? {}) },
    step: Number.isFinite(step) ? step : 0,
    completedAt: completed,
  };
}

export async function readState(supabase: Sb, userId: string): Promise<OnboardingState> {
  const empty: OnboardingState = { available: false, name: "", username: "", interests: emptyInterests(), step: 0, completedAt: null };
  try {
    const { data: auth } = await supabase.auth.getUser();
    const account = fromAccount(auth?.user);
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, display_name, username, interests, onboarding_step, onboarding_completed_at")
      .eq("id", userId)
      .maybeSingle();
    // A missing column or a missing row must not look like "signed in, step 0, not finished".
    // That combination sends For You straight back to the first onboarding screen.
    if (error || !data) {
      return { ...empty, ...account, available: false };
    }
    const raw = (data.interests && typeof data.interests === "object" ? data.interests : {}) as Partial<Interests>;
    const columnStep = Number(data.onboarding_step ?? 0);
    return {
      available: true,
      name: String(data.full_name ?? data.display_name ?? "") || account.name,
      username: String(data.username ?? "") || account.username,
      interests: { ...emptyInterests(), ...account.interests, ...raw },
      step: Math.max(Number.isFinite(columnStep) ? columnStep : 0, account.step),
      completedAt: (data.onboarding_completed_at as string | null) ?? account.completedAt,
    };
  } catch {
    return empty;
  }
}

export async function usernameFree(supabase: Sb, username: string): Promise<boolean | null> {
  try {
    const { data, error } = await supabase.rpc("username_available", { p_username: username });
    if (error) return null;
    return Boolean(data);
  } catch {
    return null;
  }
}

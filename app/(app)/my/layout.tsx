import type { ReactNode } from "react";
import { getCurrentProfile } from "@/src/lib/auth";
import { fetchOnboardingProgress } from "@/lib/onboarding-actions";
import BetaNotice from "@/src/components/beta/BetaNotice";
import OnboardingChecklist from "@/src/components/onboarding/OnboardingChecklist";

/**
 * Authenticated member shell — wraps all /my/* routes.
 *
 * Fetches the profile row (including onboarding/beta flags) server-side
 * so client components get the correct initial state without flash.
 *
 * All data fetching is wrapped in try/catch — if Supabase env vars are
 * missing or the DB is unreachable, children still render normally and
 * the overlay components simply fall back to localStorage state.
 */
export default async function MyLayout({ children }: { children: ReactNode }) {
  let profile: Awaited<ReturnType<typeof getCurrentProfile>> = null;
  try {
    profile = await getCurrentProfile();
  } catch {
    // Supabase not configured or unavailable — render children without overlays
  }

  const progress =
    profile && !profile.onboarding_completed
      ? await fetchOnboardingProgress().catch(() => ({
          hasSaved: false,
          hasWorkbench: false,
          profileComplete: false,
        }))
      : null;

  return (
    <>
      {children}

      {/* Beta notice — shown to logged-in members until dismissed */}
      <BetaNotice initialSeen={profile?.beta_notice_seen ?? false} />

      {/* Getting started — shown until completed or dismissed */}
      {!profile?.onboarding_completed ? (
        <OnboardingChecklist
          initialCompleted={false}
          initialProgress={progress ?? undefined}
        />
      ) : null}
    </>
  );
}

import type { Metadata } from "next";
import { safeNextPath } from "@/src/lib/security/validate";
import { redirect } from "next/navigation";
import { display, ui } from "../font";
import { createClient } from "@/src/lib/supabase/server";
import { interestGroups } from "@/lib/onboarding/taxonomy";
import { readState } from "@/lib/onboarding/profile";
import { onboardingCompositions } from "@/lib/home/for-you";
import OnboardingFlow from "./OnboardingFlow";
import "../home.css";
import "../for-you/for-you.css";
import "./onboarding.css";

export const metadata: Metadata = { title: "Welcome | Decolonising Archive", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next, "/for-you");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/signup");

  const state = await readState(supabase, user.id);
  // Finished already, including when completion lives on the account because the profile columns are not there yet.
  if (state.completedAt) redirect(next);

  const panels = await onboardingCompositions();
  const fullName = state.name || String((user as { user_metadata?: { full_name?: string } }).user_metadata?.full_name ?? "");
  return (
    <div className={`ared-home ex-ui ${display.variable} ${ui.variable}`}>
      <OnboardingFlow
        groups={interestGroups()}
        panels={panels}
        initial={{ name: fullName, username: state.username, interests: state.interests, step: state.step, email: String((user as { email?: string }).email ?? ""), age: user.user_metadata?.age }}
        done={next === "/for-you" ? "/for-you?welcome=1" : next}
      />
    </div>
  );
}

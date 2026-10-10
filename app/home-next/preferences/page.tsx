import type { Metadata } from "next";
import { redirect } from "next/navigation";
import HomeNav from "../HomeNav";
import { display, ui } from "../font";
import { createClient } from "@/src/lib/supabase/server";
import { interestGroups } from "@/lib/onboarding/taxonomy";
import { readState } from "@/lib/onboarding/profile";
import RecommendationHistory from "./RecommendationHistory";
import PreferencesForm from "./PreferencesForm";
import "../home.css";
import "../for-you/for-you.css";
import "../onboarding/onboarding.css";

export const metadata: Metadata = { title: "Interests | Decolonising Archive", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/signin");
  const state = await readState(supabase, data.user.id);
  return (
    <div className={`ared-home ex-ui ${display.variable} ${ui.variable}`}>
      <HomeNav signedIn variant="feed" active="for-you" />
      <main className="pf">
        <PreferencesForm groups={interestGroups()} initial={state.interests} migrated={state.available} />
        <RecommendationHistory />
      </main>
    </div>
  );
}

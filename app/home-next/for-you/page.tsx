import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import HomeNav from "../HomeNav";
import CommandBar from "../CommandBar";
import { display, ui } from "../font";
import { getCurrentUser } from "@/src/lib/auth";
import { getForYouPage } from "@/lib/home/for-you";
import ForYouFeed from "./ForYouFeed";
import "../home.css";
import "./for-you.css";

export const metadata: Metadata = {
  title: "For You | Decolonising Archive",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ForYouPage({ searchParams }: { searchParams?: Promise<{ welcome?: string }> }) {
  const welcome = (await searchParams)?.welcome === "1";
  const seed = randomUUID().slice(0, 8);
  const feed = getForYouPage({ page: 1, seed, seen: [], session: [] });
  const userPromise = getCurrentUser().catch(() => null);
  const [user, first] = await Promise.all([userPromise, feed]);
  return (
    <div className={`ared-home ex-ui ${display.variable} ${ui.variable}`}>
      <CommandBar />
      <HomeNav signedIn={Boolean(user)} variant="feed" active="for-you" />
      <main className="fy-vp">
        <h1 className="ared-sr">For You</h1>
        {welcome && <p className="fy-welcome" role="status">Your feed is ready.</p>}
        <div className="fy fy--canvas">
          <ForYouFeed initial={first} storageKey={`ared-for-you:v8:${user?.id || "visitor"}:${first.profile.interests.join("|")}`} canvas />
        </div>
      </main>
    </div>
  );
}

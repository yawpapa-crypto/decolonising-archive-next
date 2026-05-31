import ArchiveAppPage from "@/src/components/archive/ArchiveAppPage";
import { getCurrentUser } from "@/src/lib/auth";

export default async function ArchiveAppPageWithAuth() {
  // Wrap in try/catch so Supabase being unavailable (missing env vars, cold
  // start, network error) never blocks the page from rendering. We simply
  // treat an auth failure as "not signed in" and the archive renders normally.
  let signedIn = false;
  try {
    const user = await getCurrentUser();
    signedIn = Boolean(user);
  } catch {
    // Supabase unavailable — render as guest, never hang.
  }
  return <ArchiveAppPage initialMemberSignedIn={signedIn} />;
}

import ArchiveAppPage from "@/src/components/archive/ArchiveAppPage";
import { getCurrentUser } from "@/src/lib/auth";

export default async function ArchiveAppPageWithAuth() {
  const user = await getCurrentUser();
  return <ArchiveAppPage initialMemberSignedIn={Boolean(user)} />;
}

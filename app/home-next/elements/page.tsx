import LibraryGate from "../LibraryGate";
import AccountShell from "../AccountShell";
import { getCurrentUser } from "@/src/lib/auth";
import Elements from "./Elements";
export const metadata = { title: "Saved records | Decolonising Archive", robots: { index: false, follow: false } };
export default async function ElementsPage() {
  const user = await getCurrentUser();
  if (!user) return <LibraryGate next="/elements" />;
  return <AccountShell><main className="account-page"><Elements /></main></AccountShell>;
}

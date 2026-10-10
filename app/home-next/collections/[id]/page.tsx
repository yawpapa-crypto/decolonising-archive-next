import LibraryGate from "../../LibraryGate";
import AccountShell from "../../AccountShell";
import { getCurrentUser } from "@/src/lib/auth";
import CollectionView from "./CollectionView";
export const metadata = { title: "Collection | Decolonising Archive", robots: { index: false, follow: false } };
export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return <LibraryGate next={`/collections/${encodeURIComponent(id)}`} title="This collection" body="Collections are kept in a personal library. Sign in to open yours, or create an account to start one." />;
  return <AccountShell><main className="account-page"><CollectionView id={id} /></main></AccountShell>;
}

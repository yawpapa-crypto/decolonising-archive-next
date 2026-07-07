import { redirect } from "next/navigation";
import { safeNextPath } from "@/src/lib/security/validate";

type SearchParams = Promise<{
  next?: string;
}>;

export default async function AuthSignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next);
  if (next.startsWith("/admin") && !next.startsWith("//")) {
    redirect(`/admin/signin?next=${encodeURIComponent(next)}`);
  }
  redirect(`/signin?next=${encodeURIComponent(next)}`);
}

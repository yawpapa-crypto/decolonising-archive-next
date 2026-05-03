import { redirect } from "next/navigation";

type SearchParams = Promise<{
  next?: string;
}>;

export default async function AuthSignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const next = sp.next ?? "/workspace";
  if (next.startsWith("/admin") && !next.startsWith("//")) {
    redirect(`/admin/signin?next=${encodeURIComponent(next)}`);
  }
  redirect(`/signin?next=${encodeURIComponent(next)}`);
}

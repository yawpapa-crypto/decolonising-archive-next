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
  redirect(`/signin?next=${encodeURIComponent(next)}`);
}

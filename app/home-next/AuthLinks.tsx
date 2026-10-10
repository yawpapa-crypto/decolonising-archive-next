"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

/** Sign in / Sign up that return the visitor to the page they were on. */
export default function AuthLinks() {
  const path = usePathname() || "/home-next/for-you";
  const sp = useSearchParams();
  const qs = sp?.toString();
  const back = path.startsWith("/following") || path.startsWith("/people/") || path.startsWith("/curated-collections/") || path.startsWith("/home-next") || path.startsWith("/records") || path.startsWith("/source") || path.startsWith("/knowledge") || path.startsWith("/region") ? path + (qs ? `?${qs}` : "") : "/home-next/for-you";
  const next = encodeURIComponent(back);
  return (
    <>
      <Link href={`/signin?next=${next}`} className="ared-nav__login">Sign in</Link>
      <Link href={`/signup?next=${encodeURIComponent("/home-next/onboarding?next=" + next)}`} className="ared-btn ared-btn--primary ared-btn--sm">Create account</Link>
    </>
  );
}

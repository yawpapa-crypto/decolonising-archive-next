"use client";
import { usePathname } from "next/navigation";
import DisplaySettings, { DisplayApply } from "./DisplaySettings";
import NewsWidget from "./NewsWidget";

const HIDE = ["/admin", "/workbench", "/signin", "/signup", "/auth", "/onboarding", "/onboarding", "/api"];

/** Display and language control (bottom left) and the news widget (bottom right), on every public page. */
export default function Floaters() {
  const path = usePathname() || "/";
  if (HIDE.some((p) => path === p || path.startsWith(p + "/"))) return <DisplayApply />;
  return <><DisplaySettings /><NewsWidget /></>;
}

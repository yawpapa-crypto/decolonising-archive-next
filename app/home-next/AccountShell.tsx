import type { ReactNode } from "react";
import HomeNav from "./HomeNav";
import CommandBar from "./CommandBar";
import { display, ui } from "./font";
import { getCurrentUser } from "@/src/lib/auth";
import "./home.css";
import "./for-you/for-you.css";
import "./account.css";

export default async function AccountShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser().catch(() => null);
  return <div className={`ared-home ex-ui ${display.variable} ${ui.variable}`}>
    <HomeNav signedIn={Boolean(user)} variant="feed" />
    <CommandBar />
    {children}
  </div>;
}

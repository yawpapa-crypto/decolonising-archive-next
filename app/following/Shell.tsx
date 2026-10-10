import type { ReactNode } from "react";
import HomeNav from "@/app/home-next/HomeNav";
import { display, ui } from "@/app/home-next/font";
import { getCurrentUser } from "@/src/lib/auth";
import "@/app/home-next/home.css";
import "@/app/home-next/for-you/for-you.css";
import "./following.css";
export default async function Shell({
  children,
  active,
}: {
  children: ReactNode;
  active?: "following";
}) {
  const user = await getCurrentUser().catch(() => null);
  return (
    <div
      className={`ared-home ex-ui cf-shell ${display.variable} ${ui.variable}`}
    >
      <HomeNav signedIn={Boolean(user)} active={active} />
      {children}
    </div>
  );
}

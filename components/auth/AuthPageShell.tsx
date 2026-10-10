import { ReactNode } from "react";
import { display, ui } from "@/app/home-next/font";
import "@/app/home-next/home.css";
import "@/app/home-next/for-you/for-you.css";

type Props = {
  children: ReactNode;
};

/** Auth pages: navbar only — no footer so the split layout can breathe. */
export default function AuthPageShell({ children }: Props) {
  return (
    <div className={`ared-home ex-ui auth-gallery ${display.variable} ${ui.variable}`}>
      {children}
    </div>
  );
}

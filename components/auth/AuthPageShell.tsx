import { ReactNode } from "react";
import Navbar from "@/src/components/layout/Navbar";

type Props = {
  children: ReactNode;
};

/** Auth pages: navbar only — no footer so the split layout can breathe. */
export default function AuthPageShell({ children }: Props) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}

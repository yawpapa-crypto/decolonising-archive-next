import { ReactNode } from "react";
import Navbar from "@/src/components/layout/Navbar";
import SiteFooter from "@/src/components/layout/SiteFooter";
import BeyondDataMapHostClient from "@/src/components/archive/BeyondDataMapHostClient";

type PageShellProps = {
  children: ReactNode;
};

export default function PageShell({ children }: PageShellProps) {
  return (
    <>
      <Navbar />
      <BeyondDataMapHostClient />
      {children}
      <SiteFooter />
    </>
  );
}

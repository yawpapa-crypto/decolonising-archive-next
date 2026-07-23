import { ReactNode } from "react";
import Link from "next/link";
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
      <Link
        href="/knowledge"
        className="global-knowledge-tip"
        aria-label="Explore Global Knowledge Systems"
      >
        <span className="global-knowledge-tip__dot" aria-hidden="true" />
        <span>
          <strong>New</strong>
          Explore Global Knowledge Systems
        </span>
      </Link>
      <SiteFooter />
    </>
  );
}

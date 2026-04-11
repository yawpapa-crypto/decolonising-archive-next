import { ReactNode } from "react";
import Navbar from "@/src/components/layout/Navbar";
import Footer from "@/src/components/layout/Footer";

type PageShellProps = {
  children: ReactNode;
};

export default function PageShell({ children }: PageShellProps) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}

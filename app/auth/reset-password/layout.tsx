import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Reset your password | ARED",
  robots: { index: false, follow: false },
};
export default function RecoveryLayout({ children }: { children: React.ReactNode }) {
  return children;
}

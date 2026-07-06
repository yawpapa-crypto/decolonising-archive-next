import PageShell from "@/src/components/layout/PageShell";
import { requireMember } from "@/src/lib/auth";
import WorkbenchShell from "./WorkbenchShell";

export default async function WorkbenchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireMember("/my/workbench");

  return (
    <PageShell>
      <WorkbenchShell>{children}</WorkbenchShell>
    </PageShell>
  );
}

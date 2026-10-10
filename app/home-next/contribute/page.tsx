import AccountShell from "../AccountShell";
import ContributionForm from "./ContributionForm";
export const metadata = { title: "Contribute knowledge | ARED", robots: { index: false, follow: true } };
export default async function Page({ searchParams }: { searchParams: Promise<{ record?: string }> }) {
  const { record } = await searchParams;
  return (
    <AccountShell>
      <main className="account-page">
        <div style={{ maxWidth: 640 }}>
          <h1>Help the archive tell a fuller story.</h1>
          <p style={{ color: "#6e6a69", lineHeight: 1.6, margin: "0 0 28px" }}>Propose a correction, connection, source or missing attribution. Evidence comes first, and every proposal is reviewed before it changes the public archive.</p>
          <ContributionForm record={record ?? ""} />
        </div>
      </main>
    </AccountShell>
  );
}

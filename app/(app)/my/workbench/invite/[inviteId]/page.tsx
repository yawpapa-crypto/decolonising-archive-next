import Link from "next/link";
import { acceptWorkbenchInviteById } from "@/lib/workbench-collaborator-actions";
import { createClient } from "@/src/lib/supabase/server";

export default async function WorkbenchInvitePage({
  params,
}: {
  params: Promise<{ inviteId: string }>;
}) {
  const { inviteId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <section className="workbench-invite-page">
        <h1>Project invite</h1>
        <p>Sign in to accept this collaboration invite.</p>
        <Link href={`/auth/login?next=/my/workbench/invite/${inviteId}`}>Sign in</Link>
      </section>
    );
  }

  const result = await acceptWorkbenchInviteById(inviteId);

  if (result.ok && result.projectId) {
    return (
      <section className="workbench-invite-page">
        <h1>You&apos;re in</h1>
        <p>Your invite was accepted. Open the shared workbench to collaborate.</p>
        <Link className="workbench-button workbench-button-primary" href="/my/workbench/notes">
          Open workbench
        </Link>
      </section>
    );
  }

  return (
    <section className="workbench-invite-page">
      <h1>Could not accept invite</h1>
      <p>{result.error ?? "This invite is invalid or has expired."}</p>
      <Link href="/my/workbench/notes">Back to workbench</Link>
    </section>
  );
}

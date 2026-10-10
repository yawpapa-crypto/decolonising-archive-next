import Link from "next/link";
import { requireMember } from "@/src/lib/auth";
import FieldnotesWorkspace from "./FieldnotesWorkspace";
export default async function FieldnotesPage() {
  await requireMember("/workspace/fieldnotes");
  return <main style={{maxWidth:1100, margin:"0 auto", padding:"32px 24px"}}><Link href="/workspace">← Workspace</Link><h1>Fieldnotes</h1><p>Private research from AR/D Fieldnotes. Access follows your project membership. Synchronising does not publish your research.</p><FieldnotesWorkspace /></main>;
}

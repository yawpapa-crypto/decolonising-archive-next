import AccountShell from "../AccountShell";
import { editorialPhoto } from "@/lib/media/unsplash";
import { HELP } from "./articles";
import HelpContent from "./HelpContent";
export const metadata = { title: "Help Center | Decolonising Archive" };
export default async function HelpPage() {
  const photos = await Promise.all(HELP.map(c => editorialPhoto(c.query)));
  return <AccountShell><HelpContent photos={photos} /></AccountShell>;
}

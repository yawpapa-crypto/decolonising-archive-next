import { display, ui } from "./font";
import HomeNav from "./HomeNav";
import LineLoader from "./ui/LineLoader";
import "./home.css";
import "./for-you/for-you.css";
import "./ui/cosmos-dialogs.css";

type Active = "following" | "for-you" | "explore" | "fieldnotes";

/** Route-level loading screen: the real header plus the drawing mark. Shown only while a page is already on its way. */
export default function RouteLoading({ label = "Opening the archive", active }: { label?: string; active?: Active }) {
  return (
    <div className={`ared-home ex-ui ${display.variable} ${ui.variable}`}>
      <HomeNav signedIn={false} active={active} />
      <main className="cz-load-page" aria-busy="true">
        <LineLoader size={88} label={label} />
      </main>
    </div>
  );
}

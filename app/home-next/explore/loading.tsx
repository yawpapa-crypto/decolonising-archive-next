import { display, ui } from "../font";
import HomeNav from "../HomeNav";
import LineLoader from "../ui/LineLoader";
import "../home.css";
import "../for-you/for-you.css";

/** Shown only while the page is already on its way; it adds no time of its own. */
export default function Loading() {
  return (
    <div className={`ared-home ex-ui ${display.variable} ${ui.variable}`}>
      <HomeNav signedIn={false} active="explore" />
      <main className="cz-load-page" aria-busy="true">
        <LineLoader size={88} label="Opening the archive" />
      </main>
    </div>
  );
}

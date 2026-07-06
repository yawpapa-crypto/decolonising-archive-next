/**
 * Notes route stylesheet load order (intentional — later files win on equal specificity).
 *
 * 1. Board immersive — portal fullscreen board UI
 * 2. Document shell — Figma reading layout, mode chrome
 * 3. Research canvas — scoped to .workbench-research-canvas (not legacy .workbench-note-canvas)
 * 4. Mobile — notes page breakpoints; canvas uses immersive portal selectors
 * 5. Citation picker — modal / popover for references
 * 6. Document scroll fix — body.workbench-notes-document-mode only (editorial reading)
 */

import "@/app/workbench-board-immersive.css";
import "@/app/styles/archive/notes-figma.css";
import "./workbench-research-canvas/index.css";
import "@/app/styles/archive/notes-mobile.css";
import "@/app/styles/archive/citation-picker.css";
import "@/app/styles/archive/notes-scroll-fix.css";
import "@/app/styles/workbench-share-modal.css";
import "@/app/styles/workbench-collaboration-bar.css";
import "@/app/styles/archive/document-taskbar-ui.css";
import {
  IBM_Plex_Sans,
  Inter,
  Lato,
  Merriweather,
  Montserrat,
  Nunito_Sans,
  Open_Sans,
  Poppins,
  Roboto,
  Source_Sans_3,
} from "next/font/google";

const workbenchInter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-workbench-inter",
  display: "swap",
});

const workbenchRoboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-workbench-roboto",
  display: "swap",
  preload: false,
});

const workbenchOpenSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-workbench-open-sans",
  display: "swap",
  preload: false,
});

const workbenchLato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-workbench-lato",
  display: "swap",
  preload: false,
});

const workbenchMontserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-workbench-montserrat",
  display: "swap",
  preload: false,
});

const workbenchPoppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-workbench-poppins",
  display: "swap",
  preload: false,
});

const workbenchSourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-workbench-source-sans-3",
  display: "swap",
  preload: false,
});

const workbenchNunitoSans = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-workbench-nunito-sans",
  display: "swap",
  preload: false,
});

const workbenchMerriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-workbench-merriweather",
  display: "swap",
  preload: false,
});

const workbenchIbmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-workbench-ibm-plex-sans",
  display: "swap",
  preload: false,
});

const workbenchDocumentFontVariables = [
  workbenchInter.variable,
  workbenchRoboto.variable,
  workbenchOpenSans.variable,
  workbenchLato.variable,
  workbenchMontserrat.variable,
  workbenchPoppins.variable,
  workbenchSourceSans.variable,
  workbenchNunitoSans.variable,
  workbenchMerriweather.variable,
  workbenchIbmPlexSans.variable,
].join(" ");

export default function WorkbenchNotesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={workbenchDocumentFontVariables} style={{ display: "contents" }}>
      {children}
    </div>
  );
}

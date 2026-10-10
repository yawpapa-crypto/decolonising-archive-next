import Image from "next/image";
import { editorialPhoto } from "@/lib/media/unsplash";
import { ReactNode } from "react";

type Props = {
  mode: "signin" | "signup";
  children: ReactNode;
};

const COPY = {
  signin: {
    kicker: "Welcome back",
    title: "Sign in to your research workspace",
    body: "Pick up saved records, reading lists, and searches across the archive and federated library sources.",
  },
  signup: {
    kicker: "Join the archive",
    title: "Create a Member account",
    body: "Tell us a little about your work so we can shape collections, tools, and community features around real research practice.",
  },
};

export default async function AuthShell({ mode, children }: Props) {
  const copy = COPY[mode];
  const photo = await editorialPhoto("Ghana architecture coast");

  return (
    <main className="auth-split-page">
      <aside className="auth-split-visual">
        {photo && <Image unoptimized src={photo.src} alt={photo.alt} fill sizes="(max-width: 760px) 100vw, 50vw" className="auth-editorial-photo" />}
        <div className="auth-split-visual-overlay" />
        <div className="auth-split-visual-content">
          <p className="auth-split-brand">Decolonising Archive</p>
          <p className="auth-split-kicker">{copy.kicker}</p>
          <h2 className="auth-split-title">{copy.title}</h2>
          <p className="auth-split-body">{copy.body}</p>
          <ul className="auth-split-points">
            <li>Collections, archives &amp; library sources</li>
            <li>Bookmarks, reading lists &amp; saved searches</li>
            <li>Workbench notes &amp; community reading</li>
          </ul>
        </div>
        {photo && <p className="auth-photo-credit">Photo by <a href={photo.credit} target="_blank" rel="noopener noreferrer">{photo.photographer}</a> on <a href="https://unsplash.com/?utm_source=decolonising_archive&utm_medium=referral">Unsplash</a></p>}
      </aside>
      <section className="auth-split-panel">{children}</section>
    </main>
  );
}

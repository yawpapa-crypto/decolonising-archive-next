import { ReactNode } from "react";

type Props = {
  mode: "signin" | "signup";
  children: ReactNode;
};

const COPY = {
  signin: {
    kicker: "Welcome back",
    title: "Sign in to your research workspace",
    body: "Pick up saved records, reading lists, and searches across the archive — from Ghana collections to federated library sources.",
  },
  signup: {
    kicker: "Join the archive",
    title: "Create a Member account",
    body: "Tell us a little about your work so we can shape collections, tools, and community features around real research practice.",
  },
};

export default function AuthShell({ mode, children }: Props) {
  const copy = COPY[mode];

  return (
    <main className="auth-split-page">
      <aside className="auth-split-visual" aria-hidden="true">
        <div className="auth-split-visual-overlay" />
        <div className="auth-split-visual-content">
          <p className="auth-split-brand">Decolonising Archive</p>
          <p className="auth-split-kicker">{copy.kicker}</p>
          <h2 className="auth-split-title">{copy.title}</h2>
          <p className="auth-split-body">{copy.body}</p>
          <ul className="auth-split-points">
            <li>Ghana graphic design &amp; African archives</li>
            <li>Bookmarks, reading lists &amp; saved searches</li>
            <li>Workbench notes &amp; community reading</li>
          </ul>
        </div>
      </aside>
      <section className="auth-split-panel">{children}</section>
    </main>
  );
}

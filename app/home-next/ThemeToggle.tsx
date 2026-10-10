"use client";

/** Toggles data-theme on the nearest .ared-home and remembers the choice per browser. */
export default function ThemeToggle() {
  return (
    <button
      type="button"
      className="ared-theme"
      aria-label="Toggle light and dark theme"
      onClick={(e) => {
        const root = e.currentTarget.closest<HTMLElement>(".ared-home");
        if (!root) return;
        const next = root.dataset.theme === "dark" ? "light" : "dark";
        root.dataset.theme = next;
        try {
          window.localStorage.setItem("ared-home-theme", next);
        } catch {
          /* private mode: the choice just will not persist */
        }
      }}
    >
      <svg className="ared-theme__moon" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.5 11.5A6.5 6.5 0 0 1 8.5 3.5a6.5 6.5 0 1 0 8 8Z" />
      </svg>
      <svg className="ared-theme__sun" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <circle cx="10" cy="10" r="3.2" />
        <path d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M4.7 15.3 6 14M14 6l1.3-1.3" />
      </svg>
    </button>
  );
}

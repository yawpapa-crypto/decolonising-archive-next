"use client";

import { useEffect, useState } from "react";

type Prefs = {
  appearance: "light" | "dark" | "system";
  emailNotifications: boolean;
  archiveUpdates: boolean;
  searchAlerts: boolean;
  profileVisibility: "private" | "members" | "public";
};

const DEFAULT_PREFS: Prefs = {
  appearance: "system",
  emailNotifications: true,
  archiveUpdates: true,
  searchAlerts: true,
  profileVisibility: "members",
};

const STORAGE_KEY = "workspacePreferencesV1";

function applyTheme(appearance: Prefs["appearance"]) {
  if (typeof document === "undefined") return;
  const resolved =
    appearance === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : appearance;
  document.documentElement.dataset.theme = resolved;
}

export default function WorkspaceSettingsPanel() {
  const [prefs, setPrefs] = useState<Prefs>(() => {
    if (typeof window === "undefined") return DEFAULT_PREFS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_PREFS;
      const parsed = JSON.parse(raw) as Partial<Prefs>;
      return { ...DEFAULT_PREFS, ...parsed };
    } catch {
      return DEFAULT_PREFS;
    }
  });
  const [saved, setSaved] = useState("");

  useEffect(() => {
    applyTheme(prefs.appearance);
  }, [prefs.appearance]);

  function update<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    if (key === "appearance") applyTheme(next.appearance);
  }

  function savePreferences() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    applyTheme(prefs.appearance);
    setSaved("Settings saved on this device.");
    window.setTimeout(() => setSaved(""), 2200);
  }

  return (
    <div className="workspace-settings-grid">
      <label>
        <span>Appearance</span>
        <select
          value={prefs.appearance}
          onChange={(event) =>
            update("appearance", event.target.value as Prefs["appearance"])
          }
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </label>

      <label className="workspace-check">
        <input
          type="checkbox"
          checked={prefs.emailNotifications}
          onChange={(event) => update("emailNotifications", event.target.checked)}
        />
        <span>Email notifications</span>
      </label>

      <label className="workspace-check">
        <input
          type="checkbox"
          checked={prefs.archiveUpdates}
          onChange={(event) => update("archiveUpdates", event.target.checked)}
        />
        <span>Archive update notifications</span>
      </label>

      <label className="workspace-check">
        <input
          type="checkbox"
          checked={prefs.searchAlerts}
          onChange={(event) => update("searchAlerts", event.target.checked)}
        />
        <span>Saved search alerts</span>
      </label>

      <label>
        <span>Profile visibility</span>
        <select
          value={prefs.profileVisibility}
          onChange={(event) =>
            update("profileVisibility", event.target.value as Prefs["profileVisibility"])
          }
        >
          <option value="private">Private</option>
          <option value="members">Members</option>
          <option value="public">Public</option>
        </select>
      </label>

      <div className="workspace-settings-actions">
        <button type="button" className="workspace-cta" onClick={savePreferences}>
          Save settings
        </button>
        {saved ? <p className="workspace-inline-note">{saved}</p> : null}
      </div>
    </div>
  );
}

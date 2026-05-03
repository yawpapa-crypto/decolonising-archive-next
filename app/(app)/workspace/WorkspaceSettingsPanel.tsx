"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Prefs = {
  appearance: "light" | "dark" | "system";
  emailNotifications: boolean;
  archiveUpdates: boolean;
  searchAlerts: boolean;
};

const DEFAULT_PREFS: Prefs = {
  appearance: "system",
  emailNotifications: true,
  archiveUpdates: true,
  searchAlerts: true,
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
      const parsed = JSON.parse(raw) as Partial<Prefs> & { profileVisibility?: unknown };
      delete parsed.profileVisibility;
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
    <div className="workspace-settings-grid dashboard-form">
      <p className="member-profile-help workspace-settings-profile-hint">
        Profile visibility and other account details are saved in{" "}
        <Link href="/workspace?section=profile" className="workspace-link">
          Profile
        </Link>
        .
      </p>

      <label className="dashboard-field">
        <span>Appearance</span>
        <select
          className="dashboard-select"
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

      <label className="workspace-check workspace-check--settings">
        <input
          type="checkbox"
          checked={prefs.emailNotifications}
          onChange={(event) => update("emailNotifications", event.target.checked)}
        />
        <span>Email notifications</span>
      </label>

      <label className="workspace-check workspace-check--settings">
        <input
          type="checkbox"
          checked={prefs.archiveUpdates}
          onChange={(event) => update("archiveUpdates", event.target.checked)}
        />
        <span>Archive update notifications</span>
      </label>

      <label className="workspace-check workspace-check--settings">
        <input
          type="checkbox"
          checked={prefs.searchAlerts}
          onChange={(event) => update("searchAlerts", event.target.checked)}
        />
        <span>Saved search alerts</span>
      </label>

      <div className="workspace-settings-actions dashboard-actions">
        <button type="button" className="admin-button" onClick={savePreferences}>
          Save settings
        </button>
        {saved ? <p className="workspace-inline-note">{saved}</p> : null}
      </div>
    </div>
  );
}

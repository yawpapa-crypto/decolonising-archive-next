"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MemberProfileRecord, ProfileVisibility } from "@/src/lib/member-profile-types";
import { removeProfileAvatar, updateMemberProfile, uploadProfileAvatar } from "./member-profile-actions";

const BIO_MAX = 500;

type FormState = {
  full_name: string;
  display_name: string;
  preferred_name: string;
  contact_email: string;
  website: string;
  affiliation: string;
  organisation: string;
  role_title: string;
  short_bio: string;
  research_interests: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state_region: string;
  postcode: string;
  country: string;
  profile_visibility: ProfileVisibility;
};

function formFromRecord(r: MemberProfileRecord): FormState {
  return {
    full_name: r.full_name ?? "",
    display_name: r.display_name ?? "",
    preferred_name: r.preferred_name ?? "",
    contact_email: r.contact_email ?? "",
    website: r.website ?? "",
    affiliation: r.affiliation ?? "",
    organisation: r.organisation ?? "",
    role_title: r.role_title ?? "",
    short_bio: r.short_bio ?? "",
    research_interests: r.research_interests ?? "",
    address_line_1: r.address_line_1 ?? "",
    address_line_2: r.address_line_2 ?? "",
    city: r.city ?? "",
    state_region: r.state_region ?? "",
    postcode: r.postcode ?? "",
    country: r.country ?? "",
    profile_visibility: r.profile_visibility,
  };
}

function initialsFor(form: FormState, email: string | null) {
  const s =
    form.display_name.trim() ||
    form.preferred_name.trim() ||
    form.full_name.trim() ||
    email?.trim() ||
    "?";
  const parts = s.split(/[\s@._-]+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

export default function MemberProfileEditor({
  initial,
  roleLabel,
}: {
  initial: MemberProfileRecord;
  roleLabel: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(() => formFromRecord(initial));
  const [baseline, setBaseline] = useState<FormState>(() => formFromRecord(initial));
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const previewUrl = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile],
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseline), [form, baseline]);

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
  }, []);

  const discard = useCallback(() => {
    setForm(baseline);
    setMessage(null);
  }, [baseline]);

  const save = useCallback(() => {
    startTransition(async () => {
      setMessage(null);
      const res = await updateMemberProfile({
        full_name: form.full_name,
        display_name: form.display_name,
        preferred_name: form.preferred_name,
        contact_email: form.contact_email,
        website: form.website,
        affiliation: form.affiliation,
        organisation: form.organisation,
        role_title: form.role_title,
        short_bio: form.short_bio,
        research_interests: form.research_interests,
        address_line_1: form.address_line_1,
        address_line_2: form.address_line_2,
        city: form.city,
        state_region: form.state_region,
        postcode: form.postcode,
        country: form.country,
        profile_visibility: form.profile_visibility,
      });
      if (!res.ok) {
        setMessage({ type: "err", text: res.error });
        return;
      }
      setBaseline(form);
      setMessage({ type: "ok", text: "Profile saved." });
      router.refresh();
    });
  }, [form, router]);

  const onPickFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "err", text: "Please choose an image file." });
      return;
    }
    setPendingFile(file);
    setMessage(null);
  }, []);

  const uploadAvatar = useCallback(() => {
    if (!pendingFile) return;
    startTransition(async () => {
      setMessage(null);
      const fd = new FormData();
      fd.set("avatar", pendingFile);
      const res = await uploadProfileAvatar(fd);
      if (!res.ok) {
        setMessage({ type: "err", text: res.error });
        return;
      }
      setAvatarUrl(res.avatar_url);
      setPendingFile(null);
      setMessage({ type: "ok", text: "Profile photo updated." });
      router.refresh();
    });
  }, [pendingFile, router]);

  const clearAvatar = useCallback(() => {
    if (!window.confirm("Remove your profile photo?")) return;
    startTransition(async () => {
      setMessage(null);
      const res = await removeProfileAvatar();
      if (!res.ok) {
        setMessage({ type: "err", text: res.error });
        return;
      }
      setAvatarUrl(null);
      setPendingFile(null);
      setMessage({ type: "ok", text: "Profile photo removed." });
      router.refresh();
    });
  }, [router]);

  const showImg = previewUrl || avatarUrl;
  const busy = isPending;

  return (
    <div className="member-profile-editor">
      {message ? (
        <p
          className={
            message.type === "err" ? "member-profile-error" : "member-profile-success"
          }
          role="status"
        >
          {message.text}
        </p>
      ) : null}

      {dirty ? (
        <p className="member-profile-help member-profile-unsaved">You have unsaved changes.</p>
      ) : null}

      <div className="member-profile-grid">
        <section className="member-profile-card member-profile-section">
          <h3 className="member-profile-section-title">Account</h3>
          <div className="member-profile-identity">
            <div className="member-profile-avatar-wrap">
              {showImg ? (
                // eslint-disable-next-line @next/next/no-img-element -- user-uploaded blob or public URL
                <img
                  src={previewUrl || avatarUrl || ""}
                  alt=""
                  className="member-profile-avatar"
                />
              ) : (
                <span className="member-profile-avatar member-profile-avatar-initials" aria-hidden>
                  {initialsFor(form, initial.email)}
                </span>
              )}
            </div>
            <div className="member-profile-avatar-upload">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="member-profile-file-input"
                onChange={onPickFile}
                aria-label="Choose profile photo"
              />
              <button
                type="button"
                className="admin-button admin-button-secondary member-profile-upload-btn"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                Choose image
              </button>
              <button
                type="button"
                className="admin-button"
                disabled={busy || !pendingFile}
                onClick={uploadAvatar}
              >
                Upload photo
              </button>
              {avatarUrl ? (
                <button
                  type="button"
                  className="admin-button admin-button-secondary"
                  disabled={busy}
                  onClick={clearAvatar}
                >
                  Remove photo
                </button>
              ) : null}
              <p className="member-profile-help">PNG, JPG, WebP or GIF. Max 5 MB.</p>
            </div>
          </div>
          <label className="member-profile-field">
            <span className="member-profile-label">Display name</span>
            <input
              className="member-profile-input"
              value={form.display_name}
              disabled={busy}
              onChange={(e) => setField("display_name", e.target.value)}
              autoComplete="nickname"
            />
          </label>
          <div className="member-profile-field">
            <span className="member-profile-label">Sign-in email</span>
            <p className="member-profile-readonly">{initial.email ?? "—"}</p>
            <p className="member-profile-help">Managed by your account provider. Use contact email below for a different reach-out address.</p>
          </div>
          <p className="member-profile-role-badge">
            <span className="member-profile-label">Role</span>
            <span className={`role-badge role-${initial.role}`}>{roleLabel}</span>
          </p>
        </section>

        <section className="member-profile-card member-profile-section">
          <h3 className="member-profile-section-title">Personal</h3>
          <div className="member-profile-form">
            <label className="member-profile-field">
              <span className="member-profile-label">Full name</span>
              <input
                className="member-profile-input"
                value={form.full_name}
                disabled={busy}
                onChange={(e) => setField("full_name", e.target.value)}
                autoComplete="name"
              />
            </label>
            <label className="member-profile-field">
              <span className="member-profile-label">Preferred name</span>
              <input
                className="member-profile-input"
                value={form.preferred_name}
                disabled={busy}
                onChange={(e) => setField("preferred_name", e.target.value)}
              />
            </label>
            <label className="member-profile-field">
              <span className="member-profile-label">Contact email</span>
              <input
                className="member-profile-input"
                type="email"
                value={form.contact_email}
                disabled={busy}
                onChange={(e) => setField("contact_email", e.target.value)}
                placeholder="Optional"
                autoComplete="email"
              />
            </label>
            <label className="member-profile-field">
              <span className="member-profile-label">Website</span>
              <input
                className="member-profile-input"
                value={form.website}
                disabled={busy}
                onChange={(e) => setField("website", e.target.value)}
                placeholder="https://"
                autoComplete="url"
              />
            </label>
          </div>
        </section>

        <section className="member-profile-card member-profile-section">
          <h3 className="member-profile-section-title">Institution</h3>
          <div className="member-profile-form">
            <label className="member-profile-field">
              <span className="member-profile-label">Affiliation</span>
              <input
                className="member-profile-input"
                value={form.affiliation}
                disabled={busy}
                onChange={(e) => setField("affiliation", e.target.value)}
              />
            </label>
            <label className="member-profile-field">
              <span className="member-profile-label">Organisation</span>
              <input
                className="member-profile-input"
                value={form.organisation}
                disabled={busy}
                onChange={(e) => setField("organisation", e.target.value)}
              />
            </label>
            <label className="member-profile-field">
              <span className="member-profile-label">Role / title</span>
              <input
                className="member-profile-input"
                value={form.role_title}
                disabled={busy}
                onChange={(e) => setField("role_title", e.target.value)}
              />
            </label>
            <label className="member-profile-field">
              <span className="member-profile-label">Research interests</span>
              <textarea
                className="member-profile-textarea"
                rows={3}
                value={form.research_interests}
                disabled={busy}
                onChange={(e) => setField("research_interests", e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="member-profile-card member-profile-section member-profile-section-wide">
          <h3 className="member-profile-section-title">Bio</h3>
          <label className="member-profile-field">
            <span className="member-profile-label">
              Short bio <span className="member-profile-char-count">({form.short_bio.length}/{BIO_MAX})</span>
            </span>
            <textarea
              className="member-profile-textarea"
              rows={5}
              maxLength={BIO_MAX}
              value={form.short_bio}
              disabled={busy}
              onChange={(e) => setField("short_bio", e.target.value)}
            />
            <p className="member-profile-help">Up to {BIO_MAX} characters.</p>
          </label>
        </section>

        <section className="member-profile-card member-profile-section member-profile-section-wide">
          <h3 className="member-profile-section-title">Private location</h3>
          <p className="member-profile-help">
            Address information is private and used only for your account context. It is not shown on public pages.
          </p>
          <div className="member-profile-form member-profile-form-address">
            <label className="member-profile-field">
              <span className="member-profile-label">Address line 1</span>
              <input
                className="member-profile-input"
                value={form.address_line_1}
                disabled={busy}
                onChange={(e) => setField("address_line_1", e.target.value)}
                autoComplete="address-line1"
              />
            </label>
            <label className="member-profile-field">
              <span className="member-profile-label">Address line 2</span>
              <input
                className="member-profile-input"
                value={form.address_line_2}
                disabled={busy}
                onChange={(e) => setField("address_line_2", e.target.value)}
                autoComplete="address-line2"
              />
            </label>
            <label className="member-profile-field">
              <span className="member-profile-label">City</span>
              <input
                className="member-profile-input"
                value={form.city}
                disabled={busy}
                onChange={(e) => setField("city", e.target.value)}
                autoComplete="address-level2"
              />
            </label>
            <label className="member-profile-field">
              <span className="member-profile-label">State / region</span>
              <input
                className="member-profile-input"
                value={form.state_region}
                disabled={busy}
                onChange={(e) => setField("state_region", e.target.value)}
                autoComplete="address-level1"
              />
            </label>
            <label className="member-profile-field">
              <span className="member-profile-label">Postcode</span>
              <input
                className="member-profile-input"
                value={form.postcode}
                disabled={busy}
                onChange={(e) => setField("postcode", e.target.value)}
                autoComplete="postal-code"
              />
            </label>
            <label className="member-profile-field">
              <span className="member-profile-label">Country</span>
              <input
                className="member-profile-input"
                value={form.country}
                disabled={busy}
                onChange={(e) => setField("country", e.target.value)}
                autoComplete="country-name"
              />
            </label>
          </div>
        </section>

        <section className="member-profile-card member-profile-section">
          <h3 className="member-profile-section-title">Visibility</h3>
          <label className="member-profile-field">
            <span className="member-profile-label">Profile visibility</span>
            <select
              className="member-profile-input"
              value={form.profile_visibility}
              disabled={busy}
              onChange={(e) =>
                setField("profile_visibility", e.target.value as ProfileVisibility)
              }
            >
              <option value="private">Private</option>
              <option value="members_only">Members only</option>
              <option value="public">Public</option>
            </select>
          </label>
          <p className="member-profile-help">
            Controls how much of your profile could appear to others if member or public directory features are enabled. Address details stay private.
          </p>
        </section>
      </div>

      <div className="member-profile-actions">
        <button
          type="button"
          className="admin-button"
          disabled={busy || !dirty}
          onClick={save}
        >
          Save profile
        </button>
        <button
          type="button"
          className="admin-button admin-button-secondary"
          disabled={busy || !dirty}
          onClick={discard}
        >
          Discard changes
        </button>
      </div>
    </div>
  );
}

// Sign-up page — Member accounts with profile context for collections research.

import Link from "next/link";
import { redirect } from "next/navigation";
import AuthPageShell from "@/components/auth/AuthPageShell";
import AuthShell from "@/components/auth/AuthShell";
import { getCurrentUser } from "@/src/lib/auth";
import { safeNextPath } from "@/src/lib/security/validate";
import { resendSignupConfirmation, signUpMember } from "./actions";
import "@/app/styles/auth-pages.css";

type SearchParams = Promise<{
  next?: string;
  error?: string;
  sent?: string;
  email?: string;
  updated?: string;
}>;

const COLLECTION_OPTIONS = [
  { value: "", label: "Select a primary interest (optional)" },
  { value: "ghana-graphic-design", label: "Ghana Graphic Design" },
  { value: "african-archives", label: "African Archives" },
  { value: "library-sources", label: "Library & federated sources" },
  { value: "workbench", label: "Workbench notes & reading lists" },
  { value: "community", label: "Reading Commons / community" },
  { value: "multiple", label: "Multiple areas" },
];

const HEARD_ABOUT_OPTIONS = [
  { value: "", label: "How did you hear about us? (optional)" },
  { value: "colleague", label: "Colleague or word of mouth" },
  { value: "university", label: "University / institution" },
  { value: "conference", label: "Conference or event" },
  { value: "social", label: "Social media" },
  { value: "search", label: "Search engine" },
  { value: "newsletter", label: "Email or newsletter" },
  { value: "other", label: "Other" },
];

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next);

  const user = await getCurrentUser();
  if (user) redirect(next);

  return (
    <AuthPageShell>
      <AuthShell mode="signup">
        <div className="auth-card auth-card--wide">
          <p className="auth-eyebrow">Member registration</p>
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-sub">
            Members can bookmark records, save searches, and build reading lists.
            Curator and admin access is assigned by an admin — never self-selected.
          </p>

          {sp.error ? <p className="auth-error">{sp.error}</p> : null}
          {sp.updated ? <p className="auth-notice">{sp.updated}</p> : null}

          {sp.sent ? (
            <div className="auth-sent-panel">
              <p className="auth-notice">
                Check <strong>{sp.email ?? "your inbox"}</strong> for a confirmation link.
                Once confirmed, you can sign in and start saving research.
              </p>
              <form action={resendSignupConfirmation} className="auth-resend-row">
                <input type="hidden" name="email" value={sp.email ?? ""} />
                <button type="submit" className="auth-inline-button">
                  Resend confirmation email
                </button>
              </form>
            </div>
          ) : (
            <form action={signUpMember} className="auth-form">
              <fieldset className="auth-fieldset">
                <legend>About you</legend>
                <div className="auth-field-grid">
                  <label className="auth-field auth-field--full">
                    <span>Full name</span>
                    <input type="text" name="full_name" autoComplete="name" />
                  </label>
                  <label className="auth-field">
                    <span>Affiliation</span>
                    <input
                      type="text"
                      name="affiliation"
                      placeholder="University, studio, community…"
                      autoComplete="organization"
                    />
                  </label>
                  <label className="auth-field">
                    <span>Organisation</span>
                    <input type="text" name="organisation" placeholder="Department or group" />
                  </label>
                  <label className="auth-field auth-field--full">
                    <span>Role / practice</span>
                    <input
                      type="text"
                      name="role_title"
                      placeholder="Researcher, designer, curator, student…"
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="auth-fieldset">
                <legend>Location</legend>
                <div className="auth-field-grid">
                  <label className="auth-field">
                    <span>Country</span>
                    <input type="text" name="country" autoComplete="country-name" />
                  </label>
                  <label className="auth-field">
                    <span>Region / state</span>
                    <input type="text" name="state_region" autoComplete="address-level1" />
                  </label>
                  <label className="auth-field auth-field--full">
                    <span>City</span>
                    <input type="text" name="city" autoComplete="address-level2" />
                  </label>
                </div>
              </fieldset>

              <fieldset className="auth-fieldset">
                <legend>Archive interests</legend>
                <label className="auth-field">
                  <span>Primary collection interest</span>
                  <select name="collection_interest" defaultValue="">
                    {COLLECTION_OPTIONS.map((opt) => (
                      <option key={opt.value || "default"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="auth-field">
                  <span>Research interests</span>
                  <textarea
                    name="research_interests"
                    placeholder="Topics, periods, or communities you work with (optional)"
                  />
                </label>
                <label className="auth-field">
                  <span>How did you hear about us?</span>
                  <select name="heard_about" defaultValue="">
                    {HEARD_ABOUT_OPTIONS.map((opt) => (
                      <option key={opt.value || "default"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </fieldset>

              <fieldset className="auth-fieldset">
                <legend>Account</legend>
                <label className="auth-field">
                  <span>Email</span>
                  <input type="email" name="email" autoComplete="email" required />
                </label>
                <label className="auth-field">
                  <span>Phone (optional)</span>
                  <input type="tel" name="phone" autoComplete="tel" />
                </label>
                <label className="auth-field auth-field--full">
                  <span>Password</span>
                  <input
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                  />
                  <small className="auth-hint">At least 8 characters.</small>
                </label>
              </fieldset>

              <label className="auth-optin">
                <input type="checkbox" name="newsletter_opt_in" />
                <span className="auth-optin-copy">
                  <strong>Join our email list</strong>
                  <small>
                    Occasional updates on collections, research tools, and community features.
                  </small>
                </span>
              </label>

              <button type="submit" className="auth-submit">
                Create account
              </button>
            </form>
          )}

          <p className="auth-footer">
            Already have an account?{" "}
            <Link href={`/signin?next=${encodeURIComponent(next)}`}>Sign in</Link>.
          </p>
        </div>
      </AuthShell>
    </AuthPageShell>
  );
}

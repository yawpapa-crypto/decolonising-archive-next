"use client";
import { onboardingConfig } from "@/lib/onboarding/config";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUpMember } from "./actions";
import AuthSubmit from "@/components/auth/AuthSubmit";
import AredLogo from "@/app/home-next/AredLogo";

export default function SignupFlow({ next, error }: { next: string; error?: string }) {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const goBack = () => {
    if (step > 0) return setStep(0);
    // Return to wherever the visitor came from on ARED; otherwise to the archive.
    const sameSite = typeof document !== "undefined" && document.referrer.startsWith(location.origin);
    if (sameSite && history.length > 1) router.back(); else router.push("/");
  };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const emailInput = useRef<HTMLInputElement>(null);
  return <section className="signup-sequence">
    <div className="signup-progress"><button type="button" className="signup-back" aria-label={step === 0 ? "Back" : "Back to email"} onClick={goBack}><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button><Link href="/" aria-label="ARED home"><AredLogo size={30} /></Link><span className="signup-step">{step + 1} / 2</span></div>
    <div className="signup-stage" key={step}>
      <h1>{onboardingConfig.signup[step].title}</h1>
      <p>{step === 0 ? <>Create an account, or <Link href={`/signin?next=${encodeURIComponent(next)}`}>log in</Link></> : onboardingConfig.signup[1].description}</p>
      {error && <p className="signup-error" role="alert">{error}</p>}
      {step === 0 ? <form onSubmit={e => { e.preventDefault(); if (emailInput.current?.reportValidity()) setStep(1); }}>
        <label className="signup-input"><span className="ared-sr">Email address</span><input ref={emailInput} type="email" autoComplete="email" placeholder="Enter your email address" value={email} onChange={e => setEmail(e.target.value)} required autoFocus /></label>
        <button className="signup-next" disabled={!email.trim()}>Next</button>
        <p className="signup-terms">By creating an account, you agree to our <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.</p>
      </form> : <form action={signUpMember}>
        <input type="hidden" name="next" value={next} /><input type="hidden" name="email" value={email} />
        <label className="signup-input"><span className="ared-sr">Password</span><input type={show ? "text" : "password"} name="password" aria-label="Password" autoComplete="new-password" placeholder="Password" minLength={onboardingConfig.signup[1].minLength} required autoFocus value={password} onChange={e => setPassword(e.target.value)} /><button type="button" className="signup-reveal" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(v => !v)}>{show ? "Hide" : "Show"}</button></label>
        <AuthSubmit disabled={password.length < onboardingConfig.signup[1].minLength} pendingLabel="Creating your account…">Create account</AuthSubmit>
        <p className="signup-terms">Confirm your email, then personalise ARED when you’re ready.</p>
      </form>}
    </div><Link href="/" className="signup-brand">ARED</Link>
  </section>;
}

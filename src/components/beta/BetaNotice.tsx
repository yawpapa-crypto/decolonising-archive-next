"use client";

import { useEffect, useState } from "react";
import { markBetaNoticeSeen } from "@/lib/onboarding-actions";
import SupportLink from "@/src/components/site/SupportLink";

const LS_KEY = "da_beta_notice_seen";

type Props = {
  /** Server-side initial value from profiles.beta_notice_seen */
  initialSeen?: boolean;
};

export default function BetaNotice({ initialSeen = false }: Props) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Already dismissed via DB — honour it even if localStorage was cleared
    if (initialSeen) return;
    try {
      if (!localStorage.getItem(LS_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable — still show
      setVisible(true);
    }
  }, [initialSeen]);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(LS_KEY, "1");
    } catch {
      // ignore
    }
    void markBetaNoticeSeen();
  }

  // Avoid hydration mismatch — render nothing until client has mounted
  if (!mounted || !visible) return null;

  return (
    <div className="beta-notice" role="status" aria-live="polite">
      <div className="beta-notice__inner">
        <span className="beta-notice__pill">Public Beta</span>
        <p className="beta-notice__text">
          Decolonising Archive is in public beta. Features are evolving — your feedback shapes what
          comes next.{" "}
          <a href="/changelog" className="beta-notice__link">
            See what&apos;s new
          </a>
          <span className="beta-notice__separator" aria-hidden="true">
            ·
          </span>
          <SupportLink area="beta" className="beta-notice__link">
            Support beta development
          </SupportLink>
        </p>
        <button
          type="button"
          className="beta-notice__close"
          aria-label="Dismiss beta notice"
          onClick={dismiss}
        >
          ×
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

export default function InvitationMotion() {
  const [paused, setPaused] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const section = button.current?.closest<HTMLElement>(".ared-band--cta");
    if (!section) return;
    section.dataset.paused = String(paused);
    const observer = new IntersectionObserver(([entry]) => {
      section.dataset.offscreen = String(!entry.isIntersecting);
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, [paused]);
  return <button ref={button} type="button" className="ared-cta__motion" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? "Resume image motion" : "Pause image motion"}</button>;
}

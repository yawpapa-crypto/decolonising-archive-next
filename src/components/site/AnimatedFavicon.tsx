"use client";

import { useEffect } from "react";

/** A quiet breathing favicon; no page content or styles are affected. */
export default function AnimatedFavicon() {
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const context = canvas.getContext("2d");
    if (!context) return;
    const icon = document.createElement("link");
    icon.rel = "icon";
    icon.type = "image/png";
    const mark = new Image();
    let timer: ReturnType<typeof setInterval> | undefined;
    let disposed = false;
    let frame = 0;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const darkMode = window.matchMedia("(prefers-color-scheme: dark)");
    function draw() {
      if (!context) return;
      const calm = motion.matches || document.documentElement.dataset.aredCalm === "true";
      const pulse = calm ? 0 : (1 - Math.cos(frame++ * Math.PI / 12)) / 2;
      const dark = darkMode.matches;
      context.clearRect(0, 0, 64, 64);
      context.globalCompositeOperation = "source-over";
      context.fillStyle = dark ? "#f7f5f3" : "#111111";
      context.beginPath();
      context.arc(32, 32, 32, 0, Math.PI * 2);
      context.fill();
      const size = 34 - pulse * 1.2;
      const tint = document.createElement("canvas");
      tint.width = tint.height = 64;
      const t = tint.getContext("2d");
      if (!t) return;
      t.drawImage(mark, (64 - size) / 2, (64 - size) / 2, size, size);
      t.globalCompositeOperation = "source-in";
      t.fillStyle = dark ? "#111111" : "#f7f5f3";
      t.fillRect(0, 0, 64, 64);
      context.drawImage(tint, 0, 0);
      icon.href = canvas.toDataURL("image/png");
    }
    mark.onload = () => {
      if (disposed) return;
      draw();
      document.head.appendChild(icon);
      darkMode.addEventListener("change", draw);
      timer = setInterval(() => { if (!document.hidden) draw(); }, 250);
    };
    mark.src = "/images/ared-logo.png";
    return () => {
      disposed = true;
      if (timer) clearInterval(timer);
      darkMode.removeEventListener("change", draw);
      icon.remove();
    };
  }, []);
  return null;
}

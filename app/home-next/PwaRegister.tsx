"use client";
import { useEffect } from "react";

/** Registers the service worker in production so the archive keeps working on weak connections. */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const reg = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") reg(); else window.addEventListener("load", reg, { once: true });
  }, []);
  return null;
}

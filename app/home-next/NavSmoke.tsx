"use client";
import { useEffect } from "react";
export default function NavSmoke() {
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>(".ared-nav");
    const update = () => nav?.classList.toggle("ared-nav--scrolled", window.scrollY > 24);
    update(); window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return null;
}

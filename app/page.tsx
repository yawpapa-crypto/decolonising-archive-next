"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    if (!window.location.hash) {
      window.location.replace("/#/home");
    }
  }, []);

  return null;
}

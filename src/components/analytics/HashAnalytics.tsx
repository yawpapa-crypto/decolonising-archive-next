"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";

function getHashRoute() {
  const hash = window.location.hash || "#/home";
  const cleaned = hash.replace(/^#\/?/, "").trim();
  return cleaned || "home";
}

export default function HashAnalytics() {
  useEffect(() => {
    let lastRoute = "";

    const sendRouteEvent = () => {
      const route = getHashRoute();
      if (route === lastRoute) return;
      lastRoute = route;

      track("hash_route_view", {
        route,
        hash: window.location.hash || "#/home",
      });
    };

    sendRouteEvent();
    window.addEventListener("hashchange", sendRouteEvent);

    return () => {
      window.removeEventListener("hashchange", sendRouteEvent);
    };
  }, []);

  return null;
}

"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";

function getPathRoute() {
  const path = window.location.pathname || "/home";
  return path === "/" ? "/home" : path;
}

export default function RouteAnalytics() {
  useEffect(() => {
    let lastRoute = "";

    const sendRouteEvent = () => {
      const route = getPathRoute();
      if (route === lastRoute) return;
      lastRoute = route;

      track("archive_route_view", {
        route,
        path: window.location.pathname || "/home",
      });
    };

    sendRouteEvent();
    window.addEventListener("popstate", sendRouteEvent);
    window.addEventListener("archive:navigation", sendRouteEvent);

    return () => {
      window.removeEventListener("popstate", sendRouteEvent);
      window.removeEventListener("archive:navigation", sendRouteEvent);
    };
  }, []);

  return null;
}

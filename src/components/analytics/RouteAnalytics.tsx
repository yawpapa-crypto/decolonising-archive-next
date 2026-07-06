"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { track } from "@vercel/analytics";

function getPathRoute() {
  const path = window.location.pathname || "/home";
  return path === "/" ? "/home" : path;
}

export default function RouteAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";

  useEffect(() => {
    const route = pathname === "/" ? "/home" : pathname || getPathRoute();
    const path = `${pathname || window.location.pathname || "/"}${search ? `?${search}` : ""}`;

    track("archive_route_view", {
      route,
      path,
    });
  }, [pathname, search]);

  return null;
}

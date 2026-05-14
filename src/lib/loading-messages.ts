/** Human-readable PageLoader copy for in-app navigations. */
export function archiveLoadingMessage(pathname: string): string {
  const path = pathname.split("?")[0] || pathname;
  if (path === "/" || path === "/home") return "Opening home…";
  if (path.startsWith("/library")) return "Opening library…";
  if (path.startsWith("/sources")) return "Opening sources…";
  if (path.startsWith("/about")) return "Opening about…";
  if (path.startsWith("/records/")) return "Opening record…";
  return "Loading archive…";
}

export function memberLoadingMessage(pathname: string): string {
  const path = pathname.split("?")[0] || pathname;
  if (path.startsWith("/workspace")) return "Opening workspace…";
  if (path.startsWith("/my/workbench")) return "Opening workbench…";
  if (path.startsWith("/my/")) return "Loading your workspace…";
  if (path.startsWith("/curator")) return "Opening curator tools…";
  if (path.startsWith("/admin")) return "Opening admin…";
  if (path.startsWith("/auth")) return "Loading…";
  return "Loading…";
}

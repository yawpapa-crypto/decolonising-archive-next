/** Map workbench review action errors to HTTP status codes. */
export function reviewApiStatus(
  res: { ok: boolean; error?: string },
  created = false,
): number {
  if (!res.ok && res.error === "Not signed in.") return 401;
  if (res.ok) return created ? 201 : 200;
  return 400;
}

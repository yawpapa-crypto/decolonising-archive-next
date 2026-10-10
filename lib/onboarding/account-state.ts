/** Missing preference fields never establish that an existing identity is new. */
export type AccountState = "new" | "returning-legacy" | "returning-complete" | "partial";
export function accountState(
  user: { user_metadata?: Record<string, unknown> },
  progress: { step: number; completedAt: string | null },
): AccountState {
  if (progress.completedAt) return "returning-complete";
  if (progress.step > 0) return "partial";
  return user.user_metadata?.ared_signup_version === 1 ? "new" : "returning-legacy";
}

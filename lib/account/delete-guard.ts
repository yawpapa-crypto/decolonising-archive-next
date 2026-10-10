/** Account deletion is irreversible: the typed address must match the signed-in address exactly (case aside). */
export function emailConfirmed(typed: unknown, accountEmail: string | null | undefined): boolean {
  const a = String(typed ?? "").trim().toLowerCase();
  const b = String(accountEmail ?? "").trim().toLowerCase();
  return a.length > 3 && b.length > 3 && a === b;
}

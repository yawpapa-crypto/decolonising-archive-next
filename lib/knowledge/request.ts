import { NextResponse } from "next/server";
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  // Next may expose the internal upstream address in request.url. Host is the
  // HTTP authority the browser actually contacted; never trust forwarded-host.
  try {
    const parsed=new URL(origin??"");
    const host=request.headers.get("host")??new URL(request.url).host;
    const protocol=request.headers.get("x-forwarded-proto")??new URL(request.url).protocol.slice(0,-1);
    if(parsed.origin===origin && parsed.host===host && parsed.protocol===`${protocol}:`)return null;
  }catch { /* reject malformed/missing origins */ }
  return NextResponse.json({ error:"This request must come from ARED." },{status:403});
}
export function publicEvidence(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2000) return null;
  try { const url = new URL(value); return ["https:","http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}

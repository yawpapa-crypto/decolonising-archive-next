import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";
const LOG = join(process.cwd(), "tmp", "visual-job.log");

/**
 * Dev-only: run the visual resolver on this machine (where sharp and the image hosts work).
 * POST ?push=1 also upserts into public.visual_assets. GET returns the log tail.
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not found", { status: 404 });
  const push = new URL(req.url).searchParams.get("push") === "1";
  const skip = new URL(req.url).searchParams.get("skipIndex") === "1";
  mkdirSync(join(process.cwd(), "tmp"), { recursive: true });
  const out = openSync(LOG, "w");
  const args = ["scripts/resolve-visuals.mjs", "--limit", "3000", ...(skip ? ["--skip-index"] : []), ...(push ? ["--push"] : [])];
  const child = spawn(process.execPath, args, { cwd: process.cwd(), detached: true, stdio: ["ignore", out, out] });
  child.unref();
  return NextResponse.json({ started: true, pid: child.pid, args });
}

export async function GET() {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not found", { status: 404 });
  const log = existsSync(LOG) ? readFileSync(LOG, "utf8") : "";
  const idx = join(process.cwd(), "data", "visual-index.json");
  let entries = 0;
  try { entries = Object.keys(JSON.parse(readFileSync(idx, "utf8"))).length; } catch {}
  return NextResponse.json({ entries, log: log.slice(-2000) });
}

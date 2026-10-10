import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";
const ok = (s: string | null) => Boolean(s && /^[a-z0-9-]+$/.test(s) && existsSync(join(process.cwd(), "scripts", "film", `${s}.mjs`)));

/** Dev-only: run one of the launch-film capture scripts (scripts/film/*.mjs) on this machine. */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not found", { status: 404 });
  const s = new URL(req.url).searchParams.get("script");
  if (!ok(s)) return NextResponse.json({ error: "unknown script" }, { status: 400 });
  mkdirSync(join(process.cwd(), "tmp", "film"), { recursive: true });
  const out = openSync(join(process.cwd(), "tmp", "film", `${s}.log`), "w");
  const child = spawn(process.execPath, [join("scripts", "film", `${s}.mjs`)], { cwd: process.cwd(), detached: true, stdio: ["ignore", out, out] });
  child.unref();
  return NextResponse.json({ started: s, pid: child.pid });
}

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not found", { status: 404 });
  const s = new URL(req.url).searchParams.get("script");
  if (!ok(s)) return NextResponse.json({ error: "unknown script" }, { status: 400 });
  const f = join(process.cwd(), "tmp", "film", `${s}.log`);
  return NextResponse.json({ log: existsSync(f) ? readFileSync(f, "utf8").slice(-3000) : "" });
}

import { NextResponse } from "next/server";
import { getCurrentProfile, hasRole, type Profile } from "@/src/lib/auth";

export function isGuardResponse(value: Profile | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}

export async function requireMemberApi(): Promise<Profile | NextResponse> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }
  return profile;
}

export async function requireAdminApi(): Promise<Profile | NextResponse> {
  const profile = await getCurrentProfile();
  if (!profile) {
    console.warn("[security] unauthenticated admin API access attempt");
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }
  if (!hasRole(profile, "admin")) {
    console.warn("[security] forbidden admin API access", { userId: profile.id });
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }
  return profile;
}

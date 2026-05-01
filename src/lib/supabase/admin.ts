// Service-role Supabase client. SERVER-ONLY — never import this from a
// "use client" component or expose it to the browser. The service role key
// bypasses Row Level Security entirely.
//
// Use this for privileged operations that the admin user is allowed to do
// but RLS doesn't cover, e.g. listing users from auth.users via
// supabase.auth.admin.listUsers().

import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

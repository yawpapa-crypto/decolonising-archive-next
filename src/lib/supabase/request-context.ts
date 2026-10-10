import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { SupabaseClient } from "@supabase/supabase-js";
/** Request-local identity; never share a mutable authenticated client across requests. */
export const discoveryAuthContext = new AsyncLocalStorage<SupabaseClient>();

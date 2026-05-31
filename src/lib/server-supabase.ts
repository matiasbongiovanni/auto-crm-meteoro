import { createClient } from "@supabase/supabase-js";
import { getServerSupabaseEnv, getServerSupabaseEnvError } from "@/lib/supabase-env";

export function getSupabaseServerClient() {
  const env = getServerSupabaseEnv();

  if (!env) {
    throw new Error(getServerSupabaseEnvError() || "Missing Supabase server environment variables.");
  }

  return createClient(env.url, env.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

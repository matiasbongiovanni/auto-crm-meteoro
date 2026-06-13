import { NextResponse } from "next/server";
import { getPublicSupabaseEnv } from "@/lib/supabase-env";
import { ALLOWED_EMAILS } from "@/lib/allowed-emails";

export async function requireAuth(
  authHeader: string | null
): Promise<{ user: Record<string, unknown> } | NextResponse> {
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const env = getPublicSupabaseEnv();
  if (!env) {
    return NextResponse.json({ error: "Config inválida" }, { status: 500 });
  }
  const res = await fetch(`${env.url}/auth/v1/user`, {
    headers: { apikey: env.anonKey, authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const user = await res.json();
  if (!user?.email || !ALLOWED_EMAILS.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }
  return { user };
}

export function isAuthResponse(
  result: { user: Record<string, unknown> } | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}

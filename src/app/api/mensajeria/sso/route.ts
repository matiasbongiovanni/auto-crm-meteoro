import { NextRequest, NextResponse } from "next/server";
import { getSsoLoginUrl } from "@/lib/chatwoot";
import { getPublicSupabaseEnv } from "@/lib/supabase-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const env = getPublicSupabaseEnv();
  if (!env) return null;

  const res = await fetch(`${env.url}/auth/v1/user`, {
    headers: { apikey: env.anonKey, authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const userId = process.env.CHATWOOT_AGENT_USER_ID;
  if (!userId) {
    return NextResponse.json(
      { error: "CHATWOOT_AGENT_USER_ID no configurado" },
      { status: 503 },
    );
  }

  try {
    const url = await getSsoLoginUrl(userId);
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { getPublicSupabaseEnv } from "@/lib/supabase-env";
import { ALLOWED_EMAILS } from "@/lib/allowed-emails";

export const runtime = "nodejs";

const AGENTKIT_URL = process.env.AGENTKIT_URL ?? "http://localhost:8000";
const AGENTKIT_TOKEN = process.env.AGENTKIT_ADMIN_TOKEN ?? "";

async function readUser(authHeader: string | null) {
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const env = getPublicSupabaseEnv();
  if (!env) return null;
  const res = await fetch(`${env.url}/auth/v1/user`, {
    headers: { apikey: env.anonKey, authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const user = await res.json();
  if (!user?.email || !ALLOWED_EMAILS.includes(user.email.toLowerCase())) return null;
  return user;
}

export async function GET(request: Request) {
  const user = await readUser(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const res = await fetch(`${AGENTKIT_URL}/config/status`, {
      headers: { "x-admin-token": AGENTKIT_TOKEN },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Agentkit no disponible" }, { status: 503 });
  }
}

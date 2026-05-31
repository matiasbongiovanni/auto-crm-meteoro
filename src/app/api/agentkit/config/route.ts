import { NextRequest, NextResponse } from "next/server";
import { getPublicSupabaseEnv } from "@/lib/supabase-env";

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
  return res.json();
}

export async function GET(request: NextRequest) {
  const user = await readUser(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const section = request.nextUrl.searchParams.get("section");
  if (!section) return NextResponse.json({ error: "Parámetro 'section' requerido" }, { status: 400 });

  try {
    const res = await fetch(`${AGENTKIT_URL}/config/${section}`, {
      headers: { "x-admin-token": AGENTKIT_TOKEN },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Agentkit no disponible" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const user = await readUser(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const section = request.nextUrl.searchParams.get("section");
  if (!section) return NextResponse.json({ error: "Parámetro 'section' requerido" }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });

  try {
    const res = await fetch(`${AGENTKIT_URL}/config/${section}`, {
      method: "POST",
      headers: {
        "x-admin-token": AGENTKIT_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Agentkit no disponible" }, { status: 503 });
  }
}

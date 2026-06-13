import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicSupabaseEnv } from "@/lib/supabase-env";

export const runtime = "nodejs";

const WEBHOOK_URL =
  process.env.N8N_PRESUPUESTO_WEBHOOK_URL ??
  "https://meteoro-n8n.y5n0hs.easypanel.host/webhook/generacion-presupuestos";

export async function POST(request: NextRequest) {
  const env = getPublicSupabaseEnv();
  if (!env) return NextResponse.json({ error: "Servicio no disponible." }, { status: 503 });

  const cookieStore = await cookies();
  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: { getAll: () => cookieStore.getAll() },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

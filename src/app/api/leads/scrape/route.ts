import { NextRequest, NextResponse } from "next/server";
import { getPublicSupabaseEnv } from "@/lib/supabase-env";
import { getSupabaseServerClient } from "@/lib/server-supabase";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";

export const runtime = "nodejs";

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

function roleRank(role?: string) {
  if (role === "ceo") return 3;
  if (role === "admin") return 2;
  if (role === "freelancer") return 1;
  return 0;
}

export async function POST(request: NextRequest) {
  const user = await readUser(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const admin = getSupabaseServerClient();
  const { data: profile } = await admin
    .from("crm_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleRank(profile?.role) < 2)
    return NextResponse.json({ error: "Forbidden — requiere admin o ceo" }, { status: 403 });

  let body: { type: string; params?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!["maps", "instagram"].includes(body.type))
    return NextResponse.json({ error: "type debe ser 'maps' o 'instagram'" }, { status: 400 });

  const row = {
    id: crypto.randomUUID(),
    workspace_id: DEFAULT_WORKSPACE_ID,
    type: body.type,
    params: body.params || {},
    status: "pending",
    created_by: user.id,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await admin.from("crm_lead_jobs").insert(row).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, job: data }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const user = await readUser(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const admin = getSupabaseServerClient();
  const { data, error } = await admin
    .from("crm_lead_jobs")
    .select("*")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, jobs: data || [] });
}

// Worker API — authenticated by API key (not Supabase session).
// Workers call GET to claim pending jobs and PATCH to update status.
import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, requireScope } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/server-supabase";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const ctx = await authenticateApiKey(request);
  const guard = requireScope(ctx, "read");
  if (guard) return guard;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "pending";
  const limit = Math.min(Number(url.searchParams.get("limit") || "10"), 50);

  const admin = getSupabaseServerClient();
  const { data, error } = await admin
    .from("crm_lead_jobs")
    .select("*")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("status", status)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, jobs: data || [] });
}

export async function PATCH(request: NextRequest) {
  const ctx = await authenticateApiKey(request);
  const guard = requireScope(ctx, "write");
  if (guard) return guard;

  let body: {
    id: string;
    status: string;
    result_count?: number;
    error_msg?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const VALID_STATUSES = new Set(["running", "done", "error"]);
  if (!VALID_STATUSES.has(body.status))
    return NextResponse.json({ error: "status inválido" }, { status: 400 });

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { status: body.status };
  if (body.status === "running") update.started_at = now;
  if (body.status === "done" || body.status === "error") update.finished_at = now;
  if (body.result_count !== undefined) update.result_count = body.result_count;
  if (body.error_msg) update.error_msg = body.error_msg;

  const admin = getSupabaseServerClient();
  const { error } = await admin
    .from("crm_lead_jobs")
    .update(update)
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

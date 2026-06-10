import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, requireScope } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/server-supabase";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await authenticateApiKey(request);
  const guard = requireScope(ctx, "write");
  if (guard) return guard;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const allowed: Record<string, unknown> = {};
  if (body.link_documento !== undefined) allowed.link_documento = body.link_documento;
  if (body.estado !== undefined) allowed.estado = body.estado;
  if (body.notas !== undefined) allowed.notas = body.notas;
  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "Sin campos para actualizar" }, { status: 400 });
  }
  allowed.updated_at = new Date().toISOString();

  const admin = getSupabaseServerClient();
  const { data, error } = await admin
    .from("crm_proposals")
    .update(allowed)
    .eq("id", id)
    .eq("workspace_id", "workspace:meteoro")
    .select("id, link_documento")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Propuesta no encontrada" }, { status: 404 });

  return NextResponse.json({ ok: true, id: data.id, link_documento: data.link_documento });
}

import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, requireScope } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/server-supabase";

export const runtime = "nodejs";

const TEMPERATURA_MAP: Record<string, string> = {
  cold: "frio", warm: "tibio", hot: "caliente",
  frio: "frio", tibio: "tibio", caliente: "caliente",
};

export async function POST(request: NextRequest) {
  const ctx = await authenticateApiKey(request);
  const denied = requireScope(ctx, "write");
  if (denied) return denied;

  let body: {
    leadId?: string;
    contactId?: string;
    temperatura?: string;
    temperature?: string;
    notas?: string;
    notes?: string;
    canal_contacto?: string;
    activityType?: string;
    activityDescription?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const leadId = body.leadId || body.contactId;
  if (!leadId) return NextResponse.json({ error: "Falta leadId o contactId" }, { status: 400 });

  const admin = getSupabaseServerClient();
  const { data: existing } = await admin.from("crm_leads").select("id").eq("id", leadId).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    ultimo_contacto: new Date().toISOString(),
  };

  const tempRaw = body.temperatura || body.temperature;
  if (tempRaw) updateData.temperatura = TEMPERATURA_MAP[tempRaw] || tempRaw;
  if (body.notas || body.notes) updateData.notas = body.notas || body.notes;
  if (body.canal_contacto) updateData.canal_contacto = body.canal_contacto;

  const { error } = await admin.from("crm_leads").update(updateData).eq("id", leadId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, leadId });
}

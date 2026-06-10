import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, requireScope } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/server-supabase";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ctx = await authenticateApiKey(request);
  const guard = requireScope(ctx, "write");
  if (guard) return guard;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const admin = getSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);

  // Upload PDF if provided
  let link_documento: string | null = null;
  const pdfBase64 = body.pdf_base64 as string | undefined;
  const fileName = body.file_name as string | undefined;
  if (pdfBase64 && fileName) {
    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    const storagePath = `${fileName}.pdf`;
    const { error: uploadError } = await admin.storage
      .from("proposals")
      .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });
    if (!uploadError) {
      const { data: urlData } = admin.storage.from("proposals").getPublicUrl(storagePath);
      link_documento = urlData.publicUrl;
    }
  }

  // If proposalId provided → just update that record with link_documento
  const proposalId = body.proposal_id as string | undefined;
  if (proposalId) {
    if (link_documento) {
      await admin
        .from("crm_proposals")
        .update({ link_documento, updated_at: new Date().toISOString() })
        .eq("id", proposalId)
        .eq("workspace_id", "workspace:meteoro");
    }
    return NextResponse.json({ ok: true, id: proposalId, link_documento }, { status: 200 });
  }

  // Otherwise → create new record
  const cliente = String(body.cliente || "").trim();
  const concepto = String(body.concepto || "").trim();
  if (!cliente || !concepto) {
    return NextResponse.json({ error: "cliente y concepto son requeridos" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const today3 = new Date();
  today3.setDate(today3.getDate() + 3);

  const estadoRaw = String(body.estado || "enviado");
  const estado = ["enviado", "en_negociacion", "aceptado", "rechazado", "vencido"].includes(estadoRaw)
    ? estadoRaw : "enviado";

  const { data, error } = await admin
    .from("crm_proposals")
    .insert({
      id,
      workspace_id: "workspace:meteoro",
      user_id: "n8n-automation",
      cliente,
      concepto,
      monto_usd: body.monto_usd != null ? Number(body.monto_usd) : null,
      fecha_envio: today,
      proximo_seguimiento: today3.toISOString().slice(0, 10),
      estado,
      link_documento,
      notas: String(body.notas || ""),
      datos: body.datos ?? null,
    })
    .select("id, link_documento")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id, link_documento: data.link_documento }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const ctx = await authenticateApiKey(request);
  const guard = requireScope(ctx, "read");
  if (guard) return guard;

  const admin = getSupabaseServerClient();
  const { data, error } = await admin
    .from("crm_proposals")
    .select("id, cliente, concepto, monto_usd, fecha_envio, estado, link_documento, created_at")
    .eq("workspace_id", "workspace:meteoro")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, proposals: data });
}

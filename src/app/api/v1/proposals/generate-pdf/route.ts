import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, requireScope } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/server-supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

const GOTENBERG_URL = process.env.GOTENBERG_URL ?? "https://demo.gotenberg.dev";

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

  const html = String(body.html || "").trim();
  const proposalId = body.proposal_id as string | undefined;
  const fileName = String(body.file_name || `presupuesto-${Date.now()}`);

  if (!html) return NextResponse.json({ error: "html requerido" }, { status: 400 });

  // Build multipart/form-data body for Gotenberg
  const boundary = `----MeteoroBoundary${Date.now()}`;
  const htmlBytes = Buffer.from(html, "utf-8");
  const multipart = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="index.html"\r\nContent-Type: text/html\r\n\r\n`),
    htmlBytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  // Call Gotenberg
  let pdfBuffer: Buffer;
  try {
    const res = await fetch(`${GOTENBERG_URL}/forms/chromium/convert/html`, {
      method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body: multipart,
    });
    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Gotenberg error: ${err}` }, { status: 502 });
    }
    pdfBuffer = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    return NextResponse.json({ error: `PDF generation failed: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }

  // Upload to Supabase Storage
  const admin = getSupabaseServerClient();
  const storagePath = `${fileName}.pdf`;
  const { error: uploadError } = await admin.storage
    .from("proposals")
    .upload(storagePath, pdfBuffer, { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const { data: urlData } = admin.storage.from("proposals").getPublicUrl(storagePath);
  const link_documento = urlData.publicUrl;

  // Update proposal record if id provided
  if (proposalId) {
    await admin
      .from("crm_proposals")
      .update({ link_documento, updated_at: new Date().toISOString() })
      .eq("id", proposalId)
      .eq("workspace_id", "workspace:meteoro");
  }

  return NextResponse.json({ ok: true, link_documento, proposal_id: proposalId ?? null }, { status: 200 });
}

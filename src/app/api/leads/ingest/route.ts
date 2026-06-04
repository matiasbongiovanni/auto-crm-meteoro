import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { authenticateApiKey, requireScope } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/server-supabase";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";

export const runtime = "nodejs";

type IngestLead = {
  nombre?: string;
  name?: string;
  telefono?: string;
  phone?: string;
  email?: string;
  empresa?: string;
  company?: string;
  notas?: string;
  notes?: string;
  origen?: string;
  nicho?: string;
  ciudad?: string;
  pais?: string;
  ig_handle?: string;
  temperatura?: string;
};

function normalize(raw: IngestLead) {
  return {
    nombre: raw.nombre || raw.name || "",
    telefono: raw.telefono || raw.phone || null,
    email: raw.email || null,
    empresa: raw.empresa || raw.company || null,
    notas: raw.notas || raw.notes || "",
    origen: raw.origen || "scraping",
    nicho: raw.nicho || null,
    ciudad: raw.ciudad || null,
    pais: raw.pais || null,
    ig_handle: raw.ig_handle || null,
    temperatura: raw.temperatura || "frio",
  };
}

function computeHash(lead: ReturnType<typeof normalize>): string | null {
  if (lead.telefono) {
    const clean = lead.telefono.replace(/\D/g, "");
    return createHash("sha256").update(`tel:${clean}`).digest("hex");
  }
  if (lead.ig_handle) {
    return createHash("sha256")
      .update(`ig:${lead.ig_handle.toLowerCase()}`)
      .digest("hex");
  }
  return null;
}

export async function POST(request: NextRequest) {
  const ctx = await authenticateApiKey(request);
  const guard = requireScope(ctx, "write");
  if (guard) return guard;

  let body: IngestLead | IngestLead[];
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const rawList = Array.isArray(body) ? body : [body];
  if (rawList.length === 0)
    return NextResponse.json({ error: "Lista vacía" }, { status: 400 });

  const admin = getSupabaseServerClient();
  const now = new Date().toISOString();

  let inserted = 0;
  let skipped = 0;
  const insertedLeads: unknown[] = [];

  for (const raw of rawList) {
    const lead = normalize(raw);

    // Enforce phone requirement for non-instagram leads
    if (lead.origen !== "instagram" && !lead.telefono) {
      skipped++;
      continue;
    }

    if (!lead.nombre) {
      skipped++;
      continue;
    }

    const dedupe_hash = computeHash(lead);

    const row = {
      id: crypto.randomUUID(),
      user_id: ctx!.workspaceId,
      workspace_id: DEFAULT_WORKSPACE_ID,
      nombre: lead.nombre,
      origen: lead.origen,
      estado: "nuevo",
      accion: "",
      notas: lead.notas,
      fase: 1,
      fecha: now.slice(0, 10),
      telefono: lead.telefono,
      empresa: lead.empresa,
      email: lead.email,
      temperatura: lead.temperatura,
      nicho: lead.nicho,
      ciudad: lead.ciudad,
      pais: lead.pais,
      ig_handle: lead.ig_handle,
      dedupe_hash,
      canal_contacto: lead.ig_handle ? "otro" : "whatsapp",
      updated_at: now,
    };

    // Upsert — on conflict (workspace_id, dedupe_hash) do nothing
    const { data, error } = dedupe_hash
      ? await admin
          .from("crm_leads")
          .upsert(row, { onConflict: "workspace_id,dedupe_hash", ignoreDuplicates: true })
          .select("id")
          .maybeSingle()
      : await admin.from("crm_leads").insert(row).select("id").maybeSingle();

    if (error) {
      skipped++;
    } else if (data) {
      inserted++;
      insertedLeads.push(data);
    } else {
      skipped++; // duplicate ignored
    }
  }

  return NextResponse.json({ ok: true, inserted, skipped, total: rawList.length });
}

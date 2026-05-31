import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, requireScope } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/server-supabase";

export const runtime = "nodejs";

const TEMPERATURA_MAP: Record<string, string> = {
  cold: "frio",
  warm: "tibio",
  hot: "caliente",
  frio: "frio",
  tibio: "tibio",
  caliente: "caliente",
};

export async function GET(request: NextRequest) {
  const ctx = await authenticateApiKey(request);
  const denied = requireScope(ctx, "read");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const temperatureParam = searchParams.get("temperature") || "cold";
  const temperatura = TEMPERATURA_MAP[temperatureParam] || "frio";
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    const admin = getSupabaseServerClient();
    const { data, error } = await admin
      .from("crm_leads")
      .select("*")
      .eq("temperatura", temperatura)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const leads = (data || []).map((lead) => ({
      id: lead.id,
      nombre: lead.nombre,
      telefono: lead.telefono,
      empresa: lead.empresa,
      temperatura: lead.temperatura,
      estado: lead.estado,
      origen: lead.origen,
      notas: lead.notas,
      fase: lead.fase,
      fecha: lead.fecha,
      ultimo_contacto: lead.ultimo_contacto,
      intentos_contacto: lead.intentos_contacto,
      canal_contacto: lead.canal_contacto,
    }));

    return NextResponse.json(leads);
  } catch (error) {
    return NextResponse.json(
      { error: `Error al obtener leads: ${error instanceof Error ? error.message : "Unknown"}` },
      { status: 500 },
    );
  }
}

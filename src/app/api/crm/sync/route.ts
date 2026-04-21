import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, crmSettings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import type { SyncLeadResponse } from "@/types";

// Verificar API key de integración
function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) return false;

  const stored = db
    .select()
    .from(crmSettings)
    .where(eq(crmSettings.key, "whatsapp_api_key"))
    .get();

  return stored ? apiKey === stored.value : false;
}

export async function GET(request: NextRequest) {
  // Validar autenticación
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: "API key inválida o faltante" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const temperature = searchParams.get("temperature") || "cold";
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  try {
    const results = db
      .select()
      .from(contacts)
      .where(eq(contacts.temperature, temperature))
      .orderBy(desc(contacts.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    const response: SyncLeadResponse[] = results.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      company: c.company,
      notes: c.notes,
      temperature: c.temperature as any,
      score: c.score,
      source: c.source as any,
      createdAt: c.createdAt,
    }));

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error: `Error al obtener leads: ${error instanceof Error ? error.message : "Unknown"}`,
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, activities, crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { WhatsAppUpdate, Contact } from "@/types";

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

export async function POST(request: NextRequest) {
  // Validar autenticación
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: "API key inválida o faltante" },
      { status: 401 }
    );
  }

  let body: WhatsAppUpdate;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { contactId, temperature, score, notes, activityType, activityDescription } = body;

  if (!contactId || !activityType || !activityDescription) {
    return NextResponse.json(
      { error: "Faltan campos: contactId, activityType, activityDescription" },
      { status: 400 }
    );
  }

  try {
    // Verificar que el contacto existe
    const existing = db
      .select()
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .get();

    if (!existing) {
      return NextResponse.json(
        { error: "Contacto no encontrado" },
        { status: 404 }
      );
    }

    // Preparar datos de actualización
    const now = new Date();
    const updateData: Record<string, any> = { updatedAt: now };

    if (temperature !== undefined) updateData.temperature = temperature;
    if (score !== undefined) updateData.score = Math.max(0, Math.min(100, score));
    if (notes !== undefined) updateData.notes = notes;

    // Actualizar contacto
    const updatedContact = db
      .update(contacts)
      .set(updateData)
      .where(eq(contacts.id, contactId))
      .returning()
      .get() as Contact;

    // Registrar actividad
    db.insert(activities)
      .values({
        type: activityType,
        description: activityDescription,
        contactId: contactId,
        createdAt: now,
      })
      .run();

    return NextResponse.json(updatedContact, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Error al actualizar contacto: ${error instanceof Error ? error.message : "Unknown"}`,
      },
      { status: 500 }
    );
  }
}

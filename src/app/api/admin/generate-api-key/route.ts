import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { db } from "@/db";
import { crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

function isAdmin(request: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return false;
  const provided = request.headers.get("x-admin-secret");
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(adminSecret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json(
      { error: "No autorizado. Requiere x-admin-secret header o sesión admin" },
      { status: 403 }
    );
  }

  try {
    const apiKey = `sk-crm_${uuidv4().replace(/-/g, "").substring(0, 32)}`;

    const [existing] = await db
      .select()
      .from(crmSettings)
      .where(eq(crmSettings.key, "whatsapp_api_key"));

    if (existing) {
      await db
        .update(crmSettings)
        .set({ value: apiKey })
        .where(eq(crmSettings.key, "whatsapp_api_key"));
    } else {
      await db.insert(crmSettings).values({
        key: "whatsapp_api_key",
        value: apiKey,
      });
    }

    return NextResponse.json(
      {
        success: true,
        apiKey: apiKey,
        createdAt: new Date().toISOString(),
        message: "API key generado. Copia y guarda en tu .env del bot.",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Error generando API key" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const [existing] = await db
      .select()
      .from(crmSettings)
      .where(eq(crmSettings.key, "whatsapp_api_key"));

    return NextResponse.json({
      hasApiKey: !!existing,
      createdAt: existing ? "Configurado (no se revela por seguridad)" : null,
    });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    await db.delete(crmSettings).where(eq(crmSettings.key, "whatsapp_api_key"));

    return NextResponse.json({
      success: true,
      message: "API key eliminado. Genera uno nuevo con POST.",
    });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

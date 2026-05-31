import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

function isAdmin(request: NextRequest): boolean {
  const adminSecret = request.headers.get("x-admin-secret");
  return adminSecret === process.env.ADMIN_SECRET;
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
  } catch (error) {
    return NextResponse.json(
      {
        error: `Error generando API key: ${error instanceof Error ? error.message : "Unknown"}`,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 403 }
    );
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
  } catch (error) {
    return NextResponse.json(
      {
        error: `Error: ${error instanceof Error ? error.message : "Unknown"}`,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 403 }
    );
  }

  try {
    await db.delete(crmSettings).where(eq(crmSettings.key, "whatsapp_api_key"));

    return NextResponse.json({
      success: true,
      message: "API key eliminado. Genera uno nuevo con POST.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Error: ${error instanceof Error ? error.message : "Unknown"}`,
      },
      { status: 500 }
    );
  }
}

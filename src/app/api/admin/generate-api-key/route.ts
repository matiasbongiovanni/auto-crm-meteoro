import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { crmSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// Función helper para validar si el user es admin
// En un sistema real, verificarías sesión, JWT, etc.
// Por ahora: simple check de header o variable de entorno
function isAdmin(request: NextRequest): boolean {
  // Opción 1: Header secreto (solo en desarrollo)
  const adminSecret = request.headers.get("x-admin-secret");
  if (adminSecret === process.env.ADMIN_SECRET) {
    return true;
  }

  // Opción 2: En producción, verificarías sesión de usuario
  // const session = await getServerSession();
  // return session?.user?.role === "admin";

  return false;
}

export async function POST(request: NextRequest) {
  // Validar admin
  if (!isAdmin(request)) {
    return NextResponse.json(
      { error: "No autorizado. Requiere x-admin-secret header o sesión admin" },
      { status: 403 }
    );
  }

  try {
    // Generar API key única
    const apiKey = `sk-crm_${uuidv4().replace(/-/g, "").substring(0, 32)}`;

    // Verificar que no exista ya
    const existing = db
      .select()
      .from(crmSettings)
      .where(eq(crmSettings.key, "whatsapp_api_key"))
      .get();

    if (existing) {
      // Si ya existe, actualizar
      db.update(crmSettings)
        .set({ value: apiKey })
        .where(eq(crmSettings.key, "whatsapp_api_key"))
        .run();
    } else {
      // Crear nueva
      db.insert(crmSettings).values({
        key: "whatsapp_api_key",
        value: apiKey,
      }).run();
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
  // Endpoint para verificar si existe una API key (sin revelarla)
  if (!isAdmin(request)) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 403 }
    );
  }

  try {
    const existing = db
      .select()
      .from(crmSettings)
      .where(eq(crmSettings.key, "whatsapp_api_key"))
      .get();

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
  // Endpoint para rotar/eliminar API key
  if (!isAdmin(request)) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 403 }
    );
  }

  try {
    db.delete(crmSettings)
      .where(eq(crmSettings.key, "whatsapp_api_key"))
      .run();

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

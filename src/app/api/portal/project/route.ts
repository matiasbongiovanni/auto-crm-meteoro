import { NextRequest, NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-auth";
import type { PortalTask } from "@/types/portal";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("portal_token")?.value;
  if (!token) {
    return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });
  }

  const session = await getPortalSession(token);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Sesión inválida." }, { status: 401 });
  }

  const { project } = session;
  const tasks = project.tasks ?? [];
  const completadas = tasks.filter((t: PortalTask) => t.status === "completada").length;
  const total = tasks.length;
  const porcentaje = project.porcentaje_manual != null
    ? project.porcentaje_manual
    : total > 0 ? Math.round((completadas / total) * 100) : 0;

  return NextResponse.json({
    ok: true,
    project: { ...project, porcentaje_calculado: porcentaje },
    portalUser: session.portalUser,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/server-supabase";
import { getPublicSupabaseEnv } from "@/lib/supabase-env";
import { sendPortalInvite } from "@/lib/portal-invite-email";

async function verifyMati(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const env = getPublicSupabaseEnv();
  if (!env) return null;
  const res = await fetch(`${env.url}/auth/v1/user`, {
    headers: { apikey: env.anonKey, authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export async function GET(request: NextRequest) {
  const user = await verifyMati(request);
  if (!user) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });

  const clienteId = request.nextUrl.searchParams.get("cliente_id");
  if (!clienteId) return NextResponse.json({ ok: false, error: "cliente_id requerido." }, { status: 400 });

  const supabase = getSupabaseServerClient();
  const { data: project } = await supabase
    .from("portal_projects")
    .select("*, tasks:portal_tasks(*), updates:portal_updates(*), portal_user:portal_users(*)")
    .eq("cliente_id", clienteId)
    .maybeSingle();

  return NextResponse.json({ ok: true, project: project ?? null });
}

export async function POST(request: NextRequest) {
  const user = await verifyMati(request);
  if (!user) return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });

  const body = await request.json();
  const { action } = body;
  const supabase = getSupabaseServerClient();

  // ─── Guardar proyecto ──────────────────────────────────────────────────
  if (action === "save-project") {
    const { project } = body;
    // Guard: empty strings for date columns must be null
    const cleanProject = {
      ...project,
      fecha_inicio: project.fecha_inicio || null,
      fecha_estimada: project.fecha_estimada || null,
    };
    const { data, error } = await supabase
      .from("portal_projects")
      .upsert({ ...cleanProject, updated_at: new Date().toISOString() })
      .select("*")
      .single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, project: data });
  }

  // ─── Guardar tareas (bulk) ─────────────────────────────────────────────
  if (action === "save-tasks") {
    const { project_id, tasks } = body;
    // Eliminar las que ya no existen
    const { data: existing } = await supabase
      .from("portal_tasks")
      .select("id")
      .eq("project_id", project_id);
    const incomingIds = new Set((tasks as { id?: string }[]).filter((t) => t.id).map((t) => t.id));
    const toDelete = (existing ?? []).filter((t) => !incomingIds.has(t.id)).map((t) => t.id);
    if (toDelete.length > 0) {
      await supabase.from("portal_tasks").delete().in("id", toDelete);
    }
    // Upsert todas las tareas
    const rows = (tasks as { id?: string; titulo: string; category: string; status: string; orden: number; descripcion?: string }[]).map((t, i) => ({
      id: t.id || crypto.randomUUID(),
      project_id,
      titulo: t.titulo,
      category: t.category || "desarrollo",
      status: t.status || "pendiente",
      orden: t.orden ?? i,
      descripcion: t.descripcion || "",
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("portal_tasks").upsert(rows);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ─── Guardar update / timeline ─────────────────────────────────────────
  if (action === "save-update") {
    const { update } = body;
    const row = { ...update, id: update.id || crypto.randomUUID() };
    const { data, error } = await supabase.from("portal_updates").upsert(row).select("*").single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, update: data });
  }

  // ─── Eliminar update ───────────────────────────────────────────────────
  if (action === "delete-update") {
    const { id } = body;
    await supabase.from("portal_updates").delete().eq("id", id);
    return NextResponse.json({ ok: true });
  }

  // ─── Invitar usuario portal ────────────────────────────────────────────
  if (action === "invite-user") {
    const { project_id, nombre, email, slug } = body;

    // Verificar si ya existe
    const { data: existing } = await supabase
      .from("portal_users")
      .select("id, invited_at")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    let supabaseUserId: string;

    if (existing) {
      // Re-enviar invitación: generar nuevo recovery link
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email: email.toLowerCase(),
      });
      if (linkErr) return NextResponse.json({ ok: false, error: linkErr.message }, { status: 500 });

      const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:3000";
      await sendPortalInvite({
        toEmail: email.toLowerCase(),
        toNombre: nombre,
        slug,
        activationUrl: linkData.properties.action_link,
        portalUrl,
      });

      await supabase
        .from("portal_users")
        .update({ invited_at: new Date().toISOString() })
        .eq("id", existing.id);

      return NextResponse.json({ ok: true, resent: true });
    }

    // Crear user en Supabase Auth con contraseña aleatoria
    const { data: createdUser, error: createErr } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: true,
      password: crypto.randomUUID() + crypto.randomUUID(),
    });
    if (createErr) return NextResponse.json({ ok: false, error: createErr.message }, { status: 500 });
    supabaseUserId = createdUser.user.id;

    // Generar recovery link para que el cliente setee su contraseña
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: email.toLowerCase(),
    });
    if (linkErr) return NextResponse.json({ ok: false, error: linkErr.message }, { status: 500 });

    // Guardar en portal_users
    await supabase.from("portal_users").insert({
      id: crypto.randomUUID(),
      project_id,
      email: email.toLowerCase(),
      nombre,
      supabase_user_id: supabaseUserId,
      invited_at: new Date().toISOString(),
    });

    // Enviar email de invitación
    const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || "http://localhost:3000";
    await sendPortalInvite({
      toEmail: email.toLowerCase(),
      toNombre: nombre,
      slug,
      activationUrl: linkData.properties.action_link,
      portalUrl,
    });

    return NextResponse.json({ ok: true });
  }

  // ─── Set progress manual ───────────────────────────────────────────────
  if (action === "set-progress") {
    const { project_id, porcentaje_manual } = body;
    const { error } = await supabase
      .from("portal_projects")
      .update({ porcentaje_manual, updated_at: new Date().toISOString() })
      .eq("id", project_id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: `Acción desconocida: ${action}` }, { status: 400 });
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/server-supabase";
import { getPublicSupabaseEnv } from "@/lib/supabase-env";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ ok: false, error: "Email y contraseña requeridos." }, { status: 400 });
    }

    const env = getPublicSupabaseEnv();
    if (!env) {
      return NextResponse.json({ ok: false, error: "Servicio no disponible." }, { status: 503 });
    }

    // Login con Supabase
    const signInRes = await fetch(`${env.url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: env.anonKey },
      body: JSON.stringify({ email, password }),
    });

    if (!signInRes.ok) {
      return NextResponse.json({ ok: false, error: "Credenciales incorrectas." }, { status: 401 });
    }

    const session = await signInRes.json();
    const accessToken = session.access_token;

    // Verificar que es un usuario del portal
    const supabase = getSupabaseServerClient();
    const { data: portalUser } = await supabase
      .from("portal_users")
      .select("project_id")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    if (!portalUser) {
      return NextResponse.json({ ok: false, error: "No tenés acceso al portal." }, { status: 403 });
    }

    const { data: project } = await supabase
      .from("portal_projects")
      .select("slug")
      .eq("id", portalUser.project_id)
      .eq("activo", true)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ ok: false, error: "Portal no disponible." }, { status: 403 });
    }

    const response = NextResponse.json({ ok: true, slug: project.slug });
    // Guardar token en cookie httpOnly para SSR
    response.cookies.set("portal_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 horas
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ ok: false, error: "Error interno." }, { status: 500 });
  }
}

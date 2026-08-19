import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import { getSupabaseServerClient } from "@/lib/server-supabase";
import { createClient } from "@/lib/supabase/server";
import { PortalView } from "@/components/portal/PortalView";
import { getDrenovaMetricas } from "@/lib/ecommerce-metrics/drenova";
import type { PortalTask, EcommerceMetricas, MetricasSource } from "@/types/portal";

const ADMIN_EMAILS = ["matiasweschta@gmail.com"];

type Props = {
  params: Promise<{ slug: string }>;
};

function calcPorcentaje(project: { porcentaje_manual?: number | null; tasks?: PortalTask[] }) {
  const tasks = project.tasks ?? [];
  const completadas = tasks.filter((t: PortalTask) => t.status === "completada").length;
  const total = tasks.length;
  return project.porcentaje_manual != null
    ? project.porcentaje_manual
    : total > 0 ? Math.round((completadas / total) * 100) : 0;
}

async function loadMetricas(source: MetricasSource | null | undefined): Promise<EcommerceMetricas | null> {
  if (source === "drenova_carritos") return getDrenovaMetricas(30);
  return null;
}

export default async function PortalPage({ params }: Props) {
  const { slug } = await params;
  const cookieStore = await cookies();

  // ── Admin bypass: si hay sesión CRM activa, cargar por slug directo ──────
  const supabase = await createClient();
  const { data: { user: adminUser } } = await supabase.auth.getUser();
  if (adminUser?.email && ADMIN_EMAILS.includes(adminUser.email.toLowerCase())) {
    const svc = getSupabaseServerClient();
    const { data: project } = await svc
      .from("portal_projects")
      .select("*, tasks:portal_tasks(*), updates:portal_updates(*)")
      .eq("slug", slug)
      .maybeSingle();
    if (!project) notFound();
    const tasks = (project.tasks ?? []).sort((a: PortalTask, b: PortalTask) => a.orden - b.orden);
    const updates = (project.updates ?? []).sort((a: { fecha: string }, b: { fecha: string }) => b.fecha.localeCompare(a.fecha));
    const porcentaje = calcPorcentaje(project);
    const metricas = await loadMetricas(project.metricas_source).catch(() => null);
    return (
      <PortalView
        project={{ ...project, tasks, updates, porcentaje_calculado: porcentaje }}
        portalUser={{ id: adminUser.id, project_id: project.id, email: adminUser.email, nombre: "Admin (vista previa)", supabase_user_id: adminUser.id }}
        metricas={metricas}
      />
    );
  }

  // ── Flujo cliente normal ─────────────────────────────────────────────────
  const token = cookieStore.get("portal_token")?.value;
  if (!token) redirect("/portal/login");

  const session = await getPortalSession(token);
  if (!session) redirect("/portal/login");

  const { project, portalUser } = session;

  // Si el slug no coincide, redirigir al portal correcto en lugar de 404
  if (project.slug !== slug) redirect(`/portal/${project.slug}`);

  const metricas = await loadMetricas(project.metricas_source).catch(() => null);

  return (
    <PortalView
      project={{ ...project, porcentaje_calculado: calcPorcentaje(project) }}
      portalUser={portalUser}
      metricas={metricas}
    />
  );
}

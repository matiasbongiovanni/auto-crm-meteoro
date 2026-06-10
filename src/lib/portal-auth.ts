import { getSupabaseServerClient } from "@/lib/server-supabase";
import { getPublicSupabaseEnv } from "@/lib/supabase-env";
import type { PortalProject, PortalUser } from "@/types/portal";

export type PortalSession = {
  portalUser: PortalUser;
  project: PortalProject;
};

export async function getPortalSession(accessToken: string): Promise<PortalSession | null> {
  const env = getPublicSupabaseEnv();
  if (!env) return null;

  // Verificar token con Supabase
  const userRes = await fetch(`${env.url}/auth/v1/user`, {
    headers: { apikey: env.anonKey, authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!userRes.ok) return null;
  const authUser = await userRes.json();
  if (!authUser?.id) return null;

  const supabase = getSupabaseServerClient();

  // Buscar en portal_users por supabase_user_id
  const { data: portalUser } = await supabase
    .from("portal_users")
    .select("*")
    .eq("supabase_user_id", authUser.id)
    .maybeSingle();

  if (!portalUser) return null;

  // Cargar proyecto con tareas y updates
  const { data: project } = await supabase
    .from("portal_projects")
    .select("*, tasks:portal_tasks(*), updates:portal_updates(*)")
    .eq("id", portalUser.project_id)
    .eq("activo", true)
    .maybeSingle();

  if (!project) return null;

  // Ordenar tareas por orden y updates por fecha desc
  const tasks = (project.tasks ?? []).sort((a: { orden: number }, b: { orden: number }) => a.orden - b.orden);
  const updates = (project.updates ?? []).sort((a: { fecha: string }, b: { fecha: string }) => b.fecha.localeCompare(a.fecha));

  return { portalUser, project: { ...project, tasks, updates } };
}

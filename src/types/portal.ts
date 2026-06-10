export type PortalTaskStatus = "pendiente" | "en_progreso" | "completada";
export type PortalTaskCategory = "diseno" | "desarrollo" | "contenido" | "testing" | "entrega" | "otro";

export type PortalTask = {
  id: string;
  project_id: string;
  titulo: string;
  descripcion?: string;
  status: PortalTaskStatus;
  category: PortalTaskCategory;
  orden: number;
  created_at?: string;
  updated_at?: string;
};

export type PortalUpdateType = "hito" | "avance" | "entrega" | "nota";

export type PortalUpdate = {
  id: string;
  project_id: string;
  mensaje: string;
  tipo: PortalUpdateType;
  fecha: string;
  created_at?: string;
};

export type PortalProject = {
  id: string;
  cliente_id: string;
  slug: string;
  nombre_proyecto: string;
  descripcion?: string;
  porcentaje_manual?: number | null;
  fecha_inicio: string;
  fecha_estimada?: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
  tasks?: PortalTask[];
  updates?: PortalUpdate[];
  portal_user?: PortalUser | null;
};

export type PortalUser = {
  id: string;
  project_id: string;
  email: string;
  nombre: string;
  supabase_user_id?: string;
  invited_at?: string | null;
  created_at?: string;
};

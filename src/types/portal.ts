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

export type MetricasSource = "drenova_carritos";

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
  metricas_source?: MetricasSource | null;
  created_at?: string;
  updated_at?: string;
  tasks?: PortalTask[];
  updates?: PortalUpdate[];
  portal_user?: PortalUser | null;
};

export type MetricasCarritosDia = {
  dia: string;
  carritos: number;
  recuperados: number;
  con_clic: number;
  con_respuesta: number;
  tasa_recuperacion: number;
  monto_recuperado: number;
  monto_abandonado: number;
  /** Recuperados con mensaje de campaña enviado ANTES de la compra (atribución real). */
  recuperados_campana: number;
  /** Recuperados que compraron antes de que saliera el mensaje (venta orgánica, no atribuible). */
  recuperados_organico: number;
  tasa_recuperacion_campana: number;
  monto_recuperado_campana: number;
};

export type MetricasEnviosDia = {
  dia: string;
  courier: string;
  pedidos: number;
  entregados: number;
  intentos_fallidos: number;
  demorados: number;
  entrega_estimada: number;
  dias_promedio_entrega: number | null;
};

export type MetricasMensajesDia = {
  dia: string;
  plantilla_key: string;
  categoria: string;
  modulo: string | null;
  enviados: number;
  errores: number;
  cancelados: number;
  pendientes: number;
};

export type EcommerceMetricas = {
  carritos: MetricasCarritosDia[];
  envios: MetricasEnviosDia[];
  mensajes: MetricasMensajesDia[];
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

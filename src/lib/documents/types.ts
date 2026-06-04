// Tipos de datos para los documentos generados con las plantillas Meteoro.

export type Footer = {
  email: string;
  telefono: string;
  instagram: string;
};

// ─── Presupuesto / Cotización ────────────────────────────────────────────────

export type ItemCotizacion = {
  nombre: string;
  descripcion: string;
  cantidad: number;
  precio: number;
};

export type PlanMensual = {
  nombre: string;
  descripcion: string; // líneas separadas por \n
  precio: number;
};

export type PresupuestoData = {
  cliente: string;
  proyecto: string;
  numero: string;
  fecha: string;
  moneda: "ARS" | "USD" | "EUR";
  validezDias: number;
  incluyeIva: boolean;
  items: ItemCotizacion[];
  planes: PlanMensual[];
  includePlanes: boolean;
  notas: string;
  preparadoPor: string;
  footer: Footer;
  telefono?: string;
};

// ─── Bienvenida ──────────────────────────────────────────────────────────────

export type BienvenidaData = {
  cliente: string;
  empresa: string;
  fecha: string;
  mensaje: string;
  showMensaje: boolean;
  showEquipo: boolean;
  showPortal: boolean;
  portalUrl: string;
  portalUser: string;
  portalPass: string;
  showPasos: boolean;
  pasos: string; // líneas separadas por \n
  firmaMeteoro: string;
  firmaCargo: string;
  footer: Footer;
};

// ─── Onboarding ──────────────────────────────────────────────────────────────

export type SeccionOnboarding = {
  titulo: string;
  contenido: string;
};

export type FaseOnboarding = {
  nombre: string;
  duracion: string;
  estado: "pendiente" | "en-curso" | "completado";
  desc: string;
};

export type OnboardingData = {
  cliente: string;
  empresa: string;
  fecha: string;
  respCliente: string;
  respMeteoro: string;
  fechaInicio: string;
  fechaEntrega: string;
  showResp: boolean;
  showSecciones: boolean;
  secciones: SeccionOnboarding[];
  showFases: boolean;
  fases: FaseOnboarding[];
  showEntregables: boolean;
  entregables: string; // líneas separadas por \n
  showCompromisos: boolean;
  compromisos: string; // líneas separadas por \n
  showSla: boolean;
  sla: string;
  firmaMeteoro: string;
  firmaCargo: string;
  footer: Footer;
};

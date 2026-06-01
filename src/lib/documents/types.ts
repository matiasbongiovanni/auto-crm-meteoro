export type Footer = {
  email: string;
  telefono: string;
  instagram: string;
};

export type Fase = {
  numero: number;
  titulo: string;
  descripcion: string;
};

export type Item = {
  nombre: string;
  detalle: string;
  cantidad: number;
  precioUnit: number;
};

export type PlanFeature = string;

export type Plan = {
  nombre: string;
  precio: number;
  periodo: string;
  premium: boolean;
  features: PlanFeature[];
};

export type MetodoPagoFila = {
  label: string;
  valor: string;
};

export type MetodoPago = {
  titulo: string;
  filas: MetodoPagoFila[];
};

export type PresupuestoData = {
  header: { label: string; cliente: string };
  titulo: { cotizacionLabel: string; titulo: string; tagline: string };
  meta: { fecha: string; cliente: string; preparadoPor: string; moneda: string };
  fasesTitulo: string;
  fases: Fase[];
  propuestaTitulo: string;
  items: Item[];
  mostrarIva: boolean;
  ivaPct: number;
  planesTitulo: string;
  planes: Plan[];
  metodosTitulo: string;
  metodosPago: MetodoPago[];
  notas: string;
  validez: string;
  footer: Footer;
};

export type Contacto = {
  label: string;
  valor: string;
};

export type Paso = {
  numero: number;
  texto: string;
};

export type Firma = {
  empresa: string;
  nombre: string;
  rol: string;
  fecha: string;
};

export type BienvenidaData = {
  header: { label: string; cliente: string };
  titulo: { fecha: string; titulo: string };
  mensaje: { saludo: string; cuerpo: string };
  equipo: {
    titulo: string;
    nombre: string;
    rol: string;
    contactos: Contacto[];
  };
  pasosTitulo: string;
  pasos: Paso[];
  firmas: Firma[];
  footer: Footer;
};

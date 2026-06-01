import type { BienvenidaData, OnboardingData, PresupuestoData } from "./types";

const DEFAULT_FOOTER = {
  whatsapp: "+54 9 3472 54-8379",
  email: "contacto@meteoro.com.ar",
  web: "meteoro.com.ar",
};

export function defaultPresupuesto(cliente = "", proyecto = ""): PresupuestoData {
  return {
    cliente,
    proyecto: proyecto || "Propuesta de servicios",
    numero: "001",
    fecha: new Date().toISOString().slice(0, 10),
    moneda: "ARS",
    validezDias: 15,
    incluyeIva: false,
    items: [{ nombre: "", descripcion: "", cantidad: 1, precio: 0 }],
    planes: [],
    includePlanes: false,
    notas: "Pago 50% adelantado / 50% contra entrega.",
    preparadoPor: "Matías Bongiovanni — Meteoro",
    footer: DEFAULT_FOOTER,
  };
}

export function defaultBienvenida(cliente = "", empresa = ""): BienvenidaData {
  return {
    cliente,
    empresa,
    fecha: new Date().toISOString().slice(0, 10),
    mensaje:
      "Queremos darte la bienvenida a Meteoro y agradecerte la confianza que depositaste en nosotros. " +
      "Estamos emocionados de trabajar juntos y comprometidos con el éxito de tu proyecto.",
    showMensaje: true,
    showEquipo: true,
    showPortal: true,
    portalUrl: "portal.meteoro.com.ar/clientes",
    portalUser: "",
    portalPass: "",
    showPasos: true,
    pasos:
      "Reunión de onboarding (45 min)\nConfiguración del sistema\nPrueba con casos reales\nAjustes y optimización",
    firmaMeteoro: "Matías Bongiovanni",
    firmaCargo: "CEO & Fundador — Meteoro",
    footer: DEFAULT_FOOTER,
  };
}

export function defaultOnboarding(cliente = "", empresa = ""): OnboardingData {
  const today = new Date().toISOString().slice(0, 10);
  return {
    cliente,
    empresa,
    fecha: today,
    respCliente: "",
    respMeteoro: "Matías Bongiovanni",
    fechaInicio: today,
    fechaEntrega: "",
    showResp: true,
    showSecciones: true,
    secciones: [{ titulo: "Credenciales de acceso", contenido: "" }],
    showFases: true,
    fases: [
      { nombre: "Kick-off y configuración inicial", duracion: "3 días", estado: "en-curso", desc: "" },
      { nombre: "Integración de sistemas", duracion: "5 días", estado: "pendiente", desc: "" },
      { nombre: "Pruebas y ajustes", duracion: "3 días", estado: "pendiente", desc: "" },
      { nombre: "Go-live y seguimiento", duracion: "7 días", estado: "pendiente", desc: "" },
    ],
    showEntregables: true,
    entregables: "Landing page funcional\nFlujo de onboarding listo\nDocumentación de accesos\nCapacitación al equipo",
    showCompromisos: true,
    compromisos:
      "Meteoro entregará actualizaciones semanales de avance\nEl cliente proveerá acceso a los sistemas en las primeras 48h\nReunión de revisión quincenal",
    showSla: true,
    sla:
      "Tiempo de respuesta: hasta 24h hábiles\nCanal principal: WhatsApp +54 9 3472 548379\nEmail: contacto@meteoro.com.ar\nSoporte de emergencias: WhatsApp",
    firmaMeteoro: "Matías Bongiovanni",
    firmaCargo: "CEO & Fundador — Meteoro",
    footer: DEFAULT_FOOTER,
  };
}

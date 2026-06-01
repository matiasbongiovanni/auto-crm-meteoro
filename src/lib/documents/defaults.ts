import type { BienvenidaData, PresupuestoData } from "./types";

export function defaultPresupuesto(cliente: string): PresupuestoData {
  const today = new Date().toISOString().slice(0, 10);
  return {
    header: { label: "COTIZACIÓN INTERNA", cliente },
    titulo: {
      cotizacionLabel: "COTIZACIÓN #",
      titulo: "Propuesta de Servicios Meteoro",
      tagline: "Automatización · Agentes IA · Desarrollo Web",
    },
    meta: {
      fecha: today,
      cliente,
      preparadoPor: "Matías Bongiovanni",
      moneda: "ARS",
    },
    fasesTitulo: "FASES DEL PROYECTO",
    fases: [
      {
        numero: 1,
        titulo: "Crear",
        descripcion: "Análisis de requerimientos, diseño de arquitectura y setup del entorno de desarrollo.",
      },
      {
        numero: 2,
        titulo: "Lanzar",
        descripcion: "Desarrollo, integración de sistemas y deploy en producción con pruebas de aceptación.",
      },
      {
        numero: 3,
        titulo: "Crecer",
        descripcion: "Monitoreo post-lanzamiento, optimizaciones y soporte mensual continuo.",
      },
    ],
    propuestaTitulo: "PROPUESTA ECONÓMICA",
    items: [
      {
        nombre: "Servicio principal",
        detalle: "Descripción del entregable principal",
        cantidad: 1,
        precioUnit: 0,
      },
    ],
    mostrarIva: true,
    ivaPct: 21,
    planesTitulo: "PLANES DE MANTENIMIENTO",
    planes: [
      {
        nombre: "Mantenimiento Básico",
        precio: 25000,
        periodo: "/mes",
        premium: false,
        features: ["Soporte por email", "Correcciones menores", "Monitoreo básico"],
      },
      {
        nombre: "Mantenimiento Pro",
        precio: 50000,
        periodo: "/mes",
        premium: true,
        features: ["Soporte prioritario 24/7", "Actualizaciones incluidas", "Nuevas funcionalidades", "Reportes mensuales"],
      },
    ],
    metodosTitulo: "MÉTODOS DE PAGO",
    metodosPago: [
      {
        titulo: "ARS — Transferencia Bancaria",
        filas: [
          { label: "Banco", valor: "Naranja X / Mercado Pago" },
          { label: "CBU/CVU", valor: "0000003100014012345678" },
          { label: "Alias", valor: "meteoro.pagos" },
          { label: "Titular", valor: "Matías Bongiovanni" },
        ],
      },
      {
        titulo: "USD — Transferencia Internacional",
        filas: [
          { label: "Banco", valor: "Wise / Payoneer" },
          { label: "Email", valor: "pagos@meteoro.com.ar" },
          { label: "Titular", valor: "Matías Bongiovanni" },
        ],
      },
      {
        titulo: "EUR — SEPA / Wise",
        filas: [
          { label: "IBAN", valor: "ES00 0000 0000 0000 0000 0000" },
          { label: "BIC/SWIFT", valor: "WISEXXXXX" },
          { label: "Titular", valor: "Matías Bongiovanni" },
        ],
      },
      {
        titulo: "USDT — Cripto (TRC-20)",
        filas: [
          { label: "Red", valor: "TRON (TRC-20)" },
          { label: "Dirección", valor: "TXXXXXXXXXXXXXXXXXXXXXXXXXXxxxxx" },
        ],
      },
    ],
    notas:
      "• Condiciones: 50% adelanto al inicio / 50% contra entrega.\n• Los precios no incluyen IVA (se detalla arriba si aplica).\n• Esta propuesta es válida por el período indicado.",
    validez: "30 días desde la fecha de emisión",
    footer: {
      email: "contacto@meteoro.com.ar",
      telefono: "+54 9 3472 54-8379",
      instagram: "@meteoroar",
    },
  };
}

export function defaultBienvenida(cliente: string, empresa?: string): BienvenidaData {
  const today = new Date().toISOString().slice(0, 10);
  const nombre = empresa || cliente;
  return {
    header: { label: "DOCUMENTO DE BIENVENIDA", cliente },
    titulo: { fecha: today, titulo: "Bienvenido/a a Meteoro" },
    mensaje: {
      saludo: `Bienvenido/a, ${nombre}.`,
      cuerpo:
        `Estamos muy contentos de que hayas elegido a Meteoro para acompañar el crecimiento de ${nombre}. ` +
        "A partir de hoy somos parte de tu equipo. Este documento resume los próximos pasos, tus contactos directos y todo lo que necesitás saber para arrancar con el pie derecho.\n\n" +
        "Cualquier duda o consulta, no dudes en escribirnos — la comunicación directa y transparente es uno de nuestros valores.",
    },
    equipo: {
      titulo: "TU CONTACTO EN METEORO",
      nombre: "Matías Bongiovanni",
      rol: "CEO & Fundador",
      contactos: [
        { label: "WhatsApp", valor: "+54 9 3472 54-8379" },
        { label: "Email", valor: "mati@meteoro.com.ar" },
        { label: "Horario", valor: "Lun–Vie 9:00–18:00 ART" },
      ],
    },
    pasosTitulo: "PRÓXIMOS PASOS",
    pasos: [
      { numero: 1, texto: "Confirmá el pago del 50% inicial para dar inicio formal al proyecto." },
      { numero: 2, texto: "Agendamos una llamada de kick-off para definir accesos, datos y alcance final." },
      { numero: 3, texto: "Comenzamos el desarrollo según el plan acordado. Te mantenemos al tanto en cada etapa." },
    ],
    firmas: [
      { empresa: "Meteoro Agencia", nombre: "Matías Bongiovanni", rol: "CEO & Fundador", fecha: today },
      { empresa: nombre, nombre: "", rol: "Representante", fecha: today },
    ],
    footer: {
      email: "contacto@meteoro.com.ar",
      telefono: "+54 9 3472 54-8379",
      instagram: "@meteoroar",
    },
  };
}

// System prompts (español rioplatense) para la carga asistida por IA del CRM.
import type { CalendarEventType } from "@/types/crm";

export type ParsedTask = {
  title: string;
  date: string;
  time?: string;
  company?: string;
  type: CalendarEventType;
  notes?: string;
};

export type DraftDocTipo = "presupuesto" | "bienvenida" | "onboarding";
// El borrador es un objeto parcial del shape del documento (PresupuestoData / BienvenidaData / OnboardingData).
export type DraftDocResult = Record<string, unknown>;

const TASK_TYPES: CalendarEventType[] = ["tarea", "reunion", "seguimiento", "entrega", "cobro"];

export function tareasSystemPrompt(todayIso: string): string {
  return `Sos un parser de agenda para un CRM argentino. Convertís texto libre en tareas estructuradas.
Hoy es ${todayIso} (zona horaria America/Argentina/Buenos_Aires). Resolvé fechas relativas ("mañana", "el lunes que viene", "en 3 días") respecto a hoy.

Devolvé EXCLUSIVAMENTE un JSON válido con esta forma, sin texto adicional ni markdown:
{
  "events": [
    {
      "title": "string corto y claro",
      "date": "YYYY-MM-DD",
      "time": "HH:mm",
      "company": "nombre de empresa/cliente",
      "type": "${TASK_TYPES.join(" | ")}",
      "notes": "detalle extra"
    }
  ]
}

Reglas:
- "time", "company" y "notes" son opcionales: omitilos si no se mencionan (no inventes horarios ni empresas).
- type: "reunion" si hay encuentro/call/meeting; "entrega" si se entrega un trabajo; "seguimiento" si es follow-up; "cobro" si es cobrar/facturar; sino "tarea".
- Si no hay fecha explícita, usá hoy (${todayIso}).
- Español rioplatense. Títulos accionables y breves.
- Si el texto no contiene ninguna tarea, devolvé {"events": []}.`;
}

const FOOTER_NOTE =
  "No incluyas datos de contacto, footer, fechas, número ni firma: esos los completa el sistema. Montos como números (sin símbolos ni separadores de miles).";

export function documentoSystemPrompt(tipo: DraftDocTipo, todayIso: string): string {
  const base = `Sos un asistente de Meteoro (agencia argentina de automatización y desarrollo). Hoy es ${todayIso}.
A partir del brief del usuario, redactás el contenido de un documento en español rioplatense, tono profesional y cercano.
Devolvé EXCLUSIVAMENTE un JSON válido, sin texto adicional ni markdown.`;

  if (tipo === "presupuesto") {
    return `${base}

Forma del JSON:
{
  "proyecto": "título del proyecto",
  "moneda": "ARS | USD | EUR",
  "items": [ { "nombre": "servicio", "descripcion": "qué incluye", "cantidad": 1, "precio": 0 } ],
  "includePlanes": false,
  "planes": [ { "nombre": "plan mensual", "descripcion": "incluye A\\nincluye B", "precio": 0 } ],
  "notas": "condiciones (ej: 50% adelanto / 50% contra entrega)"
}

Reglas:
- Desglosá el trabajo en items concretos con precios estimados realistas (si el brief no da montos, proponé valores de referencia y aclaralo en "notas").
- "planes" solo si el brief menciona un fee mensual/recurrente; en ese caso includePlanes=true.
- "descripcion" de cada plan: un beneficio por línea separado con \\n.
- ${FOOTER_NOTE}`;
  }

  if (tipo === "bienvenida") {
    return `${base}

Forma del JSON:
{
  "mensaje": "mensaje de bienvenida cálido (2-4 oraciones)",
  "pasos": "Paso 1\\nPaso 2\\nPaso 3"
}

Reglas:
- "pasos": próximos pasos del onboarding, uno por línea separados con \\n (se numeran solos).
- ${FOOTER_NOTE}`;
  }

  // onboarding
  return `${base}

Forma del JSON:
{
  "secciones": [ { "titulo": "sección", "contenido": "detalle" } ],
  "fases": [ { "nombre": "fase", "duracion": "3 días", "estado": "pendiente | en-curso | completado", "desc": "qué pasa en la fase" } ],
  "entregables": "Entregable 1\\nEntregable 2",
  "compromisos": "Compromiso 1\\nCompromiso 2",
  "sla": "Tiempo de respuesta...\\nCanal principal..."
}

Reglas:
- "entregables", "compromisos" y "sla": un ítem por línea separado con \\n.
- Primera fase en "en-curso", el resto "pendiente".
- ${FOOTER_NOTE}`;
}

// Lector de las métricas de PuntoShop desde la Google Sheet que el workflow
// de n8n (`PuntoShop - Encuesta 5 min sin respuesta`, `tTzDwy9uxeJNkk59`, y
// `PuntoShop - CTA - Release COD`, `Z7oCWkbJoXhGMLxz`) escribe en paralelo a
// cada decisión real (mismo `Estado` que el tag que pone en Shopify). Pedido
// explícito de Mati: la fuente es la Sheet, no Shopify Admin API.
//
// La hoja es pública (export CSV vía gviz confirmado accesible sin login),
// así que no hace falta credencial ninguna.

import type { PedidosEstadoDia, PedidosEstadoMetricas } from "@/types/portal";

const SPREADSHEET_ID = "1WP-Ukuju4i_CWGa3IYMU2sDeGYm7RkIIkYbmuoihowU";
const TAB = "Hoja 1";

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let inQuote = false;
    let cur = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        cols.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

async function readPuntoshopSheet(): Promise<string[][]> {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(TAB)}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`PuntoShop Sheets CSV fetch failed: ${res.status}`);
  const text = await res.text();
  const rows = parseCSV(text);
  if (rows.length === 0 || !rows[0].includes("Estado")) {
    throw new Error("PuntoShop Sheet: respuesta inesperada (¿dejó de ser pública?)");
  }
  return rows;
}

const MESES_ES: Record<string, string> = {
  ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06",
  jul: "07", ago: "08", sep: "09", set: "09", oct: "10", nov: "11", dic: "12",
};

function quitarAcentos(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * El workflow de reprogramación (`PuntoShop - Encuesta 5 min`) no escribe una
 * fecha ISO en `Fecha` — escribe el día elegido en la encuesta como texto libre
 * en español, ej. "martes 11 ago" o "jueves 3 sep" (sin año). `new Date()` no
 * puede parsear eso y esas filas quedaban silenciosamente afuera del reporte
 * (129 de 135 reprogramados). Se resuelve acá con el año actual en ART.
 */
function parseFechaEs(fecha: string): string | null {
  const m = quitarAcentos(fecha.trim().toLowerCase()).match(/(\d{1,2})\s+([a-z]+)\.?\s*$/);
  if (!m) return null;
  const dia = m[1].padStart(2, "0");
  const mes = MESES_ES[m[2].slice(0, 3)];
  if (!mes) return null;
  const anio = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric" }).format(new Date());
  return `${anio}-${mes}-${dia}`;
}

/**
 * `Fecha` viene en ISO con offset (ej. 2026-08-07T22:33:40-03:00) o, para reprogramados,
 * en texto español ("martes 11 ago"). Muchas filas viejas la tienen vacía.
 *
 * OJO: `new Date(fecha)` NO sirve para distinguir los dos formatos — V8 parsea
 * de forma laxa strings como "jueves 3 sep" y devuelve una fecha inválida pero
 * "válida" (no NaN), así que la rama ISO se ejecutaba también con texto en
 * español y truncaba a "jueves 3 s" (los primeros 10 caracteres del string
 * original). Esas filas quedaban silenciosamente afuera de todos los días del
 * rango. Se resuelve exigiendo el prefijo ISO explícito antes de confiar en `Date`.
 */
function diaDe(fecha: string): string | null {
  if (!fecha) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) return fecha.slice(0, 10);
  return parseFechaEs(fecha);
}

/** "2026-08-28" en huso horario ART, sin importar en qué TZ corre el server (Vercel = UTC). */
function hoyArt(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date()); // en-CA da "2026-08-28"
}

/** N días atrás en formato "YYYY-MM-DD" (ART), incluyendo hoy. */
function diasAtras(n: number): string[] {
  const out: string[] = [];
  const hoy = hoyArt();
  const base = new Date(`${hoy}T12:00:00`); // mediodía para evitar corrimiento de día por DST/UTC
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    out.push(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).format(d));
  }
  return out;
}

/**
 * Métricas de los últimos `dias` días (default 30, mismo patrón que Drenova/UroBalance).
 * Devuelve un balde por día (incluso en cero, para que el gráfico no tenga huecos) + totales del período.
 */
export async function getPuntoshopMetricas(dias = 30): Promise<PedidosEstadoMetricas> {
  const rows = await readPuntoshopSheet();
  const header = rows[0];
  const idxEstado = header.indexOf("Estado");
  const idxFecha = header.indexOf("Fecha");

  const rango = diasAtras(dias);
  const rangoSet = new Set(rango);
  const porDia = new Map<string, PedidosEstadoDia>(
    rango.map((dia) => [dia, { dia, confirmados: 0, reprogramados: 0, cancelados: 0, sin_accion: 0 }])
  );
  const totales = { confirmados: 0, reprogramados: 0, cancelados: 0, sin_accion: 0 };

  for (const row of rows.slice(1)) {
    const estadoRaw = (row[idxEstado] ?? "").trim();
    const fechaRaw = idxFecha >= 0 ? (row[idxFecha] ?? "").trim() : "";
    const filaDia = diaDe(fechaRaw);

    // El workflow de cancelación ("Cancelar no manda nada") nunca escribe
    // `Fecha` — no hay forma de ubicarlo en el rango, así que queda afuera
    // del gráfico diario y de los totales (no hay día al que asignarlo).
    if (estadoRaw === "Cancelado") continue;
    if (!filaDia || !rangoSet.has(filaDia)) continue;

    const campo: keyof typeof totales = estadoRaw === "Confirmado" ? "confirmados"
      : estadoRaw === "Reprogramado" ? "reprogramados"
      : "sin_accion";

    totales[campo]++;
    porDia.get(filaDia)![campo]++;
  }

  const diasOrdenados = [...porDia.values()].sort((a, b) => a.dia.localeCompare(b.dia));

  return { dias: diasOrdenados, totales };
}

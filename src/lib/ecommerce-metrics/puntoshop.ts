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

/** `Fecha` viene en ISO con offset (ej. 2026-08-07T22:33:40-03:00). Muchas filas viejas la tienen vacía. */
function diaDe(fecha: string): string | null {
  if (!fecha) return null;
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return null;
  return fecha.slice(0, 10);
}

export async function getPuntoshopMetricas(dias = 30): Promise<PedidosEstadoMetricas> {
  const rows = await readPuntoshopSheet();
  const header = rows[0];
  const idxEstado = header.indexOf("Estado");
  const idxFecha = header.indexOf("Fecha");

  const desde = new Date();
  desde.setDate(desde.getDate() - dias);
  const desdeStr = desde.toISOString().slice(0, 10);

  const porDia = new Map<string, PedidosEstadoDia>();
  const totales = { confirmados: 0, reprogramados: 0, cancelados: 0, sin_accion: 0 };

  for (const row of rows.slice(1)) {
    const estadoRaw = (row[idxEstado] ?? "").trim();
    const fechaRaw = idxFecha >= 0 ? (row[idxFecha] ?? "").trim() : "";
    const dia = diaDe(fechaRaw);

    // Filas sin `Fecha` parseable (comunes en registros viejos) no se pueden
    // ubicar dentro del período elegido — se excluyen del reporte en vez de
    // arriesgar inflar los totales con pedidos de fecha desconocida.
    if (!dia || dia < desdeStr) continue;

    let campo: keyof typeof totales;
    if (estadoRaw === "Confirmado") campo = "confirmados";
    else if (estadoRaw === "Reprogramado") campo = "reprogramados";
    else if (estadoRaw === "Cancelado") campo = "cancelados";
    else campo = "sin_accion";

    totales[campo]++;

    if (!porDia.has(dia)) {
      porDia.set(dia, { dia, confirmados: 0, reprogramados: 0, cancelados: 0, sin_accion: 0 });
    }
    porDia.get(dia)![campo]++;
  }

  const diasOrdenados = [...porDia.values()].sort((a, b) => a.dia.localeCompare(b.dia));

  return { dias: diasOrdenados, totales };
}

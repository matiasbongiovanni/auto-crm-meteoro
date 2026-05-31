import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const TYPE_MAP: Record<string, string> = {
  blue: "blue",
  oficial: "oficial",
  mep: "bolsa",
  ccl: "contadoconliqui",
  crypto: "cripto",
};

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") || "blue";
  const apiType = TYPE_MAP[type] || "blue";

  try {
    const res = await fetch(`https://dolarapi.com/v1/dolares/${apiType}`, {
      headers: { "User-Agent": "crm-meteoro/2.0" },
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`dolarapi responded ${res.status}`);
    const data = (await res.json()) as { compra: number; venta: number; nombre: string };
    return NextResponse.json({ ok: true, compra: data.compra, venta: data.venta, nombre: data.nombre });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}

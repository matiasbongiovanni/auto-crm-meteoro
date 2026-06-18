import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthResponse } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { isClaudeCliEnabled, runClaudeJson, ClaudeCliError } from "@/lib/claude-cli";
import { tareasSystemPrompt, type ParsedTask } from "@/lib/ai-prompts";

export const maxDuration = 90;

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request.headers.get("authorization"));
  if (isAuthResponse(auth)) return auth;

  const email = String((auth.user as { email?: string }).email || "anon");
  if (!rateLimit(`ai-tareas:${email}`, { limit: 15, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Esperá un momento." }, { status: 429 });
  }
  if (!isClaudeCliEnabled()) {
    return NextResponse.json({ error: "La IA no está disponible en este entorno." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const text = String((body as { text?: unknown })?.text || "").trim();
  if (!text) return NextResponse.json({ error: "Falta el texto a analizar." }, { status: 400 });
  if (text.length > 5000) {
    return NextResponse.json({ error: "El texto es demasiado largo (máx 5000 caracteres)." }, { status: 400 });
  }

  // Fecha de hoy en formato YYYY-MM-DD según huso horario de Argentina.
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });

  try {
    // Tarea básica → Haiku (rápido y barato).
    const result = await runClaudeJson<{ events: ParsedTask[] }>(text, tareasSystemPrompt(today), {
      model: "haiku",
    });
    const events = Array.isArray(result?.events) ? result.events : [];
    return NextResponse.json({ ok: true, events });
  } catch (error) {
    const code = error instanceof ClaudeCliError ? error.code : "exec";
    const status = code === "not_found" || code === "disabled" ? 503 : 502;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error de IA" },
      { status },
    );
  }
}

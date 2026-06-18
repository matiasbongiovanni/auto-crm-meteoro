import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthResponse } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { isClaudeCliEnabled, runClaudeJson, ClaudeCliError } from "@/lib/claude-cli";
import { documentoSystemPrompt, type DraftDocResult, type DraftDocTipo } from "@/lib/ai-prompts";

export const maxDuration = 120;

const VALID_TIPOS: DraftDocTipo[] = ["presupuesto", "bienvenida", "onboarding"];

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request.headers.get("authorization"));
  if (isAuthResponse(auth)) return auth;

  const email = String((auth.user as { email?: string }).email || "anon");
  if (!rateLimit(`ai-doc:${email}`, { limit: 10, windowMs: 60_000 })) {
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

  const tipo = String((body as { tipo?: unknown })?.tipo || "") as DraftDocTipo;
  const brief = String((body as { brief?: unknown })?.brief || "").trim();

  if (!VALID_TIPOS.includes(tipo)) {
    return NextResponse.json({ error: "Tipo de documento inválido." }, { status: 400 });
  }
  if (!brief) return NextResponse.json({ error: "Falta el brief del documento." }, { status: 400 });
  if (brief.length > 8000) {
    return NextResponse.json({ error: "El brief es demasiado largo (máx 8000 caracteres)." }, { status: 400 });
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });

  try {
    // Documento → Sonnet en low effort (más capaz que Haiku, sin gastar de más).
    const datos = await runClaudeJson<DraftDocResult>(brief, documentoSystemPrompt(tipo, today), {
      model: "sonnet",
      effort: "low",
      timeoutMs: 90_000,
    });
    return NextResponse.json({ ok: true, datos });
  } catch (error) {
    const code = error instanceof ClaudeCliError ? error.code : "exec";
    const status = code === "not_found" || code === "disabled" ? 503 : 502;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error de IA" },
      { status },
    );
  }
}

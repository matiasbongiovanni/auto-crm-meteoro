// Wrapper server-only para invocar el CLI `claude -p` como subprocess.
// Usa la suscripción Claude Code instalada en el host (sin ANTHROPIC_API_KEY).
// Solo funciona self-hosted (Docker / este server), NO en Vercel serverless.
import { spawn } from "child_process";

const CLAUDE_BIN = process.env.CLAUDE_CLI_PATH || "claude";

const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_BUFFER = 10 * 1024 * 1024; // 10 MB

// Herramientas que el CLI NUNCA debe usar: solo queremos generación de texto.
const DISALLOWED_TOOLS = ["Bash", "Edit", "Write", "WebFetch", "WebSearch", "NotebookEdit", "Task"];

export type ClaudeCliErrorCode = "disabled" | "not_found" | "timeout" | "parse" | "exec";

export class ClaudeCliError extends Error {
  code: ClaudeCliErrorCode;
  constructor(message: string, code: ClaudeCliErrorCode = "exec") {
    super(message);
    this.name = "ClaudeCliError";
    this.code = code;
  }
}

export type ClaudeModel = "haiku" | "sonnet" | "opus";
export type ClaudeEffort = "low" | "medium" | "high" | "max";

export type RunClaudeOpts = {
  model?: ClaudeModel;
  effort?: ClaudeEffort;
  timeoutMs?: number;
};

export function isClaudeCliEnabled(): boolean {
  return process.env.ENABLE_CLAUDE_CLI !== "false";
}

function extractJson(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  return match ? match[0] : null;
}

// Ejecuta `claude -p` pasando el prompt por stdin (evita problemas de escaping
// e inyección de shell — no se usa shell y el prompt nunca es un argumento).
function spawnClaude(systemPrompt: string, userPrompt: string, opts: RunClaudeOpts): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const args = [
      "-p",
      "--output-format", "json",
      "--append-system-prompt", systemPrompt,
      "--disallowed-tools", ...DISALLOWED_TOOLS,
    ];
    if (opts.model) args.push("--model", opts.model);
    if (opts.effort) args.push("--effort", opts.effort);

    const child = spawn(CLAUDE_BIN, args, { stdio: ["pipe", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish(() => reject(new ClaudeCliError("La IA tardó demasiado en responder.", "timeout")));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
      if (stdout.length > MAX_BUFFER) {
        child.kill("SIGTERM");
        finish(() => reject(new ClaudeCliError("La respuesta de la IA fue demasiado grande.", "exec")));
      }
    });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });

    child.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        finish(() => reject(new ClaudeCliError(
          "CLI de Claude no encontrado. Esta función requiere el servidor self-hosted con `claude` instalado.",
          "not_found",
        )));
        return;
      }
      finish(() => reject(new ClaudeCliError(error.message || "Error ejecutando claude -p", "exec")));
    });

    child.on("close", (code) => {
      if (code === 0) finish(() => resolve(stdout));
      else finish(() => reject(new ClaudeCliError(stderr.trim() || `claude -p terminó con código ${code}`, "exec")));
    });

    child.stdin.write(userPrompt);
    child.stdin.end();
  });
}

// Ejecuta claude -p y devuelve el JSON parseado de tipo T.
// El prompt debe pedir explícitamente una respuesta JSON.
export async function runClaudeJson<T>(
  userPrompt: string,
  systemPrompt: string,
  opts: RunClaudeOpts = {},
): Promise<T> {
  if (!isClaudeCliEnabled()) {
    throw new ClaudeCliError("La IA (claude -p) está deshabilitada en este entorno.", "disabled");
  }

  const stdout = await spawnClaude(systemPrompt, userPrompt, opts);

  // `--output-format json` envuelve la respuesta en { type, result, is_error, ... }.
  let resultText = stdout;
  try {
    const envelope = JSON.parse(stdout) as { result?: unknown; is_error?: boolean };
    if (envelope?.is_error) {
      throw new ClaudeCliError("La IA devolvió un error al procesar el pedido.", "exec");
    }
    if (envelope && typeof envelope.result === "string") resultText = envelope.result;
  } catch (error) {
    if (error instanceof ClaudeCliError) throw error;
    // stdout no era el envelope esperado — seguimos con el texto crudo.
  }

  const jsonStr = extractJson(resultText);
  if (!jsonStr) {
    throw new ClaudeCliError("Claude no devolvió un JSON interpretable.", "parse");
  }
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    throw new ClaudeCliError("No se pudo parsear el JSON devuelto por Claude.", "parse");
  }
}

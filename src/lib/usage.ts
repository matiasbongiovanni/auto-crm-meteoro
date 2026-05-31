import { promises as fs } from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import type { UsageModelBreakdown, UsageOverview, UsageSeriesPoint, UsageSnapshot } from "@/types/crm";

const execFileAsync = promisify(execFile);

const CLAUDE_DIR = process.env.CLAUDE_PROJECTS_DIR || "/root/.claude/projects";
const CODEX_DB_PATH = process.env.CODEX_STATE_DB_PATH || "/root/.codex/state_5.sqlite";
const LOCAL_USAGE_FLAG = process.env.ENABLE_LOCAL_USAGE_INGESTION;

type UsageAccumulator = UsageSnapshot & { cost_usd: number | null };

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function emptyUsageOverview(reason: string, includePaths = false): UsageOverview {
  return {
    snapshots: [],
    series: [],
    byModel: [],
    summary: { claudeTokens: 0, codexTokens: 0, claudeCostUsd: 0, codexCostUsd: 0, combinedTokens: 0 },
    ingestion: { claudeDir: includePaths ? CLAUDE_DIR : null, codexDbPath: includePaths ? CODEX_DB_PATH : null, mode: "disabled", available: false, reason },
  };
}

async function resolveUsageAvailability() {
  if (LOCAL_USAGE_FLAG === "false") return { enabled: false, claudeAvailable: false, codexAvailable: false, reason: "Local usage ingestion is disabled by environment." };
  const [claudeAvailable, codexAvailable] = await Promise.all([pathExists(CLAUDE_DIR), pathExists(CODEX_DB_PATH)]);
  if (LOCAL_USAGE_FLAG === "true") {
    if (claudeAvailable || codexAvailable) return { enabled: true, claudeAvailable, codexAvailable, reason: null };
    return { enabled: false, claudeAvailable: false, codexAvailable: false, reason: "Local usage ingestion was enabled, but no local sources are available." };
  }
  if (claudeAvailable || codexAvailable) return { enabled: true, claudeAvailable, codexAvailable, reason: null };
  return { enabled: false, claudeAvailable: false, codexAvailable: false, reason: "No local usage sources are available in this runtime." };
}

function dateKey(value: string | undefined) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return value.slice(0, 10);
}

function safeModel(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "unknown";
}

async function listJsonlFiles(rootDir: string): Promise<string[]> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      const nested = await fs.readdir(full, { withFileTypes: true }).catch(() => []);
      for (const child of nested) {
        if (child.isFile() && child.name.endsWith(".jsonl")) files.push(path.join(full, child.name));
      }
    }
  }
  return files;
}

export async function readClaudeUsage(): Promise<UsageSnapshot[]> {
  const files = await listJsonlFiles(CLAUDE_DIR);
  const buckets = new Map<string, UsageAccumulator>();
  for (const file of files) {
    const content = await fs.readFile(file, "utf8").catch(() => "");
    if (!content) continue;
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      try {
        const record = JSON.parse(line);
        if (record.type !== "assistant") continue;
        const usage = record.message?.usage;
        if (!usage) continue;
        const date = dateKey(record.timestamp);
        const model = safeModel(record.message?.model);
        const input = Number(usage.input_tokens || 0);
        const output = Number(usage.output_tokens || 0);
        const cacheCreation = Number(usage.cache_creation_input_tokens || 0);
        const cacheRead = Number(usage.cache_read_input_tokens || 0);
        const cacheTokens = cacheCreation + cacheRead;
        const total = input + output + cacheTokens;
        const key = `${date}:${model}`;
        const current = buckets.get(key) || { source: "claude", period_start: date, period_end: date, model, total_tokens: 0, input_tokens: 0, output_tokens: 0, cache_tokens: 0, cost_usd: null, meta: {} };
        current.total_tokens += total;
        current.input_tokens += input;
        current.output_tokens += output;
        current.cache_tokens += cacheTokens;
        current.meta = { ...(current.meta || {}), cache_creation_input_tokens: Number((current.meta?.cache_creation_input_tokens as number) || 0) + cacheCreation, cache_read_input_tokens: Number((current.meta?.cache_read_input_tokens as number) || 0) + cacheRead };
        buckets.set(key, current);
      } catch { continue; }
    }
  }
  return [...buckets.values()].sort((a, b) => a.period_start === b.period_start ? a.model.localeCompare(b.model) : a.period_start.localeCompare(b.period_start));
}

export async function readCodexUsage(): Promise<UsageSnapshot[]> {
  const python = `import json, sqlite3\nconn = sqlite3.connect(${JSON.stringify(CODEX_DB_PATH)})\nconn.row_factory = sqlite3.Row\ncur = conn.cursor()\ncur.execute("""SELECT COALESCE(datetime(created_at_ms / 1000, 'unixepoch'), datetime(created_at, 'unixepoch')) AS created_date, COALESCE(model, 'unknown') AS model, COALESCE(tokens_used, 0) AS tokens_used, id, title FROM threads WHERE archived = 0""")\nrows = [dict(row) for row in cur.fetchall()]\nprint(json.dumps(rows))`;
  let stdout: string;
  try { ({ stdout } = await execFileAsync("python3", ["-c", python], { maxBuffer: 10 * 1024 * 1024 })); } catch { return []; }
  const rows = JSON.parse(stdout) as Array<{ created_date: string; model: string; tokens_used: number; id: string; title: string }>;
  const buckets = new Map<string, UsageAccumulator>();
  for (const row of rows) {
    const date = dateKey(row.created_date);
    const model = safeModel(row.model);
    const total = Number(row.tokens_used || 0);
    const key = `${date}:${model}`;
    const current = buckets.get(key) || { source: "codex", period_start: date, period_end: date, model, total_tokens: 0, input_tokens: 0, output_tokens: 0, cache_tokens: 0, cost_usd: null, meta: { threads: 0 } };
    current.total_tokens += total;
    current.meta = { ...(current.meta || {}), threads: Number((current.meta?.threads as number) || 0) + 1 };
    buckets.set(key, current);
  }
  return [...buckets.values()].sort((a, b) => a.period_start === b.period_start ? a.model.localeCompare(b.model) : a.period_start.localeCompare(b.period_start));
}

function buildSeries(snapshots: UsageSnapshot[]): UsageSeriesPoint[] {
  const buckets = new Map<string, UsageSeriesPoint>();
  for (const snapshot of snapshots) {
    const point = buckets.get(snapshot.period_start) || { date: snapshot.period_start, claude: 0, codex: 0 };
    if (snapshot.source === "claude") point.claude += snapshot.total_tokens;
    if (snapshot.source === "codex") point.codex += snapshot.total_tokens;
    buckets.set(snapshot.period_start, point);
  }
  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function buildModelBreakdown(snapshots: UsageSnapshot[]): UsageModelBreakdown[] {
  const buckets = new Map<string, UsageModelBreakdown>();
  for (const item of snapshots) {
    const key = `${item.source}:${item.model}`;
    const current = buckets.get(key) || { source: item.source, model: item.model, tokens: 0 };
    current.tokens += item.total_tokens;
    buckets.set(key, current);
  }
  return [...buckets.values()].sort((a, b) => b.tokens - a.tokens);
}

export async function getUsageOverview(): Promise<UsageOverview> {
  const availability = await resolveUsageAvailability();
  if (!availability.enabled) return emptyUsageOverview(availability.reason || "Local usage ingestion is unavailable.", LOCAL_USAGE_FLAG === "true");
  const [claude, codex] = await Promise.all([availability.claudeAvailable ? readClaudeUsage() : Promise.resolve([]), availability.codexAvailable ? readCodexUsage() : Promise.resolve([])]);
  const snapshots = [...claude, ...codex].sort((a, b) => a.period_start.localeCompare(b.period_start));
  const summary = snapshots.reduce((acc, item) => {
    if (item.source === "claude") { acc.claudeTokens += item.total_tokens; acc.claudeCostUsd = (acc.claudeCostUsd || 0) + (item.cost_usd || 0); }
    else { acc.codexTokens += item.total_tokens; acc.codexCostUsd = (acc.codexCostUsd || 0) + (item.cost_usd || 0); }
    acc.combinedTokens += item.total_tokens;
    return acc;
  }, { claudeTokens: 0, codexTokens: 0, claudeCostUsd: 0, codexCostUsd: 0, combinedTokens: 0 });
  return { snapshots, series: buildSeries(snapshots), byModel: buildModelBreakdown(snapshots), summary, ingestion: { claudeDir: availability.claudeAvailable ? CLAUDE_DIR : null, codexDbPath: availability.codexAvailable ? CODEX_DB_PATH : null, mode: "local", available: true, reason: null } };
}

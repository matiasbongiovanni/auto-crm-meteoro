import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const SUPABASE_REF = "qrrhfxcnbssxdofkqsst";
const MGMT_URL = `https://api.supabase.com/v1/projects/${SUPABASE_REF}/database/query`;

function escapeSqlValue(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number")
    return Number.isFinite(val) ? val.toString() : "NULL";
  if (val instanceof Date) return `'${val.toISOString().replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

function interpolate(sql: string, params: unknown[]): string {
  return sql.replace(/\$(\d+)/g, (_, n) =>
    escapeSqlValue(params[Number(n) - 1])
  );
}

async function runQuery(
  sql: string,
  params: unknown[]
): Promise<Record<string, unknown>[]> {
  const pat = process.env.SUPABASE_PAT;
  if (!pat) throw new Error("SUPABASE_PAT env var not set");
  const res = await fetch(MGMT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pat}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: interpolate(sql, params) }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SQL HTTP ${res.status}: ${body}`);
  }
  return res.json();
}

// Minimal fake postgres.js client — only needs .unsafe() and .options
const fakeClient = {
  // Drizzle's postgres-js driver accesses these to disable type parsers
  options: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parsers: {} as Record<string, any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    serializers: {} as Record<string, any>,
  },
  unsafe(query: string, params: unknown[] = []) {
    const promise = runQuery(query, params);
    return {
      then(
        resolve: ((v: unknown) => unknown) | null,
        reject?: (e: unknown) => unknown
      ) {
        return promise
          .then((rows) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result: any = [...rows];
            result.count = rows.length;
            result.columns = [];
            return resolve ? resolve(result) : result;
          })
          .catch(reject);
      },
      catch(reject: (e: unknown) => unknown) {
        return promise.catch(reject);
      },
      values() {
        return promise.then((rows) => rows.map((row) => Object.values(row)));
      },
    };
  },
  // Drizzle transactions call client.begin() — not used in this codebase
  begin: async () => {
    throw new Error("Transactions not supported in HTTP driver");
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = drizzle(fakeClient as any, { schema });

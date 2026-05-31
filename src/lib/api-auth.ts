import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/server-supabase";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";

export type ApiScope = "read" | "write" | "admin";

export type ApiAuthContext = {
  workspaceId: string;
  scopes: ApiScope[];
  keyId: string;
};

export function generateApiKey(): { full: string; prefix: string; hash: string } {
  const random = randomBytes(24).toString("base64url");
  const prefix = `met_live_${random.slice(0, 8)}`;
  const full = `${prefix}_${random.slice(8)}`;
  const hash = createHash("sha256").update(full).digest("hex");
  return { full, prefix, hash };
}

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export async function authenticateApiKey(request: NextRequest): Promise<ApiAuthContext | null> {
  const header = request.headers.get("authorization") || "";
  const key = header.replace(/^Bearer\s+/i, "").trim();
  if (!key.startsWith("met_live_")) return null;

  const admin = getSupabaseServerClient();
  const hash = hashApiKey(key);
  const { data, error } = await admin
    .from("crm_api_keys")
    .select("id, workspace_id, scopes, revoked_at")
    .eq("key_hash", hash)
    .maybeSingle();

  if (error || !data || data.revoked_at) return null;

  await admin.from("crm_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);

  return {
    workspaceId: (data.workspace_id as string) || DEFAULT_WORKSPACE_ID,
    scopes: data.scopes as ApiScope[],
    keyId: data.id as string,
  };
}

export function requireScope(ctx: ApiAuthContext | null, scope: ApiScope): NextResponse | null {
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ctx.scopes.includes(scope) && !ctx.scopes.includes("admin")) {
    return NextResponse.json({ error: `Missing scope: ${scope}` }, { status: 403 });
  }
  return null;
}

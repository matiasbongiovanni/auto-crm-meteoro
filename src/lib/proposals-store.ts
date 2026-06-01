import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";
import type { Proposal, ProposalStatus } from "@/types/crm";

export const PROPOSALS_STATE_KEY = "exp2_proposals";

const VALID_ESTADOS = new Set<ProposalStatus>(["enviado", "en_negociacion", "aceptado", "rechazado", "vencido"]);

function isMissingTableError(error: unknown) {
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : error instanceof Error
        ? error.message
        : String(error || "");
  return /schema cache|could not find the table|does not exist|42P01|undefined.*table/i.test(message);
}

function normalizeProposal(item: Partial<Proposal> & Record<string, unknown>): Proposal {
  return {
    id: String(item.id || crypto.randomUUID()),
    cliente: String(item.cliente || ""),
    concepto: String(item.concepto || ""),
    monto_usd:
      item.monto_usd === null || item.monto_usd === undefined || (typeof item.monto_usd === "string" && item.monto_usd === "")
        ? null
        : Number(item.monto_usd),
    fecha_envio: String(item.fecha_envio || new Date().toISOString().slice(0, 10)),
    proximo_seguimiento: item.proximo_seguimiento ? String(item.proximo_seguimiento) : null,
    estado: VALID_ESTADOS.has(item.estado as ProposalStatus) ? (item.estado as ProposalStatus) : "enviado",
    link_documento: item.link_documento ? String(item.link_documento) : null,
    notas: String(item.notas || ""),
    datos: (item.datos as Proposal["datos"]) ?? null,
    created_at: item.created_at ? String(item.created_at) : undefined,
    updated_at: item.updated_at ? String(item.updated_at) : undefined,
  };
}

export function normalizeProposals(value: unknown): Proposal[] {
  return Array.isArray(value) ? value.map((item) => normalizeProposal(item as Partial<Proposal> & Record<string, unknown>)) : [];
}

function mergeById(primary: Proposal[], secondary: Proposal[]) {
  const merged = new Map<string, Proposal>();
  for (const proposal of primary) merged.set(proposal.id, proposal);
  for (const proposal of secondary) merged.set(proposal.id, proposal);
  return [...merged.values()].sort((a, b) => {
    if (!a.proximo_seguimiento && !b.proximo_seguimiento) return a.fecha_envio.localeCompare(b.fecha_envio);
    if (!a.proximo_seguimiento) return 1;
    if (!b.proximo_seguimiento) return -1;
    return a.proximo_seguimiento.localeCompare(b.proximo_seguimiento);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readSharedProposals(admin: any, workspaceId: string) {
  const { data, error } = await admin
    .from("crm_state")
    .select("payload")
    .eq("user_id", workspaceId)
    .eq("state_key", PROPOSALS_STATE_KEY)
    .maybeSingle();
  if (error) throw error;
  return normalizeProposals(data?.payload);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function writeSharedProposals(admin: any, workspaceId: string, proposals: Proposal[]) {
  const { error } = await admin.from("crm_state").upsert({
    user_id: workspaceId,
    state_key: PROPOSALS_STATE_KEY,
    payload: proposals,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function listProposals(admin: any, workspaceId = DEFAULT_WORKSPACE_ID, sharedState?: Map<string, unknown>) {
  const shared = sharedState ? normalizeProposals(sharedState.get(PROPOSALS_STATE_KEY)) : await readSharedProposals(admin, workspaceId);

  try {
    const { data, error } = await admin
      .from("crm_proposals")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("proximo_seguimiento", { ascending: true, nullsFirst: false });
    if (error) throw error;
    // crm_proposals wins over crm_state (secondary is overwritten by primary)
    return mergeById(shared, normalizeProposals(data || []));
  } catch (error) {
    if (isMissingTableError(error)) return shared;
    throw error;
  }
}

export async function saveProposalRecord(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  proposal: Proposal,
  workspaceId = DEFAULT_WORKSPACE_ID,
  userId = workspaceId,
  sharedState?: Map<string, unknown>,
) {
  const now = new Date().toISOString();
  const normalized = normalizeProposal({
    ...proposal,
    created_at: proposal.created_at || now,
    updated_at: now,
  });

  const row = {
    ...normalized,
    workspace_id: workspaceId,
    user_id: userId,
    datos: proposal.datos ?? null,
    updated_at: now,
  };

  try {
    const { error } = await admin.from("crm_proposals").upsert(row);
    if (error) throw error;
    // Remove from crm_state so the normalized table is the single source of truth
    const current = sharedState ? normalizeProposals(sharedState.get(PROPOSALS_STATE_KEY)) : await readSharedProposals(admin, workspaceId);
    if (current.some((item) => item.id === normalized.id)) {
      await writeSharedProposals(admin, workspaceId, current.filter((item) => item.id !== normalized.id));
    }
    return normalized;
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
    const current = sharedState ? normalizeProposals(sharedState.get(PROPOSALS_STATE_KEY)) : await readSharedProposals(admin, workspaceId);
    const next = mergeById(current.filter((item) => item.id !== normalized.id), [normalized]);
    await writeSharedProposals(admin, workspaceId, next);
    return normalized;
  }
}

export async function deleteProposalRecord(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  id: string,
  workspaceId = DEFAULT_WORKSPACE_ID,
  sharedState?: Map<string, unknown>,
) {
  // Always clean from crm_state regardless of whether crm_proposals succeeds
  const current = sharedState ? normalizeProposals(sharedState.get(PROPOSALS_STATE_KEY)) : await readSharedProposals(admin, workspaceId);
  if (current.some((item) => item.id === id)) {
    await writeSharedProposals(admin, workspaceId, current.filter((item) => item.id !== id));
  }

  try {
    const { error } = await admin.from("crm_proposals").delete().eq("workspace_id", workspaceId).eq("id", id);
    if (error && !isMissingTableError(error)) throw error;
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
  }
}

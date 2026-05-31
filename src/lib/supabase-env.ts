type PublicSupabaseEnv = {
  url: string;
  anonKey: string;
};

type ServerSupabaseEnv = PublicSupabaseEnv & {
  serviceRoleKey: string;
};

function normalizeEnvValue(value?: string) {
  return value?.trim().replace(/^['"]|['"]$/g, "") || "";
}

function normalizeSupabaseUrl(value?: string) {
  const normalized = normalizeEnvValue(value).replace(/\/+$/, "");
  if (!normalized) return null;

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

export function getPublicSupabaseEnv(): PublicSupabaseEnv | null {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function getServerSupabaseEnv(): ServerSupabaseEnv | null {
  const publicEnv = getPublicSupabaseEnv();
  const serviceRoleKey = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!publicEnv || !serviceRoleKey) return null;
  return { ...publicEnv, serviceRoleKey };
}

export function getPublicSupabaseEnvError() {
  const rawUrl = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!rawUrl || !anonKey) {
    return "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  }

  if (!normalizeSupabaseUrl(rawUrl)) {
    return "NEXT_PUBLIC_SUPABASE_URL no es valida. Usá una URL https://<project-ref>.supabase.co sin comillas.";
  }

  return null;
}

export function getServerSupabaseEnvError() {
  if (getPublicSupabaseEnvError()) {
    return getPublicSupabaseEnvError();
  }

  const serviceRoleKey = normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!serviceRoleKey) {
    return "Falta SUPABASE_SERVICE_ROLE_KEY para las rutas del servidor.";
  }

  return null;
}

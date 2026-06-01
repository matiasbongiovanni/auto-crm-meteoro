// Helper server-side para el Platform API de Meteoro Chat (basado en Chatwoot)
// NUNCA importar desde componentes cliente — usa solo server-side

function chatwootBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_METEORO_CHAT_URL || process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_METEORO_CHAT_URL no configurado");
  return url.replace(/\/$/, "");
}

function platformToken(): string {
  const token = process.env.CHATWOOT_PLATFORM_TOKEN;
  if (!token) throw new Error("CHATWOOT_PLATFORM_TOKEN no configurado");
  return token;
}

export async function getSsoLoginUrl(userId: number | string): Promise<string> {
  const base = chatwootBaseUrl();
  const token = platformToken();

  const res = await fetch(`${base}/platform/api/v1/users/${userId}/login`, {
    headers: { api_access_token: token },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Meteoro Chat Platform API error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { data?: { url?: string }; url?: string };
  // Chatwoot 4.x devuelve { data: { url } } o { url } dependiendo de la versión
  const url = data?.data?.url ?? data?.url;
  if (!url) throw new Error("Meteoro Chat no devolvió URL SSO");
  return url;
}


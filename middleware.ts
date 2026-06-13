import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { ALLOWED_EMAILS } from "@/lib/allowed-emails";

const PUBLIC_PATHS = ["/login", "/auth", "/portal"];
const PUBLIC_API_PREFIXES = [
  "/api/crm/sync",
  "/api/crm/update-from-whatsapp",
  "/api/v1/proposals",
  "/api/webhook",
  "/api/exchange",
  "/api/widget",
  "/api/widget-script",
  "/api/widget-preview",
  "/api/leads/ingest",
  "/api/leads/jobs",
  "/api/portal/",
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/brand/") ||
    pathname === "/favicon.ico"
  )
    return true;
  return false;
}

function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

function buildCSP(nonce: string): string {
  const frameUrl = process.env.NEXT_PUBLIC_METEORO_CHAT_URL ?? "";
  const frameSrc = frameUrl ? `'self' ${frameUrl}` : "'self'";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://dolarapi.com",
    `frame-src ${frameSrc}`,
    "frame-ancestors 'self'",
  ].join("; ");
}

function withCSP(response: NextResponse, csp: string): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = generateNonce();
  const csp = buildCSP(nonce);

  if (isPublicPath(pathname)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    return withCSP(response, csp);
  }

  const { user, response } = await updateSession(request, nonce);

  if (!user) {
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json({ error: "No autorizado" }, { status: 401 });
      return withCSP(res, csp);
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    const res = NextResponse.redirect(loginUrl);
    return withCSP(res, csp);
  }

  if (!user.email || !ALLOWED_EMAILS.includes(user.email.toLowerCase())) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("error", "unauthorized");
    const res = NextResponse.redirect(loginUrl);
    return withCSP(res, csp);
  }

  return withCSP(response, csp);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

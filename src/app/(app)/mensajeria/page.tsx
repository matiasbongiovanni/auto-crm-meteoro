"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, ExternalLink, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const METEORO_CHAT_BASE = process.env.NEXT_PUBLIC_METEORO_CHAT_URL || process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL || "";

type State = "loading" | "ready" | "error" | "unconfigured";

export default function MensajeriaPage() {
  const [state, setState] = useState<State>(METEORO_CHAT_BASE ? "loading" : "unconfigured");
  const [ssoUrl, setSsoUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const fetchSsoUrl = useCallback(async () => {
    setState("loading");
    setErrorMsg("");

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState("error");
        setErrorMsg("Sesión no válida. Volvé a iniciar sesión.");
        return;
      }

      const res = await fetch("/api/mensajeria/sso", {
        headers: { authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });

      const json = await res.json() as { ok?: boolean; url?: string; error?: string };

      if (!res.ok || !json.ok || !json.url) {
        setState("error");
        setErrorMsg(json.error || `Error ${res.status} al obtener acceso al inbox`);
        return;
      }

      setSsoUrl(json.url);
      setState("ready");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Error de conexión con Meteoro Chat");
    }
  }, []);

  useEffect(() => {
    if (METEORO_CHAT_BASE) fetchSsoUrl();
  }, [fetchSsoUrl]);

  if (state === "unconfigured") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4">
        <div className="p-4 rounded-2xl bg-primary/8 border border-primary/15">
          <MessageSquare className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground/90 mb-1">Mensajería no configurada</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Configurá{" "}
            <code className="text-foreground/80 bg-muted px-1.5 py-0.5 rounded text-[11px]">
              NEXT_PUBLIC_METEORO_CHAT_URL
            </code>{" "}
            y{" "}
            <code className="text-foreground/80 bg-muted px-1.5 py-0.5 rounded text-[11px]">
              CHATWOOT_PLATFORM_TOKEN
            </code>{" "}
            en el{" "}
            <code className="text-[10px] text-muted-foreground/70">.env.local</code>{" "}
            para habilitar el inbox.
          </p>
        </div>
        <div className="glass-card rounded-xl p-4 text-left text-sm max-w-md w-full">
          <p className="text-[11px] text-muted-foreground font-mono mb-1"># .env.local</p>
          <p className="text-foreground/70 font-mono text-[11px]">NEXT_PUBLIC_METEORO_CHAT_URL=http://localhost:3000</p>
          <p className="text-foreground/70 font-mono text-[11px]">CHATWOOT_PLATFORM_TOKEN=your_platform_token</p>
          <p className="text-foreground/70 font-mono text-[11px]">CHATWOOT_AGENT_USER_ID=1</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/8">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground/90">Meteoro Chat — Inbox</p>
            <p className="text-[11px] text-muted-foreground">
              {state === "loading" ? "Conectando…" : state === "ready" ? "Conectado" : "Error de conexión"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {state === "error" && (
            <Button variant="ghost" size="sm" onClick={fetchSsoUrl} className="h-7 px-2 text-[12px] gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Reintentar
            </Button>
          )}
          {METEORO_CHAT_BASE && (
            <a
              href={`${METEORO_CHAT_BASE}/app`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/60 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Nueva pestaña
            </a>
          )}
        </div>
      </div>

      {/* States */}
      {state === "loading" && (
        <div className="flex-1 glass-card rounded-xl flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Iniciando sesión automática…</span>
        </div>
      )}

      {state === "error" && (
        <div className="flex-1 glass-card rounded-xl flex flex-col items-center justify-center gap-4 text-center p-8">
          <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground/90 mb-1">No se pudo conectar</p>
            <p className="text-[12px] text-muted-foreground max-w-sm">{errorMsg}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchSsoUrl} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Reintentar
            </Button>
            {METEORO_CHAT_BASE && (
              <a href={`${METEORO_CHAT_BASE}/app`} target="_blank" rel="noreferrer">
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir en pestaña
                </Button>
              </a>
            )}
          </div>
        </div>
      )}

      {state === "ready" && ssoUrl && (
        <div className="flex-1 glass-card rounded-xl overflow-hidden">
          <iframe
            ref={iframeRef}
            src={ssoUrl}
            className="w-full h-full border-0"
            title="Meteoro Chat Inbox"
            allow="microphone; camera; clipboard-read; clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
          />
        </div>
      )}
    </div>
  );
}

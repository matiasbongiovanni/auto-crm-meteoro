# CLAUDE.md — Meteoro CRM (auto-crm)

> CRM interno de Meteoro Agencia. Stack: Next.js 16 · React 19 · Tailwind v4 · shadcn/ui · Supabase (Auth + datos).
> Este proyecto es la nueva base unificada que reemplaza a `salidas/crm-meteoro-deploy/` (legacy en migración).

## Inicio rápido

```bash
npm run dev        # Dev server en http://localhost:3000
npm run build      # Build de producción
npm start          # Servidor producción
npm run lint       # ESLint
npm run mcp        # Servidor MCP (Claude Desktop/Web)
```

## Auth

- Login en `/login` vía **Google OAuth** (Supabase) — solo `matiasweschta@gmail.com` tiene acceso
- Sin formulario email/password — el único método es Google OAuth
- Roles: `ceo` (acceso total), `admin`, `freelancer`
- Middleware (`middleware.ts`) protege todas las rutas excepto `/login`, `/auth/*`, `/api/crm/sync`, `/api/crm/update-from-whatsapp`, `/api/v1/*`, `/api/webhook`
- Allowlist de email verificada en dos capas: `middleware.ts` (cada request) y `src/app/auth/callback/route.ts` (post-OAuth)
- Para agregar otro email autorizado: editar `ALLOWED_EMAILS` en `middleware.ts` y `src/app/auth/callback/route.ts`

## Arquitectura

**Stack**: Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Supabase Auth + Postgres

**Capa de datos híbrida:**
- Normalizado en Supabase: `crm_leads`, `crm_ingresos`, `crm_egresos`, `crm_profiles`, `crm_api_keys`, `crm_onboarding_docs`, `crm_proposals`, `crm_clientes`, `crm_invoices`
- JSON en `crm_state` (namespaced por `state_key`): pipeline, agentes, suscripciones, calendario, notas por empresa, pagos pendientes

**Diseño**: Dark monocromo negro/blanco. Primary = blanco (`#fafafa`). Tipografía: Geist Sans + Geist Mono (next/font/google). Tokens centralizados en `globals.css`. Sin toggle light/dark.

## Archivos clave

| Archivo | Rol |
|---------|-----|
| `src/components/crm/provider.tsx` | `CrmProvider`/`useCrm` — estado global y acciones |
| `src/lib/crm-server.ts` | Router de acciones del backend + RBAC |
| `src/lib/constants.ts` | `DEFAULT_WORKSPACE_ID`, `STATE_KEYS`, formateo |
| `src/types/crm.ts` | Tipos TypeScript de todas las entidades |
| `src/lib/finance.ts` | Lógica financiera (MRR, filtros por mes) |
| `src/lib/api-auth.ts` | API keys (hash SHA-256, scopes) |
| `src/lib/supabase-env.ts` | Validación de variables de entorno Supabase |
| `src/lib/chatwoot.ts` | Cliente Platform API de Meteoro Chat (server-only, SSO + Platform API) |
| `middleware.ts` | Route guard (redirige `/login` si no autenticado) |
| `supabase/meteoro-schema.sql` | Schema SQL — ejecutar en Supabase SQL Editor |

## Rutas

### App (protegidas por auth)
- `(app)/dashboard/` — Dashboard de negocio (métricas, revenue, pipeline, widget cobros + alertas cartera)
- `(app)/leads/` — Gestión de leads *(próxima fase)*
- `(app)/pipeline/` — Kanban *(próxima fase)*
- `(app)/clientes/` — **Cartera de clientes 360** ✓ — tabla, filtros, drawer detalle con tabs "Info" y "Portal"
- `(app)/finanzas/` — Ingresos/egresos/suscripciones/pagos + tab Cobranzas ✓
- `(app)/calendario/` — **Sección dedicada de calendario** ✓ (vistas día/semana/mes/agenda con `CalendarPro`)
- `(app)/tareas/` — Lista de tareas + notas por empresa ✓ (el calendario vive ahora en `/calendario`)
- `(app)/documentos/` — Generador de documentos Meteoro ✓
- `(app)/agentes/` — Config agentes prospector *(próxima fase)*
- `(app)/mensajeria/` — Meteoro Chat self-hosted embebido con SSO ✓
- `(app)/admin/` — Usuarios, roles, API keys (solo ceo) *(próxima fase)*

### Portal de Clientes (público — no requiere auth de Mati)
- `(portal)/portal/login` — Login de clientes vía email/password (Supabase)
- `(portal)/portal/[slug]` — Vista del proyecto: progreso circular, tareas por categoría, timeline de updates
- Componentes: `src/components/portal/` — `PortalView`, `PortalProgress`, `PortalTaskList`, `PortalTimeline`
- Panel admin: tab "Portal" en el drawer de `ClienteDetalle` → `PortalAdminTab`
- Tipos: `src/types/portal.ts` — `PortalProject`, `PortalTask`, `PortalUpdate`, `PortalUser`
- Auth helper: `src/lib/portal-auth.ts` — `getPortalSession(token)` verifica cookie `portal_token`
- Email invite: `src/lib/portal-invite-email.ts` — HTML Meteoro + Resend, recovery link de Supabase
- Migración SQL: `supabase/migrations/2026-06-09-portal-clientes.sql` (**pendiente confirmación de Mati**)

### API
- `/api/crm` — Router principal (GET state, POST acciones)
- `/api/crm/sync` — Sync WhatsApp bot (auth por `x-api-key`)
- `/api/crm/update-from-whatsapp` — Update desde bot (auth por `x-api-key`)
- `/api/exchange` — Cotización USD (dolarapi.com)
- `/api/usage` — Stats de uso Claude/Codex
- `/api/mensajeria/sso` — Genera URL SSO para auto-login en Meteoro Chat (auth Supabase requerido)
- `/api/leads/ingest` — Ingesta canónica de leads (API key scope `write`, no requiere sesión) → `crm_leads`
- `/api/leads/scrape` — Encolar job de scraping (auth Supabase, gate admin) · GET lista jobs
- `/api/leads/jobs` — Worker: GET jobs pendientes · PATCH actualizar estado (API key scope `read`/`write`)
- `/api/portal/auth` — POST login portal (email+password) → Supabase signIn + cookie `portal_token`
- `/api/portal/project` — GET datos del proyecto del cliente (autenticado con cookie portal)
- `/api/portal/admin` — GET/POST CRUD del portal (autenticado con Bearer token de Mati)
- `/api/ai/parse-tareas` — POST `{text}` → tareas estructuradas (`CalendarEvent`) vía `claude -p` (Haiku). Auth + rate limit. No persiste.
- `/api/ai/draft-documento` — POST `{tipo, brief}` → datos de presupuesto/bienvenida/onboarding vía `claude -p` (Sonnet low effort). Auth + rate limit. No persiste.

## Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Workers de scraping (no van en Next.js, van en la máquina que corre worker-jobs.py)
CRM_URL=https://crm.meteoro.com.ar               # o http://localhost:3000 en dev
CRM_WORKER_API_KEY=met_live_...                  # generar desde Admin → API Keys (scopes: read+write)

# Meteoro Chat self-hosted (sección Mensajería)
NEXT_PUBLIC_METEORO_CHAT_URL=http://localhost:3008
CHATWOOT_PLATFORM_TOKEN=<platform-api-token>   # server-only, NUNCA con NEXT_PUBLIC_
CHATWOOT_AGENT_USER_ID=1                        # ID del agente que se loguea vía SSO
CHATWOOT_DEFAULT_ACCOUNT_ID=1                   # Account ID de la cuenta Meteoro Interno

# Portal de Clientes
NEXT_PUBLIC_PORTAL_URL=https://crm.meteoro.com.ar  # URL base para links en emails y cookie
RESEND_API_KEY=<resend-api-key>                              # API key de Resend para emails de invitación
RESEND_FROM_EMAIL=noreply@meteoro.com.ar                     # Remitente (debe estar verificado en Resend; fallback: onboarding@resend.dev)
```

Ver `salidas/meteoro-chat/scripts/seed-instancia.sh` para obtener los valores de Meteoro Chat.

## Reglas de código

- Español en la UI (español rioplatense)
- ≤300 líneas por componente; dividir si crece
- Lucide para íconos (no emojis)
- Dinero en USD como `number` (no centavos — el CRM de Meteoro usa USD directamente)
- date-fns para fechas
- Tailwind v4 vía CSS (no tailwind.config.ts)
- shadcn/ui como sistema único de componentes
- Dark-first: todos los tokens definidos en `:root` y `.dark` con los mismos valores oscuros

## Estado de migración (2026-05-30)

FASE 0 ✓ completada:
- Backend portado (crm-server, finance, proposals-store, api-auth, supabase libs)
- Auth Supabase + middleware route guard
- Sistema de diseño dark monocromo negro/blanco + Geist (refactorizado 2026-05-31)
- Dashboard de negocio (BusinessMetrics + RevenueChart)
- Login page

FASE 0.5 ✓ completada (2026-05-31, actualizada 2026-06-01):
- Mensajería: Meteoro Chat self-hosted embebido con SSO automático
- SSO bridge server-side (src/lib/chatwoot.ts + /api/mensajeria/sso)
- SSO: agente compartido (CHATWOOT_AGENT_USER_ID) — resolveUserIdByEmail eliminado (dead-code)
- frame-ancestors configurado en el core para desarrollo
- Branding operativo: BrandingController fijo (ActionController::API, sin PlatformController)
- Ruta branding: PATCH /platform/api/v1/meteoro/branding (alineada con Meteoro Admin)
- Env del core documentadas: FRAME_ANCESTORS, FRONTEND_URL, METEORO_ADMIN_API_KEY en .env.example + docker-compose.yaml
- seed-instancia.sh: default URL corregido a :3008
- ⚠️ Pendiente manual: `docker compose run --rm rails bundle exec rails db:migrate` (crea tabla meteoro_brandings)
- ⚠️ Pendiente: completar CHATWOOT_PLATFORM_TOKEN + CHATWOOT_AGENT_USER_ID + CHATWOOT_DEFAULT_ACCOUNT_ID en .env.local (correr seed-instancia.sh)

FASE 0.6 ✓ completada (2026-06-01):
- Documentos: generador de presupuestos y cartas de bienvenida con plantillas HTML Meteoro
- Editor dinámico por tipo
- Export PDF vía `window.print()` + descarga `.html` autocontenido
- Campo `datos jsonb` en `crm_proposals` y `crm_onboarding_docs`
- ⚠️ Aplicar `supabase/migrations/2026-06-01-documentos-datos-jsonb.sql` en Supabase SQL Editor.

FASE 1 ✓ completada (2026-06-02):
- **Cartera de clientes** (`/clientes`): `ClientesPanel` + `ClienteDetalle` drawer — CRUD completo, health score, filtros status/salud/búsqueda, MRR por cliente, días a renovación
- **Cobranzas**: `CobranzasPanel` como tab en Finanzas — generación mensual, estados (pendiente/pagada/vencida/anulada), marcar pagada → auto-crea `crm_ingresos`, PDF de factura branded
- **Tipos**: `Cliente`, `Invoice`, `ClientStatus`, `ClientHealth`, `BillingCycle`, `InvoiceStatus` en `crm.ts`
- **Backend**: acciones `save-cliente`, `delete-cliente`, `save-invoice`, `delete-invoice`, `mark-invoice-paid`, `generate-monthly-invoices` en `crm-server.ts` con RBAC
- **Provider**: estado `clientes`/`invoices` + 6 acciones nuevas + scope `"clientes"` para refresh parcial
- **Dashboard**: widget cobros del mes + alertas renovación/vencidos (visibles solo si hay clientes)
- **Navegación**: item "Clientes" (ícono `Building2`) en Sidebar, MobileNav y AppHeader — role guard ≥ admin
- **Documentos**: `render-factura.ts` — HTML autocontenido con branding Meteoro, export vía `window.print()`
- **Migración pendiente**: `supabase/migrations/2026-06-02-clientes-cobranzas.sql` — aplicar con confirmación de Mati

FASE 0.7 ✓ completada (2026-06-01):
- **Settings**: flags `hideGoalAmount` y `revenueHiddenByDefault` en `Settings` type + `DEFAULT_SETTINGS` + `normalizeSettings`
- **Dashboard**: `BusinessMetrics` acepta `defaultHidden` y `hideGoalAmount`; revenue oculto por defecto configurable desde Admin
- **Admin → Configuración**: `SettingsForm` para editar meta, ocultar monto, revenue por defecto, nota CEO, scope
- **Admin → Métricas**: `AdminMetrics` con conteo de usuarios por rol/estado y de API keys por scope/actividad
- **Finanzas → Métricas**: `FinanceMetrics` con neto mes vs anterior, MRR, proyección anual, cobrado/por cobrar, top clientes, categorías, ticket promedio, YTD, gráfico evolución 6 meses
- **Tareas → Métricas**: `TaskMetrics` con activas/vencidas/urgentes/completadas y resumen del día
- **Tareas → Calendario**: `CalendarView` mejorado (chips por evento, panel de día seleccionado, botón Hoy)
- **PWA**: `manifest.ts` + `public/sw.js` + `ServiceWorkerRegister` + íconos 192/512/maskable/apple-touch en `public/icons/`
- **Branding**: `public/brand/meteoro-negativo.png` en Sidebar y MobileNav (logo real de Meteoro)
- **MobileNav**: actualizado con NAV_ITEMS reales, role guard, logo Meteoro
- **Migración SQL** (pendiente confirmación): `supabase/migrations/2026-06-01-consolidar-datos.sql`

FASE 2 ✓ completada (2026-06-04):
- **Generador de Leads** (`/leads/generador`): 3 tabs — Formulario manual, Scrapling/Maps, Instagram seguidores
- **Cola de jobs** (`crm_lead_jobs`): Supabase table + endpoints `/api/leads/scrape` (encolar, Supabase auth) + `/api/leads/jobs` (worker, API key)
- **Ingesta canónica** (`/api/leads/ingest`): API key scope `write`, dedupe por hash, excepción teléfono para `origen=instagram`
- **Tipos nuevos**: `LeadJob`, `LeadJobStatus`, `VaultItem`, `VaultMeta`, `VaultAuditEntry` en `crm.ts`; `Lead` extendido con `nicho`, `ciudad`, `pais`, `ig_handle`
- **Bóveda zero-knowledge** (`/boveda`): solo CEO, passphrase maestra + WebCrypto AES-256-GCM, auto-lock 10 min, auditoría append-only
- **Workers Python**: `~/tools/leads/worker-jobs.py` (loop de cola), `~/tools/leads/instagram-followers.py` (instagrapi), `scrape-leads.py` actualizado (canónico + legacy)
- **Migración pendiente**: `supabase/migrations/2026-06-04-leads-boveda.sql` — aplicar con confirmación de Mati

FASE SEGURIDAD + CASH COLLECT ✓ (2026-06-13):
- **Hardening de seguridad** (commit `5664100`): webhook con secret obligatorio + `timingSafeEqual`; `requireAuth` cableado en ~10 rutas API antes abiertas; rate limiter (`src/lib/rate-limit.ts`) en `portal/auth`; allowlist de email por env (`src/lib/allowed-emails.ts`); bumps de CVE (next 16.2.9, anthropic-sdk, overrides postcss/esbuild).
- **Rate limit** ahora también en endpoints públicos de ingesta: `/api/webhook` (por IP), `/api/leads/ingest` y `/api/crm/sync` (por API key).
- **RBAC** en writes de finanzas: `save-ingreso`/`delete-ingreso`/`save-egreso`/`delete-egreso` exigen rol ≥ admin (`roleRank < 2` → 403).
- **`auth-helpers.ts`** unificado: importa `ALLOWED_EMAILS` de `allowed-emails.ts` (no hardcode).
- **RLS deny-all** en tablas core: `supabase/migrations/2026-06-13-rls-core-tables.sql` — habilita RLS en `crm_leads`, `crm_ingresos`, `crm_egresos`, `crm_state`, `crm_profiles`, `crm_api_keys`, `crm_onboarding_docs`, `crm_proposals`. El server usa service_role (BYPASSRLS); cierra el bypass del anon key público. **⚠️ Correr en Supabase SQL Editor.**
- **Cash collect** (corazón del dashboard):
  - `src/lib/cobranzas.ts` — aging buckets (corriente / 1-7 / 8-30 / 31+), `carteraAbierta`, `proximaAccion`.
  - `src/lib/forecast.ts` — `STAGE_PROBABILITY` por etapa (lead .1, contacted .3, in_progress .6, closed 1, recalentar .05), `pipelinePonderado`, `forecastMes` (suscripciones + pipeline ponderado).
  - `CashCollectWidget` — cobrado vs meta (barra de progreso), por-cobrar, vencido, forecast del mes.
  - `AgingBreakdown` — desglose por antigüedad + top facturas urgentes con CTA "Recordar" (WhatsApp, pendiente de cablear al agentkit).
- **Bug fix**: selector de scope 7d/30d/90d del dashboard ahora filtra ingresos/egresos por ventana de días real (antes guardaba el estado pero no filtraba nada).

FASE ACCIONES 1-CLICK ✓ (2026-06-18):
- **Centro de Acciones** (`CentroAcciones.tsx`): panel "Hoy · qué hacer" arriba del dashboard. Agrega en una sola lista priorizada (urgentes primero): facturas vencidas, seguimientos de propuestas vencidos/hoy, renovaciones ≤7d y tareas/eventos de hoy+vencidos no completados. Cada ítem con acción 1-click.
- **WhatsApp 1-click** (`src/lib/whatsapp.ts`): `buildWhatsAppUrl` (wa.me + texto encoded), `findTelefono` (matchea nombre/empresa contra clientes+leads), plantillas rioplatenses `msgCobro`/`msgSeguimientoPropuesta`/`msgRenovacion`. Abre WhatsApp con mensaje pre-armado; no envía automático.
- **AgingBreakdown**: botón "Recordar" ahora abre WhatsApp con recordatorio de cobro (antes solo toast). Recibe `leads` para resolver teléfono.
- Solo código, sin migraciones SQL ni credenciales nuevas. Plan: `planes/2026-06-18-crm-acciones-1click.md`.

FASE CARGA CON IA (claude -p) ✓ (2026-06-18):
- **Motor**: `src/lib/claude-cli.ts` — `runClaudeJson<T>(prompt, system, {model, effort})` ejecuta `claude -p --output-format json` con `spawn`+stdin (sin shell, sin inyección). Usa la suscripción Claude Code del host, NO `ANTHROPIC_API_KEY`. Tools de escritura/red deshabilitadas. Gate `isClaudeCliEnabled()` (`ENABLE_CLAUDE_CLI`).
- **Prompts**: `src/lib/ai-prompts.ts` — `tareasSystemPrompt(hoy)` + `documentoSystemPrompt(tipo, hoy)`, español rioplatense, salida JSON estricta. Tipos `ParsedTask`, `DraftDocResult`.
- **Endpoints** (auth + rate limit, no persisten): `/api/ai/parse-tareas` (Haiku) y `/api/ai/draft-documento` (Sonnet, effort low).
- **Provider**: `parseTareasAI(text)` y `draftDocumentoAI(tipo, brief)` (fetch directo con token, no tocan estado global).
- **UI Tareas**: botón "Cargar con IA" → `AiTaskParser.tsx` (dialog: texto libre → preview editable con incluir/excluir → loop `saveCalendarEvent`).
- **UI Documentos**: botón "Redactar con IA" en `presupuesto-editor.tsx` y `bienvenida-editor.tsx` → `ai-brief.tsx` (genérico) → pre-rellena el editor (solo campos de contenido; contacto/fecha/firma quedan manuales).
- **Modelos**: Haiku para tareas; Sonnet low effort para documentos (pedido de Mati).
- **⚠️ Requiere self-hosted**: el CLI no existe en Vercel serverless. Flags en `.env.example` (`ENABLE_CLAUDE_CLI`, `CLAUDE_CLI_PATH`). Sin migraciones SQL.
- Plan: `planes/2026-06-18-crm-claude-cli-inputs-ia.md`.

FASE CALENDARIO GRILLA HORARIA ✓ (2026-06-19):
- **Agenda estilo Google Calendar/Calendly** en `/tareas`: `CalendarPro.tsx` ahora con 4 vistas — **Día (default)** / Semana / Mes / Agenda. Día y Semana son grilla horaria **08:00–20:00**.
- **`CalendarEvent.end_time?`** (nuevo, opcional, JSON-only — sin migración SQL; el calendario vive en `crm_state.exp2_calendar`). Eventos ahora ocupan un **bloque** por hora inicio/fin.
- **`src/components/tareas/TimeGrid.tsx`** — grilla reusable (día/semana): bloques posicionados absolutos, solapados repartidos en sub-columnas (`overlapColumns`), fila "todo el día" para eventos sin hora, línea de "ahora", click en franja vacía → alta con fecha+hora prellenadas.
- **`src/lib/calendar-time.ts`** — helpers puros: `GRID_START_HOUR=8`/`GRID_END_HOUR=20`, `eventLayout`, `overlapColumns`, `offsetToTime`, `defaultEndTime` (+60min), `nowOffsetPx`.
- **Form** (`tareas/page.tsx`): inputs Hora inicio + Hora fin; default fin = inicio+60min. Drag&drop en grilla reprograma día y hora (preserva duración); en mes solo día.
- **Métricas/charts/heatmap intactos** (no dependen de `end_time`). `Calendar.tsx` legacy eliminado.
- Plan: `planes/2026-06-19-crm-tareas-calendario-google.md`.

FASE UX PRO + INTERCONEXIÓN ✓ (2026-06-22):
- **Refresh silencioso (clave)**: `provider.tsx` separa `initialLoading` (solo primer arranque, único que bloquea la UI) de `refreshing` (refreshes de fondo). `AppShell` ya no desmonta `children` en cada refresh; los refreshes muestran solo `TopProgressBar` (barra fina superior). El listener `visibilitychange` ahora refetchea en silencio (nunca spinner de página completa). Provider expone `refreshing`.
- **Navbar agrupado**: `src/components/layout/NavGroups.ts` define grupos (Operación / Negocio / Agenda / Sistema) — fuente única para `Sidebar` y `BottomNav`. Sidebar con encabezados de sección + glow en activo (`nav-glow`). "Configuración" enlaza a `/admin`.
- **Calendario sección propia** (`/calendario`): reutiliza `CalendarPro`. `EventForm` extraído a `src/components/tareas/EventForm.tsx` (compartido con `/tareas`). `/tareas` quedó con Lista + Notas.
- **Interconexión estilo Obsidian**:
  - `src/lib/relaciones.ts` — `getEmpresaResumen(empresa, state)` agrega leads/cliente/eventos/notas/invoices/pipeline/suscripciones por nombre de empresa normalizado; `listEmpresas(state)`. Sin migración SQL (match en cliente).
  - `EmpresaLink` (`src/components/shared/EmpresaLink.tsx`) — chip clickeable usado en clientes, leads, pipeline, tareas/notas; abre el `EmpresaDrawer` 360.
  - `EmpresaContext` + `EmpresaDrawer` montados en `AppShell` (drawer con backlinks "Aparece en…" + saltos sin recargar).
  - **Command palette** (`CommandPalette.tsx`, Cmd/Ctrl-K): busca secciones, empresas y acciones rápidas. Botón "Buscar" en `AppHeader`.
- **Capa visual** (`globals.css`): `.ambient-bg` (luz radial sutil del shell), `.nav-glow`, `.glow-card`, `.text-display` (jerarquía de títulos), keyframe `topbar`. Mantiene monocromo negro/blanco; sin fuente nueva (Geist).
- Solo código, sin migraciones SQL ni credenciales nuevas. Plan: `planes/2026-06-22-crm-meteoro-navbar-calendario-no-refresh-pro.md`.

FASE 3, 4 pendientes (pipeline kanban, agentes config UI)
Pendiente (fase 2 acciones): cron para `generate-monthly-invoices` automático, digest diario, y envío automático vía whatsapp-agentkit (disparo + registro de acción por factura).

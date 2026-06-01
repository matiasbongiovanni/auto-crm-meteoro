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

- Login en `/login` (email/password vía Supabase Auth)
- Roles: `ceo` (acceso total), `admin`, `freelancer`
- Middleware (`middleware.ts`) protege todas las rutas excepto `/login`, `/auth/*`, `/api/crm/sync`, `/api/crm/update-from-whatsapp`, `/api/v1/*`, `/api/webhook`
- El primer usuario que se registre obtiene rol `ceo` automáticamente

## Arquitectura

**Stack**: Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Supabase Auth + Postgres

**Capa de datos híbrida:**
- Normalizado en Supabase: `crm_leads`, `crm_ingresos`, `crm_egresos`, `crm_profiles`, `crm_api_keys`, `crm_onboarding_docs`, `crm_proposals`
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
- `(app)/dashboard/` — Dashboard de negocio (métricas, revenue, pipeline)
- `(app)/leads/` — Gestión de leads *(próxima fase)*
- `(app)/pipeline/` — Kanban *(próxima fase)*
- `(app)/finanzas/` — Ingresos/egresos/suscripciones/pagos *(próxima fase)*
- `(app)/tareas/` — Calendario y tareas *(próxima fase)*
- `(app)/documentos/` — **Generador de documentos Meteoro** ✓ (implementado 2026-06-01)
- `(app)/agentes/` — Config agentes prospector *(próxima fase)*
- `(app)/mensajeria/` — **Meteoro Chat self-hosted embebido con SSO** ✓ (implementado 2026-05-31)
- `(app)/admin/` — Usuarios, roles, API keys (solo ceo) *(próxima fase)*

### API
- `/api/crm` — Router principal (GET state, POST acciones)
- `/api/crm/sync` — Sync WhatsApp bot (auth por `x-api-key`)
- `/api/crm/update-from-whatsapp` — Update desde bot (auth por `x-api-key`)
- `/api/exchange` — Cotización USD (dolarapi.com)
- `/api/usage` — Stats de uso Claude/Codex
- `/api/mensajeria/sso` — Genera URL SSO para auto-login en Meteoro Chat (auth Supabase requerido)

## Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Meteoro Chat self-hosted (sección Mensajería)
NEXT_PUBLIC_METEORO_CHAT_URL=http://localhost:3008
CHATWOOT_PLATFORM_TOKEN=<platform-api-token>   # server-only, NUNCA con NEXT_PUBLIC_
CHATWOOT_AGENT_USER_ID=1                        # ID del agente que se loguea vía SSO
CHATWOOT_DEFAULT_ACCOUNT_ID=1                   # Account ID de la cuenta Meteoro Interno
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

FASE 1, 2, 3 pendientes (leads, pipeline, agentes)

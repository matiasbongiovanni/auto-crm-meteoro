# Plan: Calendario de Tareas estilo Google Calendar / Calendly

**Creado:** 2026-06-19
**Estado:** Implementado ✓ (2026-06-19)
**Pedido:** Rehacer la sección Tareas del CRM con un calendario visual de grilla horaria — vista día (principal), semana y mes — donde cada tarea ocupa un bloque de horario, sin romper las métricas existentes.

---

## Descripción General

### Qué Logra Este Plan
Convierte la sección `/tareas` del CRM en una agenda de grilla horaria real (estilo Google Calendar): vista **Día** como principal, **Semana** como grilla de 7 columnas con franjas de hora, y **Mes** como overview. Cada tarea/evento define hora de inicio y fin, y se renderiza como un **bloque que ocupa ese horario** ("slot ocupado"). Las métricas, charts y heatmap siguen funcionando igual.

### Por Qué Importa
Mati gestiona clientes y entregas como builder + account manager. Hoy las tareas se ven como lista o como chips en celdas de mes, sin noción de "horario ocupado". Una agenda visual le permite planificar el día real, evitar solapamientos y tener un sistema operativo propio que va creciendo.

---

## Estado Actual

### Estructura Existente Relevante
- `src/app/(app)/tareas/page.tsx` — página con tabs **Lista / Calendario / Notas**, `EventForm` (form de alta/edición), métricas arriba. Usa `CalendarPro`.
- `src/components/tareas/CalendarPro.tsx` — calendario actual con vistas **mes / semana / agenda**, drag&drop (`@dnd-kit/core`) para reprogramar fecha. La semana es lista por columna, NO grilla horaria. No hay vista día.
- `src/components/tareas/Calendar.tsx` — `CalendarView` legacy, **ya no se usa** (la página usa `CalendarPro`).
- `src/components/tareas/TaskMetrics.tsx`, `TaskCharts.tsx` (`TaskCharts` + `ContributionHeatmap`), `TaskToolbar.tsx`, `AiTaskParser.tsx` — sin cambios funcionales.
- `src/lib/task-config.ts` — `TYPE_CONFIG`, `DAY_NAMES`, `MONTHS`, `localToday()`, `toDateStr()`. Fuente de verdad visual compartida.
- `src/types/crm.ts` (L254-264) — `CalendarEvent { id, title, date, time?, company?, type, completed, notes, created_at }`. **No tiene fin/duración.**
- Persistencia: JSON en `crm_state` key `exp2_calendar` (no es tabla normalizada). Acciones `save-calendar-event` / `delete-calendar-event` en `src/lib/crm-server.ts` (L425-438). Provider en `src/components/crm/provider.tsx` (L312-313). **No requiere migración SQL** — el payload es JSON libre.

### Brechas o Problemas que se Abordan
1. No existe **vista día** (la principal pedida).
2. La **semana** no es grilla horaria, es lista de chips por columna.
3. Los eventos **no ocupan un rango horario** — solo tienen `time` puntual, no se ven como bloque.
4. No se puede crear un evento clickeando una franja horaria.

---

## Cambios Propuestos

### Resumen de Cambios
- Extender `CalendarEvent` con `end_time?: string` (hora fin, opcional, backward-compatible).
- Agregar campo **Hora fin** al `EventForm` (junto a la Hora inicio ya existente).
- Reescribir `CalendarPro` para soportar 4 vistas: **Día (default) / Semana / Mes / Agenda**, con Día y Semana como **grilla horaria 08:00–20:00**.
- Eventos con hora se renderizan como **bloques posicionados** por inicio/fin (slot ocupado). Eventos sin hora ("todo el día") van en una fila superior.
- Click en franja vacía → abre alta de evento con fecha + hora prellenadas.
- Mantener drag&drop de reprogramación (extender a mover entre horas en Día/Semana — ver Paso 5).
- Métricas/charts/heatmap intactos (dependen de `date`/`completed`/`type`, no de la hora).
- Borrar `Calendar.tsx` legacy (no usado).

### Nuevos Archivos a Crear

| Ruta del Archivo | Propósito |
| ---------------- | --------- |
| `src/components/tareas/TimeGrid.tsx` | Componente de grilla horaria reutilizable por Día y Semana: renderiza filas de hora 08–20, columna(s) de día, bloques de evento posicionados absolutamente por hora inicio/fin, línea de "ahora", click en slot vacío para crear. |
| `src/lib/calendar-time.ts` | Helpers puros de tiempo: `GRID_START=8`, `GRID_END=20`, `parseHM(t)`→minutos, `eventTop/eventHeight` (px o %), `overlapColumns(events)` para repartir eventos solapados en sub-columnas, `defaultEndTime(start)` (+60min). |

### Archivos a Modificar

| Ruta del Archivo | Cambios |
| ---------------- | ------- |
| `src/types/crm.ts` | Agregar `end_time?: string` a `CalendarEvent` (L254-264). |
| `src/components/tareas/CalendarPro.tsx` | Reescritura: 4 vistas (`dia`/`semana`/`mes`/`agenda`), default `dia`. Día y Semana usan `TimeGrid`. Mes y Agenda quedan como están (chips). Header con navegación y botón Hoy adaptados al rango (día ±1, semana ±7, mes ±1). |
| `src/app/(app)/tareas/page.tsx` | `EventForm`: agregar input **Hora fin** (`end_time`) al lado de Hora; pasar `end_time` en `onSave`. Default de end = inicio +60min si hay inicio y no hay fin. Sin otros cambios de layout. |
| `src/lib/crm-server.ts` | El `followUpEvent` autogenerado (L353) seguirá sin hora — OK. No requiere cambio salvo tipado, que ya es transparente al agregar campo opcional. |

### Archivos a Eliminar
- `src/components/tareas/Calendar.tsx` — `CalendarView` legacy sin uso (la página usa `CalendarPro`). Confirmar con grep que no se importa en ningún lado antes de borrar.

---

## Decisiones de Diseño

### Decisiones Clave Tomadas
1. **Rango de grilla 08:00–20:00** (decisión de Mati): 12 franjas de hora. Eventos fuera de rango quedan clampeados al borde y marcados (raro en su operación).
2. **Hora inicio + hora fin** (decisión de Mati): `time` = inicio (campo ya existe), nuevo `end_time` = fin. Si se carga sin fin, el bloque ocupa 60 min por default vía `defaultEndTime()`. Eventos sin `time` = "todo el día" (fila superior).
3. **`end_time` opcional y JSON-only**: no hay migración SQL porque el calendario vive como JSON en `crm_state.exp2_calendar`. Eventos viejos sin `end_time` siguen válidos.
4. **Vista Día como default**: `useState<View>("dia")`. Persiste la elección de vista en la sesión del componente (no hace falta guardar en backend).
5. **Reusar `TYPE_CONFIG` de `task-config.ts`** para color de bloques (`hex`/`chip`/`dot`) — coherencia con charts y chips.
6. **Mantener `@dnd-kit`** ya instalado para drag&drop; extender a arrastre vertical (cambio de hora) en TimeGrid. Si el arrastre por hora resulta complejo, en fase 1 se permite drag solo entre días (semana) y se deja el reagendado de hora vía edición — ver Paso 5.

### Alternativas Consideradas
- **Librería externa (react-big-calendar / FullCalendar / Schedule-X)**: descartada. Suma peso y choca con el sistema monocromo Tailwind v4 + shadcn ya establecido. La grilla horaria es ~150 líneas de CSS grid; mejor control visual y de bundle hacerla a mano reusando `task-config`.
- **Tabla normalizada en Supabase para eventos**: innecesario ahora; el JSON en `crm_state` ya funciona y evita migración + RLS. Se puede migrar más adelante si crece.

### Preguntas Abiertas
Ninguna pendiente — rango horario y modelo de duración ya definidos por Mati.

---

## Tareas Paso a Paso

### Paso 1: Extender el tipo y el formulario
Agregar la noción de hora fin.

**Acciones:**
- En `src/types/crm.ts`, agregar `end_time?: string;` a `CalendarEvent`.
- En `EventForm` (`tareas/page.tsx`), agregar un `<Input name="end_time" type="time">` en la grilla junto a "Hora" (pasar de 2 columnas a inicio/fin). En `onSave`, incluir `end_time: String(fd.get("end_time") || "") || undefined`.
- Importar `defaultEndTime` y, si hay `time` y no `end_time`, setear `end_time = defaultEndTime(time)` antes de guardar.

**Archivos afectados:**
- `src/types/crm.ts`
- `src/app/(app)/tareas/page.tsx`

### Paso 2: Helpers de tiempo
Crear utilidades puras para posicionar bloques.

**Acciones:**
- Crear `src/lib/calendar-time.ts` con: constantes `GRID_START_HOUR = 8`, `GRID_END_HOUR = 20`, `HOUR_PX = 56` (alto de fila); `parseHM(t: string): number` (minutos desde 00:00); `minutesToOffsetPx(min)`; `eventLayout(e)` → `{ topPx, heightPx }` clampeado al rango; `defaultEndTime(start: string): string` (+60min, máx 20:00); `overlapColumns(events)` → asigna `{ col, cols }` a eventos que se solapan para repartirlos horizontalmente; `nowOffsetPx()` para la línea de "ahora".
- Sin dependencias nuevas; usar `date-fns` solo si simplifica (ya está en el proyecto).

**Archivos afectados:**
- `src/lib/calendar-time.ts` (nuevo)

### Paso 3: Componente TimeGrid
Grilla horaria reusable por Día y Semana.

**Acciones:**
- Crear `src/components/tareas/TimeGrid.tsx`. Props: `days: string[]` (1 para día, 7 para semana), `events: CalendarEvent[]`, callbacks `onNewSlot(date, time)`, `onEdit`, `onToggle`, `onDelete`, `onReschedule`.
- Layout: columna izquierda con labels de hora (08:00…20:00); por cada día, una columna relativa con altura `(GRID_END-GRID_START)*HOUR_PX`. Líneas horizontales por hora.
- Fila superior "todo el día" para eventos sin `time`.
- Renderizar cada evento con hora como bloque `absolute` usando `eventLayout` + `overlapColumns`. Color por `TYPE_CONFIG[type]`. Mostrar título, rango horario y empresa si entra. Tachado/opacidad si `completed`.
- Click en zona vacía de una columna → calcular hora aproximada por offset Y → `onNewSlot(date, "HH:00")`.
- Click en bloque → `onEdit(event)`. Checkbox para `onToggle`. Botón borrar para `onDelete`.
- Línea roja fina de "ahora" si el día visible incluye hoy.

**Archivos afectados:**
- `src/components/tareas/TimeGrid.tsx` (nuevo)

### Paso 4: Reescribir CalendarPro con 4 vistas
Integrar la grilla y la vista día principal.

**Acciones:**
- Cambiar `type View = "dia" | "semana" | "mes" | "agenda"` y `useState<View>("dia")`.
- Switch de vistas en header: Día / Semana / Mes / Agenda (íconos lucide: `CalendarRange`/`Columns`/`CalendarDays`/`List`).
- Navegación `shift(dir)`: día ±1, semana ±7, mes ±1 mes. Botón **Hoy** resetea cursor a hoy.
- **Día**: `<TimeGrid days={[cursorDate]} … />` + encabezado con fecha larga (ej. "Jueves 19 de Junio").
- **Semana**: `<TimeGrid days={weekDays(cursor)} … />` (reusar `weekDays` existente).
- **Mes**: mantener grilla mensual actual con chips + `DayPanel` (sin cambios).
- **Agenda**: mantener `AgendaView` actual.
- Conservar `byDate` memo, `DndContext` y `onReschedule`.

**Archivos afectados:**
- `src/components/tareas/CalendarPro.tsx`

### Paso 5: Drag & drop en grilla (reprogramar hora)
Extender el reagendado a la grilla horaria.

**Acciones:**
- En `TimeGrid`, hacer cada bloque `useDraggable` y cada columna-día `useDroppable` con data `{ date }`. Al soltar, calcular nueva hora por offset Y del drop y llamar `onReschedule(event, newDate, newStartTime)` preservando la duración (recalcular `end_time`).
- Extender la firma de `onReschedule` en `CalendarPro` y en `page.tsx` (`handleReschedule`) para aceptar `newTime?` opcional y, si viene, actualizar `time` + `end_time`.
- Si el cálculo de hora por drop resulta inestable en esta fase, degradar a: drag solo cambia el **día** (mantener hora) y dejar el cambio de hora vía edición. Documentarlo en el commit.

**Archivos afectados:**
- `src/components/tareas/TimeGrid.tsx`
- `src/components/tareas/CalendarPro.tsx`
- `src/app/(app)/tareas/page.tsx`

### Paso 6: Limpieza y verificación visual
- Confirmar con `grep -rn "Calendar.tsx\|CalendarView" src` que `Calendar.tsx` no se importa; eliminarlo.
- `npm run lint` y `npm run build` sin errores.
- Revisar que `TaskMetrics`, `TaskCharts`, `ContributionHeatmap` sigan calculando igual (no dependen de `end_time`).

**Archivos afectados:**
- `src/components/tareas/Calendar.tsx` (eliminar)

### Paso 7: Actualizar documentación
- En `auto-crm/CLAUDE.md`, sección estado: agregar línea de la fase "Calendario grilla horaria (día/semana/mes/agenda) + `end_time`".
- En el CLAUDE.md raíz no hace falta tocar (detalle interno del CRM).

**Archivos afectados:**
- `auto-crm/CLAUDE.md`

---

## Conexiones y Dependencias

### Archivos que Referencian Esta Área
- `tareas/page.tsx` consume `CalendarPro`, `TaskMetrics`, `TaskCharts`, `AiTaskParser`, `TaskToolbar` — solo `CalendarPro` y `EventForm` cambian.
- `crm-server.ts` genera `followUpEvent` sin hora → cae en "todo el día", correcto.
- `AiTaskParser.tsx` / `/api/ai/parse-tareas` producen `CalendarEvent` sin `end_time` → válido (opcional). Mejora futura: que la IA devuelva `end_time`.

### Actualizaciones Necesarias para Consistencia
- `task-config.ts` ya es la fuente de color compartida — TimeGrid debe usarlo, no redefinir colores.
- Si más adelante se normaliza el calendario a tabla Supabase, `end_time` se mapea directo.

### Impacto en Flujos de Trabajo Existentes
- Tab "Lista" y "Notas por empresa": sin cambios.
- Drag&drop existente de mes: se mantiene; se suma el de grilla.
- Eventos cargados antes de este cambio: se ven como bloque de 60 min default (si tienen `time`) o "todo el día" (si no).

---

## Lista de Validación
- [ ] `CalendarEvent` tiene `end_time?` y el form lo guarda.
- [ ] Vista Día es la default y muestra grilla 08–20 con bloques posicionados.
- [ ] Vista Semana muestra 7 columnas con grilla horaria y bloques.
- [ ] Click en franja vacía abre alta con fecha + hora prellenadas.
- [ ] Un evento con inicio/fin ocupa visualmente ese rango (slot ocupado); dos solapados se reparten en sub-columnas.
- [ ] Eventos sin hora aparecen en fila "todo el día".
- [ ] Línea de "ahora" visible en el día de hoy.
- [ ] Drag reprograma (al menos de día; idealmente de hora).
- [ ] `TaskMetrics` / `TaskCharts` / `ContributionHeatmap` sin regresión.
- [ ] `Calendar.tsx` eliminado y sin imports rotos.
- [ ] `npm run lint` y `npm run build` OK.
- [ ] `auto-crm/CLAUDE.md` actualizado.

---

## Criterios de Éxito
La implementación está completa cuando:
1. La sección `/tareas` abre en **vista Día** con una grilla horaria estilo Google Calendar y se puede navegar a Semana, Mes y Agenda.
2. Al crear una tarea con hora inicio y fin, aparece como **bloque que ocupa ese horario** en Día y Semana, con su color por tipo.
3. Las métricas, charts y heatmap existentes siguen funcionando exactamente igual.
4. El build y el lint pasan sin errores y no quedan archivos muertos.

---

## Notas
- **Sin migración SQL ni credenciales nuevas**: todo el calendario es JSON en `crm_state.exp2_calendar`.
- **No usar librería de calendario externa** — grilla a mano con CSS grid + `task-config` para mantener bundle y estética monocromo.
- Futuras iteraciones (fuera de este plan): snap de drag a 15 min, redimensionar bloque arrastrando el borde inferior, que la IA (`parse-tareas`) devuelva `end_time`, sincronización con Google Calendar real vía OAuth.

> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Plan**: 36 · **Chat**: 1 · **Fase**: F1 (`/investigate`) · **Creado**: 2026-04-27 · **Estado**: ✅ cerrado 2026-04-27

# Plan 36 · Chat 1 — Auditoría UX/UI de las 7 páginas de Monitoreo

## Objetivo

Recoger del usuario, página por página, qué le molesta del diseño actual y qué le falta. Sin diagnóstico, no hay rediseño — Plan 35 cerró el hub + shells, ahora toca decidir qué páginas internas vale la pena tocar.

## MODO SUGERIDO

`/investigate` (sin código). Salida = acta con decisión binaria por página: ✅ rediseñar · 🟡 ajuste menor · ⏭️ no tocar.

## Plan file

[.claude/plan/monitoreo-pages-redesign.md](../../plan/monitoreo-pages-redesign.md)

## Páginas en alcance (7)

| # | Sub-vista | Ruta | Componente |
|---|-----------|------|------------|
| 1 | Bandeja de Correos | `/intranet/admin/monitoreo/correos/bandeja` | `email-outbox` |
| 2 | Dashboard del día | `/intranet/admin/monitoreo/correos/dashboard` | `email-outbox-dashboard-dia` |
| 3 | Diagnóstico de Correos | `/intranet/admin/monitoreo/correos/diagnostico` | `email-outbox-diagnostico` |
| 4 | Auditoría de Correos | `/intranet/admin/monitoreo/correos/auditoria` | `auditoria-correos` |
| 5 | Trazabilidad de Errores | `/intranet/admin/monitoreo/incidencias/errores` | `error-groups` |
| 6 | Reportes de Usuarios | `/intranet/admin/monitoreo/incidencias/reportes` | `feedback-reports` |
| 7 | Rate Limit Events | `/intranet/admin/monitoreo/seguridad/rate-limit` | `rate-limit-events` |

## Salida esperada de este chat

Acta inline (en este mismo brief al cerrar) con tabla:

| # | Página | Decisión | Notas del usuario |
|---|--------|----------|-------------------|
| 1 | Bandeja | ✅/🟡/⏭️ | … |
| … | … | … | … |

A partir de esa acta, `/end` decide si se generan briefs derivados (Chat 2..N) y cuántos.

## Restricciones

- Sin código en este chat.
- Trazabilidad de Errores (#5) recién rediseñada en Plan 34 — preguntar explícitamente; default ⏭️ salvo que el usuario insista.

---

## 📋 Acta del Chat 1 (2026-04-27)

### Decisión binaria por página

| # | Página | Decisión | Notas del usuario |
|---|--------|----------|-------------------|
| 1 | Bandeja de Correos | ✅ rediseñar | Tab transparente · botón Exportar sin contraste · layout muy vertical (4 secciones apiladas: stats + chart + filtros + tabla) — necesita mejor distribución · header de tabla transparente · paginador default `[5, 10, 15]` con 5 por default · 3 filtros con mismo placeholder y sin labels |
| 2 | Dashboard del día | ✅ rediseñar (parcial) | Tab "Resumen" excelente — **NO tocar** · Tab "Detalle de fallos" caótico/amontonado → reformatear como dashboard |
| 3 | Diagnóstico de Correos | ✅ rediseñar | Más visual en general · gap del día está bien · diagnóstico por correo: agregar **sugerencias en buscador** + **búsqueda por apellidos/nombres** (no solo por correo) |
| 4 | Auditoría de Correos | 🟡 ajuste menor | **Bloqueador detectado en este chat**: feature flag `auditoriaCorreos: false` en `environment.ts` (prod) — la página existe en código pero no se ve. Decisión: subir el flag a `true` (la auditoría es read-only, no tiene riesgo). Sin rediseño visual pedido — el usuario no la pudo ver. |
| 5 | Trazabilidad de Errores | ✅ rediseñar (override default ⏭️) | Tab transparente · Kanban incompleto: hoy solo muestra columnas Nuevo / Visto / En Progreso, faltan Resuelto / Ignorado (hoy solo se llega a esos estados vía botón del detalle). Agregar las 2 columnas faltantes al Kanban. |
| 6 | Reportes de Usuarios | 🟡 ajuste menor | Mejorar diseño de las métricas (cards superiores Total/Nuevos/En Progreso/Resueltos/Descartados). Sin cambios estructurales. |
| 7 | Rate Limit Events | 🟡 ajuste menor | Agregar 1 dato útil: **cuántos intentó vs cuál era el umbral máximo en lapso de tiempo** (intentos/umbral por evento). Sin rediseño. |

### Patrones cross-página detectados

| Patrón | Páginas afectadas | Origen probable |
|--------|-------------------|-----------------|
| **Tab transparente (no blanco)** | #1, #5 (probable resto) | `<p-tabs>` en shells del Plan 35 — fix global en CSS del shell o en `styles.scss` |
| **Header de tabla transparente** | #1 | Override PrimeNG — ya hay regla [`design-system.md` §1](../../rules/design-system.md) que dice que toda `p-table` es transparente. Verificar por qué #1 no la respeta. |
| **Botones Exportar/Refrescar sin contraste** | #1 (probable más) | Usar tokens `var(--text-color)` + `var(--surface-300)` per [`design-system.md` §3](../../rules/design-system.md) (botones text/outlined) |
| **Slow request inicial** | #1, #3 | **Fuera de scope FE** — issue BE. Anotado en plan file para chat futuro BE. |

### Salida fuera de scope (anotar pero no ejecutar acá)

- Slow requests primera carga en #1 y #3 → ticket BE en algún chat futuro (revisar `Slow request` warnings vistos en Trazabilidad de Errores: `GET /api/sistema/asistencia/dia... 6755ms` y `GET /api/sistema/email-... 8687ms`).
- #4 requiere subir flag `auditoriaCorreos: true` en `environment.ts` — decisión rápida que entra al chat de Bandeja (#1) o un chat de "ajustes menores" agrupado.

### Plan de chats derivados (decisión del usuario 2026-04-27)

**1 chat por página** (7 FE) + **1 chat BE** para apoyo de #3. Total **8 chats**.

| # | Tipo | Alcance | Repo |
|---|------|---------|------|
| **Chat 2** | `/design + /execute` FE | **Bandeja de Correos (#1)** — reflujo de layout, tab+tabla transparentes, contraste botón Exportar, paginador `[5,10,15]` default 5, labels en filtros | `educa-web` |
| **Chat 3** | `/design + /execute` FE | **Dashboard del día (#2)** — solo tab "Detalle de fallos" en formato dashboard | `educa-web` |
| **Chat 4** | `/design + /execute` FE | **Diagnóstico de Correos (#3)** — más visual + sugerencias en buscador + búsqueda por apellidos/nombres en cliente (consume endpoint BE del Chat 4b) | `educa-web` |
| **Chat 4b** | `/design + /execute` BE | **Endpoint diagnóstico búsqueda por nombre/apellidos** en `Educa.API` — extiende `GET /api/sistema/email-outbox/diagnostico` o agrega endpoint nuevo. **Bloquea Chat 4 FE.** | `Educa.API` |
| **Chat 5** | `/execute` FE | **Auditoría de Correos (#4)** — flip `auditoriaCorreos: false → true` en `environment.ts`. Tras hacer visible la página, validar visual antes de cerrar (o promover a Chat 5b si requiere rediseño) | `educa-web` |
| **Chat 6** | `/design + /execute` FE | **Trazabilidad de Errores (#5) — Kanban** — agregar columnas Resuelto + Ignorado · tab transparente | `educa-web` |
| **Chat 7** | `/execute` FE | **Reportes de Usuarios (#6)** — mejorar diseño de cards de métricas | `educa-web` |
| **Chat 8** | `/design + /execute` FE | **Rate Limit Events (#7)** — agregar columna/dato "intentos vs umbral en lapso" (puede requerir BE — verificar al arrancar; si BE falta, derivar Chat 8b) | `educa-web` |

### Reglas operativas para los chats derivados

- **Tab transparente**: cada chat resuelve el patrón en el archivo que toque (probablemente `styles.scss` global). El primer chat que lo encuentre lo arregla globalmente; los siguientes solo verifican que su shell heredó el fix. Documentar en el primer brief que toque para que los siguientes lo skipeen.
- **Slow requests** (#1 inicial · #3 inicial): fuera de scope FE. Anotar en `.claude/tasks/be-slow-requests-monitoreo.md` para chat BE futuro (fuera del Plan 36).
- **Orden recomendado de ejecución**: Chat 5 (flag flip · 5 min · destraba ver #4) → Chat 4b BE → Chat 2 (#1) → Chat 4 FE (#3) → Chat 6 (#5 Kanban) → Chat 3 (#2 Dashboard) → Chat 7 (#6) → Chat 8 (#7). El usuario reordena libremente; la única dependencia dura es Chat 4b BE → Chat 4 FE.

### DoD de este Chat 1

- [x] Las 7 páginas tienen decisión documentada
- [x] Bloqueadores no-de-rediseño detectados (#4 flag flip)
- [x] Patrones cross-página identificados
- [x] Plan de chats derivados propuesto

**Pendiente**: validar con el usuario el plan de 3 chats derivados antes de cerrar con `/end`. El `/end` generará los 3 briefs en `chats/open/` y queda listo `/go` para arrancar Chat 2.


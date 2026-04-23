> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 30 · **Chat**: 2 (reordenado) · **Fase**: F2.FE · **Estado**: ⏳ pendiente arrancar — cola top 3 del maestro posición #1.

---

# Plan 30 Chat 2 — FE: Dashboard "correos del día" (pantalla admin)

## PLAN FILE

- Plan canónico: **inline en el maestro** bajo sección **"🟡 Plan 30 — Dashboard Visibilidad Admin"** (`.claude/plan/maestro.md`).
- Origen: 2026-04-23, sesión de cierre del Plan 30 Chat 1 F1.BE. El usuario priorizó **"poder ver todo desde el front con facilidad"** — si el back ya está, pasamos al front antes que Chats 2/3 BE (gap asistencia, diagnóstico). Esos chats BE se re-numeran a Chat 3 y Chat 4 del plan.

## OBJETIVO

Crear la pantalla admin `/intranet/admin/email-outbox/dashboard-dia` que consume el endpoint recién entregado (`GET /api/sistema/email-outbox/dashboard-dia?fecha=yyyy-MM-dd`) y renderiza en una sola vista las 4 secciones del `EmailDashboardDiaDto`: **Resumen** (10 KPIs), **PorHora** (24 buckets, chart), **PorTipo** (agregación por `EO_Tipo`), **BouncesAcumulados** (top 50 destinatarios con 2+ bounces post-SMTP).

Reemplaza las 6 queries SQL manuales que el admin hoy ejecuta cada día en SSMS (Q1/Q3/Q4/Q8 + D1/D4). Pantalla read-only — no muta outbox ni blacklist.

**Alcance explícito**: **solo FE**. El BE ya está ([commit en Educa.API master](https://github.com/— pendiente de commit por el usuario)).

## PRE-WORK OBLIGATORIO (investigación antes de codear)

1. **Leer** `src/app/features/intranet/pages/admin/email-outbox/email-outbox.component.ts` + `.html` + `.scss` — patrón de la pantalla admin existente de bandeja de correos (header + stats + chart + filters + table + widgets + drawer). La página nueva es **hermana** de esta, no la reemplaza.
2. **Leer** `src/app/features/intranet/pages/admin/email-outbox/components/defer-fail-status-widget/` — patrón del widget auto-refresh (polling 60s, semáforo OK/WARNING/CRITICAL, fail-safe CRITICAL). La sección "Resumen" de la nueva pantalla comparte ADN visual con este widget.
3. **Leer** `src/app/features/intranet/pages/admin/email-outbox/components/email-outbox-chart/email-outbox-chart.component.ts` — patrón de chart con PrimeNG. El chart PorHora de la nueva pantalla puede reusar configuración.
4. **Leer** `src/app/features/intranet/pages/admin/email-outbox/services/email-outbox-data.facade.ts` — patrón RxJS → signals + estado de carga (para replicar en el facade de dashboard-dia).
5. **Leer** `src/app/features/intranet/pages/admin/email-outbox/pipes/tipo-fallo-label.pipe.ts` + `tipo-fallo-severity.pipe.ts` — **reusar tal cual** para los tags de tipo de fallo en la pantalla nueva. Ya existen y cubren los valores del DTO.
6. **Leer** `src/app/features/intranet/pages/admin/auditoria-correos/` — patrón de tabla con datos agregados de correos + masking.
7. **Leer** `src/app/features/intranet/intranet.routes.ts` líneas 319-325 (ruta `admin/email-outbox`) — patrón para agregar la nueva sub-ruta.
8. **Leer** `src/app/features/intranet/shared/config/intranet-menu.config.ts` — ubicar `Bandeja de Correos` dentro del módulo **Sistema > Monitoreo** y decidir dónde va la entrada nueva.
9. **Repasar** reglas FE relevantes — `design-system.md` (B1 container con border, B3 stat card, B6 filter bar, B4 tabla, sección 8 tokens de color), `skeletons.md` (skeleton obligatorio en toda sección con datos async), `crud-patterns.md` (store + facade + signals privados), `a11y.md` (botones icon-only con `[pt]` aria-label), `primeng.md` (appendTo="body" en selects/calendars).

## DECISIONES A VALIDAR CON EL USUARIO (antes de tocar código)

5 decisiones no triviales. **Todas con recomendación del brief** — el usuario puede aceptar el lote completo o ajustar.

1. **Ruta**: sub-ruta `/intranet/admin/email-outbox/dashboard-dia` vs ruta hermana propia `/intranet/admin/dashboard-correos` vs tab/sub-vista dentro de la página existente.
   - **Recomendación**: **sub-ruta** `/intranet/admin/email-outbox/dashboard-dia` — mantiene la familia `email-outbox` junta en código y URL, permite bookmark directo, la página nueva tiene su propio facade/store sin contaminar el existente (que es operativo, no analítico). Precedente: `/intranet/admin/auditoria-correos` es ruta hermana separada aunque conceptualmente es "bandeja".

2. **Entrada en el menú admin**: agregar al grupo **Sistema > Monitoreo** junto a `Bandeja de Correos` y `Auditoría de Correos`, con label `Dashboard del día`.
   - **Recomendación**: **sí**, con flag `environment.features.emailOutboxDashboardDia = true` en dev, `false` en prod para gated rollout. El menú group ya existe según `menu-modules.md` sección 8 (Sistema > Monitoreo tiene 3 items + auditoria).

3. **Polling / refresh**: manual (botón refresh) vs auto 60s vs manual + toggle "auto".
   - **Recomendación**: **botón refresh manual + indicador `GeneratedAt`** visible (ej: "Actualizado hace 3 min"). A diferencia de `DeferFailStatusWidget` que es semáforo en tiempo real (60s), el Dashboard es analítico — el admin refresca cuando quiere verificar el estado. Auto-polling en un dashboard denso consume renders innecesarios. Si más adelante se pide, agregar toggle.

4. **Layout vertical**:
   - **Recomendación**: orden top-down `Header (con filtro fecha + refresh) → Resumen (10 stat cards en grid) → Chart PorHora (barras apiladas) → PorTipo (tabla chica) + BouncesAcumulados (tabla grande) en dos columnas responsive`. En mobile colapsa a una columna. Replica la ergonomía de `email-outbox.component.html` (Stats → Chart → Table).

5. **Chart PorHora**: barras apiladas (Enviados + Fallidos + QueLlegaronAlSmtp como series separadas) vs líneas vs heatmap.
   - **Recomendación**: **barras apiladas** — 3 series (`Enviados`, `Fallidos`, `QueLlegaronAlSmtp`) sobre 24 buckets. Horizontal axis: `0-23` hora Lima. Color tokens `var(--green-500)` para enviados, `var(--red-500)` para fallidos, `var(--blue-800)` para "llegaron al SMTP". Reusar `chart.js` de PrimeNG (ya presente en `email-outbox-chart`).

Durante el chat, el usuario acepta/ajusta las 5 decisiones antes de escribir código.

## ALCANCE

### Archivos a crear

**Feature `email-outbox-dashboard-dia/`** (hermano de `email-outbox/`):

| # | Archivo | Rol | Líneas estimadas |
|---|---------|-----|------:|
| 1 | `pages/admin/email-outbox-dashboard-dia/email-outbox-dashboard-dia.component.ts` | Page component (Smart) — consume facade, orquesta sub-componentes | ~80 |
| 2 | `pages/admin/email-outbox-dashboard-dia/email-outbox-dashboard-dia.component.html` | Template top-down | ~100 |
| 3 | `pages/admin/email-outbox-dashboard-dia/email-outbox-dashboard-dia.component.scss` | Layout grid + overrides locales mínimos | ~60 |
| 4 | `pages/admin/email-outbox-dashboard-dia/index.ts` | Barrel export | ~5 |
| 5 | `pages/admin/email-outbox-dashboard-dia/services/email-outbox-dashboard-dia.service.ts` | Gateway HTTP (1 endpoint) | ~30 |
| 6 | `pages/admin/email-outbox-dashboard-dia/services/email-outbox-dashboard-dia.store.ts` | Signals + computed (dto, loading, error, fechaConsulta) | ~80 |
| 7 | `pages/admin/email-outbox-dashboard-dia/services/email-outbox-dashboard-dia.facade.ts` | Orquesta RxJS + signals | ~90 |
| 8 | `pages/admin/email-outbox-dashboard-dia/services/index.ts` | Barrel | ~3 |
| 9 | `pages/admin/email-outbox-dashboard-dia/models/email-dashboard-dia.models.ts` | Tipos `EmailDashboardDiaDto` + 4 sub-DTOs (mirror del BE) | ~60 |
| 10 | `pages/admin/email-outbox-dashboard-dia/components/dashboard-header/dashboard-header.component.ts` + `.html` + `.scss` | Header con título + date picker + botón refresh + `GeneratedAt` label | ~80 |
| 11 | `pages/admin/email-outbox-dashboard-dia/components/dashboard-resumen/dashboard-resumen.component.ts` + `.html` + `.scss` | 10 stat cards (patrón B3 del design-system) | ~100 |
| 12 | `pages/admin/email-outbox-dashboard-dia/components/dashboard-chart-hora/dashboard-chart-hora.component.ts` + `.html` + `.scss` | Chart barras apiladas 24 buckets | ~100 |
| 13 | `pages/admin/email-outbox-dashboard-dia/components/dashboard-por-tipo-table/dashboard-por-tipo-table.component.ts` + `.html` + `.scss` | Tabla agregación por `EO_Tipo` | ~80 |
| 14 | `pages/admin/email-outbox-dashboard-dia/components/dashboard-bouncers-table/dashboard-bouncers-table.component.ts` + `.html` + `.scss` | Tabla top 50 destinatarios + copy-to-clipboard | ~100 |
| 15 | `pages/admin/email-outbox-dashboard-dia/components/dashboard-resumen-skeleton/dashboard-resumen-skeleton.component.ts` | Skeleton 10 cards | ~30 |
| 16 | `pages/admin/email-outbox-dashboard-dia/components/dashboard-chart-hora-skeleton/dashboard-chart-hora-skeleton.component.ts` | Skeleton chart | ~30 |

**Test specs** (Vitest):

| # | Archivo | Cubre |
|---|---------|-------|
| 17 | `email-outbox-dashboard-dia.facade.spec.ts` | Facade: load, error handling, error codes mapeados a toast, refresh, cambio de fecha |
| 18 | `email-outbox-dashboard-dia.store.spec.ts` | Store: set/asReadonly, computed de KPIs derivados |
| 19 | `dashboard-resumen.component.spec.ts` | Render de 10 cards con DTO seed |
| 20 | `dashboard-bouncers-table.component.spec.ts` | Render de tabla + pipe de masking (ya viene masked del BE pero verificar que se preserva) |

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/app/features/intranet/intranet.routes.ts` | Agregar ruta `admin/email-outbox/dashboard-dia` con `loadComponent` + `title: 'Intranet - Dashboard de Correos'`. Gated por `environment.features.emailOutboxDashboardDia`. |
| `src/app/features/intranet/shared/config/intranet-menu.config.ts` | Agregar item en grupo `Sistema > Monitoreo` con label `Dashboard del día`, icono `pi-chart-bar` o `pi-chart-pie`, flag-gated. |
| `src/app/config/environment.ts` + `environment.development.ts` | Agregar `emailOutboxDashboardDia: true` (dev) / `false` (prod) en `features`. |

### Contrato de modelos (mirror del BE)

```typescript
// models/email-dashboard-dia.models.ts
export interface EmailDashboardDiaDto {
  fecha: string;                          // ISO yyyy-MM-dd (el BE serializa Date como string)
  resumen: EmailDashboardResumen;
  porHora: EmailDashboardPorHora[];       // siempre 24 items
  porTipo: EmailDashboardPorTipo[];       // variable
  bouncesAcumulados: EmailBouncesAcumulados[]; // ≤ 50
  generatedAt: string;
}

export interface EmailDashboardResumen {
  enviados: number;
  fallidos: number;
  pendientes: number;
  reintentando: number;
  formatoInvalido: number;
  sinCorreo: number;
  blacklisteados: number;
  throttleHost: number;
  otrosFallos: number;
  deferFailContadorCpanel: number;
}

export interface EmailDashboardPorHora {
  hora: number;               // 0-23
  enviados: number;
  fallidos: number;
  queLlegaronAlSmtp: number;
}

export interface EmailDashboardPorTipo {
  tipo: string;               // "ASISTENCIA", "ReporteFallosCorreoAsistencia", etc.
  enviados: number;
  fallidos: number;
  pendientes: number;
}

export interface EmailBouncesAcumulados {
  destinatarioMasked: string; // Ya viene en formato "j***z@dominio.com" del BE
  bouncesAcumulados: number;
  ultimoIntento: string;      // ISO
  ultimoError: string;        // ≤ 100 chars
}

export type DashboardDiaErrorCode =
  | 'FECHA_FORMATO_INVALIDO'
  | 'FECHA_FUTURA_INVALIDA'
  | 'FECHA_DEMASIADO_ANTIGUA';
```

## TESTS MÍNIMOS

| Caso | Setup | Esperado |
|------|-------|----------|
| Load inicial sin filtro | Facade.loadData() llamado en ngOnInit | Store.loading=true → service HTTP → store.dto set + loading=false |
| Refresh manual | Facade.refresh() | Mismo flujo, conserva `fechaConsulta` actual del store |
| Cambio de fecha válida | Facade.setFecha('2026-04-22') | Nueva request con `?fecha=2026-04-22` |
| Error `FECHA_FUTURA_INVALIDA` | Service mock devuelve 400 con errorCode | Toast error con mensaje localizado; store.error set; no crash |
| Error `FECHA_DEMASIADO_ANTIGUA` | idem con otro code | Toast con mensaje específico |
| Error genérico 500 (no debería pasar por INV-S07) | Service mock tira error | Toast error + logger.error + store.error set |
| Render Resumen con 10 KPIs | Seed DTO | 10 stat cards con los valores exactos |
| Render Chart con 24 buckets | Seed PorHora con 3 horas no-cero | Chart componente recibe 24 series + 3 labels con datos |
| Render BouncesAcumulados enmascarados | Seed 2 bouncers con `j***z@dominio.com` | Tabla muestra el mail masked, sin rehidratar |
| Skeletons durante loading | `loading=true` | 4 secciones skeleton (`dashboard-resumen-skeleton`, chart skeleton, 2 tablas skeleton) |
| Feature flag `emailOutboxDashboardDia=false` | Navegar a ruta | 404 o redirect (la ruta no debe existir sin el flag) |
| Menu item oculto sin flag | Menu config con flag off | Item no aparece en Sistema > Monitoreo |

Framework: **Vitest** + `@angular/core/testing` + jsdom. Patrón: `TestBed.configureTestingModule` con `provideHttpClient` + `provideHttpClientTesting`.

**Baseline esperado**: suite FE actual + ~8-12 tests nuevos.

## REGLAS OBLIGATORIAS

**Arquitectura & Stack**:
- Componente standalone + `ChangeDetectionStrategy.OnPush` en TODOS los componentes (page + sub-componentes) — ver `code-style.md` y `architecture.md`.
- `inject()` over constructor. `DestroyRef` via inject. `takeUntilDestroyed(this.destroyRef)` en TODO `.subscribe()`.
- Imports con alias (`@core`, `@shared`, `@features/intranet/*`, `@data`, `@config`) — regla `code-style.md`.
- **Signals** para estado local. **NgRx Signals no necesario** — es feature-local. Store con signals privados `_x` + `.asReadonly()` + métodos de mutación.
- RxJS termina en el facade. Componentes consumen `facade.vm` (computed ViewModel) — regla `state-management.md`.
- **Logger** (`@core/helpers/logs`), nunca `console.log`. Para trazar el load: `logger.tagged('DashboardDia:Facade', 'info', '...')`.
- **Cap 300 líneas** por archivo TS (regla ESLint `max-lines` del `eslint.md`). Si un archivo crece, extraer sub-componente o helper.

**Design system**:
- Container secciones con **border + radius, NO background** (B1 del `design-system.md`).
- Stat cards con `background: transparent` (global) — solo modificar border/color para variantes (B3).
- Filter bar patrón B6 (search + filter-dropdowns + btn-clear con `margin-left: auto`).
- Tablas patrón B4 (`.table-section` con border radius, headers UPPERCASE con `.label-uppercase`).
- Botón refresh con `p-button-text p-button-sm btn-icon` + `[pt]` aria-label (B5 + a11y).
- **Tokens de color** (sección 8): `var(--red-500)`, `var(--red-600)`, `var(--blue-800)`, `var(--green-500)`, `var(--yellow-500)` — **NO hex literal**. Texto blanco sobre `p-button-success` ya global (A5), no inline.
- Tags: `styleClass="tag-neutral"` para metadatos informativos (tipos de correo); `severity="danger|warning|success"` sin `tag-neutral` para críticos (status, umbrales).
- Alert banner para casos límite (cap 90 días) usando `color-mix()` (B9) — no fondos hex rígidos.

**PrimeNG**:
- `p-calendar` con `appendTo="body"` para el filtro de fecha. `dateFormat="yy-mm-dd"`, `maxDate={hoyLima}`, `minDate={hoyLima - 90d}`.
- `p-select` (si hay) con `appendTo="body"`.
- Botones icon-only con `[pt]="{ root: { 'aria-label': 'Refrescar' } }"`.
- Chart de PrimeNG (`p-chart type="bar"`) — reusar import de `email-outbox-chart.component.ts`.

**Templates** (`templates.md`):
- Todo binding usa **signal directo** o **computed** — nunca funciones en template (excepto event handlers `(click)`).
- `@for track item.id` obligatorio. `@if @else if @else` encadenado.
- NO getters en template; refactorizar a `computed()`.

**Skeletons** (`skeletons.md`):
- Cada sección con datos async tiene skeleton propio (Resumen, Chart, PorTipo, Bouncers) — 4 skeletons distintos.
- `minHeight` en el contenedor para evitar CLS.
- Reusar `app-skeleton-loader`, `app-table-skeleton`, `app-stats-skeleton` del `@shared/components/`.

**Rendering progresivo** (`lazy-rendering.md`):
- 4 fases de `*Ready` signals — mostrar cada sección cuando llega. Aunque el endpoint es una sola request, el FE puede renderizar progresivamente si se usa `scan` para emitir parcial — **opcional**: si se trata como single emit, mostrar todo junto está bien (endpoint ya es rápido).
- **Recomendación**: fase única (una sola request, una sola emisión) para este caso. El rendering progresivo se justifica cuando hay N requests, no cuando es 1.

**Optimistic UI / WAL**:
- **NO aplica** — esta pantalla es read-only. El facade NO usa `WalFacadeHelper`. Ver `optimistic-ui.md` sección "prohibido `.subscribe` directo": aplica solo a mutaciones. Aquí se usa `.pipe(...).subscribe(...)` normal con `takeUntilDestroyed`.

**Rate limiting**:
- Interceptor global ya limita requests (`rateLimitInterceptor`) — no hay prevención adicional necesaria.
- `withRetry` **NO** reintenta 429 — usar el helper default del proyecto para el load.

**a11y**:
- Contrast: texto sobre fondo claro usa `var(--blue-800)` no celeste.
- Botones icon-only con aria-label vía `[pt]`.
- Headers semánticos (`h1` del header, `h2` por sección del dashboard).

**Storage / cache**:
- SWR del SW cachea automáticamente el endpoint — no necesita lógica manual.
- Si se agrega filtro de fecha como query param, la cache key se normaliza sola (no es parámetro de cache-busting).

## APRENDIZAJES TRANSFERIBLES (del Plan 30 Chat 1 BE — commit pendiente)

**Del endpoint BE**:

1. **URL exacta**: `GET /api/sistema/email-outbox/dashboard-dia` con query opcional `?fecha=yyyy-MM-dd`.
2. **Auth**: 4 roles administrativos (Director, Asistente Administrativo, Promotor, Coordinador Académico). El guard `permisosGuard` + la ruta admin ya protege — no requiere adicional.
3. **Rate limit**: **global 200/min**, sin decorator custom. Bueno para refresh manual.
4. **Response format**: `ApiResponse<EmailDashboardDiaDto>` con `success/data/message`. El interceptor FE ya hace **auto-unwrap** (`project_api_response_unwrap` memoria) — el service llama `get<EmailDashboardDiaDto>(url)` y recibe el data directo, **no** `get<ApiResponse<EmailDashboardDiaDto>>`.
5. **Error codes (400)**:
   - `FECHA_FORMATO_INVALIDO` — formato distinto a `yyyy-MM-dd`
   - `FECHA_FUTURA_INVALIDA` — fecha posterior a hoy Lima
   - `FECHA_DEMASIADO_ANTIGUA` — más de 90 días atrás
   - Mapear cada uno a mensaje en toast localizado.
6. **INV-S07**: el BE **nunca** devuelve 500 por error de agregación. Si falla internamente, retorna DTO con resumen en ceros, `porHora` con 24 buckets vacíos, listas vacías. **El FE puede confiar** en que siempre hay shape — no necesita skeleton defensivo para "campos null". Igualmente, manejar errores de red reales (timeout, 401, 403).
7. **Valores reales de `EO_Tipo`** detectados en prod via SQL (2026-04-23):
   - `ASISTENCIA` (UPPERCASE)
   - `ReporteFallosCorreoAsistencia` (CamelCase — **no es bug**, así se encola hoy)
   - Implica que el pipe `tipo-label` (si lo hay) debe aceptar literal arbitrario, no una whitelist.
8. **Valores reales de `EO_TipoFallo`** detectados en prod: `NULL`, `FAILED_INVALID_ADDRESS`, `FAILED_UNKNOWN`. Los demás placeholders del BE (`FAILED_NO_EMAIL`, `FAILED_BLACKLISTED`, `FAILED_THROTTLE_HOST`) son defensivos — aún no observados. El pipe existente `tipo-fallo-label.pipe.ts` ya cubre esto.
9. **Masking de emails**: el BE aplica `EmailHelper.Mask()` antes de exponer bouncers — formato `j***z@dominio.com` (primera + última letra del local-part). El FE **no** debe re-masquear ni intentar des-masquear.

**Del patrón existente del proyecto**:

10. **Página admin email-outbox actual** (`src/app/features/intranet/pages/admin/email-outbox/`): patrón canónico para esta nueva pantalla. Copiar estructura (page + services + components + models + pipes).
11. **Pipes reusables**: `tipo-fallo-label` y `tipo-fallo-severity` en `email-outbox/pipes/` — importarlos en la nueva página directamente (o moverlos a `@intranet-shared` si ambos usarán, preguntar al usuario).
12. **Widget auto-refresh**: `DeferFailStatusWidget` en `email-outbox/components/defer-fail-status-widget/` es el patrón de polling 60s + semáforo. Si se decide auto-polling, replicar. Si no (recomendación), mirar solo por inspiración.
13. **Feature flags**: agregar en ambos `environment.ts` y usarlas con spread condicional en `intranet.routes.ts` + `intranet-menu.config.ts`.
14. **UiMappingService**: `@shared/services/ui-mapping.service.ts` tiene helpers (`getRolSeverity`, `getEstadoSeverity`). Usar si aplica para los tags de Resumen.
15. **Shared skeletons**: `StatsSkeletonComponent`, `TableSkeletonComponent`, `SkeletonLoaderComponent` en `@shared/components/` — reusar antes de crear propios.

**Del dominio (Plan 29 + Plan 22)**:

16. **DeferFailContadorCpanel** del Resumen: es el mismo concepto que `CurrentHourStatus.DeferFailCount` pero acumulado al día completo. Sirve para ver cuánto del "techo cPanel" se consumió en el día.
17. **Bounces acumulados ≥2** es **alerta temprana de INV-MAIL02** — el BE auto-blacklistea al 3er bounce. La tabla debe enfatizar este umbral: 2 bounces = **warning**, 3+ = **critical** (visual).
18. **Copy-to-clipboard en BouncesAcumulados**: útil para que el admin pegue el correo masked + contexto en un ticket. Agregar botón copy en cada row.

## FUERA DE ALCANCE

- **Gap asistencia-vs-correos** — Plan 30 Chat 3 BE (reordenado). La pantalla nueva **no** muestra asistencia. Se agregará una sección después cuando exista el endpoint.
- **Búsqueda por correo específico** — Plan 30 Chat 4 BE. No hay input de búsqueda por destinatario en este chat.
- **Auto-polling** (salvo que el usuario lo pida en Decisión 3).
- **Edición de blacklist / reintento desde el dashboard** — la pantalla es read-only.
- **Exportación PDF/Excel** — no aplica a un dashboard; si el admin lo pide luego, se evalúa (fuera de scope del Plan 30).
- **Drawer de detalle del correo individual** — ya existe en la página `email-outbox`; desde el dashboard se navegaría a esa página si fuera necesario (link opcional, no crítico).
- **Chart.js** no se incluye con import nuevo — usar el que ya está vía `email-outbox-chart`.

## CRITERIOS DE CIERRE

```
INVESTIGACIÓN INICIAL (≤ 10 min)
[ ] Leer email-outbox.component.ts + .html (patrón de página)
[ ] Leer defer-fail-status-widget (patrón auto-refresh, NO replicar polling salvo pedido)
[ ] Leer email-outbox-chart.component.ts (patrón chart PrimeNG)
[ ] Leer email-outbox-data.facade.ts (patrón RxJS → signals)
[ ] Leer tipo-fallo-label/severity pipes (reusar)
[ ] Leer intranet-menu.config.ts (ubicar Sistema > Monitoreo)
[ ] Confirmar con usuario las 5 DECISIONES antes de codear

CÓDIGO
[ ] Models con mirror tipado del DTO + errorCode type
[ ] Service con 1 método GET + error mapping
[ ] Store con signals privados + asReadonly + computed
[ ] Facade con load + refresh + setFecha, RxJS al store, toast en error
[ ] Page component standalone OnPush consumiendo facade.vm
[ ] Sub-componentes: Header (date picker + refresh + generatedAt), Resumen (10 cards), ChartHora, PorTipoTable, BouncersTable
[ ] 4 skeletons (al menos Resumen + Chart + 2 tablas)
[ ] Route agregada a intranet.routes.ts con flag
[ ] Menu agregado a intranet-menu.config.ts con flag
[ ] Feature flag en environment.ts / environment.development.ts
[ ] Cap 300 líneas en todos los archivos (eslint max-lines)

TESTS
[ ] Facade spec (load, refresh, setFecha, error codes → toast)
[ ] Store spec (mutaciones + computed)
[ ] 2-3 component specs (Resumen render, Bouncers render con masking)
[ ] npm test verde (vitest) — delta esperado +8 a +12

DESIGN SYSTEM
[ ] Cards con border, sin background (B3)
[ ] Tablas patrón B4, headers con .label-uppercase
[ ] Filter bar (header de página) patrón B6
[ ] Botones icon-only con [pt] aria-label
[ ] Tokens de color (no hex literal)
[ ] Tags informativos con tag-neutral; críticos con severity sin tag-neutral
[ ] p-calendar con appendTo="body" + maxDate/minDate correctos

VALIDACIÓN
[ ] npm run lint limpio (ningún warning nuevo)
[ ] npm run build limpio
[ ] npm test verde
[ ] Dev server: navegar a /intranet/admin/email-outbox/dashboard-dia
    1. Page carga con skeletons → DTO del endpoint → 4 secciones renderizadas
    2. Cambiar fecha al día anterior → nueva request OK
    3. Seleccionar fecha futura vía p-calendar → bloqueada por maxDate
    4. Seleccionar fecha > 90 días vía picker → bloqueada por minDate
    5. Ingresar fecha inválida en URL manual (`?fecha=bad`) → 400 + toast
    6. Botón refresh → re-fetch OK
    7. Flag off en environment → 404/redirect y menu oculto

MAESTRO
[ ] Actualizar cola: remover Plan 30 Chat 2 FE, avanzar/agregar Plan 24 Chat 3 FE o Plan 30 Chat 3 BE según prioridad
[ ] Plan 30 row: ~25% → ~50% (Chat 2 de 4 nuevos)
[ ] Si se movieron Chats 2/3 BE a después del FE, documentar reordenamiento en el plan

COMMIT
[ ] Un solo commit en educa-web main con subject sugerido abajo
[ ] Mover este archivo a educa-web/.claude/chats/closed/ en el commit docs del maestro
```

## COMMIT MESSAGE sugerido

### Commit FE (educa-web main)

**Subject** (≤ 72 chars):

```
feat(admin): Plan 30 Chat 2 — add "dashboard-dia" email outbox page
```

**Body** (inglés según skill `commit`, español solo entre `"..."` para literales de dominio):

```
Add /intranet/admin/email-outbox/dashboard-dia page that consumes the
"GET /api/sistema/email-outbox/dashboard-dia" endpoint delivered in
Plan 30 Chat 1. Renders the full daily snapshot in 4 sections:

 - "Resumen" — 10 KPI stat cards (sent, failed, pending, retrying,
   failure type breakdown, "deferFailContadorCpanel").
 - "PorHora" — stacked bar chart with 24 hourly buckets (sent,
   failed, reached-SMTP).
 - "PorTipo" — aggregation table by "EO_Tipo" (real prod values:
   "ASISTENCIA" and "ReporteFallosCorreoAsistencia").
 - "BouncesAcumulados" — top 50 recipients with 2+ post-SMTP
   failures, masked "j***z@dominio.com" (early warning for INV-MAIL02
   auto-blacklist trigger at 3 bounces).

Header exposes an optional date picker ("p-calendar" with
"maxDate=hoy Lima", "minDate=hoy - 90d") plus a manual refresh
button and a "GeneratedAt" label. No auto-polling — the admin
refreshes when needed.

Error codes from the BE ("FECHA_FORMATO_INVALIDO",
"FECHA_FUTURA_INVALIDA", "FECHA_DEMASIADO_ANTIGUA") are mapped to
toast messages. INV-S07 on the BE guarantees the shape never
crashes the UI.

Read-only — the page doesn't mutate "EmailOutbox" or
"EmailBlacklist". Gated by feature flag
"emailOutboxDashboardDia" (true in dev, false in prod for staged
rollout).

Tests:
 - Facade: load, refresh, setFecha, error-code → toast mapping.
 - Store: mutations + computed KPIs.
 - Component: "Resumen" 10 cards render, "BouncersTable" preserves
   masking.

Suite +8 to +12 tests, all green ("npm test"). Plan 30 row ~25%
→ ~50%.
```

### Commit docs-maestro (mismo repo, commit separado)

**Subject**:

```
docs(maestro): Plan 30 Chat 2 F2.FE ✅ cerrado — dashboard page live
```

## CIERRE

Feedback a pedir al cerrar el Chat 35 (Plan 30 Chat 2 FE):

1. **Decisiones finales** — registrar las 5 decisiones aceptadas/ajustadas durante el chat.
2. **Reordenamiento del Plan 30** — ¿los Chats 2 y 3 BE originales (gap asistencia, diagnóstico) se re-numeran o se retoma el orden original después? Actualizar el maestro.
3. **Paridad visual vs SQL** — el usuario debería contrastar los KPIs del Resumen contra las queries manuales (Q1/Q3/Q4/Q8) un día típico para confirmar paridad numérica. Si hay drift, documentar causa.
4. **Utilidad real** — ¿la pantalla responde las preguntas que el admin tenía cada día? Si falta alguna vista (ej: "correos rechazados por tipo de fallo en las últimas 2 horas"), agendar micro-chat de follow-up.
5. **Auto-polling** — ¿el feedback post-uso sugiere agregarlo (toggle manual)? Reevaluar la Decisión 3 tras una semana de uso.
6. **Próximo chat** — candidatos:
   - **Plan 30 Chat 3 BE** — gap asistencia-vs-correos (si el admin pide la vista cruzada)
   - **Plan 24 Chat 3 FE** — progress bar CrossChex (desplazado por este chat, reactivable ya)
   - **Plan 30 Chat 4 BE** — búsqueda por correo específico (menos prioritario)
7. **Limpieza del menú** — si el grupo Sistema > Monitoreo queda con 4+ items, considerar re-agrupar según `menu-modules.md`.

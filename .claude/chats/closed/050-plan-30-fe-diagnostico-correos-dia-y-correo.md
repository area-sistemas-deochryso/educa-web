> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 30 · **Chat**: FE (Chat 3 + Chat 4 combinados) · **Fase**: F3.FE + F4.FE · **Estado**: ⏳ pendiente arrancar.

---

# Plan 30 FE — Diagnóstico de correos: gap asistencia-vs-correos del día + diagnóstico por correo

## PLAN FILE

Plan 30 vive **inline en el maestro** (no tiene archivo dedicado). Referencia obligada:

- Maestro: `.claude/plan/maestro.md` — fila Plan 30 (~95% post-Chat 4 BE, este chat lo cierra al 100%).
- BE Chat 3 cerrado: commit `eb92ec2` en `Educa.API master` — endpoint `GET /api/sistema/email-outbox/diagnostico-correos-dia` (gap asistencia-vs-correos por día).
- BE Chat 4 cerrado: commit `3c316a2` en `Educa.API master` — endpoint `GET /api/sistema/email-outbox/diagnostico?correo={email}` (diagnóstico por correo específico).

## OBJETIVO

Cerrar Plan 30 al 100% agregando **dos pantallas admin** que consumen los endpoints BE ya entregados:

1. **Dashboard "Gap del día"** — vista de salud "¿se enviaron los correos de asistencia que correspondían hoy?". Reemplaza inspección manual de logs.
2. **Diagnóstico por correo** — pega un email, ves resumen de envíos, historia (últimas 50), estado de blacklist y qué personas (Estudiante/Profesor/Director/Apoderado) lo tienen registrado. Reemplaza el set manual M1-M8 de SSMS.

Ambas restringidas a Director/Asistente Administrativo (rol `Administrativos`). Un solo chat si son liviables — la lógica es read-only sin mutaciones, sin WAL.

## PRE-WORK OBLIGATORIO

1. **Leer los DTOs reales del BE** antes de escribir el feature service FE:

   ```bash
   # En el repo Educa.API (no en educa-web)
   grep -rn "EmailDiagnosticoDto\|DiagnosticoCorreosDiaDto\|GapAsistenciaCorreoDto" Educa.API/Educa.API/DTOs/ --include="*.cs"
   ```

   Listar la firma exacta del controller del Chat 3 (`diagnostico-correos-dia`) y del Chat 4 (`diagnostico?correo=`) — query params, response shape, status codes, validación de input.

2. **Confirmar permisos**: ambos endpoints usan `[Authorize(Roles = Roles.Administrativos)]`. La ruta FE debe quedar protegida con `permisosGuard` y entrar como ítem de menú admin (sub-módulo "Bandeja de Correos" → "Diagnóstico").

3. **Confirmar que el Chat 4 FE del Plan 32 NO entró en conflicto**: el feature `email-outbox` ya tiene el wiring de la pill `<app-correlation-id-pill>` y la columna "Correlation". El nuevo feature `email-diagnostico` es **separado** de `email-outbox` — no muta ese módulo, solo agrega entradas de menú nuevas y rutas hermanas.

4. **Verificar que los dos endpoints BE están desplegados en el ambiente de prueba** antes de empezar (sin backend, no hay forma de validar el shape — se puede hacer mock pero el DTO real debe confirmarse al menos por inspección de código).

## ALCANCE

Estructura del feature (`features/intranet/pages/admin/email-diagnostico/`):

| # | Archivo | Tipo | Estimado |
|---|---------|------|----------|
| 1 | `email-diagnostico.routes.ts` o entrada en `intranet.routes.ts` | Routing | +~15 ln |
| 2 | `models/email-diagnostico.models.ts` | DTOs espejo BE | ~80 ln |
| 3 | `services/email-diagnostico.service.ts` | Gateway HTTP | ~50 ln |
| 4 | `services/email-diagnostico.facade.ts` | Orquesta carga + búsqueda | ~120 ln |
| 5 | `services/email-diagnostico.store.ts` | Estado read-only | ~80 ln |
| 6 | `pages/dia/email-diagnostico-dia.component.ts/html/scss` | Page Smart (Chat 3) | ~180 ln total |
| 7 | `pages/correo/email-diagnostico-correo.component.ts/html/scss` | Page Smart (Chat 4) | ~200 ln total |
| 8 | `components/gap-day-summary/` | Presentational (KPIs del día) | ~80 ln total |
| 9 | `components/email-history-table/` | Presentational (tabla últimas 50) | ~100 ln total |
| 10 | `components/blacklist-status-card/` | Presentational (activo/despejado) | ~60 ln total |
| 11 | `components/personas-asociadas-list/` | Presentational (4 tipos persona) | ~80 ln total |
| 12 | Update en `intranet-menu.config.ts` | Menú admin (sub-grupo "Sistema/Monitoreo") | +~10 ln |
| 13 | Tests: facade + service + 4 components | Nuevos | ~250 ln total |

### Página 1 — Gap del día (`/intranet/admin/diagnostico-correos`)

> **"¿se enviaron hoy todos los correos de asistencia que correspondían?"**

- **Header** con `<app-page-header>`: título "Diagnóstico de correos del día", botón refresh, date picker (default hoy zona Lima) — el endpoint del Chat 3 acepta `?fecha=YYYY-MM-DD`.
- **KPI cards** (4 stat-cards horizontales del design-system B3):
  - "Asistencias del día" (total registros con `_TipoPersona='E'` + grado dentro de INV-C11)
  - "Correos enviados" (de esa lista, cuántos cruzaron a `EmailOutbox` con `EO_Estado='Sent'`)
  - "Correos pendientes/en cola" (con `Pending`/`Retrying`)
  - "Gap" (no encontrados — destaque rojo si > 0, verde si = 0)
- **Tabla detalle** del gap: estudiante (DNI enmascarado + nombre + grado/sección), correo apoderado, motivo del gap (`SIN_CORREO_APODERADO` / `BLACKLISTED` / `NO_ENCOLADO` / `FAILED`).
- Skeleton table-skeleton mientras carga (`tableReady` signal).

### Página 2 — Diagnóstico por correo (`/intranet/admin/diagnostico-correos/correo`)

> **"pegá un email, mostrame todo lo que sabemos de él"**

- **Search box** grande: input email + botón "Diagnosticar" (debounce no aplica — es submit explícito, no live search). Validación cliente: `pattern@domain` mínimo + max 200 chars. El BE devuelve `CORREO_REQUERIDO` / `CORREO_INVALIDO` para errores; mapear con `error-handler.service` a toasts amigables.
- **Resumen card**: totales por estado (`Sent` / `Pending` / `Retrying` / `FailedTransient` / `FailedPermanent` / `FailedBlacklisted`), primer intento, último intento, `mostrandoUltimos: 50`.
- **Historia tabla**: 50 filas con `EO_FechaReg`, `EO_Tipo` (ASISTENCIA / ASISTENCIA_CORRECCION_ESTUDIANTE / ASISTENCIA_CORRECCION_PROFESOR / etc.), `EO_Estado`, `EO_TipoFallo`, `EO_UltimoError` (truncado 200, hover muestra tooltip si truncado), `EO_CorrelationId` con `<app-correlation-id-pill compact>` que linkea al hub `/intranet/admin/correlation/:id` (Plan 32 ya cerrado).
- **Blacklist card**: si `Blacklist != null`, mostrar tag `Activo` o `Despejado` + `MotivoBloqueo` + `FechaBloqueo` + `FechaDespejo?`.
- **Personas asociadas**: lista de las 4 tablas (`Estudiante`/`Profesor`/`Director`/`Apoderado`) que tienen ese correo, con DNI enmascarado + nombre + `Campo` (qué columna lo guarda — útil cuando un correo está en `EST_CorreoApoderado` vs `APO_Correo`).

### Routing y permisos

```ts
// features/intranet/pages/admin/email-diagnostico/email-diagnostico.routes.ts
export const EMAIL_DIAGNOSTICO_ROUTES: Route[] = [
  {
    path: '',
    canActivate: [permisosGuard],
    data: { permissionPath: 'intranet/admin/diagnostico-correos' },
    children: [
      { path: '', loadComponent: () => import('./pages/dia') },
      { path: 'correo', loadComponent: () => import('./pages/correo') },
    ],
  },
];
```

### Menú admin

Bajo el módulo "Sistema" → grupo "Monitoreo" (ya existe en `intranet-menu.config.ts` con `Errores` + `Bandeja de Correos` + `Reportes de Usuarios`). Agregar:

```ts
{ label: 'Diagnóstico Correos', icon: 'pi pi-envelope', route: '/intranet/admin/diagnostico-correos' }
```

## TESTS MÍNIMOS

### `email-diagnostico.service.spec.ts` — ~3 casos

| # | Caso | Esperado |
|---|------|----------|
| 1 | `getDiagnosticoDia(fecha)` | GET con `?fecha=YYYY-MM-DD`, devuelve DTO esperado |
| 2 | `getDiagnosticoCorreo(email)` | GET con `?correo=` URL-encoded |
| 3 | `getDiagnosticoCorreo(email)` con 400 `CORREO_INVALIDO` | propaga error con errorCode |

### `email-diagnostico.facade.spec.ts` — ~5 casos

| # | Caso | Esperado |
|---|------|----------|
| 1 | `loadDia(fecha)` happy path | store recibe data, `tableReady=true`, no error |
| 2 | `loadDia(fecha)` error 500 | store error set, error-handler dispara toast |
| 3 | `searchCorreo(email)` happy path | store recibe DTO compuesto |
| 4 | `searchCorreo('')` | rechaza sin pegar al BE (validación cliente) |
| 5 | `searchCorreo('no-arroba')` | rechaza con error de formato |

### `email-diagnostico-dia.component.spec.ts` — ~3 casos

| # | Caso | Esperado |
|---|------|----------|
| 1 | Render con gap=0 | KPI "Gap" en verde, tabla vacía con empty-state |
| 2 | Render con gap > 0 | KPI rojo, tabla con N filas, motivo visible |
| 3 | Cambio de fecha dispara `loadDia` con fecha nueva | facade.loadDia llamado con la fecha |

### `email-diagnostico-correo.component.spec.ts` — ~3 casos

| # | Caso | Esperado |
|---|------|----------|
| 1 | Submit vacío | input invalid, no se llama al facade |
| 2 | Submit válido | facade.searchCorreo llamado, resumen + historia + blacklist + personas se renderizan |
| 3 | Click en pill correlation | router.navigate a `/intranet/admin/correlation/:id` |

### Componentes presentational — 4 specs (~2 casos cada uno)

| # | Componente | Casos |
|---|-----------|-------|
| 1 | `gap-day-summary` | render con KPIs / render con gap=0 fondo verde |
| 2 | `email-history-table` | render con 50 filas / render con UltimoError truncado y tooltip |
| 3 | `blacklist-status-card` | render activo / render despejado / render null (no-op) |
| 4 | `personas-asociadas-list` | render con E+P duplicado / render lista vacía |

**Baseline FE post-Plan 30 esperado**: ~+22 tests sobre 1648 actuales → ~1670 verdes.

## REGLAS OBLIGATORIAS

- **`crud-patterns.md`** — feature read-only, basta 1 facade + 1 store. No multi-facade (no hay mutaciones).
- **`templates.md`** — sin funciones en template, todo `computed()`; `@for` con track único (correlationId o `EO_CodID`).
- **`design-system.md`** — B1 (containers con border, sin background), B3 (stat-card layout — KPIs), B4 (tabla con UPPERCASE headers + transparent), B6 (filter bar para fecha), B9 (alert banner si gap > 0). Tag `Sistema` con `tag-neutral` para tipo de fallo, severidad para `EO_Estado`.
- **`a11y.md`** — date picker accesible, search input con label visible, botones icon-only con `pt`+`aria-label`, contraste de KPI verde/rojo cumpliendo WCAG AA.
- **`primeng.md`** — `appendTo="body"` en p-calendar y selects.
- **`pagination.md`** — para la historia (50 filas) **client-side**: PrimeNG conoce el total del array; no abrir paginación server-side. Para el gap del día también client-side a menos que la lista exceda 500 filas (entonces server-side variante B con `/count` separado).
- **`reading-optimization.md`** — solo leer DTOs del BE como pre-work; no leer todo el feature `email-outbox` para "tomar referencia".
- **`code-style.md` + `code-language.md`** — código en inglés (email-diagnostico, gap-day-summary), UI en español. Ruta URL pública en español: `/intranet/admin/diagnostico-correos`.
- **Cap 300 ln** por archivo TS, ~250 HTML.
- **No `any`** en código nuevo.
- **`no-restricted-imports`** — los componentes consumen `StorageService` o `BaseHttpService` desde `@core/services`, **nunca** los servicios internos.
- **WAL no aplica** — no hay mutaciones. Si en el futuro agrega "reenviar correo" o "blanquear blacklist", abrir mini-plan derivado.
- **Permisos** — `permisosGuard` con override `data.permissionPath: 'intranet/admin/diagnostico-correos'`. **Verificar** si el path requiere registrarse en el `permission registry` o si reusa uno existente.

## APRENDIZAJES TRANSFERIBLES (del Chat 5 FE Plan 34)

- **Cap 300 ln efectivas** (sin blanks/comments) — usar `awk '!/^\s*$/ && !/^\s*\/\// && !/^\s*\/\*/ && !/^\s*\*/' file | wc -l` para medir, no `wc -l` raw.
- **Imports de storage**: `no-restricted-imports` protege `preferences-storage.service`. Si el feature necesita persistir preferencia (ej: última fecha consultada en gap del día), agregar método al `StorageService` facade primero.
- **Pill correlation reusable**: `<app-correlation-id-pill>` está en `@shared/components/correlation-id-pill/`. Usarla compact en la tabla de historia (Plan 32 cerrado) — click navega solo, no requiere lógica adicional.
- **`p-tabs` API moderna**: `<p-tabs value="X"><p-tablist><p-tab value="X" /></p-tablist><p-tabpanels><p-tabpanel value="X" /></p-tabpanels></p-tabs>`.
- **Outputs no `confirm`/`cancel`/`close`** (ESLint `no-output-native`). Usar `searchSubmit`, `dateChange`, etc.
- **`ng-content` projection** en `<app-page-header>` con un wrapper `.header-actions` (flex gap 0.75rem).
- **Skeleton table** desde `@intranet-shared/components/table-skeleton` con `SkeletonColumnDef[]` configurado en `config/`.
- **Tests con vitest**: `npx vitest run src/app/features/intranet/pages/admin/email-diagnostico/` corre solo la suite del feature.
- **Lint del feature**: `npx eslint src/app/features/intranet/pages/admin/email-diagnostico/` para validar antes del lint global.
- **Build production**: `npm run build` (~2-3 min). Los warnings SSR de ExcelJS/dayjs son preexistentes, ignorar.

## FUERA DE ALCANCE

- **No tocar el BE** — los dos endpoints están entregados en `eb92ec2` (Chat 3) y `3c316a2` (Chat 4). Si aparece un campo faltante en el DTO, **abrir mini-plan derivado** y no parchar el FE con cálculos del lado cliente.
- **No tocar el feature `email-outbox`** — es un módulo hermano (bandeja general). Ya tiene la pill correlation (Plan 32 Chat 4 FE).
- **No agregar mutaciones** (reenviar, blanquear blacklist, marcar como justificado) — read-only este chat.
- **No tocar el feature `error-groups`** — Plan 34 cerró su FE en el commit anterior.
- **No tocar el hub `correlation`** (Plan 32 cerrado al 100%) — solo lo consumimos vía la pill.
- **No agregar feature flag** — el feature entra a producción con permiso explícito en el guard.
- **Mobile**: dashboard del día y diagnóstico por correo NO son flujos críticos en mobile. La tabla de historia se ve mal en pantallas chicas pero el admin trabaja en desktop. No invertir tiempo en breakpoints custom; basta `overflow-x: auto` en el wrapper de la tabla y dejar que el design-system B4 haga lo suyo.

## CRITERIOS DE CIERRE

- [ ] Pre-work hecho: DTOs reales del BE inspeccionados, controllers auditados (rutas, validaciones, status codes).
- [ ] Routing protegido con `permisosGuard` y entrada en `intranet-menu.config.ts`.
- [ ] Página "Gap del día" funcional: KPIs, tabla detalle, date picker, refresh, skeleton inicial.
- [ ] Página "Diagnóstico por correo" funcional: input + submit, resumen, historia con pill correlation, blacklist, personas asociadas.
- [ ] Mapeo de errores: `CORREO_REQUERIDO` / `CORREO_INVALIDO` → toasts amigables.
- [ ] Tests verdes (~+22 sobre baseline 1648 → ~1670 verdes).
- [ ] Lint OK (0 errores nuevos), build production OK.
- [ ] Cap 300 ln respetado en cada archivo.
- [ ] Browser check: ambas pantallas accesibles, KPI verde/rojo según gap, pill correlation navega al hub, fecha persiste en URL para deep-link.
- [ ] Commit FE en `educa-web main` con mensaje canónico (en inglés, sin Co-Authored-By).
- [ ] Mover este archivo a `educa-web/.claude/chats/closed/` al cerrar el chat.
- [ ] Actualizar `educa-web/.claude/plan/maestro.md` (fila Plan 30): pasar % a **100%** y mover a `history/planes-cerrados.md` cuando el usuario confirme verificación post-deploy.
- [ ] Quitar el item "Plan 30 FE Chat 3 + 4 combinados" de la cola top 3 del maestro.

## COMMIT MESSAGE sugerido

**Frontend** (`educa-web main`):

```
feat(admin): close Plan 30 with email diagnostic dashboards

Add the two admin diagnostic screens that consume the BE endpoints
landed in commits "eb92ec2" (gap asistencia-vs-correos del día) and
"3c316a2" (diagnostico por correo) - the full FE wiring closes Plan 30
to 100%.

The "diagnostico-correos-dia" page answers the daily question "did all
expected attendance emails go out today?" with 4 KPI cards (asistencias,
sent, pending, gap) and a detail table that pinpoints why each missing
email failed ("SIN_CORREO_APODERADO", "BLACKLISTED", "NO_ENCOLADO",
"FAILED"). The "diagnostico-correos/correo" page replaces the manual
M1-M8 SSMS routine: paste an email, get the summary, the last 50
"EmailOutbox" rows with their "EO_TipoFallo", the optional blacklist
card and the "PersonasAsociadas" list across "Estudiante" / "Profesor" /
"Director" / "Apoderado".

Each occurrence row in the history table renders the
"<app-correlation-id-pill>" reused from Plan 32 - clicking it navigates
to the correlation hub with the same id. DNI is masked end-to-end ("***1234")
and "EO_UltimoError" is shown truncated to 200 chars with a tooltip.
Both screens are read-only (no WAL needed) and gated behind
"permisosGuard" with permissionPath
"intranet/admin/diagnostico-correos".

22 new tests (3 service + 5 facade + 3 dia component + 3 correo
component + 8 presentational components) -> 1670 FE green (baseline
1648 from Plan 34 Chat 5).
```

## CIERRE

Al cerrar este chat, pedir feedback al usuario sobre:

1. ¿La pantalla del gap del día comunica bien la salud? ¿KPIs en orden correcto, "Gap" tiene el destaque que le da prioridad visual?
2. ¿El diagnóstico por correo cubre los M1-M8 manuales? ¿Falta alguna sección que el SSMS routine reemplazaba?
3. ¿Mover Plan 30 a `history/planes-cerrados.md` ya, o esperar verificación post-deploy?
4. ¿El permission path `intranet/admin/diagnostico-correos` queda separado o se consolida bajo el de `email-outbox` (que ya existe)? Decisión menor pero conviene definirla antes del cierre.
5. Si el usuario detecta deuda al usar la pantalla en prod (ej: filtro adicional por `EO_Tipo`, exportación a Excel del gap del día, "Retry manual" en filas FAILED), abrir mini-plan derivado o documentar como deuda menor.

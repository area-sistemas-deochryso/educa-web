> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Validación prod**: ✅ verificada 2026-04-27 — hub /intranet/admin/correlation/:id renderiza las 4 secciones; pills funcionan en error-logs.
> **Plan**: 32 · **Chat**: 4 · **Fase**: FE · **Estado**: ⏳ pendiente arrancar.

---

# Plan 32 Chat 4 FE — Hub `/correlation/:id` + pill reusable + wiring en 4 dashboards

## PLAN FILE

- `.claude/plan/correlation-id-links.md` — sección **"Chat 4 FE — Pantalla hub + pill + wiring en 4 dashboards"**.
- Maestro: `.claude/plan/maestro.md` — fila Plan 32 + bloque Notas.
- Reglas que más aplican:
  - `.claude/rules/architecture.md` (taxonomía facade/store/component, capa shared vs intranet-shared).
  - `.claude/rules/dialogs-sync.md` (drawers/dialogs NUNCA dentro de `@if`).
  - `.claude/rules/design-system.md` § A1 Opción C (pill con `styleClass="tag-neutral"`) + B6 (filter bar con query param).
  - `.claude/rules/a11y.md` (`aria-label` obligatorio en pill icon-only y botones que solo lleven la pill).
  - `.claude/rules/state-management.md` (signal store privado + `asReadonly()` + facade entre store y RxJS).
  - `.claude/rules/optimistic-ui.md` — N/A: el hub es read-only, no hay mutaciones, ningún WAL.
  - `.claude/rules/code-language.md` (código en inglés, UI en español).
  - `.claude/rules/eslint.md` cap 300 líneas + `layer-enforcement`.

## OBJETIVO

Cerrar Plan 32 al 100% convirtiendo el `CorrelationId` en un hipervínculo navegable. Construir el **hub central** `/intranet/admin/correlation/:id` (consume el endpoint del Chat 3 BE, ya cerrado en commit `7184bab`) + pill reusable `<app-correlation-id-pill>` + wiring en los 4 dashboards admin (`error-logs`, `rate-limit-events`, `feedback-reports`, `email-outbox`) con sincronización por query param.

Frase del usuario que motivó el plan completo: *"un id correlational que no se puede usar no sirve de nada"*.

## PRE-WORK OBLIGATORIO

### 1. Verificar estado del repo

```bash
cd "/c/Users/Asus Ryzen 9/EducaWeb/educa-web"
git status
git log --oneline -10
```

**Esperado**: branch `main`, último commit `3d40aee docs(plan): Plan 32 Chat 3 BE cerrado` o más adelante. Si hay cambios sin commit que no son de este chat, avisar al usuario.

### 2. Confirmar shape del DTO BE consumido

El backend ya cerró Chat 3 BE (commit `7184bab` en `Educa.API master`). El endpoint que consume el FE es:

```
GET /api/sistema/correlation/{id}
[Authorize(Roles = Roles.Administrativos)]
→ ApiResponse<CorrelationSnapshotDto>
```

**Forma del DTO** (verificar en `../Educa.API/Educa.API/DTOs/Sistema/CorrelationSnapshotDto.cs` y los 4 sub-DTOs):

```typescript
// Aproximación TypeScript del DTO BE (camelCase tras el unwrap del interceptor)
interface CorrelationSnapshot {
  correlationId: string;       // eco del id consultado
  generatedAt: string;         // ISO date hora Perú
  errorLogs: CorrelationErrorLog[];
  rateLimitEvents: CorrelationRateLimitEvent[];
  reportesUsuario: CorrelationReporteUsuario[];
  emailOutbox: CorrelationEmailOutbox[];
}
```

**Antes de codear**, leer los 5 DTOs reales (no inventar campos) y mapearlos uno a uno a los modelos TS del feature `correlation/models/correlation.models.ts`. Anotar:

- En `errorLogs`, `usuarioDniMasked` ya viene enmascarado upstream — no aplicar `Mask()` adicional.
- En `rateLimitEvents` y `reportesUsuario`, los DNIs vienen enmascarados (`***1234`).
- En `emailOutbox`, `destinatarioMasked` ya viene enmascarado.
- Campos truncados a 200 chars: `mensaje` (errorLogs), `descripcionResumen` (reportes), `propuestaResumen` (reportes), `ultimoErrorResumen` (outbox).

### 3. Confirmar permiso para la nueva ruta

El brief asume que la ruta `correlation/:id` hereda el permiso de `error-logs` (mismo escenario admin: trazabilidad). Confirmar con el usuario:

> "¿La nueva ruta `/intranet/admin/correlation/:id` debe tener un permiso propio (`ADMIN_CORRELATION` en el registry) o reusa `ADMIN_TRAZABILIDAD_ERRORES`/`ADMIN_ERROR_LOGS` (lo que esté hoy en `permissions.md`)? Reusar es más simple, propio es más limpio si el menú se quisiera filtrar finamente — pero el hub no tiene entrada de menú."

Default sugerido: **reusar el permiso de error-logs** (es deep-link, no destino de menú).

### 4. Inspeccionar las 4 páginas existentes

Leer el `routes.ts` actual y la estructura de cada feature antes de tocar:

- `src/app/features/intranet/pages/admin/error-logs/` — store, drawer, span del CorrelationId.
- `src/app/features/intranet/pages/admin/rate-limit-events/` — store, service, table, drawer.
- `src/app/features/intranet/pages/admin/feedback-reports/` — botón icono del drawer (drawer reutilizado de error-logs).
- `src/app/features/intranet/pages/admin/email-outbox/` (o la ruta real — el plan dice "o la ruta real de la bandeja") — confirmar el path: probablemente `bandeja-correos` por el menú Sistema → Monitoreo.

Anotar hallazgos en el primer mensaje del chat: nombres reales de carpetas, dónde está el span del id, si el store ya lee query params, etc.

## ALCANCE

| Bloque | Archivos previstos | Líneas estimadas |
|--------|-------------------|------------------|
| Pill reusable shared | `src/app/shared/components/correlation-id-pill/correlation-id-pill.component.{ts,html,scss}` + `index.ts` (4) | ~80-100 total |
| Feature `correlation/` | `pages/admin/correlation/correlation.component.{ts,html,scss}` + `services/correlation.service.ts` + `services/correlation.facade.ts` + `services/correlation.store.ts` + `models/correlation.models.ts` + 4 sub-componentes presentacionales (~12-14 archivos) | ~600-800 total |
| Wiring `error-logs` | `services/error-logs.store.ts` (leer query param) + `components/error-log-detail-drawer/error-log-detail-drawer.component.html` (pill + bloque "Eventos relacionados") (2) | ~30-50 |
| Wiring `rate-limit-events` | `services/rate-limit-events.service.ts` (filtro `correlationId` en GET) + `services/rate-limit-events.store.ts` (query param init) + `components/rate-limit-table/...html` (pill) + `components/rate-limit-detail-drawer/...{ts,html}` (pill + handler `onBuscarEnErrorLog` apunta al hub) (4) | ~40-60 |
| Wiring `feedback-reports` | store init + drawer template (~2) | ~20-30 |
| Wiring `email-outbox` | tabla con nueva columna pill + store init (~2) | ~30-40 |
| Routes | `intranet.routes.ts` — entrada `correlation/:id` con `permissionsGuard` | 1 |
| Tests | hub component (render 4 secciones + 4 empty states), service (carga snapshot), facade (navegación query param), pill (aria-label dinámico + click navega) (~5-6 archivos) | ~200-300 |

**Total estimado**: ~18-22 archivos · sesión extensa pero acotada (no toca BE).

## TESTS MÍNIMOS

| # | Componente | Test | Archivo |
|---|-----------|------|---------|
| 1 | `CorrelationIdPillComponent` | Render con id corto: muestra el id completo + aria-label `"Ver eventos del correlation id <id>"` | `pill.component.spec.ts` |
| 2 | `CorrelationIdPillComponent` | Click navega a `/intranet/admin/correlation/<id>` (mock `Router.navigate`) | igual |
| 3 | `CorrelationIdPillComponent` | Modo `compact=true` trunca a primeros 8 chars + tooltip con id completo | igual |
| 4 | `CorrelationService` | `getSnapshot(id)` hace `GET /api/sistema/correlation/<id>` y devuelve el DTO unwrapped | `correlation.service.spec.ts` |
| 5 | `CorrelationFacade` | `loadSnapshot(id)` setea `loading=true` → llama service → setea snapshot → `loading=false` | `correlation.facade.spec.ts` |
| 6 | `CorrelationFacade` | Error del service → setea `error` y limpia snapshot, fire-and-forget no rompe la UI | igual |
| 7 | `CorrelationComponent` | Lee `:id` del `ActivatedRoute.paramMap` y dispara `loadSnapshot` en init | `correlation.component.spec.ts` |
| 8 | `CorrelationComponent` | Render de 4 secciones SIEMPRE, cada una con su empty state cuando la lista llega vacía | igual |
| 9 | `error-logs.store` | Init lee `correlationId` del query param y aplica filtro | `error-logs.store.spec.ts` |
| 10 | `rate-limit-events.store` | Init lee `correlationId` del query param y aplica filtro al GET | `rate-limit-events.store.spec.ts` |

## REGLAS OBLIGATORIAS

| Regla | Aplicación |
|-------|-----------|
| `INV-RU03` | El submit del reporte usa el `correlationId` de la última request ANTES (no el POST del propio reporte). El hub solo lee — no necesita tocar la lógica. Test 8 cubre el render |
| `INV-RU05` | Reporte anónimo (`UsuarioDniMasked = null`) debe linkear igual desde el hub. Test específico en `CorrelationComponent` o sub-componente `correlation-reports-section` |
| `INV-D08` | El service consume `ApiResponse<T>` — el interceptor ya hace unwrap, así que el método del service tipa `Observable<CorrelationSnapshot>` y usa `http.get<CorrelationSnapshot>(...)` (NO `<ApiResponse<...>>`). Recordatorio: ver `feedback_api_response_unwrap` |
| Pill design system | `<app-correlation-id-pill>` usa `<p-tag>` interno con `styleClass="tag-neutral"` (informativo, no crítico). Border radius del tag, color `--text-color`, fondo `--surface-200` |
| `aria-label` | Pill: `[pt]="{ root: { 'aria-label': 'Ver eventos del correlation id ' + id() } }"` |
| `dialogs-sync.md` | Si el wiring de un drawer existente requiere cambios (error-logs, rate-limit-events, feedback-reports), NUNCA mover el drawer dentro de `@if` |
| Cap 300 líneas FE | Si el `correlation.component.ts` crece más de 250 líneas, dividir en sub-componentes. Si el `correlation.facade.ts` crece, separar en `correlation-data.facade.ts` (load) — pero el hub es read-only, no debería pasar de 200 |
| `architecture.md` | Pill va en `@shared/components/` (cross-feature: lo usan 4 features admin distintas + el hub). El feature `correlation/` va en `features/intranet/pages/admin/correlation/` |
| Code language | Carpetas y clases en inglés (`correlation`, `CorrelationComponent`), URL en inglés también (`/intranet/admin/correlation/:id` — es deep-link admin, aceptable per `code-language.md`). Labels visibles en español ("Eventos correlacionados", "Errores", "Rate limit", "Reportes de usuario", "Correos enviados") |
| `eslint.md` | `layer-enforcement`: el hub component consume `correlation.facade`, el facade consume `correlation.service` + `correlation.store`. El store NO importa HttpClient, NO hace `.subscribe()` |

## APRENDIZAJES TRANSFERIBLES (del Chat 3 BE, 2026-04-25)

1. **Naming inconsistente del índice de ReporteUsuario**: el índice ya existente en BD se llama `IX_REU_CorrelationId` (sin sufijo `_ReporteUsuario`). Los 2 nuevos siguen el patrón estándar `IX_<TablaName>_CorrelationId`. Irrelevante para el FE pero documentado en el plan.

2. **Tabla real `[Table("REU_ReporteUsuario")]`**: el atributo `Table` aliasea `ReporteUsuario` a `REU_ReporteUsuario` en BD. El FE no se entera de esto — el DTO viene como `reportesUsuario[]`.

3. **Caps defensivos del BE**: el endpoint devuelve **máximo 100 filas por sección** (cap fijo, no paginado). El FE NO necesita paginación — un mismo CorrelationId raramente genera más de 1-3 filas. Si una sección viene con 100, el sub-componente puede mostrar un footer informativo "Mostrando 100 (cap defensivo)".

4. **Truncado a 200 chars** en `mensaje`/`descripcionResumen`/`propuestaResumen`/`ultimoErrorResumen`. El FE renderiza tal cual — el detalle completo vive en el dashboard de cada fuente. Si el usuario quiere ver el cuerpo completo del error, hace click en el "ir a este registro" (link cruzado al dashboard origen).

5. **Endpoint disponible (commit `7184bab`)**: `GET /api/sistema/correlation/{id}`, `[Authorize(Roles = Roles.Administrativos)]`. Validación path id: no-empty + cap defensivo 64 chars + trim. Si el id es inválido (vacío, > 64 chars), devuelve `400 BadRequest` — no `200` con listas vacías.

6. **Universo vacío vs id inválido**:
   - **Id válido pero sin eventos** → `200 OK` con las 4 listas vacías + `correlationId` eco + `generatedAt`. Hub renderiza 4 empty states.
   - **Id inválido** → `400 BadRequest`. Hub debe mostrar mensaje de error específico (no generic "algo falló").

7. **DNIs ya enmascarados al llegar al FE**: NO aplicar `Mask()` adicional. Renderizar tal cual (`***1234`). El BE garantiza que ningún DNI crudo sale del service.

8. **Email destinatario también enmascarado**: campo `destinatarioMasked` (ej: `pa***añ@gmail.com` o `***@dominio` si local < 4 chars).

9. **Plan 30 patrón canónico ya probado**: el BE usó `ApplicationDbContext` directo + queries secuenciales + `BuildEmpty` factory para INV-S07. El FE no necesita conocer esto — solo consumir el endpoint.

10. **Drawer reutilizado feedback-reports → error-logs**: el plan file dice *"el flujo 'drawer reutilizado de error-logs' se mantiene como atajo secundario o se elimina (decidir en el chat)"*. Decisión sugerida: **eliminar** ese flujo — la pill al hub es la nueva navegación canónica. Confirmar con el usuario al inspeccionar feedback-reports.

11. **Dependencia bloqueada por shape DTO**: leer los 5 DTOs reales antes de codear los modelos TS. NO inferir campos por nombre. Si algún campo no se entiende, preguntar al usuario antes de crear el modelo.

12. **Test infra ya disponible**: el proyecto usa Vitest + jsdom (ver `rules/testing.md`). Mocks para `Router`, `ActivatedRoute` y `HttpClient` ya tienen patrón establecido en otros tests del intranet (buscar `error-logs.store.spec.ts` o `feedback-reports.store.spec.ts` como referencia).

## FUERA DE ALCANCE

- **Backend**: ya cerrado. El endpoint, índices, DTOs y tests están listos. NO tocar `Educa.API`.
- **Backfill histórico** de `EO_CorrelationId`: aceptado en `/design`, no hay forma de inventar el id.
- **Migración** de `EmailFailureLogger.ExtractCorrelationId` para usar `HttpContext.Items[CorrelationIdItemKey]` en vez del header del request: deuda detectada en Chat 2 BE, sigue fuera de scope (chat dedicado en el futuro si vale la pena).
- **Entrada de menú** para `correlation/:id`: NO agregar al `intranet-menu.config.ts`. Es deep-link admin, no destino de navegación.
- **Permiso nuevo en el registry**: si el usuario decide reusar el permiso de error-logs en el pre-work, NO crear `ADMIN_CORRELATION`. Si crea uno propio, agregarlo a `permissions.md` + module-registry.
- **Feature flag**: el hub puede salir directo a producción (no requiere flag). Si se quiere flag por seguridad, agregar `correlation` al `environment.features` y spread condicional en routes — confirmar con el usuario.
- **Refactors de las 4 páginas existentes** que no sean estrictamente para el wiring: si al tocar `error-logs` aparece un anti-patrón, anotarlo en el chat de cierre como deuda lateral, no resolverlo aquí.

## CRITERIOS DE CIERRE

- [ ] Pill `<app-correlation-id-pill>` en `@shared/components/` con tests verdes (1-3 del bloque TESTS MÍNIMOS).
- [ ] Hub `/intranet/admin/correlation/:id` renderiza 4 secciones SIEMPRE + 4 empty states.
- [ ] Tests del hub component + service + facade verdes (4-8 del bloque TESTS MÍNIMOS).
- [ ] `error-logs`: drawer pinta pill + bloque "Eventos correlacionados" con link al hub. Store lee query param.
- [ ] `rate-limit-events`: tabla pinta pill, drawer pinta pill, `onBuscarEnErrorLog` redirige al hub. Service acepta filtro `correlationId`. Store lee query param.
- [ ] `feedback-reports`: drawer pinta pill (decisión sobre el atajo a error-logs documentada).
- [ ] `email-outbox` (o `bandeja-correos`): tabla pinta pill (nueva columna o reuso). Store lee query param.
- [ ] Ruta `correlation/:id` agregada a `intranet.routes.ts` con `permissionsGuard` heredando permiso decidido en pre-work.
- [ ] **Sin entrada de menú** para correlation.
- [ ] Lint + build OK en `educa-web` (`npm run lint && npm run build`).
- [ ] Suite FE verde sin regresiones (baseline ~1535 verdes — Plan 22 cierre, confirmar al arrancar).
- [ ] Probado en browser (el agente NO puede hacer esto, el usuario verifica):
  - [ ] rate-limit → hub desde drawer; back button vuelve a rate-limit con filtro intacto
  - [ ] error-logs → hub desde drawer enriquecido
  - [ ] feedback-reports → hub
  - [ ] email-outbox → hub
  - [ ] Deep-link directo a `/correlation/xxx` carga vista
  - [ ] Id ficticio → 4 empty states correctos
- [ ] Plan file `correlation-id-links.md` actualizado: Chat 4 ✅ + sección "Resultado real" + commit hash FE.
- [ ] Maestro: fila Plan 32 a **100%** + nota nueva al inicio del bloque Notas + Plan 32 movido a `history/planes-cerrados.md` (o marcado como candidato a archivado).
- [ ] Commit en `educa-web main` con el mensaje del bloque siguiente.
- [ ] Mover este brief a `educa-web/.claude/chats/closed/045-...md` al cerrar el chat.
- [ ] Decidir con el usuario si actualizar la cola top 3 del maestro (Plan 32 sale de la cola activa).

## COMMIT MESSAGE sugerido

Frontend (`educa-web main`):

```
feat(admin): Plan 32 Chat 4 — correlation hub + pill + wiring

New admin page /intranet/admin/correlation/:id aggregates the
4 telemetry sources that share a CorrelationId (ErrorLog,
RateLimitEvent, "REU_ReporteUsuario", EmailOutbox) into a
single hub view. Consumes GET /api/sistema/correlation/{id}
shipped in Plan 32 Chat 3 BE (commit 7184bab).

Reusable <app-correlation-id-pill> in @shared/components/ —
standalone, OnPush, click navigates to the hub via Router,
"tag-neutral" styleClass per design-system A1 Opción C, dynamic
aria-label per a11y rules. Used by 4 admin dashboards.

Wiring on the 4 dashboards: error-logs (drawer pill + related
events block), rate-limit-events (table + drawer pill, GET filter
"correlationId", "onBuscarEnErrorLog" redirects to hub),
feedback-reports (drawer pill, deprecated cross-link to
error-logs drawer), email-outbox (table pill column). All four
stores read "correlationId" from the query param on init so the
URL is portable and back button works.

Hub renders 4 sections always — empty states inline per Plan 32
design decision 4. Defensive caps from BE respected (100 rows
per section, 200 chars on free-text fields). Anonymous reports
(INV-RU05) link the same with masked DNI null.

No menu entry — the hub is deep-link only. Permission reused
from error-logs (decided during pre-work). No feature flag —
ships directly.

N tests: pill (3), service (1), facade (2), hub component (2),
4 store wirings (4) → 1535+N FE green (baseline 1535).

Closes Plan 32 at 100%.
```

Reglas de commit respetadas: inglés imperativo (`add`, no `added`), español solo entre `"..."` (`"REU_ReporteUsuario"`, `"correlationId"`, `"tag-neutral"`, `"onBuscarEnErrorLog"`), **NUNCA `Co-Authored-By`**, subject 60 chars ≤ 72 ✅.

> **Nota**: el commit message es un template. Antes de commitear, ajustar `N` por el número real de tests agregados, y reemplazar el resumen por lo que efectivamente se hizo (el chat puede descubrir simplificaciones o complicaciones que cambien el alcance).

## CIERRE

Al cerrar el chat, pedirle al usuario feedback sobre:

1. **Permiso de la nueva ruta**: confirmar la decisión tomada en pre-work (reusado vs propio) en `permissions.md` + module-registry si aplica.
2. **Decisión sobre el cross-link de feedback-reports → drawer error-logs**: ¿se eliminó por completo o se dejó como atajo secundario? Documentar en el plan file.
3. **Path real de la bandeja de correos**: confirmar si la página vive en `/intranet/admin/email-outbox` o `/intranet/admin/bandeja-correos` o similar — el plan file decía "o la ruta real". Anotar el path canónico en el commit + plan.
4. **Suite final FE**: confirmar el número exacto (esperado ≈ 1535 + N tests del scope; si llegan más por race con otros chats FE simultáneos, ajustar).
5. **Verificación post-deploy** (cuando se pushee a Netlify): probar los 5 flujos del browser checklist (drawers → hub, deep-link, id ficticio).
6. **¿Plan 32 a `history/planes-cerrados.md`?**: si todos los criterios están cubiertos, mover Plan 32 al historial y eliminar la fila del inventario activo del maestro. Si queda algo pendiente (validación post-deploy del usuario), dejarlo como ✅ 100% pero sin archivar todavía.
7. **Cola top 3**: actualizar removiendo Plan 32 (ya cerrado) y agregando un item nuevo si se descubrió trabajo derivado durante el chat.

Recordar al usuario: después de cerrar este chat, **mover el brief a `educa-web/.claude/chats/closed/`** y agregar el nuevo trabajo derivado al final de la cola del maestro si aplica.

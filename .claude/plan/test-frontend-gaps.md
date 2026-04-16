# Plan 13 — Frontend: Test Gaps Críticos

> **Fecha**: 2026-04-16
> **Objetivo**: Cubrir las áreas del frontend sin tests: páginas admin críticas, flujos de integración UI, interceptores nuevos, y resiliencia WAL/offline/cache.
> **Estado actual**: 129 spec files. Buenos tests de stores/facades/guards. Gaps: muchas páginas sin spec, 0 tests de flujo completo, interceptores nuevos sin cobertura, WAL/offline parcial.
> **Coordinación**: Complementa Plan 10 (Flujos Alternos) y Plan 1 F4 (Invariantes).

---

## Diagnóstico

| Área | Tests existentes | Riesgo sin cobertura |
|------|-----------------|---------------------|
| **Páginas admin sin spec** | 0 para: asistencias admin, email-outbox, error-logs, feedback-reports, health-permissions | CRUD completo sin validación de comportamiento |
| **Interceptores nuevos** | 0 para: api-response, clock-sync, sw-cache-invalidation, request-trace | Unwrap roto → toda la app falla; clock drift → tokens inválidos |
| **Flujos de integración** | 0 | Login → permisos → navegación → CRUD sin validar end-to-end en FE |
| **WAL/Offline/Cache** | Parcial (wal-facade-helper) | Cola offline, reconciliación, liderazgo tabs, corrupción IndexedDB |
| **Componentes shared sin spec** | 0 para: skeleton-loader, lazy-content, toast, intranet-layout | Regresiones visuales silenciosas |

---

## Fases

### F1 — Interceptores Core Sin Cobertura (CRÍTICO)

> Los interceptores son invisibles: si fallan, toda la app se degrada sin error claro.

| Interceptor | Archivo | Qué testear |
|------------|---------|-------------|
| `api-response` | `api-response.interceptor.ts` | Unwrap `ApiResponse<T>` → devuelve `.data`. Error no-ApiResponse → pasa tal cual. Response null → manejo seguro |
| `clock-sync` | `clock-sync.interceptor.ts` | Calcula offset con header `Date` del server. Sin header → no falla. Offset se aplica a requests subsecuentes |
| `sw-cache-invalidation` | `sw-cache-invalidation.interceptor.ts` | Mutación exitosa → invalida cache SW del recurso. GET → no invalida. Error → no invalida |
| `request-trace` | `request-trace.interceptor.ts` | Agrega `X-Request-Id`. Excluye endpoint de reportes (INV-RU03). `trackLastRequestId()` se actualiza |

**Entregable**: 4 archivos spec, ~30 tests.

### F2 — Páginas Admin Críticas Sin Spec

> Estas páginas manejan datos sensibles y operaciones irreversibles.

| Página | Riesgo | Qué testear |
|--------|--------|-------------|
| `admin/asistencias` | Edición formal + cierre mensual (INV-AD03/04) | CRUD facade, cierre/revertir, validaciones de mes cerrado |
| `admin/feedback-reports` | Reportes de usuario + estados (INV-RU*) | Store mutations, transiciones de estado, filtros |
| `admin/health-permissions` | Permisos de salud | Store + facade (ya migrado a WAL) — spec de smoke |
| `admin/email-outbox` | Bandeja de correos | Facade load + filtros + stats |
| `admin/error-logs` | Logs de errores | Facade load + filtros |

**Enfoque**: Tests de store + facade (no de template). Un spec por página cubriendo operaciones principales.

**Entregable**: 5 archivos spec, ~40 tests.

### F3 — Flujos de Integración UI

> Hoy cada pieza se testea aislada. Nadie verifica que login → permisos → guard → navegación → carga de datos funcione como cadena.

**Flujos críticos a testear** (tests de integración con TestBed + providers reales donde sea posible):

| Flujo | Componentes involucrados | Qué validar |
|-------|-------------------------|-------------|
| Login completo | LoginComponent → AuthService → AuthStore → Router | Credenciales válidas → navega a intranet. Inválidas → error. Cuenta inactiva → bloqueado |
| Guard + Permisos | permisosGuard → UserPermisosService → Router | Sin permiso → redirect. Con permiso → pasa. Permiso exacto (INV-S04) |
| CRUD admin tipo | Page → Facade → Store → Template signals | Load → muestra datos. Create → refetch. Edit → mutación quirúrgica. Delete → confirm + remove |
| Error recovery | Interceptor → ErrorHandler → Toast | 401 → logout. 422 → toast con mensaje. 500 → toast genérico. 429 → retry |

**Entregable**: 4 archivos spec, ~30 tests.

### F4 — WAL / Offline / Cache

> El WAL es el corazón de la UX optimista. Si falla el rollback, el usuario ve datos inconsistentes.

| Escenario | Qué testear |
|-----------|-------------|
| Optimistic update OK | `apply` → UI cambia → server OK → `onCommit` reconcilia |
| Optimistic update FAIL | `apply` → UI cambia → server error → `rollback` restaura snapshot exacto |
| Create con ID del server | `apply` cierra dialog → `onCommit` agrega item con ID real |
| Cola offline | Operación sin red → encola → reconecta → dequeue + envía |
| Cache SW stale | SWR devuelve cache → `cacheUpdated$` emite datos frescos → signal se actualiza |
| IndexedDB corrupto | Open falla → fallback graceful (no crash) |

**Entregable**: 3 archivos spec, ~25 tests. Amplía los tests existentes de `wal-facade-helper.service.spec.ts`.

### F5 — Componentes Shared de Alto Uso

> Componentes que se usan en 10+ páginas. Una regresión aquí impacta toda la app.

| Componente | Qué testear |
|-----------|-------------|
| `skeleton-loader` | Renderiza variantes (text, circle, rect, card). Acepta width/height. |
| `table-skeleton` | Genera columnas según `SkeletonColumnDef[]`. Renderiza N rows. |
| `stats-skeleton` | Genera N cards. Acepta iconPosition. |
| `lazy-content` | Loading=true → muestra skeleton. Loading=false → muestra content. Transition con hideDelay. |
| `intranet-layout` | Renderiza header + sidebar + content. Responsive. |

**Entregable**: 5 archivos spec, ~25 tests.

---

## Orden de ejecución

```
F1 (Interceptores) → F2 (Páginas admin) → F4 (WAL/Offline) → F3 (Flujos integración) → F5 (Shared)
```

Razón: F1 interceptores son la base invisible. F2 son CRUD admin sin red de seguridad. F4 protege la UX optimista. F3 y F5 son robustez general.

---

## Métricas de éxito

| Métrica | Antes | Después |
|---------|-------|---------|
| Interceptor tests | 4 de 8 | 8 de 8 |
| Admin pages con spec | ~12 de 17 | 17 de 17 |
| Integration flow tests | 0 | ~4 suites |
| WAL/offline tests | 1 parcial | ~3 suites completas |
| Shared component tests | ~8 | ~13 |

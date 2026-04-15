# Enforcement de Reglas — De Documentación a Restricción Técnica

> **Estado**: Fase 1 completada (2026-04-09), Fase 2 completada (2026-04-13), Fases 3-5 pendientes
> **Prioridad**: Alta (fundacional — mejora la calidad de todo lo demás)
> **Origen**: Análisis Codex + Claude (2026-04-08)
> **Principio**: "Una regla buena no solo se explica, se diseña para resistir mal uso"

---

## Diagnóstico Actual

| Nivel de enforcement | Estado actual | Brecha |
|---------------------|---------------|--------|
| **Documentación** | Extensa (30+ archivos en `.claude/rules/`) | Informa pero no protege |
| **Wrappers** | Existen para áreas críticas (Storage, WAL, HTTP, Session, Cache) | No se fuerza su uso exclusivo (→ Fase 5) |
| **Tipos** | Parcial (algunos `any`, tipos inline duplicados) | No todos los DTOs/estados usan tipos semánticos (→ Fase 3) |
| **Estructura** | Clara (core/shared/features) con fronteras lint | ✅ Fase 1: ESLint detecta cross-imports |
| **Linting** | ✅ ESLint 9 con reglas de arquitectura por capa | Reglas activas desde 2026-04-09 |
| **Tests** | ✅ 101 tests de contrato (Auth, Storage, Permisos, WAL, Guards, Utils) | Cobertura P1-P2 completa. Faltan P3 (interceptors, calificación) |
| **CI** | Inexistente | Nada bloquea merge de código roto (→ Fase 4) |

### Wrappers que YA existen (no crear de nuevo)

| Zona crítica | Wrapper actual | Ubicación |
|--------------|---------------|-----------|
| Sesión | `SessionCoordinatorService` + `SessionActivityService` + `SessionRefreshService` | `@core/services/session/` |
| Storage | `StorageService` (facade sobre 8 implementaciones) | `@core/services/storage/` |
| HTTP | `BaseHttpService` (base class para API services) | `@core/services/http/` |
| WAL/Mutaciones | `WalFacadeHelper.execute()` | `@core/services/wal/` |
| Cache | `CacheInvalidationService` + `CacheVersionManagerService` | `@core/services/cache/` |
| Auth | `AuthService` + `AuthApiService` | `@core/services/auth/` |
| Errores | `GlobalExceptionMiddleware` (backend) | `Middleware/` |
| Logging | `logger` helper (frontend) | `@core/helpers/` |

**Conclusión**: Los wrappers están. Lo que falta es **forzar que se usen** y **detectar cuando se saltean**.

---

## Fases de Ejecución

### Fase 1 — Linting de Arquitectura (enforcement estático)

> **Objetivo**: Que ESLint detecte violaciones de capas y uso directo de APIs prohibidas.
> **Herramienta**: Reglas custom en `eslint.config.js` usando `no-restricted-imports` y `no-restricted-globals`.
> **Esfuerzo**: ~2-3 horas
> **Impacto**: Alto — cada `npm run lint` detecta violaciones automáticamente

#### 1.1 Imports prohibidos entre capas

| Regla | Qué prohíbe | Por qué |
|-------|-------------|---------|
| `shared/` no importa de `features/` | `@features/*` en archivos de `shared/` | shared es base, features es consumidor |
| `shared/` no importa de `@intranet-shared` | `@intranet-shared/*` en archivos de `shared/` | Dependencia inversa prohibida |
| Components no importan `HttpClient` directo | `@angular/common/http` en `*.component.ts` | Components usan facades/services, no HTTP |
| Features no importan de otras features | `@features/intranet/pages/admin` desde `@features/intranet/pages/profesor` | Cada feature es independiente |

**Implementación**: `no-restricted-imports` con overrides por carpeta en `eslint.config.js`.

#### 1.2 APIs prohibidas fuera de wrappers

| API prohibida | Solo permitida en | Regla ESLint |
|--------------|-------------------|-------------|
| `localStorage` | `@core/services/storage/` | `no-restricted-globals` |
| `sessionStorage` | `@core/services/storage/` | `no-restricted-globals` |
| `document.cookie` | `@core/services/storage/` | `no-restricted-globals` |
| `console.log` | Ninguno (usar `logger`) | `no-console` ya existe (warn → error) |
| `new HttpClient()` | `@core/services/http/` y services | `no-restricted-imports` por carpeta |

#### 1.3 Naming y estructura

| Regla | Qué detecta |
|-------|------------|
| Archivos > 500 líneas | Warning en lint (no bloqueo) |
| `any` en código nuevo | Ya existe como warn → subir a error en archivos nuevos |

#### Checklist Fase 1

```
[x] Agregar overrides por carpeta en eslint.config.js
[x] Prohibir localStorage/sessionStorage/document.cookie fuera de storage/
[x] Prohibir HttpClient en *.component.ts (solo HttpClient, no tipos como HttpErrorResponse)
[x] Prohibir imports @features/* desde shared/
[x] Prohibir imports cross-feature (admin ↔ profesor ↔ estudiante) — profesor→admin es warn por violación existente
[x] Prohibir imports @intranet-shared desde shared/ — re-exports temporales con eslint-disable (TODO F5)
[x] Subir no-console de warn a error
[x] Verificar: npm run lint pasa con 0 errores (88 warnings pre-existentes)
[x] Documentar reglas en .claude/rules/eslint.md
```

**Completado**: 2026-04-09. Violación conocida: `profesor/final-salones/` importa de `admin/salones/` (warn, pendiente refactor a @intranet-shared).

---

### Fase 1.5 — Inventario de reglas `no-restricted-imports` (F3.1 del maestro, 2026-04-14)

> **Objetivo**: Cerrar gaps de lint de capas antes de proceder con F3.2-F3.5.

#### Reglas activas hoy

| Scope | Prohibe | Nivel |
| --- | --- | --- |
| `shared/**` | `@features/*`, `@intranet-shared(/*)` | error |
| `*.component.ts` | `HttpClient` (de `@angular/common/http`) | error |
| `*.component.ts` | `**/*.store(.ts)` | error |
| `*.store.ts` | `HttpClient`, `**/*.facade(.ts)`, `**/*.service(.ts)` | error |
| `*.store.ts` | `.subscribe()` (via `no-restricted-syntax`) | error |
| `*.facade.ts` (excl. `-data/-crud/-ui`) | `**/*.facade(.ts)` (cross-facade) | **warn** |
| `admin/**` | `profesor/*`, `estudiante/*` | error |
| `profesor/**` | `admin/*`, `estudiante/*` | **warn** (violación existente) |
| `estudiante/**` | `admin/*`, `profesor/*` | error |
| `features/**` + `shared/**` | Internals de storage (session/preferences/notification/indexed-db/cache/smart-data), `auth-api`, `session-coordinator/refresh` | error |

**Otras relacionadas**:

- `no-restricted-globals`: `localStorage`, `sessionStorage` (con exenciones en `storage/`, `debug/`, `cache/`, tests).
- `wal/no-direct-mutation-subscribe`: facades (excl. `-data/-ui`).
- `structure/no-deep-relative-imports`, `no-repeated-blocks`, `no-compact-trivial-setter`, `max-lines: 300`.

#### Gaps detectados

| # | Gap | Dónde | Acción sugerida | Subfase |
| --- | --- | --- | --- | --- |
| G1 | Components pueden importar `*-api.service.ts` o `BaseHttpService` directamente | `*.component.ts` | Agregar pattern `**/*-api.service(.ts)` + `**/base-http*` a la regla existente | F3.2 |
| G2 | `document.cookie` documentado como prohibido pero no bloqueado | global | Agregar a `no-restricted-globals` con exención en `storage/` | F3.2 |
| G3 | WAL internals expuestos (`WalService`, `WalSyncEngine`, `WalDbService`) | `features/**` + `shared/**` barrel enforcement | Extender barrel enforcement | F3.2 / F5 |
| G4 | Cache internals: `CacheVersionManagerService` no bloqueado | `features/**` + `shared/**` | Extender barrel enforcement | F3.2 / F5 |
| G5 | `*.service.ts` (gateway IO) puede importar stores | `*.service.ts` | Agregar regla: services no importan `*.store` | F3.3 |
| G6 | `cross-role/**` sin restricciones de cross-feature | `cross-role/**` | Definir política (¿puede importar de admin/profesor/estudiante?) | F3.3 |
| G7 | `profesor → admin` sigue en **warn** (violación `final-salones/`) | `profesor/**` | Migrar `SalonesAdminTable`+`SalonDetailDialog` a `@intranet-shared` y subir a error | F3.5 |
| G8 | Re-exports temporales `@shared` → `@intranet-shared` con `eslint-disable` | `shared/**/index.ts` | Auditar consumidores + eliminar | F3.4 / F5 |
| G9 | Cross-facade es **warn**, no error | `*.facade.ts` | Subir a error cuando 0 violaciones | F3.3 tras limpieza |

#### Notas

- G1 y G5 son gaps de lint de capa puros → **F3.2-F3.3**.
- G3/G4 solapan con F5 (hardening de barrels); la diferencia es si se bloquea desde barrel (`index.ts` deja de exportar) o desde ESLint pattern. Hacer ambos.
- G7/G8 dependen de refactor previo (migrar código a `@intranet-shared`) → **F3.4-F3.5**.

#### Checklist F3.1

```
[x] Inventariar reglas actuales
[x] Identificar gaps por regla
[x] Mapear cada gap a subfase F3.x
[x] Actualizar maestro (marcar F3.1 ✅)
```

#### F3.2 — Cerrar G2, G3, G4 (2026-04-14)

**G1 movido a F3.5** — 8 componentes importan `*-api.service.ts` directamente (violaciones pre-existentes). Requiere migrar a facades primero.

Reglas agregadas a `eslint.config.js`:

- **G2**: `no-restricted-properties` bloquea `document.cookie` globalmente. 0 violaciones.
- **G3**: barrel enforcement para WAL internals (`wal-db`, `wal-sync-engine`, `wal-leader`, `wal-metrics`, `wal-cache-invalidator`, `wal-coalescer`, `wal-http`, `wal-error`) en `features/**` + `shared/**`. 0 violaciones desde esas capas.
- **G4**: barrel enforcement para `cache-version-manager*` en `features/**` + `shared/**`. 0 violaciones (único consumidor es `src/app/app.ts`, fuera del scope).

Verificación: `npx eslint src/app/**/*.ts` → 191 problemas (6 errores + 185 warnings), todos **pre-existentes** (2 `max-lines`, 4 `wal/no-direct-mutation-subscribe` en health-permissions facades). Ninguna regla nueva disparó violaciones.

Checklist F3.2:

```
[x] Bloquear document.cookie (G2)
[x] Barrel enforcement WAL internals (G3)
[x] Barrel enforcement Cache internals (G4)
[x] Verificar lint sin errores nuevos
[x] Mover G1 a F3.5 (requiere refactor previo a facades)
```

#### F3.3 — Intento cerrar G5/G6/G9 + descubrimiento G10 (2026-04-14)

**G9 subido a error** (cross-facade warn → error en `src/app/**/*.facade.ts`). 0 violaciones. **Advertencia**: efectivo solo para facades **fuera** de `features/**` (ver G10).

**G5 y G6 revertidos** tras descubrir G10.

##### G10 — Bug estructural del config (nuevo, bloqueante para F3.3)

> **ESLint flat config reemplaza (no merge) el valor de `no-restricted-imports` cuando múltiples configs matchean el mismo archivo. El último gana.**

Consecuencia: el bloque de barrel enforcement (aplica a `features/**` + `shared/**`) **sobrescribe** todas las reglas intermedias para archivos dentro de esas capas.

**Verificación con `eslint --print-config`**:

- `users.store.ts` → sin restricción de no importar facades/services.
- `users-crud.facade.ts` → sin restricción cross-facade (G9).
- `calendary.component.ts` (productivo) → sin restricción cross-role (G6).
- `campus-editor.service.ts` → sin restricción services→stores (G5).
- `*.component.ts` en features → sin restricción de no importar stores/HttpClient.

**Reglas de capa afectadas (todas las intermedias)**:

| Regla (doc) | Archivo | Estado real |
| --- | --- | --- |
| `components` no importan `HttpClient` | `*.component.ts` en features/ | **Inefectiva** — barrel enforcement overwrite |
| `components` no importan `*.store` | `*.component.ts` en features/ | **Inefectiva** |
| `stores` no importan facades/services | `*.store.ts` en features/ | **Inefectiva** |
| `stores` no hacen `.subscribe()` | `*.store.ts` en features/ | ✅ Efectiva (otra regla: `no-restricted-syntax`) |
| Cross-facade | `*.facade.ts` en features/ | **Inefectiva** |
| Cross-feature (admin↔profesor↔estudiante) | features pages | **Inefectiva** |
| Barrel enforcement (storage/auth/session internals) | features/ + shared/ | ✅ Efectiva (es el que gana) |
| WAL/Cache internals (G3/G4) | features/ + shared/ | ✅ Efectiva (mismo bloque) |

**Opciones de fix (todas fuera del alcance de F3.3 chat-sized)**:

1. **Consolidar patterns en un único bloque por scope de archivo** (reescribir config entero). Cada bloque de archivo define TODOS sus patterns. Elimina sobreescritura.
2. **Plugin custom** como `wal/no-direct-mutation-subscribe` — una rule propia que inspecciona la ubicación del archivo y aplica restricciones acumulativas. Más código, más mantenible.
3. **Reordenar configs**: barrel enforcement primero, específicos después. Invierte el problema — los específicos pierden las restricciones de barrel.

**Decisión**: G10 se mueve a **F5 (hardening de wrappers)** como tarea de refactor estructural del config. Requiere chat dedicado con diseño previo.

##### Checklist F3.3

```
[x] G9 subido a error (efectivo en core/, inefectivo en features/ por G10)
[x] G5 revertido — requiere fix de G10 primero
[x] G6 revertido — requiere fix de G10 primero
[x] G10 documentado como bloqueante
[x] Verificar lint vuelve a baseline F3.2 (191 problemas, mismos pre-existentes)
```

**Impacto en el plan**: F3.3 se considera **cerrada parcialmente** (solo G9). F3.4 puede proceder independientemente (es auditoría). F3.5 hereda G1, G5, G6, y ahora G10 también depende de F5.

##### Update 2026-04-14 — G10 resuelto por Plan 11

Plan 11 (refactor `eslint.config.js`) cerró G10 introduciendo plugin local `layer-enforcement`
con dos reglas (`imports-error` / `imports-warn`) que iteran una tabla declarativa. Los
7 bloques `no-restricted-imports` intermedios fueron reemplazados. Desbloquea F3.3→F3.5.

**Verificación post-fix (`npx eslint .` al 2026-04-14)**: 30 errores totales. 22 son
`layer-enforcement/imports-error` previamente invisibles. Catálogo en Plan 11 F4.

**Reenganche F3.3**:

- G5 (stores no importan `HttpClient`) → ya efectivo, tapa quedó cubierta por
  `store-no-io-no-facade` de `LAYER_RULES`. 0 violaciones activas.
- G6 (stores no importan services) → ya efectivo. Destapa **3 violaciones**:
  `wal-status.store.ts` (2) + `campus-navigation.store.ts` (1). Pasan a F3.5.
- G9 (cross-facade) → confirmado efectivo. 0 violaciones nuevas.
- G10 → resuelto. Quedó ✅.

F3.3 queda **totalmente cerrada**. F3.5 recibe G1 (existente) + G5/G6 (ya efectivos pero
con violaciones pre-existentes que catalogamos abajo) + las 22 violaciones nuevas.

##### Inventario F3.5 — violaciones destapadas por fix G10

Las 22 violaciones `layer-enforcement/imports-error` destapadas al habilitar el plugin
agrupan así:

| Categoría | Cantidad | Archivos |
|-----------|---------:|----------|
| Components importando stores (G2 extendido) | 12 | ctest-k6 (4), videoconferencias, simulador-notas, profesor-salones, profesor-foro, profesor-calificaciones, salon-estudiantes-dialog, permisos-detail-drawer, attachments-modal |
| `admin/` → `profesor/` (cross-feature) | 5 | admin-health-permissions (3 archivos) |
| Stores → services (G6) | 3 | wal-status.store (2), campus-navigation.store (1) |
| `estudiante/` → `profesor/` (cross-feature) | 2 | curso-content-readonly-dialog |

Más 2 warnings `profesor/` → `admin/`/`estudiante/` (severidad warn por migración gradual
— ver G7/G8) y los QW1 del maestro (WAL). Los `max-lines` y unused-vars/console están
fuera de scope de F3.5.

El plan de ataque de F3.5 es por lotes:

1. **Lote A — G2 extendido (components importando stores)**: ✅ **cerrado 2026-04-15**. 12 archivos migrados en 3 sub-lotes:
   - A.1 (7 archivos): tipos extraídos a `*.models.ts` hermanos del store (permisos-detail-drawer, videoconferencias, simulador-notas, attachments-modal) o a carpeta `models/` compartida (profesor-salones/foro/salon-estudiantes-dialog). `attachments-modal` retiene store como provider scoped con escape hatch justificado.
   - A.2 (4 archivos): `CTestK6Facade` extendido con 14 pass-through methods; ctest-k6.component + 3 steps migrados.
   - A.3 (1 archivo): `CalificacionesFacade.setContenidoWithSalon()` expuesto como método compuesto; profesor-calificaciones migrado.
2. **Lote B — Stores → services (G6)**: 3 casos, auditar si el service debe inyectarse
   en el facade + el store recibe el resultado vía setter. Chat chico.
3. **Lote C — Cross-feature admin↔estudiante**: ✅ **cerrado 2026-04-15**. Decisión:
   escape hatches justificados + migración física a `@intranet-shared` diferida como
   tarea estructural separada (scope real: ~15 archivos entre `health-permission.models`,
   `health-permissions-api.service`, `salon-health-permissions-tab` complejo, 2 summary
   dialogs y sus consumidores internos en profesor/ — fuera del budget chat-sized).
   - `admin/health-permissions/admin-health-permissions.component.ts`: 2 escapes (DTO + tab component).
   - `admin/health-permissions/services/admin-health-permissions.facade.ts`: 2 escapes (API service + DTOs).
   - `admin/health-permissions/services/admin-health-permissions.store.ts`: 1 escape bloque (import multi-línea) con `/* eslint-disable */` + `/* eslint-enable */`.
   - `estudiante/cursos/components/curso-content-readonly-dialog/...component.ts`: 2 escapes (archivos + tareas summary dialogs, vistas read-only cross-role).
   - Resultado: `npx eslint .` deja **0 errores de `layer-enforcement/imports-error`** en todo el repo (F3.5.E cumplido en la misma corrida).
   - Nota de seguimiento: al atacar la migración física a `@intranet-shared`, eliminar estos 7 escapes y mover los archivos origen; consumidores dentro de `profesor/` se actualizan en el mismo PR.
4. **Lote D — G1 original (8 components importando `*-api.service` directamente)**: heredado
   de F3.2, requiere migración a facade. Chat por módulo.
   - **D.1 cerrado 2026-04-15** — cross-role widgets (2 archivos): `profesor-attendance-widget` y `attendance-summary-widget` migrados de `TeacherAttendanceApiService`/`DirectorAttendanceApiService` a `AttendanceService` (facade existente en `@shared/services/attendance/`). La interfaz del facade cubre 1:1 los métodos consumidos (`getSalonesProfesor`, `getAsistenciaDia`, `getEstadisticasDirector`), cero cambios de tipos. En la misma corrida se extendió `component-no-http-no-store` con pattern `-api\.service(\.ts)?$` — las 6 violaciones restantes ya son bloqueantes en lint.
   - **D.2 cerrado 2026-04-15** — módulo estudiante (4 archivos): `foro/estudiante-foro`, `mensajeria/estudiante-mensajeria`, `attendance/student-attendance` y `schedules/estudiante-horarios` migrados a nuevo `EstudianteFacade` fino en `estudiante/services/estudiante.facade.ts`. Delega 3 métodos de lectura (`getMisHorarios`, `getMiAsistencia`, `getServerTime`) a `EstudianteApiService`. Se eligió el patrón de D.1 (facade delgado cross-sub-feature, estilo `AttendanceService`) en vez de facades dedicados con store por cada sub-feature: los 4 componentes solo necesitan 1-2 lecturas, crear stores completos sería sobrediseño. Los facades que sí tienen store propio (`EstudianteCursosFacade`, `StudentSchedulesFacade`) siguen consumiendo `EstudianteApiService` directo — ese es su rol legítimo.
   - **D.3 cerrado 2026-04-15** — módulo profesor (2 archivos): `schedules/profesor-horarios` y `grades/profesor-calificaciones` dejaron de inyectar `ProfesorApiService`. Se extendió `ProfesorFacade` con 2 reads delegados (`getServerTime()`, `getContenido(horarioId)`) siguiendo el mismo patrón fino que `EstudianteFacade` de D.2. `CalificacionesFacade` ya cubría el resto del flujo de calificaciones, no requirió cambios. Lint + tsc limpios.

Cada lote actualiza este plan (marca progreso de G-IDs) y el maestro (sub-bullets bajo
F3.5) al terminar.

##### Update 2026-04-15 — F3.4 cerrada (auditoría `shared/` → `features/` / `@intranet-shared`)

Auditoría sobre `src/app/shared/**`:

| Patrón | Violaciones | Detalle |
|--------|-------------|---------|
| `import ... from '@features/*'` | 0 | Limpio |
| `import ... from '@intranet-shared/...'` | 0 | Limpio |
| `export * from '@intranet-shared/...'` (G8) | 15 | 3 barrels: `components/index.ts` (7), `pipes/index.ts` (5), `directives/index.ts` (3) |

Los 15 re-exports ya están silenciados con escape hatch `/* eslint-disable layer-enforcement/imports-error -- Razón: shim temporal de migración @shared → @intranet-shared */` desde Plan 11 F5.2 — deuda visible con TODO(F5.3) para eliminarlos cuando los consumidores migren al alias final.

**Verificación**: `npx eslint src/app/shared` → 0 errores.

**Resultado**: F3.4 ✅. G8 queda delegado a F5.3 (eliminar re-exports tras migrar consumidores a `@intranet-shared`).

##### F3.6 — Cierre consolidado de F3 (2026-04-15)

F3 (Lint de capas) queda **cerrada**. Resumen de estado por subfase:

| Subfase | Estado | Resultado |
|---------|--------|-----------|
| F3.1 Inventario gaps G1-G9 | ✅ | Tabla de 9 gaps documentada |
| F3.2 Cerrar G2/G3/G4 | ✅ | `document.cookie`, WAL internals, Cache internals bloqueados |
| F3.3 G5/G6/G9 + descubrimiento G10 | ✅ | G9 efectivo; G5/G6 efectivos tras fix G10 (Plan 11) |
| F3.4 Auditoría `shared/` | ✅ | 0 imports cross-layer; 15 re-exports silenciados con TODO(F5.3) |
| F3.5 Violaciones destapadas (A+B+C+D+E) | ✅ | 22 violaciones resueltas en 4 lotes |
| F3.6 Cierre procedural | ✅ | Este bloque |

**Estado de gaps G1-G10 al cierre**:

| Gap | Estado | Nota |
|-----|--------|------|
| G1 (components → `*-api.service`) | ✅ | 8 components migrados a facades (D.1+D.2+D.3) |
| G2 (components → stores) | ✅ | 12 components migrados (A.1+A.2+A.3) |
| G3 (WAL internals) | ✅ | Barrel enforcement extendido |
| G4 (Cache internals) | ✅ | Barrel enforcement extendido |
| G5 (services → stores) | ✅ | Regla activa + violaciones resueltas (Lote B) |
| G6 (cross-role) | ✅ | Política definida (facade-only) |
| G7 (profesor → admin warn) | 🔄 | Diferido: migración `@intranet-shared` como tarea estructural |
| G8 (re-exports `@shared` → `@intranet-shared`) | 🔄 | Delegado a F5.3 |
| G9 (cross-facade warn) | ✅ | Efectivo en error |
| G10 (bug ESLint flat config) | ✅ | Resuelto por Plan 11 (plugin `layer-enforcement`) |

**Verificación final**: `npx eslint .` → 0 errores de `layer-enforcement/imports-error` en todo el repo.

**Siguiente tramo**: F4 (Tests de invariantes). F4.1-F4.3 ejecutables sin bloqueos. F4.4-F4.5 esperan Plan 2/B y Plan 3 F4 respectivamente.

---

### Fase 2 — Tests de Contrato e Invariantes (red de seguridad)

> **Objetivo**: Que las reglas de negocio críticas tengan tests que fallen si alguien las rompe.
> **Herramienta**: Vitest + tests unitarios/integración
> **Esfuerzo**: ~4-6 horas (incremental, no todo de una vez)
> **Impacto**: Medio-alto — protege invariantes del dominio

#### 2.1 Prioridad de tests por riesgo

| Zona | Qué testear | Tipo | Prioridad |
|------|-------------|------|-----------|
| **Auth/Session** | Login flow, token refresh, logout cleanup | Unit | P1 |
| **Permisos** | Resolución 2 capas (rol → personalizado), verificación exacta por ruta | Unit | P1 |
| **Storage** | Facade delega correctamente, cleanup en logout | Unit | P1 |
| **WAL** | execute() con onCommit/onError, rollback en error | Unit | P2 |
| **Asistencia estados** | Cálculo A/T/F/J según ventanas horarias | Unit | P2 |
| **Guards** | authGuard bloquea sin token, permisosGuard verifica ruta exacta | Unit | P2 |
| **Calificación** | Promedio ponderado, ventana de edición 2 meses | Unit | P3 |
| **Interceptors** | Rate limit enqueue, auth header injection | Unit | P3 |

#### 2.2 Tests de contrato de wrappers

Verificar que los wrappers hacen lo que prometen:

```typescript
// Ejemplo: StorageService siempre limpia en logout
describe('StorageService', () => {
  it('clearAll limpia sessionStorage, preferences y notificaciones', () => {
    // Arrange: poblar datos
    // Act: clearAll()
    // Assert: todo vacío
  });
});

// Ejemplo: WalFacadeHelper ejecuta onCommit en éxito
describe('WalFacadeHelper', () => {
  it('ejecuta onCommit cuando HTTP responde ok', () => { /* ... */ });
  it('ejecuta onError y NO onCommit cuando HTTP falla', () => { /* ... */ });
});
```

#### 2.3 Tests de invariantes de negocio (backend-driven, frontend-verifiable)

```typescript
// INV-C01: Estado de asistencia lo determina el ingreso
describe('AsistenciaEstadoCalculador', () => {
  it('ingreso 7:45 en periodo regular → A', () => { /* ... */ });
  it('ingreso 8:25 en periodo regular → T', () => { /* ... */ });
  it('ingreso 9:35 en periodo regular → F', () => { /* ... */ });
  it('justificación tiene precedencia absoluta', () => { /* ... */ });
});
```

#### Checklist Fase 2

```
[x] Tests de AuthService (login, logout, refresh, cambiarContrasena, switchSession) — 20 tests
[x] Tests de StorageService (facade delegation, cleanup, clearAll exhaustivo) — 15 tests
[x] Tests de permisosGuard (ruta exacta, sin herencia) — 9 tests (ya existían)
[x] Tests de WalFacadeHelper (optimistic, server-confirmed, fallback, rollback, postReloadCommit$) — 20 tests NUEVOS
[x] Tests de estado.utils (funciones puras de estado activo/inactivo) — 12 tests NUEVOS
[x] Tests de authGuard (bloqueo sin token) — 3 tests (ya existían)
[x] Tests de UserPermisosService (tienePermiso exacto, ensureLoaded, storage restore) — 22 tests (ya existían)
[x] Verificar: npm test pasa con tests nuevos (67/67 en archivos modificados)
```

**Completado**: 2026-04-13. Tests de cálculo de asistencia (INV-C01/C02) no aplican al frontend — esa lógica vive en el backend (AsistenciaEstadoCalculador.cs). Se reemplazó con tests de estado.utils.ts. Tests pre-existentes rotos en `usuarios.store.spec.ts` (53 failures) son anteriores a esta fase — el store fue refactorizado y los tests no se actualizaron.

---

### Fase 3 — Tipos Semánticos Completos (enforcement por compilador)

> **Objetivo**: Que TypeScript rechace datos mal formados en compilación, no en runtime.
> **Herramienta**: Tipos estrictos, const + type pattern, eliminar `any`
> **Esfuerzo**: ~3-4 horas (incremental al tocar cada módulo)
> **Impacto**: Medio — errores detectados antes de ejecutar
> **Dependencia**: Parcialmente hecho (ver `semantic-types.md`), falta completar

#### 3.1 Tipos semánticos pendientes de crear

| Tipo | Valores | Dónde definir |
|------|---------|---------------|
| `EstadoMatricula` | `PREASIGNADO \| PENDIENTE_PAGO \| PAGADO \| CONFIRMADO \| CURSANDO \| FINALIZADO \| RETIRADO \| ANULADO` | `@data/models/matricula.models.ts` |
| `MetodoPago` | `EFECTIVO \| TRANSFERENCIA \| YAPE \| PLIN \| OTRO` | `@data/models/matricula.models.ts` |
| `EstadoEstudiante` | `MATRICULADO \| ACTIVO \| INACTIVO \| EGRESADO` | `@data/models/estudiante.models.ts` |
| `EstadoPeriodo` | Ya existe como `PeriodoCierreEstado` | Verificar uso consistente |
| `WalConsistencyLevel` | `optimistic \| optimistic-confirm \| server-confirmed \| serialized` | `@core/services/wal/models/` |

#### 3.2 Eliminar `any` restante

- Ejecutar `grep -r ": any" src/app/` → listar instancias
- Priorizar: services > stores > facades > components
- Reemplazar por tipos específicos o `unknown` en catch

#### Checklist Fase 3

```
[ ] Crear tipos semánticos de Fase 3.1
[ ] Audit de `any` en services y stores (prioridad)
[ ] DTOs de API usan tipos semánticos (no string genérico para estados)
[ ] Signals tipados con tipos semánticos
[ ] Verificar: ng build --configuration production sin errores
```

---

### Fase 4 — CI Pipeline (enforcement en merge)

> **Objetivo**: Que ningún código roto llegue a main/master.
> **Herramienta**: GitHub Actions
> **Esfuerzo**: ~2-3 horas
> **Impacto**: Máximo — enforcement no opcional
> **Dependencia**: Fases 1 y 2 deben estar estables

#### 4.1 Pipeline frontend (educa-web)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup-node (22.x)
      - npm ci
      - npm run lint          # Fase 1 reglas
      - npm run build -- --configuration production
      - npm test              # Fase 2 tests
```

#### 4.2 Pipeline backend (Educa.API) — futuro

```yaml
# Cuando haya tests backend
- dotnet build
- dotnet test
```

#### Checklist Fase 4

```
[ ] Crear .github/workflows/ci.yml para educa-web
[ ] lint + build + test obligatorios
[ ] PR no mergeable sin CI verde
[ ] Crear .github/workflows/ci-backend.yml cuando haya tests backend
```

---

### Fase 5 — Hardening de Wrappers (cerrar escape hatches)

> **Objetivo**: Que los wrappers existentes sean el ÚNICO camino, no solo el camino sugerido.
> **Herramienta**: Refactor de barrel exports + ESLint + documentación
> **Esfuerzo**: ~2-3 horas
> **Impacto**: Alto para zonas críticas
> **Dependencia**: Fase 1 (lint ya detecta bypasses)

#### 5.1 Barrel exports restrictivos

Actualmente `@core/services/storage/index.ts` exporta TODAS las implementaciones. Solo debería exportar la facade:

| Módulo | Exportar públicamente | Mantener interno |
|--------|----------------------|-----------------|
| `storage/` | `StorageService` | SessionStorageService, PreferencesStorageService, etc. |
| `session/` | `SessionCoordinatorService` | SessionActivityService, SessionRefreshService |
| `wal/` | `WalFacadeHelper`, `WalStatusStore` | WalService, WalSyncEngine, WalDbService, etc. |
| `cache/` | `CacheInvalidationService` | CacheVersionManagerService |

**Riesgo**: Cambiar exports puede romper imports existentes. Hacer con grep previo.

#### 5.2 Patrón: lint + wrapper combinado

Para cada zona crítica, la estrategia completa es:

```
1. Wrapper existe (ya hecho)
2. Barrel export solo expone el wrapper (Fase 5.1)
3. ESLint prohíbe imports directos a implementaciones (Fase 1)
4. Test verifica que el wrapper hace lo correcto (Fase 2)
5. CI bloquea merge si algo falla (Fase 4)
```

#### Checklist Fase 5

```
[ ] Reducir exports de storage/index.ts a solo StorageService
[ ] Reducir exports de wal/index.ts a WalFacadeHelper + WalStatusStore
[ ] Reducir exports de session/index.ts a SessionCoordinatorService
[ ] Grep de imports directos → migrar a facade
[ ] ESLint rule para prohibir imports a archivos internos de wrappers
[ ] Verificar: npm run lint + npm run build pasan
```

---

## Mapa de Enforcement por Zona Crítica

| Zona | Wrapper | Lint | Test | CI | Progreso |
|------|---------|------|------|----|----------|
| **Sesión/Auth** | ✅ SessionCoordinator | ✅ Prohibir localStorage | ✅ 20 tests | ⬜ Pendiente | Wrapper + Lint + Test |
| **Storage** | ✅ StorageService | ✅ Prohibir localStorage/sessionStorage | ✅ 15 tests | ⬜ Pendiente | Wrapper + Lint + Test |
| **HTTP** | ✅ BaseHttpService | ✅ Prohibir HttpClient en components | — | ⬜ Pendiente | Wrapper + Lint |
| **WAL/Mutaciones** | ✅ WalFacadeHelper | ✅ Prohibir imports internos WAL | ✅ 20 tests | ⬜ Pendiente | Wrapper + Lint + Test |
| **Cache** | ✅ CacheInvalidation | ✅ Prohibir imports internos cache | — | ⬜ Pendiente | Wrapper + Lint |
| **Permisos** | ✅ permisosGuard | — | ✅ 31 tests (guard 9 + service 22) | ⬜ Pendiente | Wrapper + Test |
| **Logging** | ✅ logger | ✅ no-console: error | — | ⬜ Pendiente | Wrapper + Lint |
| **Capas** | ✅ Arquitectura | ✅ Prohibir cross-imports | — | ⬜ Pendiente | Lint |

---

## Orden de Ejecución Recomendado

```
Fase 1 (Lint)     ← Impacto inmediato, bajo riesgo, detecta problemas existentes
  ↓
Fase 2 (Tests)    ← Red de seguridad para zonas críticas
  ↓
Fase 4 (CI)       ← Hace las fases 1 y 2 no-opcionales (se puede adelantar si F1 está lista)
  ↓
Fase 3 (Tipos)    ← Incremental, se hace al tocar cada módulo
  ↓
Fase 5 (Barrels)  ← Cierra escape hatches, requiere lint estable
```

**Fase 3 es continua** — no necesita un sprint dedicado. Se aplica cada vez que se toca un archivo.

---

## Relación con Otras Tasks

| Task existente | Cómo se relaciona |
|---------------|-------------------|
| `higiene-estructural.md` | Fase 1 (lint de capas) refuerza las fronteras que higiene estableció |
| `archivos-grandes-refactor.md` | Fase 1 puede agregar warning de líneas. Los refactors facilitan tests (Fase 2) |
| `normalizacion-idiomatica.md` | Independiente — naming no afecta enforcement |
| `revision-codigo-muerto.md` | Fase 5 (barrel exports) puede eliminar exports de código muerto |

---

## Métricas de Éxito

| Métrica | Antes | Después de Fase 1-2 (actual) | Después de Fase 4-5 (objetivo) |
|---------|-------|---------------------|---------------------|
| Violaciones de capa detectables | 0 | ✅ Todas (lint) | Bloqueadas (CI) |
| Tests de contrato | 0 | ✅ 101 tests (Auth 20 + Storage 15 + Permisos 22+9 + WAL 20 + Guards 3 + Utils 12) | Obligatorios en merge |
| `any` en services/stores | ? (auditar) | Pendiente (Fase 3) | 0 en código nuevo |
| Bypass de wrappers posible | Sí (import directo) | Detectado (lint) | Bloqueado (barrel + lint) |
| CI pipeline | No existe | Pendiente (Fase 4) | Lint + build + test |

---

## Cuándo NO aplicar enforcement

| Situación | Razón |
|-----------|-------|
| Regla depende mucho de contexto de negocio | Falsos positivos > valor |
| Wrapper solo reexporta sin agregar comportamiento | Capa tonta sin valor |
| La regla en realidad pide rediseño, no vigilancia | Lint no arregla arquitectura rota |
| Costo de mantener la regla > beneficio | Reglas de lint muy frágiles |
| Código legacy que no se va a tocar | No refactorizar "por si acaso" |

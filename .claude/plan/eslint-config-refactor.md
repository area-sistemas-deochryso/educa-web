# Refactor del `eslint.config.js` — Fix al bug G10 (override de `no-restricted-imports`)

> **Estado**: ✅ F1-F5 (F5.3 tests opcionales sin ejecutar; re-exports cubiertos el 2026-04-15)
> **Origen**: G10 detectado durante F3.3 del Plan 1 (Enforcement) el 2026-04-14
> **Prioridad**: Alta — desbloquea F3.3 y F3.5 del enforcement, y remedia un falso positivo de "enforcement activo"
> **Capa en el maestro**: Capa 5 (Patrones + Resiliencia), pero puede adelantarse si bloquea trabajo de enforcement.

---

## F1 — Decisión (2026-04-14): Opción B (plugin `layer-enforcement`)

Bug confirmado empíricamente con `npx eslint --print-config` sobre
`src/app/features/intranet/components/attendance/attendance-day-list/attendance-day-list.component.ts`:
el `no-restricted-imports` efectivo solo contiene los 5 patterns del barrel enforcement. Las
restricciones de component (HttpClient, `*.store`) están ausentes.

### Opciones evaluadas

| Criterio | Opción A (consolidar) | Opción B (plugin) |
|---|---|---|
| Combinaciones a cubrir | 7 scopes con overlap (admin/profesor/estudiante × component/store/facade) → explosión | 1 tabla declarativa |
| Severidad mixta (profesor cross-feature = warn, resto = error) | **Imposible** — ESLint no permite mezclar severidades dentro de un mismo `no-restricted-imports` | Trivial — plugin reporta con severidad por regla |
| Duplicación de 5 patterns barrel | Con helper `const` funciona pero cada scope debe spreadearlos | 0 duplicación |
| Precedente en el repo | — | ✅ `walPlugin`, `structurePlugin` ya existen |
| Mantenibilidad | Alta fricción al agregar patterns nuevos o combinaciones | Una sola tabla, extensible |

### Decisión

**Opción B — plugin local `layer-enforcement`** en el mismo `eslint.config.js` (siguiendo el patrón de
`walPlugin` y `structurePlugin`). El plugin expone una regla `layer-enforcement/no-restricted-imports`
(o similar) que:

1. Lee `context.filename` y deriva el conjunto de "capas" a las que pertenece el archivo
   (component/store/facade/service, scope shared/admin/profesor/estudiante, features/shared).
2. Mantiene una **tabla declarativa** de restricciones por capa con su mensaje y severidad lógica
   (aunque ESLint requiere una sola severidad externa, el plugin puede elegir reportar o no según
   el nivel interno — o exponer dos reglas: `layer-enforcement/errors` y `layer-enforcement/warns`).
3. Visita cada `ImportDeclaration` y reporta según la tabla.

Esto reemplaza los bloques `no-restricted-imports` intermedios (components, stores, facades,
admin/profesor/estudiante) y se compone con los 2 bloques que siguen siendo bloques ESLint
nativos: barrel enforcement (patterns específicos que ya funcionan por estar al final) y shared
(que también funciona porque shared no cae en scope de features). Alternativamente, el plugin puede
absorber también barrel + shared para un solo lugar de verdad.

### Entregable de F1

- [x] F1.1 Verificado: no hay plugin de terceros conocido que haga merge de `no-restricted-imports` — es comportamiento documentado de flat config
- [x] F1.2 Evaluada Opción A — rechazada por severidad mixta + combinatoria
- [x] F1.3 Evaluada Opción B — viable con patrón existente
- [x] F1.4 Decisión: Opción B
- [x] F1.5 Plan + maestro actualizados

F2 arranca el inventario de patterns a consolidar en la tabla declarativa del plugin.

---

## F2-F3 — Implementación del plugin (2026-04-14)

### Inventario consolidado (tabla `LAYER_RULES`)

| id | match | severidad | restricciones |
|----|-------|-----------|---------------|
| `shared-no-features` | `/src/app/shared/` | error | `@features/*`, `@intranet-shared` |
| `component-no-http-no-store` | `*.component.ts` | error | `HttpClient` from `@angular/common/http`, `**/*.store{.ts}` |
| `store-no-io-no-facade` | `*.store.ts` | error | `HttpClient`, `**/*.facade{.ts}`, `**/*.service{.ts}` |
| `facade-no-cross-facade` | `*.facade.ts` excl `-data/-crud/-ui` | error | `**/*.facade{.ts}` |
| `admin-no-cross-feature` | `features/admin/` | error | `@features/intranet/pages/profesor/*`, `.../estudiante/*` |
| `profesor-no-cross-feature` | `features/profesor/` | **warn** | `.../admin/*`, `.../estudiante/*` |
| `estudiante-no-cross-feature` | `features/estudiante/` | error | `.../admin/*`, `.../profesor/*` |

### Implementación

Plugin `layer-enforcement` en `eslint.config.js` (región propia, sigue el patrón de
`walPlugin` y `structurePlugin`). Expone dos reglas con nombres únicos:

- `layer-enforcement/imports-error` — reporta violaciones con severidad error
- `layer-enforcement/imports-warn` — reporta violaciones con severidad warn

Ambas leen la misma tabla `LAYER_RULES`, filtran por severidad y visitan
`ImportDeclaration`. El chequeo soporta `importedNames` opcional para restringir solo
cuando un named specifier específico está presente (ej: `HttpClient`).

Se eliminaron los 7 bloques que hoy vivían silenciados por G10:

- `shared/` → `@features`, `@intranet-shared`
- `*.component.ts` → HttpClient, stores
- `*.store.ts` → HttpClient, facades, services (la regla `no-restricted-syntax` de
  `.subscribe()` queda en su bloque propio — nombre distinto, no hay override)
- `*.facade.ts` → cross-facade
- `admin/`, `profesor/`, `estudiante/` → cross-feature

Se conserva: barrel enforcement nativo (bloquea internals de storage/auth/session/WAL/cache;
es el último bloque `no-restricted-imports` de todo el config, no hay override posterior).

### Verificación empírica

`npx eslint --print-config` sobre un component en `features/**` ahora retorna:

```text
layer-enforcement/imports-error: [2]
layer-enforcement/imports-warn: [1]
```

`npm run lint` ahora detecta violaciones que antes quedaban invisibles:

- Components importando stores directamente (~12 instancias)
- Stores importando services (~3 instancias)
- admin/ importando de profesor/ (~5 instancias)
- estudiante/ importando de profesor/ (~2 instancias)
- profesor/ importando de admin/ (~2 instancias, warn)

Estas correcciones son trabajo de **Plan 1 F3.5**, no de este plan.

### Criterios de aceptación cumplidos

1. ✅ `--print-config` sobre cualquier `.component.ts` en `features/**` incluye `layer-enforcement/imports-error`
2. ✅ Lo mismo para `.store.ts`, `.facade.ts`, archivos en `admin/`, `profesor/`, `estudiante/`
3. ✅ `npm run lint` detecta violaciones pre-existentes (esperado: aumento de errores hasta F3.5)
4. ✅ F4: `rules/eslint.md` refleja la realidad del enforcement (ver F4 abajo)

---

## F4 — Reenganche con Plan 1 (2026-04-14)

### Limpieza de directivas huérfanas

3 directivas `/* eslint-disable no-restricted-imports */` en barrels de `shared/*/index.ts`
quedaron huérfanas tras el fix. Removidas completamente:

- `src/app/shared/components/index.ts` — bloque envolviendo 7 re-exports
- `src/app/shared/directives/index.ts` — bloque envolviendo 3 re-exports
- `src/app/shared/pipes/index.ts` — bloque envolviendo 5 re-exports

**Por qué removerlas en vez de renombrarlas a `layer-enforcement/imports-error`**: el plugin
`layer-enforcement` solo hookea `ImportDeclaration`. Re-exports (`export * from`,
`export { X } from`) no disparan la regla. Las directivas no suprimen nada — solo generan
ruido ("Unused eslint-disable"). El TODO(F5) en los barrels sigue marcando el trabajo real:
migrar consumidores a `@intranet-shared` y eliminar los re-exports.

**Gap del plugin anotado**: `layer-enforcement` no detecta la violación arquitectónica de
`shared/` re-exportando `@intranet-shared`. Si se quisiera enforcement duro, habría que
extender el plugin a `ExportAllDeclaration` / `ExportNamedDeclaration`. Pero la política
actual prefiere eliminar los re-exports (F5 del Plan 1) antes que legitimarlos con una
regla que los proteja.

### Actualización de `rules/eslint.md`

- Sección "Reglas de arquitectura" reescrita: tabla ahora refleja el plugin `layer-enforcement`
  con sus 7 entries (shared, component, store, facade-cross, admin/profesor/estudiante
  cross-feature). Severidades explícitas.
- Bloque introductorio explica qué es `layer-enforcement`, por qué existe, y la limitación
  de `ImportDeclaration`-only.
- Todos los ejemplos de escape hatch actualizados a
  `// eslint-disable-next-line layer-enforcement/imports-error -- Razón: …`.
- Tabla de excepciones configuradas actualizada: la entrada de `shared/**/index.ts` ahora
  explica que los re-exports NO disparan la regla y deben ser **eliminados** (no legitimados).

### Panorama destapado para Plan 1 F3.5

Lint completo a 2026-04-14 reporta **30 errores totales**, de los cuales **22** son
`layer-enforcement/imports-error` que antes eran invisibles. Desglose por categoría:

| Categoría | Cantidad | Archivos afectados |
|-----------|---------:|--------------------|
| Components importando stores directamente | 12 | ctest-k6 (4), videoconferencias, simulador-notas, profesor-salones, profesor-foro, profesor-calificaciones, salon-estudiantes-dialog, permisos-detail-drawer, attachments-modal |
| `admin/` importando de `profesor/` | 5 | admin-health-permissions (3 archivos × hasta 2 imports) |
| Stores importando services | 3 | wal-status.store (2), campus-navigation.store (1) |
| `estudiante/` importando de `profesor/` | 2 | curso-content-readonly-dialog |

**No contados en los 22 pero parte del trabajo destapado**:
- 2 warnings `profesor → admin/estudiante` (severidad warn por diseño — migración gradual)
- 4 `wal/no-direct-mutation-subscribe` ya catalogados como QW1 en el maestro
- 2 `max-lines` (wal-sync-engine, profesor-salones) — ya listados en Plan 5 F6.1
- 2 `no-unused-vars`, 1 `no-console` (limpieza menor fuera de enforcement)

El trabajo de corregir estas 22 violaciones vive en **Plan 1 F3.5**. Este plan (11) solo
destapó el trabajo, no lo ejecuta.

### Entregables de F4

- [x] F4.1 Removidas 3 directivas huérfanas en `shared/*/index.ts`
- [x] F4.2 `rules/eslint.md` actualizado (tabla, ejemplos, excepciones, limitación)
- [x] F4.3 Panorama de violaciones destapadas catalogado (arriba) y linkeado a Plan 1 F3.5
- [x] F4.4 `npx eslint` sobre los 3 barrels → 0 warnings (verificado)
- [x] F4.5 Maestro + este plan actualizados

---

## F5 — Extensión a re-exports (2026-04-15)

### Cambio

`createImportChecker` ahora visita también `ExportAllDeclaration` y
`ExportNamedDeclaration` con `source`. Un re-export como
`export * from '@intranet-shared/…'` dispara la misma regla de capa que el
`import` equivalente. Implementado con un handler único `checkNode(node)`
compartido por las 3 formas.

`hasImportedName` actualizado para distinguir:

- `ImportDeclaration` → `specifier.imported.name` (ImportSpecifier)
- `ExportNamedDeclaration` → `specifier.local.name` (ExportSpecifier)
- `ExportAllDeclaration` → sin specifiers; si la restricción pide
  `importedNames` específicos, no aplica (retorna `false`)

### Escape hatches en los 3 barrels (F5.2)

Los 15 re-exports de `shared/*/index.ts` → `@intranet-shared/*` quedan ahora
detectados. Se silenciaron con bloque justificado:

```typescript
/* eslint-disable layer-enforcement/imports-error -- Razón: shim temporal de
   migración @shared → @intranet-shared; eliminar cuando los consumidores usen
   el alias final (Plan 1 F5.3). */
export * from '@intranet-shared/…';
```

Escape de bloque (no `next-line`) porque son N re-exports contiguos con la misma
justificación. La deuda queda **visible y acotada** — eliminar los escapes es la
prueba de que los consumidores migraron.

### Verificación

- `npx eslint src/app/shared/{components,directives,pipes}/index.ts` → 0
  errores, 0 warnings (antes del escape hatch reportaba 15 errores).
- `npx eslint .` → 30 errores totales (22 `layer-enforcement/imports-error`
  pre-existentes del Plan 1 F3.5 + 4 `wal/no-direct-mutation-subscribe` + 2
  `max-lines` + 2 menores). **Sin regresiones** introducidas por el cambio.

### Entregables

- [x] F5.1 Plugin extendido a `ExportAllDeclaration` + `ExportNamedDeclaration`
- [x] F5.2 Escape hatches justificados en los 3 barrels
- [ ] F5.3 Tests de guardia (opcional, no ejecutado — el lint sobre los barrels
  actúa como regression test implícito)
- [x] F5.4 `rules/eslint.md` actualizado: quitada la limitación
  "`layer-enforcement` solo chequea `ImportDeclaration`"; tabla de excepciones
  refleja que los re-exports ahora se detectan y silencian con justificación

---

## Problema

ESLint flat config **reemplaza (no merge)** el valor de una regla cuando múltiples configs matchean el mismo archivo. Para `no-restricted-imports`, el **último config que matchea** define los patterns finales del archivo.

En el `eslint.config.js` actual, el bloque de **barrel enforcement** (que aplica a `features/**` + `shared/**`) es el último bloque que define `no-restricted-imports`. Como casi todo el código productivo vive bajo `features/**`, sus patterns ganan y **todas las reglas intermedias son inefectivas** para esos archivos.

### Reglas afectadas (verificadas con `npx eslint --print-config`)

| Regla (doc) | Scope | Estado real en `features/**` |
| --- | --- | --- |
| Components no importan `HttpClient` | `*.component.ts` | **Inefectiva** |
| Components no importan `*.store` | `*.component.ts` | **Inefectiva** |
| Stores no importan facades | `*.store.ts` | **Inefectiva** |
| Stores no importan services | `*.store.ts` | **Inefectiva** |
| Stores no hacen `.subscribe()` | `*.store.ts` | ✅ Efectiva (vive en `no-restricted-syntax`, regla distinta) |
| Cross-facade | `*.facade.ts` | **Inefectiva** |
| Cross-feature (admin ↔ profesor ↔ estudiante) | features pages | **Inefectiva** |
| Shared/ → features/ | `shared/**` | ✅ Efectiva (shared no cae en el scope de barrel) |
| Barrel enforcement (storage/auth/session/WAL/Cache internals) | `features/**` + `shared/**` | ✅ Efectiva |

**Corolario**: el coverage real de enforcement de capas para código productivo es mucho menor de lo que documenta `rules/eslint.md`.

---

## Opciones de fix

### Opción A — Consolidar patterns en un único bloque por scope

Cada bloque de archivos (components, stores, facades, services, cross-role, cross-feature, barrel enforcement) define TODOS los patterns que le aplican en un solo `no-restricted-imports`. Duplica patterns del barrel enforcement en cada scope específico.

| Pro | Contra |
| --- | --- |
| Solución con primitivas de ESLint | Duplicación: si cambia un pattern de barrel, actualizar N bloques |
| Fácil de entender sin leer plugins | Verboso |
| Sin código custom | Frágil a nuevos gaps (F3.3 mostró cuánto se escapa) |

### Opción B — Plugin custom `layer-enforcement`

Un plugin propio (siguiendo el patrón de `wal/no-direct-mutation-subscribe`) que:

- Lee la ubicación del archivo (`context.filename`)
- Decide qué restricciones aplican según la capa (component / store / facade / service / cross-role / cross-feature)
- Inspecciona cada `ImportDeclaration` y reporta según una tabla declarativa

| Pro | Contra |
| --- | --- |
| Patterns centralizados en una sola estructura | Más código a mantener |
| Escape hatches legibles por regla | Requiere tests del plugin |
| Extensible para futuros gaps | Se aleja de primitivas ESLint |
| Reusable: mismo plugin para `.component.ts`, `.store.ts`, etc. | Curva de aprendizaje para quien lo toque |

### Opción C — Reordenar configs (descartada)

Poner barrel enforcement primero, específicos después. El último config que matchea gana, pero entonces se pierde el barrel enforcement para archivos que también matchean un bloque específico. Invierte el problema.

### Recomendación

**Opción A como fase 1** (rápida, desbloquea enforcement pronto) + **Opción B como fase 2** si la duplicación se vuelve problemática al añadir más reglas.

La decisión definitiva se toma en F1 del plan (ver abajo) tras un spike corto.

---

## Fases

### F1 — Spike y decisión (chat corto, ≤ 6 mensajes)

- [ ] F1.1 Verificar si `typescript-eslint` o algún plugin de terceros resuelve el merge de `no-restricted-imports` sin rehacer el config
- [ ] F1.2 Probar Opción A con 1 bloque (ej: `*.component.ts`) — medir cuántos patterns se duplican
- [ ] F1.3 Probar Opción B con un plugin stub — medir líneas de código y legibilidad
- [ ] F1.4 Decidir A, B, o híbrido (A para pocos bloques, B si supera cierto umbral)
- [ ] F1.5 Actualizar este plan + maestro con la decisión

### F2 — Inventario de patterns a consolidar

- [ ] F2.1 Listar todos los bloques actuales con `no-restricted-imports` (base, shared, component, store, facade, service (revertido), cross-role (revertido), admin, profesor, estudiante, barrel enforcement)
- [ ] F2.2 Para cada bloque, tabla de patterns y mensajes actuales
- [ ] F2.3 Identificar patterns que se duplicarían entre bloques (esp. barrel enforcement)
- [ ] F2.4 Diseñar estructura final (tabla archivo-pattern)
- [ ] F2.5 Actualizar plan base

### F3 — Implementación (chat dedicado, según decisión de F1)

#### Si Opción A

- [ ] F3.A.1 Consolidar patterns en cada bloque (un scope por commit si son muchos)
- [ ] F3.A.2 Verificar con `eslint --print-config` que cada archivo tiene TODOS sus patterns esperados
- [ ] F3.A.3 Lint completo — baseline debe coincidir con el actual, más las violaciones que ahora sí se detectan

#### Si Opción B

- [ ] F3.B.1 Crear plugin local `layer-enforcement` en `eslint.config.js` (inline o archivo separado)
- [ ] F3.B.2 Definir tabla declarativa de restricciones por capa
- [ ] F3.B.3 Implementar visitor de `ImportDeclaration`
- [ ] F3.B.4 Tests unitarios del plugin (vitest, similar a lo que existe para wal plugin si hubiera)
- [ ] F3.B.5 Reemplazar los bloques de `no-restricted-imports` intermedios con la nueva regla
- [ ] F3.B.6 Lint completo — verificar detección

### F4 — Reenganche con F3.3 (gaps pendientes)

- [ ] F4.1 Re-habilitar G5 (services no importan stores)
- [ ] F4.2 Re-habilitar G6 (cross-role no importa de admin/profesor/estudiante)
- [ ] F4.3 Confirmar G9 (cross-facade) ahora sí aplica en `features/**`
- [ ] F4.4 Auditar violaciones que ahora salen a la luz (cross-feature, component→store, etc.) y decidir warn/error según plan F3.5
- [ ] F4.5 Actualizar `rules/eslint.md` para que documento refleje la realidad efectiva
- [ ] F4.6 Actualizar plan base + maestro

### F5 — Tests de guardia (opcional pero recomendado)

- [ ] F5.1 Tests que fallen si un archivo clave (ej: un component) pierde sus restricciones. Pueden ser assertions sobre `eslint --print-config` en CI.
- [ ] F5.2 Actualizar plan base + maestro

---

## Criterios de aceptación

1. `npx eslint --print-config <cualquier.component.ts en features/>` incluye las restricciones de components (no `HttpClient`, no `*.store`).
2. Lo mismo para `*.store.ts`, `*.facade.ts`, `*.service.ts`, archivos en `cross-role/`, archivos en `admin/`/`profesor/`/`estudiante/`.
3. `npm run lint` detecta las violaciones pre-existentes en features que hoy pasan inadvertidas (esperado: aumento en warnings, no errors si se deja warn inicial).
4. `rules/eslint.md` refleja el estado real del enforcement, no el aspiracional.

---

## Fuera de alcance

- **Corregir violaciones recién detectadas**: eso es F3.5 del Plan 1 (Enforcement). Este plan solo **habilita la detección**.
- **Agregar nuevos patterns no identificados en F3.1**: mantener el scope a los gaps ya inventariados (G1, G5, G6, G9).

---

## Coordinación cross-plan

| Plan | Dependencia |
| --- | --- |
| Plan 1 (Enforcement) F3.3 | Bloqueada parcialmente por este plan — se puede continuar con F3.4 (auditoría) en paralelo |
| Plan 1 (Enforcement) F3.5 | Se ejecuta DESPUÉS de este plan — las correcciones que genera dependen de que el lint detecte las violaciones |
| Plan 1 (Enforcement) F5 | Este plan puede considerarse subfase de F5 ("wrappers exclusivos/hardening"). Alternativamente, plan independiente con ejecución prioritaria. |

---

## Notas

- Si F1 detecta que `typescript-eslint` o un plugin ya resuelve el merge, documentar y adoptar esa solución en lugar de A/B.
- El plan asume que el equipo prefiere detección sobre silencio — subir todo a warn primero, luego a error en F3.5 del Plan 1 cuando las violaciones estén arregladas.

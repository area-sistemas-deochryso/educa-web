# xP50 F3a Cat B — core→shared service move

> Diseño para la Cat B de F3a en [xrepo-50](../../../../educa-coord/plans/xrepo/040-059/xrepo-50-fe-cohesion-coupling-refactor.md). Contract-only, sin pseudocódigo ni paths de implementación concretos en las fases.

## Problema

`@core` importa hoy de `@shared` en 6 puntos (el 7mo, el shim de `attendance/index.ts`, ya no existe — verificado contra el código actual, no contra el audit 213 que lo listaba). Esto viola el contrato de capas (`core ← features ← shared ← intranet-shared`, sin imports inversos) y bloquea que F1 (guardrails ESLint) llegue a cero suppressions.

Los 6 puntos, por causa raíz:

- Una interfaz de dominio (`HasId`) usada por la infra genérica de CRUD (store base + facade base) que está mal ubicada en `@shared` — es un contrato de tipo, no UI.
- Dos utilidades puras (extracción de pathname, resolución de versión de schema) usadas por un interceptor de `@core` — son helpers, no UI.
- Dos tipos de wire (`ApiResponse`, `PaginatedResponse`) usados por un servicio de permisos de `@core` — son shape de datos, no UI.
- Dos constantes de copy UI (mensaje de error genérico, detalle de error de refresh) usadas por la facade base de CRUD en `@core` para mostrar toasts — son las únicas dos entradas de un set más grande (`UI_SUMMARIES`, `UI_ADMIN_ERROR_DETAILS`) que sí es legítimamente `@shared` porque el resto de sus entradas (`scheduleConflict`, etc.) son específicas de features.

## Opciones

- **A — Mover cada ítem a su capa canónica según causa raíz** (interfaces/tipos → `@data`, utils → `@core/helpers`, subset genérico de copy → nueva ubicación en `@core`). Pros: resuelve la causa, no solo el síntoma; deja `@shared` con contenido genuinamente compartido. Contras: toca 4 puntos de destino distintos, más superficie de revisión.
- **B — Mover los 6 imports en bloque a `@core` (duplicar/reexportar desde ahí)** sin reclasificar por tipo. Pros: cambio mecánico, un solo destino. Contras: no resuelve la causa raíz (`HasId`/`ApiResponse` seguirían mal tipados como "core" cuando son contratos de datos genéricos también usados fuera de core); dejaría basura arquitectónica para una futura F5.
- **C — No mover nada; suprimir con eslint-disable permanente.** Pros: cero esfuerzo. Contras: contradice el done-when de F1 ("zero suppressions"); es la razón por la que Cat B existe como fase separada.

## Recomendación

**Opción A.** Es la que el propio audit 213 ya identificó por causa raíz (línea 65 del audit) y es consistente con cómo se resolvió Cat A (SwService movido a su capa canónica, no re-exportado). Evita dejar deuda para F4/F5.

## Decisiones

| Decisión | Elección | Por qué |
|---|---|---|
| Destino de `HasId` | `@data` | Es un contrato de forma de datos (tiene `id`), no una interfaz de UI. `@data` es la capa de tipos/modelos, consumida tanto por `@core` como por `@features`. |
| Destino de `ApiResponse`/`PaginatedResponse` | `@data` | Mismo razonamiento — son shapes de respuesta HTTP, no UI. |
| Destino de `extractPathname`/`getSchemaVersion` | `@core/helpers` | Ya son puras y solo las consume un interceptor de `@core`; no hay motivo para que vivan fuera. |
| Destino del subset de copy UI genérico | Nueva ubicación bajo `@core` (constantes genéricas de infra, separadas de las constantes ricas de `@shared`) | La facade base de CRUD es infraestructura genérica reutilizada por toda feature; no puede depender de `@shared` sin romper la capa, pero sí necesita 2 strings genéricos (no feature-specific). Se acepta duplicar esos 2 valores entre `@core` y `@shared` en vez de fusionar los sets — fusionar forzaría a `@shared` a depender de `@core` o viceversa para las entradas restantes, que sí son feature-specific. |
| Alcance de la copy UI movida | Solo las 2 entradas realmente consumidas por `@core` (mensaje de error genérico, detalle de refresh) | Mover el set completo (`UI_SUMMARIES`, `UI_ADMIN_ERROR_DETAILS`) violaría el principio de "menor superficie posible" — el resto de esas constantes son feature-specific y siguen viviendo en `@shared`. |

## Fases funcionales

### F3a-CatB-1 — Mover tipos y contratos de datos a `@data`
`depends_on: []`

**Qué logra**: `HasId`, `ApiResponse` y `PaginatedResponse` quedan definidos en `@data`, re-exportados donde `@shared` los siga necesitando (consumidores en `@features` no deben romperse). Los 3 imports de `@core` hacia `@shared` para estos símbolos desaparecen.

**Ordering rationale**: independiente del resto — es un movimiento de tipos puro sin dependencia de runtime.

**Non-obvious trap**: `HasId` y `ApiResponse`/`PaginatedResponse` son consumidos también por features vía `@shared` hoy — la migración debe preservar el import path público de `@shared` (re-export) hasta que F5 (consolidación) limpie los shims, igual que se hizo con el shim de `attendance` en su momento.

### F3a-CatB-2 — Mover utilidades del interceptor a `@core/helpers`
`depends_on: []`

**Qué logra**: `extractPathname` y `getSchemaVersion` quedan en `@core/helpers`. El import `@core → @shared` para estas dos utilidades desaparece.

**Ordering rationale**: independiente de F3a-CatB-1 y F3a-CatB-3 — es un movimiento de funciones puras aisladas, puede correr en paralelo.

### F3a-CatB-3 — Extraer subset genérico de copy UI a `@core`
`depends_on: []`

**Qué logra**: la facade base de CRUD deja de importar `UI_ADMIN_ERROR_DETAILS`/`UI_SUMMARIES` completos desde `@shared`; en su lugar consume un set reducido de constantes genéricas definido en `@core`. Los sets originales en `@shared` quedan intactos para el resto de sus consumidores en `@features`.

**Ordering rationale**: independiente del resto. Es el único de los tres que requiere una decisión de diseño explícita (dónde trazar la línea entre "genérico de infra" y "específico de feature"), ya resuelta arriba en la sección de Decisiones.

**Non-obvious trap**: si un futuro consumidor de `@core` necesita un mensaje que hoy vive solo en el set rico de `@shared`, la tentación va a ser "agregarlo al set genérico de `@core`" — eso reintroduce fragmentación. El criterio correcto es: si el mensaje es específico de una feature, esa feature lo consume directamente desde `@shared`, no a través de la facade base.

### F3a-CatB-4 — Remover suppressions de F1 correspondientes a estos 6 puntos
`depends_on: [F3a-CatB-1, F3a-CatB-2, F3a-CatB-3]`

**Qué logra**: las tagged debt markers de F1 para `core→shared` quedan en cero, cerrando el done-when de F3a completo (todas las Cat A + Cat B).

**Ordering rationale**: depende de que las 3 fases anteriores hayan movido cada símbolo — remover la suppression antes rompería el lint.

## Done-when criteria

- `ng lint` pasa con cero suppressions tagged a `core→shared` (verificable: búsqueda de las tags de F1 asociadas a estos 6 puntos, deben no existir).
- `ng build` (producción) sigue en verde tras cada fase.
- Ningún archivo bajo `core/` importa símbolos de `@shared` (verificable vía la regla ESLint de F1, que pasa de "suppressed" a "enforced" para este par de capas).
- Los consumidores actuales en `@features` que usaban `HasId`/`ApiResponse`/`PaginatedResponse`/`extractPathname`/`getSchemaVersion` vía `@shared` siguen resolviendo (re-exports intactos o imports actualizados, sin breaking changes de API pública).
- El set rico de `UI_SUMMARIES`/`UI_ADMIN_ERROR_DETAILS` en `@shared` no pierde ninguna entrada consumida por features.

## Dependencias

- Requiere F1 (guardrails ESLint) y F2 (barrel enforcement) ya cerrados — confirmado, ambos están ✅ en el maestro.
- No depende de F3b (email admin) ni de F4 (view unification) — tracks paralelos.
- Bloquea el cierre completo de F3a (Cat A ya cerrada en brief 366; con Cat B cerrada, F3a queda 100%).

## Fuera de alcance

- El shim `@shared → @intranet-shared` (16 violaciones documentadas, HIGH pero explícitamente diferido a F5).
- Cross-feature imports (30 violaciones, fuera de Cat B).
- Consolidación de email admin (F3b, track separado).
- Cualquier cambio de comportamiento visible al usuario — esto es reubicación de código, no refactor funcional.

## Reglas/invariantes aplicables

- Contrato de capas `core ← features ← shared ← intranet-shared` (audit 213, enforcement vía ESLint plugin de F1).
- Convención barrel-only (F2) — los símbolos movidos deben seguir siendo accesibles vía barrel en su nueva ubicación.
- `code-language.md` — naming en inglés para los nuevos archivos/símbolos en `@core`.
- ADR-0006 (plan-as-contract) — este plan no fija paths ni firmas concretas; el chat de ejecución las descubre contra el código vigente al momento de implementar.

### Worktree strategy

- **Isolation**: worktree.
- **Exclusive**: true — toca `@core`, `@data` y `@shared`, capas consumidas transversalmente; conflictúa con cualquier otro chat tocando esas carpetas.
- **Touches**: `src/app/core/**`, `src/app/shared/constants/**`, `src/app/shared/interfaces/**`, `src/app/shared/models/**`, `src/app/data/**` (destino de los tipos movidos).
- **Parallel risk**: none conocido — no hay otro chat activo en `running/` al momento de este diseño.

---

## TL;DR
- **Problema**: 6 imports `@core → @shared` violan el contrato de capas y bloquean cerrar F3a de xP50.
- **Recomiendo**: opción A — mover cada símbolo a su capa canónica (tipos a `@data`, utils a `@core/helpers`, subset de copy genérica a `@core`) · porque resuelve la causa raíz, no solo el síntoma, y es consistente con cómo se cerró Cat A.
- **Pendiente**: nada — diseño autocontenido, sin decisión externa pendiente.

Sin alternativas reales viables además de la descartada por causa raíz (B) y la que no cierra nada (C): ver sección Opciones.

**Alcance** (si se ejecuta la recomendada):
- toca: `@core` (store base, facade base, interceptor de schema-version, servicio de permisos), `@data` (nuevos tipos), `@shared` (constants/interfaces/models, con re-exports donde aplique).
- fuera: shim `@shared → @intranet-shared` (F5), cross-feature imports, F3b (email admin), F4 (view unification).

**Reglas que aplican**: contrato de capas (audit 213 + F1 ESLint), barrel-only (F2), `code-language.md`, ADR-0006.

**Siguiente paso**: `/execute`.

## Contract checklist

- [ ] `HasId` está definido en `@data`, ya no en `@shared/interfaces`.
- [ ] `ApiResponse` y `PaginatedResponse` están definidos en `@data`, ya no en `@shared/models`.
- [ ] `extractPathname` y `getSchemaVersion` están en `@core/helpers`, ya no en `@shared/constants`.
- [ ] La facade base de CRUD en `@core` ya no importa desde `@shared/constants`.
- [ ] `UI_SUMMARIES` y `UI_ADMIN_ERROR_DETAILS` en `@shared` conservan todas sus entradas actuales (no se eliminó ninguna usada por features).
- [ ] Ningún archivo bajo `src/app/core/` tiene un import cuya ruta resuelve a `@shared`.
- [ ] `ng lint` pasa sin las suppressions de F1 tagged a estos 6 puntos.
- [ ] `ng build` de producción pasa sin errores nuevos.

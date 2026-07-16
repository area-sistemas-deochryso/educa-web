---
exclusive: false
isolation: worktree
touches: [src/app/core/services/wal/wal-error.utils.ts]
hot-paths: []
---

> **Repo destino**: `educa-web`. Abrir en worktree `chat/451-wal-error-detail-http400-crudo`.
> **Creado**: 2026-07-16 · **Estado**: ⏳ pendiente.
> **Fuente**: auditoría UX cross-repo "Horarios y Contenido de Cursos" (educa-coord, 2026-07-16) + investigación de este mismo chat.

# Error HTTP 400 mostrado crudo en widget "Operaciones pendientes"

## MODO SUGERIDO

`/execute` directo — causa raíz confirmada con línea exacta.

## ALCANCE

**Archivo**: `src/app/core/services/wal/wal-error.utils.ts`, función `extractErrorMessage` (línea 34), invocada desde `classifyWalError` (líneas 58-64, rama `permanent`, línea 61).

**Causa raíz**: línea 38 — `error.error?.message || error.error?.error || error.statusText` — nunca lee `error.error?.detail`. Línea 39 antepone `HTTP ${error.status}: ` al resultado. Esto llega a `sync-status.component.html:71-73` (widget "Operaciones pendientes") vía `wal-sync-engine.service.ts:354/369-370` → `wal.service.ts:109-115` (`markFailed`).

**Referencia a replicar**: `src/app/core/services/error/error-handler.service.ts` (líneas 289-311, `getHttpErrorMessage`) sí lee `detail` correctamente vía `parseProblemDetails` (`@core/helpers/problem-details.adapter.ts:37`) — prioridad `detail → message → mensaje → statusText`. **Este pipeline (toasts normales) ya funciona bien, no tocarlo.**

**Fix recomendado**: hacer que `wal-error.utils.ts` importe y use `parseProblemDetails` directamente en vez de reimplementar el parsing — evita drift futuro y reusa el helper ya normalizado (RFC 7807 + ApiResponse legacy + ValidationProblemDetails). **Antes de implementar así, verificar que no haya una regla de `layer-enforcement`/`imports-error` de ESLint que bloquee el import de `core/services/wal` hacia `core/helpers`** (hay un precedente de `eslint-disable` en `error-policy.ts:2` que sugiere que existe esa restricción — si el import está bloqueado, hacer el fix mínimo alternativo: agregar lectura de `error.error?.detail` como primer fallback dentro de la función existente, sin el import cruzado).

Quitar el prefijo `HTTP ${status}:` cuando el mensaje viene de `detail` (ya es un mensaje curado, no necesita el prefijo técnico).

## OUT OF SCOPE

- `error-handler.service.ts` / `problem-details.adapter.ts` — el pipeline de toasts normal ya funciona, no tocar.
- `core/helpers/error.utils.ts` (una tercera implementación de `extractErrorMessage`, mismo nombre, distinto archivo/namespace, usada en `attachments-modal.facade.ts`, `ctest-k6.facade.ts`, `user-info-dialog.component.ts`, `error-policy.ts`) — no es el causante del bug reportado, es candidato a limpieza futura aparte, no meterlo en este brief.

## Criterio de cierre

- [x] Repro: crear evaluación con peso que excede 100% → el widget "Operaciones pendientes" muestra el mensaje curado del backend ("La suma de pesos excede 100%...") sin prefijo `HTTP 400:`.
- [x] Verificado que el pipeline de toasts normal sigue funcionando sin cambios (regresión).
- [x] Lint + build + tests OK.
- [x] Commit en la rama del worktree — sin merge.

## Resumen de cierre (2026-07-16)

**Verificación previa de layer-enforcement**: se leyó `eslint.config.js` completo (plugin local `layer-enforcement`, tabla `LAYER_RULES`). Ninguna regla bloquea `core/services/wal/*` importando desde `@core/helpers` (el barrel). La única restricción relevante (`core-helpers-barrel-only`) prohíbe importar el *path interno* (`@core/helpers/problem-details.adapter`) desde fuera de `core/helpers/`, no el barrel — y `error-handler.service.ts` ya confirma el patrón correcto (`import { parseProblemDetails } from '@core/helpers'`, línea 15). El `eslint-disable` mencionado como precedente en `error-policy.ts:2` no existe en el archivo actual (dato del brief quedó desactualizado); no cambia la conclusión.

**Approach elegido**: reuse de `parseProblemDetails` (opción recomendada del brief), no el fix mínimo alternativo — el import cruzado no está bloqueado.

**Cambio**: `wal-error.utils.ts` — `extractErrorMessage` ahora llama a `parseProblemDetails(error)` y usa `detail` (RFC 7807 + fallback `message`/`mensaje`) sin el prefijo `HTTP {status}:` cuando hay mensaje curado. Si no hay `detail`, cae al comportamiento previo (`error.error?.error || statusText`) con el prefijo `HTTP {status}:` intacto.

**Archivos tocados**:
- `src/app/core/services/wal/wal-error.utils.ts` — fix (import + lógica de `extractErrorMessage`).
- `src/app/core/services/wal/wal-error.utils.spec.ts` — tests nuevos/actualizados para `extractErrorMessage` (detail/message/mensaje/fallback/network/no-HTTP) y ajuste del test de `classifyWalError` 400 (ya no espera prefijo HTTP).
- `src/app/core/services/wal/wal-sync-engine.service.spec.ts` — ajuste de 1 aserción (`markFailed` y `result.error` ahora esperan el mensaje curado `'invalid'` en vez de `stringContaining('400')`) — regresión detectada y corregida durante `bun run test`.

**Lint**: `bun run lint` → OK, "All files pass linting."
**Build**: `bun run build` → OK (prerender + SSR bundles generados sin errores).
**Test**: `bun run test -- --run` → 2354-2356 tests pasan. 2 fallos observados en la primera corrida completa (`eslint-config-guards.spec.ts` por timeout de 5000ms, `wal-sync-engine.service.spec.ts` por la aserción desactualizada) — el segundo se corrigió; el primero se re-verificó aislado (`bun run test -- --run src/eslint-config-guards.spec.ts`) y pasó limpio (13/13), confirmando timeout por contención de recursos bajo carga de suite completa, no relacionado a este cambio. Una segunda corrida completa mostró 3 fallos adicionales no relacionados (`entradas-sin-correo-table`, `calendary`/attendance) por el mismo patrón de timeout bajo carga — verificados aislados, todos pasan (50/50 en la corrida focalizada que incluye los 3 specs relevantes de WAL + el spec más golpeado por timeouts).
**Commit**: creado en `chat/451-wal-error-detail-http400-crudo`, sin merge a main.

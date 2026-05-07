# 122 — FE: regla `takeUntilDestroyed` — refactor a `firstValueFrom`

> **Creado**: 2026-05-07 · **Cerrado**: 2026-05-07 · **Estado**: ✅ shipped local.
> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Modo**: `/design` → `/execute` → `/validate`.
> **Origen**: Task `tasks/wal-cache-audit-fixes.md` H5 (P3). Sub-chat 1 de 3 restantes del audit.

## Qué se quería

Resolver el hallazgo H5 del audit WAL+Cache: dos `subscribe()` sin `takeUntilDestroyed` en `wal-facade-helper.service.ts` (líneas 167 y 184). Auditoría detectada como rule violation, sin leak real (HTTP one-shots auto-completan).

## Decisión tomada (Opción C)

Refactor a `firstValueFrom` en lugar de eximir HTTP one-shots de la regla universal. Razón: la opción "eximir" introducía una excepción en la regla, deuda silenciosa que un dev futuro podía aplicar mal en streams continuos. La opción "refactor" deja la regla sin excepción y convierte fire-and-forget implícito en explícito (`.catch(() => { /* comentario */ })`).

Descartadas:
- **Opción A (eximir HTTP one-shots)**: cero código pero introducía excepción permanente.
- **Opción B (`take(1)`)**: ceremonia sin efecto en HTTP, no resuelve el problema de paradigma.

## Qué se hizo

### Refactor (5 callsites)

Todos en services/facades `providedIn: 'root'` sin `DestroyRef` natural:

1. `core/services/wal/wal-facade-helper.service.ts:158` (`executeServerConfirmed`) — método pasa a `async`, usa `firstValueFrom + try/catch`.
2. `core/services/wal/wal-facade-helper.service.ts:183` (`executeFallback`) — mismo patrón.
3. `core/services/auth/auth.service.ts:235` (`api.warmup()`) — fire-and-forget con `.catch(() => {})` + comentario.
4. `core/services/notifications/notifications.service.ts:113` (`api.getActivas()`) — `.then/.catch`.
5. `features/intranet/pages/admin/schedules/services/horarios-crud.facade.ts:264` (`api.importarHorarios`) — `.then/.catch`.

### Reglas

- `rules/code-style.md` — nueva sección "HTTP one-shots en services `providedIn: 'root'`" con ejemplos canónicos + razón. Regla 2 universal queda intacta sin excepción.
- `rules/crud-patterns.md` — anti-patrón #10 ampliado con la pauta para services root.

### Tests

- `horarios-crud.facade.spec.ts` — 2 tests del bloque `importarHorarios` migrados a `async/await + await Promise.resolve()` para esperar la microtask de `firstValueFrom`. Patrón válido para futuros refactores similares.

### Task

- `tasks/wal-cache-audit-fixes.md` H5 marcado ✅ con nota de la decisión y links a los 5 callsites tocados.

## Validación

- Lint: 0 errores propios (1 warning preexistente no relacionado).
- Vitest: **1934/1934 verde** (sin regresiones).
- TypeScript: limpio.

## Aprendizajes transferibles

1. **`subscribe()` desnudo en service `providedIn: 'root'` no es leak, pero rompe la regla universal**. Resolverlo con excepción documentada es deuda permanente; resolverlo con `firstValueFrom` deja la regla sin excepción y obliga a manejar errores explícitamente.

2. **El patrón `firstValueFrom + .then/.catch` mantiene firma `void`** en métodos públicos consumidos fire-and-forget — los callers no necesitan await ni cambios. Útil cuando refactorizar el contrato externo es scope creep.

3. **Tests sync que asertan después de un `subscribe()` con `of()` mock pasan a fallar al migrar a `firstValueFrom`** porque la resolución es vía microtask. Fix mecánico: marcar el test `async` y `await Promise.resolve()` antes de las assertions. No requiere `flushMicrotasks()` ni `fakeAsync` — Promise.resolve() basta.

4. **Fire-and-forget intencional debería tener `.catch(() => {})` con comentario explícito** ("best-effort", "telemetry"), no callback olvidado. Convierte una decisión tácita en explícita, lo que ayuda al code reviewer.

## Pendiente del task wal-cache-audit-fixes.md

- **P1 H7** — naming `WAL_CACHE_MAP` a camelCase (1 chat dedicado, riesgo medio-alto cross-facades).
- **P2 cleanup** — H2 (region duplicada en wal-facade-helper) + H3 (`console.table`) + H4 (separadores `=====`) + H6 (comentarios verbosos) + H10 (triple duplicación de patrones de módulo). 1 chat bajo riesgo.

## Findings menores ya cerrados (anotados aquí para auditoría)

El task también enumera findings de la 1ra ronda del WAL Integration Smoke. Estado real al 2026-05-07:

- **F-S04** ✅ resuelto (brief 089, cerrado 2026-05-04) — toast 4xx con mensaje específico.
- **F-S06** ✅ resuelto (brief 090, cerrado 2026-05-04) — cross-tab refetch.
- **F-S08** ✅ resuelto (brief 097, cerrado 2026-05-04) — banner REQUIRES_MIGRATION.

El task aún los lista como pendientes. Al ejecutar el sub-chat de P2 cleanup conviene actualizar también la sección "Findings menores 1ra ronda smoke" del task para reflejar este estado.

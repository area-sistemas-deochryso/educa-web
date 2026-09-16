# 689 — Audit Tests F1: INV-CONTRACT03 — casing de endpoint WAL

> **Repo destino**: `educa-web`
> **Plan**: [`audit-tests-frontend-2026-09-16.md`](../../plan/audit-tests-frontend-2026-09-16.md) (Fase F1)
> **Creado**: 2026-09-16 · **Estado**: ✅ listo para `/end` (hallazgo invertido — ver Resultado).
> **MODO SUGERIDO**: `/execute`
> **touches**: `src/app/core/services/wal/wal.service.ts`, `src/app/core/services/wal/wal.service.spec.ts`

## Origen

Hallazgo de `/audit` (2026-09-16) sobre la suite de tests frontend, categoría **Bug/Regla violada** — el hallazgo de mayor severidad del audit, tratado en fase propia por su impacto (contradice un invariante documentado) y por ser una unidad de trabajo aislada y rápida.

## Scope

1. `wal.service.spec.ts:69-94` tiene un test que afirma explícitamente "persists the endpoint preserving the original casing" — verifica que si la API llama a `wal.add()` con un endpoint en mayúsculas/mixed-case, se persiste tal cual.
2. Esto contradice **INV-CONTRACT03** (`.claude/rules/business-rules.md`): `WalEntry.endpoint` debe persistirse **siempre en lowercase**, normalizado por `WalService.add()` antes de guardar, para matchear las keys de `api-schema-versions.ts` (que están todas en lowercase). Un mismatch de casing produce un cache-miss invisible en el lookup de WAL — la entry existe pero nunca se encuentra.
3. Confirmado por grep sobre `core/services/wal/`: no existe ningún `.toLowerCase()` en la normalización de `endpoint` en ningún archivo del módulo. La normalización documentada en `business-rules.md`/`reference/optimistic-ui.md` nunca se implementó — el test simplemente documenta el bug actual en vez de protegerlo.
4. Fix:
   - Agregar `.toLowerCase()` sobre `endpoint` en `WalService.add()` antes de persistir la entry.
   - Corregir el test para esperar el endpoint normalizado en minúsculas; agregar/ajustar el caso mixed-case como input explícito (`'Api/Usuarios'` → se persiste como `'api/usuarios'`).
   - Revisar si algún consumer de `WalEntry.endpoint` (lookups contra `api-schema-versions.ts`, dedupe, coalescer) ya compensaba el bug con un `.toLowerCase()` propio en el call-site — si es así, decidir si ese `.toLowerCase()` defensivo se simplifica o se deja (redundante pero inofensivo).

## Pre-work

- Antes de tocar código, revisar con `git log -p -- src/app/core/services/wal/wal.service.ts` si "preserva casing" fue un cambio deliberado reciente que invalidó INV-CONTRACT03 sin actualizar la regla — si es así, esto puede ser una regresión ya en producción. Grep de call-sites de `wal.execute`/`wal.add` con endpoints mixed-case reales (no solo en tests) para dimensionar el impacto actual antes de asumir que es solo teórico.

## Out of scope

- El resto de gaps de cobertura de WAL (ver F5, `693-audit-tests-f5-infra-wal-integration-gaps.md`).
- No es un refactor de `WalService` — solo la normalización de `endpoint` y su test.

## Resultado (2026-09-16) — el pre-work invirtió el diagnóstico

El pre-work (`git log -p -- src/app/core/services/wal/wal.service.ts`) encontró la respuesta a la pregunta que el propio brief planteaba: **sí, "preserva casing" fue un cambio deliberado**, y por eso no se aplicó el fix original.

- Commit `4d44d790` (2026-05-09) agregó `WalService.normalizeEndpoint()` con `.toLowerCase()`, tal como pedía INV-CONTRACT03.
- Commit `8b2ccc85` (2026-05-13, *"fix (wal-lowercase error)"*) lo revirtió **4 días después**: lowercasear todo el path rompía `/api/sistema/usuarios/{rol}/{id}`, donde el backend compara `rol` case-sensitive (`IUsuarioRolStrategy.SoportaRol`, ej. `"Estudiante"`). El commit dejó un test de regresión explícito (`preserves casing in path segments that are case-sensitive in the backend`).
- El test que el audit marcó como "bug" (`persists the endpoint preserving the original casing`) **es ese test de regresión** — protege el fix real, no documenta un bug.
- Tracé el supuesto consumidor del casing (`api-schema-versions.ts` / `getSchemaVersion()`): normaliza con `.toLowerCase()` **internamente** antes de comparar, y solo lo llama `schema-version.interceptor.ts` sobre el path del request HTTP saliente — **nunca** lee `WalEntry.endpoint` desde el WAL/IndexedDB. No hay coalescer ni dedupe que compare `endpoint`. El único consumidor real es `wal-http.helper.ts`, que lo usa tal cual para reproducir la llamada — ahí es donde el casing del rol importa.
- Método real es `WalService.append()` (no `WalService.add()` — el brief/docs citaban un nombre que no existe en el código actual).

**Conclusión**: no había bug en `WalService` ni en su test — el bug estaba en la documentación (`INV-CONTRACT03` en `business-rules.md` + `.claude/rules/optimistic-ui.md`), que describía una normalización revertida hace 4 meses sin actualizar la regla. Confirmado con el usuario (`/go`, checkpoint de decisión) antes de tocar los `.claude/rules/*`.

**Acción tomada**:
- `wal.service.ts` / `wal.service.spec.ts`: **sin cambios** — están correctos.
- `.claude/rules/business-rules.md` — INV-CONTRACT03 reescrito: casing preservado a propósito, con la razón (commit `8b2ccc85`) y por qué el consumidor no lo necesita lowercased.
- `.claude/rules/optimistic-ui.md` — actualizado en el mismo sentido.
- `wal.service.spec.ts` corrido en la worktree (28/28 tests OK, sin tocar el archivo) — confirma que el comportamiento actual es el correcto.
- Pendiente fuera de este repo (no tocado, `one-repo-one-chat`): `educa-coord` tiene 2 referencias a `INV-CONTRACT03` (`plans/xrepo/040-059/xrepo-42-case-drift.md`, `.claude/chats/closed/283-coord-p42-f4-inv-contract-docs.md`) que podrían citar la misma versión desactualizada del invariante — candidato a brief de seguimiento en `educa-coord`.

## Criterio de cierre

- [x] Confirmado (vía git log) que "preserva casing" fue deliberado — commit `8b2ccc85`, con causa raíz documentada.
- [x] Ningún consumidor real depende del casing lowercased — `wal.service.ts`/spec quedan intactos.
- [x] `INV-CONTRACT03` corregido en `business-rules.md` + `.claude/rules/optimistic-ui.md`.
- [x] Tests OK (28/28 `wal.service.spec.ts`, sin tocar el archivo — build/lint no aplican, no se tocó TS).
- [x] Plan actualizado: F1 → ✅ (hallazgo invertido documentado).
- [x] Maestro actualizado.
- [ ] Seguimiento cross-repo (`educa-coord`) — no bloqueante, ver nota arriba.

## Tiempo real

~40 min (incluye pausa de confirmación con el usuario tras el pre-work).

# FE — Plan 1 Fase 5: Hardening de wrappers (barrel + lint)

> **Repo destino**: `educa-web` (main)
> **Estado**: ⏳ pendiente arrancar
> **Creado**: 2026-05-09 · **Modo sugerido**: `/audit` → `/execute` → `/validate`
> **Plan padre**: [`plan/enforcement-fase-5-wrappers.md`](../../plan/enforcement-fase-5-wrappers.md)
> **Origen**: promocionado desde `tasks/enforcement-reglas.md` el 2026-05-09 vía `/go`. F1-F4 del Plan 1 ya en producción; este chat cierra F5.

## CONTEXTO

Las fases 1-4 del Plan 1 (Enforcement de Reglas) ya corren en producción:

- **F1** — ESLint plugin `layer-enforcement` con `imports-error` / `imports-warn`. Bloquea cross-imports entre capas y APIs prohibidas (`localStorage`, `sessionStorage`, `console`, `HttpClient` directo en components/stores).
- **F2** — 101 tests de contrato sobre Auth, Storage, Permisos, WAL, Guards.
- **F3** — Tipos semánticos `const + type` en 13 dominios.
- **F4** — `.github/workflows/ci.yml` corre lint+build+test.

Lo pendiente: los wrappers existen y los lints prohíben bypass cross-capa, pero los **barrel exports** de las zonas críticas siguen exponiendo implementaciones internas. Un dev que importa `SessionStorageService` directo desde `@core/services/storage` actualmente compila — el lint solo lo bloquea si está fuera de `@core/services/storage/`. Cerrar el escape hatch significa que el barrel solo exponga la facade, así no hay forma de saltearla ni siquiera dentro de su propia carpeta.

## SCOPE

### IN — 3 zonas críticas con wrapper estable

| Módulo | Exportar públicamente | Mantener interno |
|---|---|---|
| `@core/services/storage/` | `StorageService` | `SessionStorageService`, `PreferencesStorageService`, `IndexedDBService`, demás impls |
| `@core/services/wal/` | `WalFacadeHelper`, `WalStatusStore` | `WalService`, `WalSyncEngine`, `WalDbService`, `WalSyncRecovery`, `WalLeaderService`, `WalCrossTabRefetchService`, etc. |
| `@core/services/session/` | `SessionCoordinatorService` | `SessionActivityService`, `SessionRefreshService` |

### OUT

- `@core/services/cache/` y `@core/services/auth/` — wrappers presentes pero el inventario de impls internas requiere revisión separada. Si el audit del paso 1 muestra que caben en el patrón con cambios triviales, se incluyen; si requieren refactor mayor del wrapper, quedan para sub-chat F5.2.
- Tipos semánticos pendientes (F3.1: `EstadoMatricula`, `MetodoPago`, `EstadoEstudiante`) — son F3 del plan, ya cerrada.
- Backend (`Educa.API/`) — esta fase es 100% FE.
- Migración de tests que mockean impls internas — solo si el cambio del barrel rompe específicamente esos mocks; refactor del enfoque de mocking queda para chat dedicado.

## ENFOQUE PROPUESTO

1. **Audit (`/audit`)**: para cada zona IN, listar `[archivo consumidor, símbolo importado, ¿wrapper público o interno?, acción]`. Comandos:

   ```bash
   grep -rn "from '@core/services/storage" src/app --include="*.ts"
   grep -rn "from '@core/services/wal" src/app --include="*.ts"
   grep -rn "from '@core/services/session" src/app --include="*.ts"
   ```

2. **Migrar consumidores (`/execute`)**: imports a impls internas → wrapper público. Si el wrapper no cubre el caso, agregarle el método (preferido) o documentar excepción con escape hatch (`// eslint-disable-next-line layer-enforcement/imports-error -- Razón: <invariante>`).

3. **Reducir barrel exports (`/execute`)**: cada `index.ts` solo re-exporta el wrapper público. Las impls quedan accesibles solo via path completo, no desde el barrel.

4. **Agregar regla ESLint (`/execute`)**: nueva entrada en `LAYER_RULES` que prohíba imports al path completo de impls internas desde fuera de su carpeta. Antes de editar, leer el API del plugin local para confirmar el shape del selector.

5. **Validar (`/validate`)**: `npm run lint` · `npx vitest run` · `ng build --configuration production`.

## VALIDACIÓN

- `npm run lint` — 0 errores.
- `npx vitest run` — toda la suite verde (baseline ~1934 tests).
- `ng build --configuration production` — sin errores.
- Smoke manual: confirmar que la app intranet sigue cargando, sesión persiste tras refresh (storage), WAL muta sin romperse (crear/editar un curso desde admin).

## ARCHIVOS ESPERADOS

- 3 `index.ts` reducidos (storage, wal, session).
- 0-15 archivos consumidores migrados a facade (depende del audit).
- 1 entrada nueva en `eslint.config.js` (3 reglas dentro de `LAYER_RULES`).
- 1 update a `rules/eslint.md` documentando la regla nueva.
- 1 update a `tasks/enforcement-reglas.md` marcando F5 ✅.

## RIESGOS

| Riesgo | Mitigación |
|---|---|
| Romper imports existentes al reducir barrel | Audit grep exhaustivo previo. Migrar consumidores antes de editar el `index.ts`. |
| Wrapper no cubre algún API interno | Agregar método al wrapper (preferido) o escape hatch con razón. |
| Tests mockean impls internas y rompen | Migrar mocks a la facade o documentar como excepción de test scope. |

## REVERSIBILIDAD

Si tras 1-2 semanas la regla nueva genera más fricción que valor, revertir el barrel y la regla. Tests y consumidores ya migrados se mantienen — el cambio incremental sigue siendo positivo.

## DEPENDENCIAS

- Ninguna externa. F1-F4 del Plan 1 cerradas. No requiere cambios BE.
- Compatible con cualquier estado del backlog (no toca `AsistenciaPersona`, `EmailNotificationService`, ni features en flight).

## REFERENCIAS

- [`plan/enforcement-fase-5-wrappers.md`](../../plan/enforcement-fase-5-wrappers.md) — plan completo.
- [`tasks/enforcement-reglas.md`](../../tasks/enforcement-reglas.md) — task padre con F1-F4.
- [`rules/eslint.md`](../../rules/eslint.md) — plugin `layer-enforcement` y escape hatch.
- [`rules/architecture.md`](../../rules/architecture.md) — capas y wrappers documentados.
- [`documentacion-subsistemas/wal-write-ahead-log.md`](../../documentacion-subsistemas/wal-write-ahead-log.md) — convención del wrapper WAL.

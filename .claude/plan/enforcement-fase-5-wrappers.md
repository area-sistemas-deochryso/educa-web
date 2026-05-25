# Plan 1 — Fase 5: Hardening de Wrappers (cerrar escape hatches)

> ⚠️ **Legacy plan (pre-ADR-0006).** This plan may contain implementation detail (file paths, DTOs, counts) that could be stale. Per [ADR-0006 D5](../../educa-coord/decisions/0006-plan-authoring-contract-not-blueprint.md), extract intent + decisions only — ignore concrete paths, signatures, and counts. Investigate current code before executing.

> **Estado**: ⏳ pendiente arrancar (promocionado desde `tasks/enforcement-reglas.md` el 2026-05-09 vía `/go`).
> **Plan padre**: Plan 1 — Enforcement de Reglas (F1-F3 ✅ · F4 parcial ✅ · F5 ⏳).
> **Prioridad**: 🟢 Media — deuda técnica con dueño claro, scope acotado.
> **Estimación**: ~2-3h, un solo chat.
> **Principio**: "Que los wrappers existentes sean el ÚNICO camino, no solo el camino sugerido."

---

## Contexto

Las fases anteriores del Plan 1 ya están en producción:

- **F1 (Lint de arquitectura)** ✅ — `eslint.config.js` con plugin local `layer-enforcement` (reglas `imports-error` / `imports-warn`). Cubre cross-imports entre capas + APIs prohibidas (`localStorage`, `sessionStorage`, `console`, `HttpClient` directo en components/stores). Ver `rules/eslint.md`.
- **F2 (Tests de contrato)** ✅ — 101 tests P1-P2 (Auth, Storage, Permisos, WAL, Guards, Utils).
- **F3 (Tipos semánticos)** ✅ — patrón `const + type` aplicado a 13 dominios (`AppUserRoleValue`, `NivelEducativo`, `AprobacionEstado`, etc.). Ver `rules/semantic-types.md`.
- **F4 (CI Pipeline)** ✅ parcial — `.github/workflows/ci.yml` corre `lint + build + test` en cada push/PR.

Lo pendiente de F5: los wrappers existen y los lints prohíben bypass cross-capa, pero **los barrel exports siguen exponiendo implementaciones internas**. Un dev que importa `SessionStorageService` directo desde `@core/services/storage` actualmente compila — el lint solo lo bloquea si está fuera de `@core/services/storage/`. Cerrar el escape hatch significa que el barrel solo exponga la facade, así no hay forma de saltearla ni siquiera dentro de su propia carpeta.

## Objetivo

Reducir los barrel exports (`index.ts`) de las 3 zonas críticas para que solo expongan el wrapper público, y agregar regla ESLint que prohíba imports directos a archivos internos.

## Scope

### IN — Zonas críticas con wrapper estable

| Módulo | Exportar públicamente | Mantener interno (no exportar del barrel) |
|---|---|---|
| `@core/services/storage/` | `StorageService` | `SessionStorageService`, `PreferencesStorageService`, `IndexedDBService`, demás impls |
| `@core/services/wal/` | `WalFacadeHelper`, `WalStatusStore` | `WalService`, `WalSyncEngine`, `WalDbService`, `WalSyncRecovery`, `WalLeaderService`, `WalCrossTabRefetchService`, etc. |
| `@core/services/session/` | `SessionCoordinatorService` | `SessionActivityService`, `SessionRefreshService` |

### OUT (no aplica esta fase)

- `@core/services/cache/` y `@core/services/auth/` — wrappers presentes pero el inventario de impls internas requiere revisión separada. Si tras audit caben en el patrón, se incluyen; si no, queda para F5.2.
- Migración de `tasks/` (`design-patterns-frontend.md`, `design-patterns-backend.md`) — son roadmaps incrementales separados, no entran.
- Backend (`Educa.API/`) — esta fase es 100% FE.

## Plan de ejecución (una sola fase, un solo chat)

### Paso 1 — Audit (`/audit`)

Leer cada `index.ts` y listar **qué se exporta hoy**. Cruzar con grep de imports reales en `src/app/`:

```bash
# Para cada wrapper, ver qué se importa fuera de su propia carpeta
grep -rn "from '@core/services/storage'" src/app --include="*.ts"
grep -rn "from '@core/services/wal'" src/app --include="*.ts"
grep -rn "from '@core/services/session'" src/app --include="*.ts"
```

Producir tabla `[archivo, símbolo importado, ¿es wrapper público o interno?, acción]`. Acciones posibles:

| Caso | Acción |
|---|---|
| Importa el wrapper público (`StorageService`, `WalFacadeHelper`, etc.) | OK, no cambiar |
| Importa una impl interna (ej: `SessionStorageService`) | Migrar a wrapper o documentar excepción |
| Importa una impl interna porque el wrapper no expone esa función | Decidir: agregar al wrapper o dejar el import directo (debería ser raro) |

### Paso 2 — Migrar consumidores (`/execute`)

Para cada import de impl interna fuera de su carpeta, migrar a wrapper público. Si el wrapper no cubre el caso, agregar el método (preferido) o dejar como excepción documentada con `// eslint-disable-next-line ... -- Razón: <invariante>`.

### Paso 3 — Reducir exports del barrel (`/execute`)

Reemplazar el `index.ts` de cada zona crítica para que solo re-exporte el wrapper público. Las impls quedan importables solo via path completo (`@core/services/storage/session-storage.service.ts`), nunca desde `@core/services/storage`.

### Paso 4 — Agregar regla ESLint (`/execute`)

En `eslint.config.js`, agregar entradas en `LAYER_RULES` (plugin `layer-enforcement`) que prohíban imports al path completo de impls internas desde fuera de su carpeta:

```js
{
  selector: "ImportDeclaration[source.value=/^@core\\/services\\/storage\\/(?!index|storage\\.service$).*/]",
  scope: { except: ["**/core/services/storage/**"] },
  message: "Importar StorageService desde @core/services/storage. Las impls internas no son API pública."
}
```

(El detalle exacto del selector depende del API del plugin local — confirmar leyendo `eslint-plugin-layer-enforcement` antes de editar.)

### Paso 5 — Validar (`/validate`)

```bash
npm run lint   # Sin errores
npx vitest run # Suite verde (baseline ~1934)
ng build --configuration production  # Sin errores
```

## Archivos a tocar (estimación)

- 3 barrel `index.ts` (storage, wal, session)
- 0-15 archivos consumidores migrados a facade (depende del audit)
- 1 entrada nueva en `eslint.config.js` con 3 reglas
- 0 tests nuevos (la suite existente cubre — F2 ya tiene 50+ tests sobre estos wrappers)
- 1 actualización a `rules/eslint.md` documentando la regla nueva

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Romper imports existentes al reducir el barrel | Audit grep exhaustivo antes de editar el `index.ts`. Migrar consumidores primero. |
| Wrapper no cubre 100% del API interno | Documentar excepción puntual con escape hatch + `-- Razón:` |
| Tests fallan porque mockean impls internas | Migrar mocks a la facade o documentar como excepción de test |

## Checklist final

```
[ ] Audit completado (tabla [archivo, símbolo, acción])
[ ] Consumidores migrados a wrapper público
[ ] Barrel exports reducidos: storage/index.ts, wal/index.ts, session/index.ts
[ ] Regla ESLint agregada en LAYER_RULES (3 entradas)
[ ] rules/eslint.md actualizado documentando la regla nueva
[ ] npm run lint sin errores
[ ] npx vitest run verde
[ ] ng build --configuration production sin errores
[ ] Commit semantic con scope `core/wrappers` + reseña en `tasks/enforcement-reglas.md` (F5 ✅)
```

## Reversibilidad

Si la regla nueva descubre que un consumidor legítimo necesita una impl interna que no encaja en el wrapper, dos opciones:

1. **Agregar el método al wrapper** (preferido — el wrapper crece con casos reales).
2. **Documentar excepción con escape hatch**: `// eslint-disable-next-line layer-enforcement/imports-error -- Razón: <caso real>`.

Si tras 1-2 semanas la regla genera más fricción que valor, revertir el barrel y la regla. Tests y consumidores migrados se mantienen — el cambio incremental sigue siendo positivo.

## Referencias cruzadas

- `tasks/enforcement-reglas.md` — task de origen, contiene F1-F4 hechas.
- `rules/eslint.md` — convenciones del plugin `layer-enforcement` y escape hatch.
- `rules/architecture.md` — capas y wrappers documentados.
- `documentacion-subsistemas/wal-write-ahead-log.md` — convención del wrapper WAL.

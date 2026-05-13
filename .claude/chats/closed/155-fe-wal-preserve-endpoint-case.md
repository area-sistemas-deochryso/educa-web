# Fix WAL — preservar casing del endpoint persistido

> **Repo destino**: `educa-web` (main) — FE only.
> **Creado**: 2026-05-13 · **Estado**: ⏳ pendiente arrancar.
> **Modo sugerido**: `/execute` (cambio quirúrgico, diseño cerrado en investigación previa) → `/validate`.

## Contexto

Investigación previa (este chat): editar un Estudiante en `/intranet/admin/usuarios` (cambiar `correoApoderado`) responde `400 ROL_INVALIDO`. La URL real enviada al server es `/api/sistema/usuarios/**estudiante**/240` (lowercase), pero el BE compara case-sensitive contra `Roles.Estudiante = "Estudiante"` ([EstudianteStrategy.cs:49](../../../Educa.API/Educa.API/Services/Usuarios/Strategies/EstudianteStrategy.cs#L49)) y ningún strategy matchea → `BusinessRuleException("ROL_INVALIDO")`.

**Causa raíz**: `WalService.normalizeEndpoint` lowercases el path entero antes de persistir la entry en IndexedDB ([wal.service.ts:30-34](../../src/app/core/services/wal/wal.service.ts#L30-L34)). El sync engine ejecuta la request real con `entry.endpoint` ya lowercase ([wal-sync-engine.service.ts:275](../../src/app/core/services/wal/wal-sync-engine.service.ts#L275) → `sendWalEntryRequest` → `http.put(entry.endpoint, ...)`).

**Por qué se introdujo** (Plan 42 F2-FE.3 / INV-CONTRACT03): para matchear `api-schema-versions.ts` que también normaliza con `.toLowerCase()`.

**Por qué la normalización es innecesaria en este nivel**: `getSchemaVersion` ya hace `path.toLowerCase()` internamente al hacer el lookup ([api-schema-versions.ts:96](../../src/app/shared/constants/api-schema-versions.ts#L96)). El WAL no necesita pre-normalizar el endpoint persistido. La normalización en storage rompe paths con segmentos case-sensitive como `{rol}`.

**Único endpoint afectado hoy**: `/api/sistema/usuarios/{rol}/{id}` y `/api/sistema/usuarios/{rol}/{id}/estado`. Los demás endpoints WAL son alfanuméricos sin segmentos case-sensitive embebidos.

**Probablemente afecta a TODOS los roles, no solo Estudiante** — el listado paginado del BE devuelve `Rol = Roles.Estudiante/Profesor/Apoderado/Director/...` Pascal, y el WAL los lowercases todos al persistir.

## Objetivo

Editar/togglear cualquier usuario desde `/intranet/admin/usuarios` debe llegar al BE con el rol Pascal preservado.

## Plan de cambios

### 1. `src/app/core/services/wal/wal.service.ts`

- **Eliminar** `WalService.normalizeEndpoint` (era passthrough con un solo job: lowercase, que ahora se quita).
- En el `append` ([wal.service.ts:66](../../src/app/core/services/wal/wal.service.ts#L66)) reemplazar `endpoint: WalService.normalizeEndpoint(config.endpoint)` por `endpoint: config.endpoint`.
- Actualizar el JSDoc de la región "Endpoint Normalization" (eliminar o reescribir explicando que el path se preserva tal cual).

### 2. `src/app/core/services/wal/wal.service.spec.ts`

- Eliminar/actualizar el describe `normalizeEndpoint (static)` — los tests vigentes asertan `toLowerCase()` que ya no aplica.
- Actualizar `wal.service.spec.ts:63` y `:78` que asertan `entry.endpoint === '/api/sistema/usuarios/42'` lowercase — si los tests fuente pasan paths capitalizados, ajustar el esperado.
- Agregar test nuevo: "preserva casing del path al persistir" con un path que contenga un segmento mixed-case (ej: `/api/sistema/usuarios/Estudiante/240`).

### 3. Verificación de consumidores de `entry.endpoint`

Confirmado en investigación que los 3 consumidores son safe sin el lowercase:
- `wal-http.helper.ts:12-18` — usa el path para HTTP request real → **necesita Pascal**.
- `wal-cache-invalidator.service.ts:25` — `extractPatternsFromEndpoint` extrae `/api/{first-segment}` que ya es lowercase por convención de routes ASP.NET, no se ve afectado.
- `api-schema-versions.ts:96` — `getSchemaVersion` ya normaliza con `path.toLowerCase()` en su propio lookup.

## Pre-work obligatorio

- Confirmar con grep que no hay otros sitios donde `entry.endpoint` se asuma lowercase:
  ```
  grep -rn "entry\.endpoint\|wal.*endpoint" src/ --include="*.ts"
  ```
- Verificar que ningún consumer de `WalService.normalizeEndpoint` existe fuera del propio service.

## Validación

| Caso | Esperado |
|---|---|
| Editar Estudiante: cambiar `correoApoderado` | 200 OK, response `Usuario actualizado exitosamente` |
| Editar Profesor: cambiar `correo` | 200 OK |
| Editar Director: cambiar `correo` | 200 OK |
| Toggle Estudiante activo→inactivo | 200 OK, registro queda inactivo en BD |
| Replay tras reload (entry pendiente en IndexedDB) | Path con casing original preservado, request exitosa |
| `getSchemaVersion('/api/sistema/usuarios/Estudiante/123')` | Sigue devolviendo `1` (lookup case-insensitive interno) |

### Tests

- `npm test` → todos los specs WAL verdes.
- Smoke manual en `npm run start` editando un Estudiante desde `/intranet/admin/usuarios` con DevTools Network abierto: verificar que la Request URL del PUT lleva `/Estudiante/` Pascal.

## Riesgos

- **Entries pendientes en IndexedDB de usuarios actuales**: si algún usuario tiene una entry WAL ya persistida con endpoint lowercase pre-fix, el replay seguirá fallando hasta que IndexedDB se limpie. Probablemente ninguno tiene entries pendientes (es un bug nuevo del editar usuarios), pero documentar en el commit message. Workaround manual: borrar IndexedDB desde DevTools si se reproduce.
- **Otros endpoints con segmentos case-sensitive ocultos**: si en el futuro se agrega un endpoint con un parámetro case-sensitive en el path, ya funciona out-of-the-box.

## Commit sugerido

```
fix(wal): preserve endpoint casing in persisted entries

normalizeEndpoint lowercased the entire path when persisting entries to
IndexedDB to match api-schema-versions.ts lookup keys. The sync engine
then replayed the lowercased path on the real HTTP request, which broke
endpoints with case-sensitive segments (notably /api/sistema/usuarios/{rol}/{id}
where the BE compares rol against "Estudiante"/"Profesor"/... case-sensitive).

getSchemaVersion already lowercases the path internally for its own lookup,
so the storage-level normalization was redundant and harmful. Remove
normalizeEndpoint and persist the endpoint as-is.

Fixes ROL_INVALIDO when editing any user from /intranet/admin/usuarios.
```

## Out of scope

- Cambios en BE (`SoportaRol` queda case-sensitive — es el contrato correcto).
- Refactor del sync engine para usar `cb.http$` registrado en vez de `sendWalEntryRequest`. Tema aparte, no es lo que rompe esto.
- Cleanup de entries WAL stale pre-fix. Si aparece un usuario afectado, doc manual: `DevTools → Application → IndexedDB → educa-wal → clear`.

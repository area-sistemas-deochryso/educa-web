# 130 · Auditoría BE↔FE shape mismatch + lint custom

> **Creado**: 2026-05-08 · **Estado**: ⏳ pendiente arrancar · **Repo**: `educa-web` (main) — investigación cruza BE
> **Origen**: Bug en `/intranet/admin/monitoreo/correos/domain-pauses` — `t.filter is not a function`. Fix puntual en commit `bfa96f0` (`email-domain-pause.service.ts` desenvolvía `PaginatedResult` mal). El usuario reporta que **es estándar del stack**, así que el fix puntual no escala — hay que mapear todos los casos y prevenirlos con lint.

## Modo sugerido

`/investigate → /design → /execute`. La investigación es lo que da forma al lint — sin saber qué patrones reales viven en el repo, el lint queda genérico y ruidoso.

## Síntoma del bug original

- BE devuelve `ApiResponse<PaginatedResult<T>>` → `{ success, data: { data: T[], page, pageSize, total } }`.
- `apiResponseInterceptor` (`core/interceptors/api-response/`) desenvuelve **una sola capa** (`success`/`data`) y deja el `PaginatedResult` entero como body.
- El service FE tipaba la respuesta como `T[]` (array plano) y mandaba el objeto al store.
- El facade hacía `items().filter(...)` sobre `{ data, page, pageSize, total }` → `TypeError: filter is not a function`.

El interceptor está bien, el BE está bien (`ApiResponse<PaginatedResult<T>>` es el patrón documentado en `rules/pagination.md` "Variante A"). El error es del **service FE** que no hace `.pipe(map(res => res.data))` cuando el endpoint pagina.

## Objetivo del chat

1. **Mapear** todos los services FE que hablan con endpoints BE que devuelven `PaginatedResult<T>` (o cualquier wrapper `{ data, ... }`), y verificar que el FE desenvuelva correctamente.
2. **Diseñar y escribir un ESLint rule custom** que detecte el patrón anti-pattern: `http.get<T[]>(...)` cuando el endpoint BE responde `PaginatedResult<T>`.
3. **Reportar** los bugs latentes encontrados en la auditoría como tasks o briefs derivados (no fixearlos en este chat — scope = audit + lint).

## Contexto técnico clave

### Patrón estándar del proyecto

| Capa | Shape |
|------|-------|
| BE controller | `return Ok(ApiResponse<PaginatedResult<T>>.Ok(result));` |
| HTTP body crudo | `{ success: true, data: { data: [...], page, pageSize, total } }` |
| Tras `apiResponseInterceptor` | `{ data: [...], page, pageSize, total }` (PaginatedResult) |
| Lo que el service FE debe devolver | `T[]` (extraído de `.data`) **o** `PaginatedResult<T>` completo si la UI muestra el total |

Convivencia documentada en `rules/pagination.md` (variante A wrapper, variante B `/count` separado, fallback client-side).

### Tipos involucrados

- `PaginatedResult<T>` definido en `core/services/facades/base-crud.facade.types.ts:28`.
- BE clase: `Educa.API/.../PaginatedResult.cs` (chequear ruta exacta).
- `ApiResponse<T>` BE: `{ success, data, message }`.

### Convenciones existentes

- `BaseCrudFacade` (`core/services/facades/base-crud.facade.ts`) consume `PaginatedResult<T>` directo en su `fetchItems()` abstracto (`line 466`). Los facades que extienden BaseCrudFacade probablemente están bien — el problema vive en services manuales.
- Hay un comentario en MEMORY (`feedback_api_response_unwrap.md`): "Interceptor auto-unwraps; services use `get<T>()` NOT `get<ApiResponse<T>>()`". El feedback es correcto pero **no cubre el segundo wrapper** (PaginatedResult).

## Plan de trabajo (3 fases)

### F1 · Investigate — mapeo BE↔FE (read-only)

Producir una tabla de todos los endpoints BE que devuelven `PaginatedResult<T>` y, para cada uno, identificar el service FE consumidor + verificar que desenvuelva bien.

**Pasos**:

1. **BE**: grep `PaginatedResult<` en `Educa.API/Controllers/` y `Educa.API/Services/`. Listar endpoints (ruta + DTO interno).

   ```
   grep -rn "PaginatedResult<" Educa.API/Educa.API/Controllers/
   ```

2. **FE**: para cada endpoint BE encontrado, buscar el service consumidor:
   - `grep -rn "<ruta>" educa-web/src/app/`.
   - Inspeccionar el `http.get<...>` correspondiente: ¿está tipado como `T[]`, como `PaginatedResult<T>`, o como `unknown`?
   - ¿Hace `.pipe(map(...))` para extraer `.data`?

3. **Producir tabla** en el brief de cierre con columnas:
   `endpoint | controller | DTO interno | service FE | tipo declarado en .get<...> | unwrap correcto | bug latente sí/no`.

4. **Buckets esperados**:
   - **OK**: usa `BaseCrudFacade` o ya hace `map(res => res.data)`.
   - **Bug latente**: tipado plano `T[]` pero el body real es `PaginatedResult<T>`. Mismo síntoma que `domain-pauses` esperando a manifestarse.
   - **Falsos positivos**: endpoints que SÍ devuelven `T[]` plano (no paginan).

5. Salida F1: lista priorizada de bugs latentes + tabla completa para alimentar el lint del F2.

### F2 · Design + Execute — ESLint rule custom

Escribir una regla en `eslint-plugin-educaweb/` (o el plugin local existente — chequear `eslint.config.js`, ya hay un plugin `layer-enforcement` y otro `structure` y `wal`) que detecte el anti-pattern.

**Heurísticas posibles** (a discutir en F2 design antes de elegir):

- **H1 — naming-based**: si `http.get<X[]>(url)` y `url` matchea regex de endpoints paginados (`/api/sistema/email-outbox/...`, `/api/admin/...`, etc.), warn.
  - Pro: simple. Contra: depende de convención de URLs, frágil.

- **H2 — shape-based con manifest**: mantener un JSON `paginated-endpoints.json` (lista de endpoints BE que devuelven `PaginatedResult`), generado por un script que parsea los controllers C#. La regla compara la URL del `http.get` contra el manifest y falla si el tipo declarado es `T[]` en lugar de `PaginatedResult<T>` (o si no hay `.pipe(map(res => res.data))`).
  - Pro: 0 falsos positivos. Contra: requiere mantener el manifest sincronizado (cron en hook de pre-commit BE).

- **H3 — type-aware con TypeScript Compiler API**: la regla resuelve el tipo real del response usando el tsserver y verifica que coincida con el shape esperado del endpoint.
  - Pro: detecta también casos donde el service usa `unknown` y mete un cast. Contra: tipo-aware lint es lento y complejo.

- **H4 — runtime guard en helper compartido**: agregar `httpGetPaginated<T>(url)` en `BaseHttpService` que ya hace el `.pipe(map(res => res.data))`. La regla obliga a usar este helper en lugar de `this.http.get<T[]>` cuando el endpoint pagina. Convertir el resto de la auditoría F1 a usar el helper.
  - Pro: ataca el problema de raíz, simplifica los services. Contra: requiere refactor masivo.

**Recomendación tentativa**: H4 + lint que prohíbe `http.get<X[]>(...)` en archivos `*.service.ts` cuando el path matchea un endpoint paginado conocido. El manifest se mantiene chico (≤30 endpoints).

**Decisión real en F2 design**, no asumir.

**Implementación del lint** (ya existen 3 plugins locales en `eslint.config.js`):

- `layer-enforcement` (capas FE)
- `structure` (`no-deep-relative-imports`, `no-repeated-blocks`, `no-compact-trivial-setter`)
- `wal` (`no-direct-mutation-subscribe`)

Agregar el nuevo plugin `api-shape` con la regla `unwrap-paginated`. Seguir el patrón de los 3 plugins existentes (no traerlos de npm).

### F3 · Reportar bugs latentes

- Bugs encontrados en F1 → tasks individuales en `chats/tasks/` o briefs en `chats/open/` agrupados por subsistema (FE-only, max 3 endpoints por brief).
- **No fixear en este chat** — el scope es audit + infra preventiva. Los fixes van en chats hijos.

## Criterios de éxito al cerrar

- [ ] Tabla completa de endpoints BE paginados ↔ services FE consumidores, con columna "bug latente sí/no".
- [ ] Lista de bugs latentes priorizados (URLs admin con tráfico real primero).
- [ ] ESLint rule custom funcionando en `eslint.config.js` (ej: `npm run lint` la ejecuta y reporta).
- [ ] La regla pasa en limpio o con N warnings esperados (los bugs latentes ya identificados).
- [ ] Doc actualizado: agregar sección a `rules/pagination.md` apuntando a la regla y al manifest.
- [ ] Briefs hijos creados para los fixes (no commiteados acá).

## Lo que NO entra en este chat

- Fixear los bugs latentes encontrados (van a briefs hijos).
- Refactorizar services que usan BaseCrudFacade (esos están bien).
- Tocar BE — el patrón `ApiResponse<PaginatedResult<T>>` es estándar correcto.
- Migrar `httpGetPaginated` a todos los services (eso es F4 si la decisión va a H4).

## Pistas para arrancar rápido

- Commit del fix puntual: `bfa96f0` en `educa-web/main`.
- Archivo modificado: `src/app/features/intranet/pages/admin/email-outbox/services/email-domain-pause.service.ts`.
- Memoria relevante: `feedback_api_response_unwrap.md` (necesita updatearse al cerrar este chat para mencionar el doble unwrap).
- Plugins lint existentes: ver `eslint.config.js` raíz del proyecto, sección `plugins` y `rules`.
- BE controller del bug: `Educa.API/Controllers/Sistema/EmailQuarantineController.cs:101`.

## Riesgos

- **R1 — Manifest desincronizado**: si el lint depende de un JSON mantenido a mano, se queda viejo. Mitigación: script BE que regenera el manifest desde los controllers C# (parsing simple del retorno `ApiResponse<PaginatedResult<...>>`).
- **R2 — Falsos positivos**: endpoints que devuelven `T[]` plano legítimamente disparan la regla. Mitigación: heurística H4 con helper explícito.
- **R3 — Scope creep**: la auditoría descubre bugs cross-subsistema y tienta fixearlos acá. Mitigación: criterio de cierre estricto = audit + lint, fixes en briefs hijos.

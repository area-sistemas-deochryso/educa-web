> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Validación prod**: ✅ verificada 2026-04-27 — hook popula EO_CorrelationId en correos con request HTTP autenticada (fila 3531 confirmada). Webhook CrossChex queda como deuda separada.
> **Plan**: 32 · **Chat**: 2 · **Fase**: BE · **Estado**: ⏳ pendiente arrancar.

---

# Plan 32 Chat 2 BE — `EmailOutbox` gana `EO_CorrelationId`

## PLAN FILE

Plan completo y dedicado (no inline en maestro):

- `../../educa-web/.claude/plan/correlation-id-links.md` — sección **"Chat 2 BE — EmailOutbox gana `EO_CorrelationId` (precondición de Chat 3)"**.
- Maestro: `../../educa-web/.claude/plan/maestro.md` — fila **Plan 32** en el inventario + bullets de Notas bajo la cola top 3.
- Reglas de negocio aplicables: `../../educa-web/.claude/rules/business-rules.md` §16 (Reportes de Usuario) + `INV-S07` (fire-and-forget) + §18 (Correos Salientes). Reglas de correos: `../../educa-web/.claude/rules/backend.md` sección "Envío de Correos — Outbox Obligatorio".

## OBJETIVO

Agregar la columna `EO_CorrelationId` a `EmailOutbox` (**ya creada en BD de pruebas por el usuario** — el chat arranca con la columna existente) y cablear `EmailOutboxService.EnqueueAsync` para que persista el id de la request actual desde `CorrelationIdMiddleware`. Es **precondición del Chat 3 BE** que agrega el endpoint unificado `GET /api/sistema/correlation/{id}` cruzando 4 fuentes.

Con este chat cerrado, cada correo nuevo encolado desde un path request-driven queda trazable hasta la request que lo originó. Los correos del `EmailOutboxWorker` en retry preservan el id original (no se sobrescribe). Los correos sin request en curso (background jobs, worker retries a nivel infra, health checks) quedan con `null` — aceptable.

## PRE-WORK OBLIGATORIO

### 1. Columna ya existe en BD — verificar

El ALTER TABLE ya se ejecutó en la BD de pruebas por el usuario el 2026-04-24 durante el /design. **No volver a ejecutar**. Solo confirmar con un SELECT de esquema:

```sql
SELECT c.name AS ColumnaName, t.name AS TipoDato, c.max_length, c.is_nullable
FROM sys.columns c
JOIN sys.tables tab ON c.object_id = tab.object_id
JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE tab.name = 'EmailOutbox' AND c.name = 'EO_CorrelationId';
```

Resultado esperado: `EO_CorrelationId | nvarchar | 72 | 1` (max_length 72 = 36 chars × 2 bytes NVARCHAR, is_nullable = 1).

Si NO devuelve fila, ejecutar:

```sql
ALTER TABLE EmailOutbox ADD EO_CorrelationId NVARCHAR(36) NULL;
```

Y avisar al usuario que la columna no estaba.

### 2. Identificar la key exacta que usa `CorrelationIdMiddleware`

Antes de escribir el hook, **leer `Middleware/CorrelationIdMiddleware.cs`** para confirmar la key con la que guarda el id en `HttpContext.Items`. Puede ser:

- `"CorrelationId"` (string literal)
- `"X-Correlation-Id"` (header name)
- `AppConstants.CorrelationIdKey` (constante)
- O setea `HttpContext.TraceIdentifier` en vez de `Items`

El hook tiene que usar la misma key que el middleware — inventar una key distinta rompe silenciosamente.

Grep sugerido:

```
grep -r "CorrelationId" Educa.API/Middleware/
grep -r "HttpContext.Items\[" Educa.API/ --include="*.cs"
```

### 3. Inventariar paths de enqueue existentes

Listar los callers de `IEmailOutboxService.EnqueueAsync` para confirmar cuáles están en request context y cuáles no:

```
grep -rn "EnqueueAsync" Educa.API/Services/ Educa.API/Controllers/ --include="*.cs"
```

Paths esperados en request context (tendrán `HttpContext`):

- `AsistenciaService` (correo de marcación en tiempo real)
- `AsistenciaAdminService` (correo de corrección — INV-AD05)
- `ReporteUsuarioService` (notificación a directores — INV-RU08)
- Notificaciones admin de eventos/avisos

Paths esperados **sin** request context (quedan con `null`):

- `EmailOutboxWorker` al reenviar un correo existente (no crea nueva fila, actualiza la existente — no aplica EnqueueAsync)
- Cualquier background service / Hangfire job que encole

## ALCANCE

Archivos a crear/modificar:

| Archivo | Líneas estimadas | Acción |
|---------|------------------|--------|
| `Models/Sistema/EmailOutbox.cs` | +3-5 | Agregar propiedad `EO_CorrelationId` (string?) con `[Column("EO_CorrelationId")]` + `[StringLength(36)]` |
| `Services/Notifications/EmailOutboxService.cs` o partial nuevo `EmailOutboxService.Enqueue.cs` | +10-20 | Hook en `EnqueueAsync`: resolver id desde `IHttpContextAccessor.HttpContext?.Items[<key>]` y asignar a `entry.EO_CorrelationId`. Si el service ya está cerca de 300 líneas, crear partial `.Enqueue.cs` siguiendo el patrón del Plan 29 |
| Inyección `IHttpContextAccessor` | +1-2 | Si no está ya inyectado en `EmailOutboxService`, agregarlo. Registrar en DI si hace falta (`builder.Services.AddHttpContextAccessor()` — probablemente ya está) |
| `DTOs/Sistema/EmailOutbox*Dto.cs` | +1-2 | DTOs de listado admin del outbox: agregar `string? CorrelationId`. Si no existe listado admin aún, saltar y anotar como deuda para Chat 4 FE |
| `Data/ApplicationDbContext.cs` o equivalente | 0 | No se toca — EF infiere desde las DataAnnotations del modelo. Verificar que no haya Fluent API que requiera update |
| Tests nuevos: `Services/Notifications/EmailOutboxServiceEnqueueCorrelationTests.cs` | ~150-200 | 4-5 tests (ver sección "TESTS MÍNIMOS") |

Total estimado: **~5-6 archivos**, ninguno rompe cap 300 líneas si se usa partial cuando corresponda.

## TESTS MÍNIMOS

Casos con `input → resultado esperado`:

| # | Input | Resultado esperado |
|---|-------|-------------------|
| 1 | `EnqueueAsync` con `HttpContext.Items["<key>"] = "abc-12345-def"` | Fila en BD con `EO_CorrelationId = "abc-12345-def"` |
| 2 | `EnqueueAsync` sin `HttpContext` (accessor retorna null — background job simulado) | Fila creada con `EO_CorrelationId = null` (sin excepción) |
| 3 | `EnqueueAsync` con `HttpContext` pero sin la key en `Items` | Fila creada con `EO_CorrelationId = null` (graceful) |
| 4 | `EnqueueAsync` con key presente pero valor no-string (ej: un GUID boxed) | Fila con `EO_CorrelationId = <valor.ToString()>` o null si el cast falla — decidir en el chat |
| 5 | DTO de listado admin hidratado desde BD con `EO_CorrelationId` no-null | DTO incluye `CorrelationId = "abc-12345-def"` |
| 6 (opcional) | Validación INV-MAIL01 (formato inválido rechaza) + INV-MAIL02 (blacklist rechaza) siguen funcionando intactas con la nueva columna | Tests existentes de blacklist siguen verdes, fila NO se crea (pre-filtro prevalece) |

Usar `TestDbContextFactory.Create()` para integration tests con BD in-memory o SQL Server LocalDB según el patrón del proyecto.

## REGLAS OBLIGATORIAS

| Regla | Aplicación en este chat |
|-------|-------------------------|
| `INV-D02` | Auditoría del modelo ya existe. La nueva columna NO es auditoría, es trazabilidad. No agregar campos Reg/Mod nuevos |
| `INV-S07` | Fail-safe: si el lookup de `HttpContext` falla por cualquier razón (race condition, scoped lifetime expirado), el enqueue NO debe fallar — graceful a `null` |
| `INV-RU03` | **Preservado sin tocar**. El submit de ReporteUsuario ya usa la lógica del FE para setear `REU_CorrelationId = última request ANTES del POST`. Este chat toca `EmailOutbox`, no `ReporteUsuario`. Sin cambios en esa área |
| `INV-MAIL01`, `INV-MAIL02` | **Intactos**. El pre-filtro de `EnqueueAsync` (validator + blacklist) debe seguir funcionando antes del hook de correlation. Orden: (1) validar formato, (2) consultar blacklist, (3) setear CorrelationId, (4) persistir. Si (1) o (2) rechazan, ni siquiera se llega a (3) — no hay fila y no hay correlation |
| Cap 300 líneas BE | Si `EmailOutboxService.cs` pasa el cap, crear partial `.Enqueue.cs` (patrón Plan 29 Chat 2) |
| `rules/backend.md` § "Envío de Correos — Outbox Obligatorio" | Ningún cambio aquí, el service sigue siendo el único punto de enqueue. **No llamar `IEmailService` directo** desde ningún lugar de producción |
| Structured logging | Si se agregan logs, usar placeholders (`_logger.LogDebug("EO correlation set to {CorrelationId} for destinatario {Destinatario}", id, EmailHelper.Mask(dest))`). Nunca string interpolation |
| `rules/backend.md` § Migraciones | No aplica acá — la columna ya está en BD. No hay script SQL nuevo que mostrar |
| Cap 300 + `DbContext` excepción documentada | `ApplicationDbContext.cs` puede superar 300 (DbSets crecen lineal). No tocar salvo si EF no infiere correctamente |

## APRENDIZAJES TRANSFERIBLES (del chat de /design)

1. **La columna EO_CorrelationId ya está en BD de pruebas**. El usuario ejecutó `ALTER TABLE EmailOutbox ADD EO_CorrelationId NVARCHAR(36) NULL;` el 2026-04-24 durante el /design. **No volver a mostrarle el script**. Solo confirmar con el SELECT del Pre-work y arrancar con el modelo C#.

2. **El FE ya tiene el 30% del cableado del hub** (ver plan file para detalles). Este chat no toca FE — Chat 4 lo consolida. Para este chat: basta con que `EmailOutbox` persista `EO_CorrelationId` y que algún DTO de listado admin lo exponga. El resto es Chat 3 (endpoint) y Chat 4 (UI).

3. **Patrón Plan 31 Chat 1 similar pero no igual**. Plan 31 Chat 1 (commit `c46dfa0` en `Educa.API master`) introdujo el header `X-Educa-Outbox-Id` con patrón "id propagado header → BD → admin". Similar pero el propósito es distinto:
   - Plan 31 `X-Educa-Outbox-Id = EO_CodID` — identifica **el correo** (para el parser IMAP que correlaciona NDRs)
   - Plan 32 `EO_CorrelationId` — identifica **la request HTTP que generó el correo** (para el hub cross-tabla)
   - Ambas columnas coexisten en `EmailOutbox` y sirven propósitos distintos. No consolidar.

4. **`EmailOutboxWorker` retries**: cuando el worker reenvía un correo existente, **NO crea una fila nueva** — actualiza la existente (`EO_Estado = RETRYING`, incrementa `EO_IntentosEnvio`, etc.). El `EO_CorrelationId` original **se conserva** porque no hay EnqueueAsync nuevo. Perfecto — no hay que hacer nada especial para retries.

5. **Plan 30 Chat 4 (commit `3c316a2`) estableció patrones arquitectónicos** que Chat 3 BE reusará: `EmailDiagnosticoPersonaLookup` para queries auxiliares con cap 300 + `EmailDiagnosticoSnapshotFactory.BuildEmpty` para fail-safe INV-S07. **Este chat (Chat 2) NO los usa** — es un hook simple en un service existente. Solo queda anotado para referencia cruzada.

6. **Commit style (feedback del usuario, aplica a ambos repos)**: commits en inglés, español solo entre `"..."`, **NUNCA `Co-Authored-By`** (regla de la skill `commit`, ya aplicada 1 vez mal en memoria del usuario, requirió `--amend`). Subject ≤ 72 chars.

7. **Paths de enqueue activos hoy** (confirmado durante el inventario del /design — revalidar en este chat con grep):
   - `AsistenciaService` → tipo outbox `"ASISTENCIA"`
   - `AsistenciaAdminService` → tipo `"ASISTENCIA_CORRECCION"` (INV-AD05)
   - `ReporteUsuarioService` → tipo `"REPORTE_USUARIO"` (INV-RU08)
   - Todos son request-driven → todos deberían quedar con `EO_CorrelationId` populated.

## FUERA DE ALCANCE

- **Endpoint `/api/sistema/correlation/{id}`** — es Chat 3 BE, no tocar controllers nuevos aquí.
- **Índices BD sobre `*_CorrelationId`** — Chat 3 BE los crea tras SELECT previo sobre `sys.indexes`.
- **Pantalla hub + pill FE + wiring en 4 dashboards** — Chat 4 FE en `educa-web main`.
- **Backfill de datos históricos** — imposible (no se puede inventar el id). Registros pre-deploy quedan `EO_CorrelationId = null` y no serán linkeables. Aceptado en el /design.
- **Consolidar con `X-Educa-Outbox-Id` de Plan 31** — son columnas distintas con propósitos distintos. Coexisten.
- **Rate limiting de `EnqueueAsync`** — no aplica, el enqueue es invocado solo desde services de negocio, no desde endpoints externos.

## CRITERIOS DE CIERRE

- [ ] SELECT de esquema confirma `EO_CorrelationId NVARCHAR(36) NULL` en BD.
- [ ] `Models/Sistema/EmailOutbox.cs` tiene propiedad `EO_CorrelationId` con DataAnnotations correctas.
- [ ] `EmailOutboxService.EnqueueAsync` (o partial `.Enqueue.cs`) setea el valor desde `IHttpContextAccessor.HttpContext?.Items[<key correcta>]`.
- [ ] La key usada en el lookup coincide con la que `CorrelationIdMiddleware` escribe (confirmado por grep).
- [ ] `IHttpContextAccessor` registrado en DI (probablemente ya lo estaba por Plan 29 o anteriores — confirmar).
- [ ] DTOs de listado admin del outbox incluyen `CorrelationId` (o anotar como deuda para Chat 4 FE si no hay listado admin aún).
- [ ] 4-5 tests nuevos verdes: enqueue con id, sin HttpContext, sin key en Items, persistencia en DTO, INV-MAIL01/02 intactos.
- [ ] Suite BE completa sin regresiones (baseline: ~1373 BE verdes a 2026-04-24).
- [ ] `dotnet build` sin warnings nuevos.
- [ ] Cap 300 líneas respetado en todos los archivos tocados.
- [ ] Commit en `Educa.API master` con mensaje del bloque "COMMIT MESSAGE sugerido" abajo.
- [ ] Actualizar fila Plan 32 + Notas del maestro en `../../educa-web/.claude/plan/maestro.md` con commit hash + tests count post-chat.
- [ ] Actualizar cola top 3 del maestro: ¿promover Plan 32 Chat 3 BE al top 3, o dejarlo fuera hasta decisión explícita del usuario?
- [ ] Mover este archivo a `educa-web/.claude/chats/closed/` al cerrar el chat.

## COMMIT MESSAGE sugerido

Backend (`Educa.API master`):

```
feat(outbox): Plan 32 Chat 2 — EO_CorrelationId + enqueue hook

EmailOutbox gains EO_CorrelationId (NVARCHAR(36) NULL, already
created in DB during the design chat). Adds the property to the
model and a hook in EnqueueAsync that resolves the value from
IHttpContextAccessor.HttpContext?.Items[<key>] provided by
CorrelationIdMiddleware. Falls back to null when no HttpContext
is present (background jobs, worker retries, health checks).

Historical rows stay NULL -- no backfill possible. New rows from
request-driven paths ("ASISTENCIA", "ASISTENCIA_CORRECCION",
"REPORTE_USUARIO", admin notifications) carry the id and become
correlatable via the upcoming GET /api/sistema/correlation/{id}
endpoint (Chat 3 BE).

Admin listing DTO(s) expose CorrelationId so the future
bandeja-correos FE pill (Chat 4 FE) can render the pill for
every row. No new indexes in this chat -- Chat 3 BE adds the
filtered index over EO_CorrelationId alongside the three peers
on ErrorLog, RateLimitEvent and ReporteUsuario.

Precondition of Plan 32 Chat 3 BE.

N new tests on EnqueueAsync: with id, without HttpContext,
with HttpContext but no correlation key, INV-MAIL01/02 still
reject before the hook runs.
```

Reglas del commit respetadas: inglés imperativo, español solo entre `"..."` (tipos outbox), **sin `Co-Authored-By`**, subject ≤ 72 chars (`feat(outbox): Plan 32 Chat 2 — EO_CorrelationId + enqueue hook` = 66 chars ✅).

Frontend: **no aplica** — este chat no toca `educa-web`. Chat 4 FE tendrá su propio commit.

## CIERRE

Al cerrar el chat, pedirle al usuario feedback sobre:

1. **Key exacta del middleware**: confirmar qué string literal / constante terminó usándose en el lookup. Anotarlo en la actualización del maestro para que Chat 3 BE no la redescubra.

2. **DTO de listado admin**: ¿ya existía y se extendió, o se creó uno nuevo? Si no había listado admin del outbox, Chat 4 FE necesitará saberlo para agregarlo o consumir otro endpoint.

3. **Cola top 3**: tras cerrar este chat, ¿promover Plan 32 Chat 3 BE al top 3 del maestro (y qué desplaza), o dejarlo fuera hasta revisión de prioridades?

4. **Verificación manual post-deploy**: el usuario debe ejecutar una request admin en BD de pruebas (ej: un login, o un submit de reporte de usuario) y confirmar con `SELECT TOP 5 EO_CodID, EO_Destinatario, EO_CorrelationId, EO_FechaReg FROM EmailOutbox ORDER BY EO_CodID DESC;` que las filas nuevas traen el id. Registrar ese chequeo en la actualización del maestro.

5. **Deuda técnica detectada**: si durante el chat aparece algún path de enqueue que esperábamos request-driven pero NO tiene HttpContext (ej: un flujo nuevo que no habíamos mapeado), listarlo como deuda — puede ser señal de que el flujo debería pasar por otro contexto.

Recordar al usuario: después de cerrar este chat, **mover este brief a `educa-web/.claude/chats/closed/`** y actualizar la cola top 3 del maestro antes de iniciar Chat 3 BE.

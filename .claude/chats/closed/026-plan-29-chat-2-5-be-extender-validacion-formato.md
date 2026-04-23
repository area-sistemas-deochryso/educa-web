> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo — todos los archivos tocados son BE. El `/design` (Chat 1) vive en `educa-web` pero este fix es 100% Educa.API.
> **Plan**: 29 · **Chat**: 2.5 · **Fase**: `/execute` BE (gap fix del Chat 2) · **Estado**: ⏳ pendiente arrancar.

---

# Plan 29 Chat 2.5 BE — Extender validación de formato a todos los tipos

## PLAN FILE

`../../educa-web/.claude/plan/maestro.md` → sección **"🔴 Plan 29 — Corte de cascada SMTP (`max_defer_fail_percentage`)"** → subsección **"Chat 2 — BE (implementación) ✅ cerrado 2026-04-22"** → bloque **"Gaps conocidos → cerrar en Chat 2.5 BE"**, gap **(1)**.

Contexto del Chat 2 cerrado (leer solo si hace falta):

- `../../educa-web/.claude/chats/closed/025-plan-29-chat-2-be-email-validator-blacklist-ssl-fix.md` — brief completo del Chat 2, para referencia.
- Commit `674e86a` en Educa.API `master` — código base del Chat 2 sobre el que se parcha.

## OBJETIVO

Cerrar el gap más importante detectado al cerrar el Chat 2: la validación de formato RFC sigue restringida a los tipos `"Asistencia"` y `"AsistenciaProfesor"` via el whitelist `TiposValidadosAlEncolar`. Tipos no-asistencia (`NotificacionAdmin`, `ReporteUsuario`, `ReporteFallosCorreoAsistencia`, etc.) con destinatario mal formado (ñ, tildes, vacío, sin `@`) siguen encolando como `PENDING`, el worker los intenta enviar, el SMTP rebota 5.1.1 y gastamos una del contador `5/h` de cPanel. Eso **contradice el objetivo del Plan 29** ("nada inválido debe llegar al SMTP"). El fix es ~15 min: eliminar el whitelist y validar siempre.

El gap D4 (endpoint `DeferFailStatus` para desbloquear Plan 22 Chat B) **NO entra** en este chat — es deuda separada, requiere diseñar el shape del agregado. Ver "FUERA DE ALCANCE".

## PRE-WORK OBLIGATORIO

Ninguno. No hay SQL ni decisiones de diseño. El Chat 1 ya aprobó la regla "validar formato pre-encolado" (decisión 1); el Chat 2 la implementó parcialmente; este chat la completa.

**Antes de codificar, ejecutar este grep** para saber si hay tests existentes que asuman el comportamiento viejo (tipo no-asistencia + formato inválido → `PENDING`) — esos tests van a fallar al remover el whitelist y hay que ajustarlos (el cambio es correcto, pero hay que confirmar que ninguno depende explícitamente del bug):

```bash
grep -rn "NotificacionAdmin\|ReporteUsuario\|ReporteFallosCorreoAsistencia" \
  "c:/Users/Asus Ryzen 9/EducaWeb/Educa.API/Educa.API.Tests/Services/Notifications/"
```

Reportar al usuario los matches (si los hay) antes de tocar código.

## ALCANCE

### Archivos a MODIFICAR

| # | Archivo | Cambio | Impacto líneas |
|---|---------|--------|----------------|
| 1 | `Educa.API/Services/Notifications/EmailOutboxService.Enqueue.cs` | Eliminar el `HashSet<string> TiposValidadosAlEncolar` + simplificar el `(isValid, tipoFallo, razon) = ...` para validar siempre | -6, +1 |
| 2 | `Educa.API.Tests/Services/Notifications/EmailOutboxServiceTests.cs` | Agregar casos `NotificacionAdmin` + `ReporteUsuario` con formato inválido → `FAILED` + `FAILED_INVALID_ADDRESS`/`FAILED_NO_EMAIL`. Remover cualquier assertion que asuma el comportamiento viejo | +~15 |

### Cambio exacto en `EmailOutboxService.Enqueue.cs`

**Antes** (líneas ~17-21):

```csharp
// Tipos de correo cubiertos por la validación ASCII+RFC al encolar (Plan 22 F1).
// Otros tipos (NotificacionAdmin, ReporteUsuario, ReporteFallosCorreoAsistencia, etc.)
// conservan el flujo actual sin guard.
private static readonly HashSet<string> TiposValidadosAlEncolar =
    new(StringComparer.Ordinal) { "Asistencia", "AsistenciaProfesor" };
```

**Después**:

```csharp
// Plan 29 Chat 2.5 — Plan 22 F1 se extiende a TODOS los tipos. Mantener un
// whitelist dejaba pasar destinatarios con formato inválido en tipos no-
// asistencia, que cruzaban al SMTP y consumían la cuota max_defer_fail (5/h).
```

**Antes** (líneas ~44-46 dentro de `EnqueueAsync`):

```csharp
var (isValid, tipoFallo, razon) = TiposValidadosAlEncolar.Contains(tipo)
    ? EmailValidator.Validate(email.To)
    : (true, null, null);
```

**Después**:

```csharp
var (isValid, tipoFallo, razon) = EmailValidator.Validate(email.To);
```

Nada más cambia. La lógica downstream (`outbox.EO_Estado = isValid ? "PENDING" : "FAILED"`, `BuildFailureMessage`, `_failureLogger.LogAsync`) ya funciona para cualquier tipo — solo estaba gateada por el whitelist.

## TESTS MÍNIMOS

Agregar al archivo **existente** `Educa.API.Tests/Services/Notifications/EmailOutboxServiceTests.cs` una region nueva `Plan 29 Chat 2.5 — formato para todos los tipos`:

| Input | Tipo | Resultado esperado |
|-------|------|-------------------|
| `"apoderadó@gmail.com"` (tilde) | `"NotificacionAdmin"` | fila `EO_Estado='FAILED'` + `EO_TipoFallo='FAILED_INVALID_ADDRESS'` + `EO_ProximoIntento=null` |
| `""` (vacío) | `"NotificacionAdmin"` | fila `EO_Estado='FAILED'` + `EO_TipoFallo='FAILED_NO_EMAIL'` |
| `"sin-arroba"` | `"ReporteUsuario"` | fila `EO_Estado='FAILED'` + `EO_TipoFallo='FAILED_INVALID_ADDRESS'` |
| `"apoderado@gmail.com"` (válido) | `"NotificacionAdmin"` | fila `EO_Estado='PENDING'` (flujo normal sigue funcionando) |
| `"apoderado@gmail.com"` (válido) | `"ReporteFallosCorreoAsistencia"` | fila `EO_Estado='PENDING'` |

Sugerir al menos un test parametrizado `[Theory]` que cubra los tipos no-asistencia en masa contra un mismo input inválido para cerrar la regresión.

**Diagnóstico en caso de fallo**: si al correr la suite algún test existente falla con mensaje del tipo "expected PENDING but got FAILED" en un test de `NotificacionAdmin`/`ReporteUsuario`, el test **asumía el bug**. Actualizarlo al nuevo comportamiento y dejar comentario `// Plan 29 Chat 2.5 — alineado al comportamiento correcto: formato inválido siempre FAILED`.

**Target**: suite BE ≥ 1242 + ~5 = **~1247+ verdes**.

## REGLAS OBLIGATORIAS

### Invariantes aplicables

- **`INV-MAIL01`** — Extendido a **todos los tipos** (antes restringido por whitelist). `EmailOutboxService.EnqueueAsync` valida regex siempre; destinatario inválido → fila `FAILED` con `TipoFallo` apropiado + `EO_UltimoError` con razón legible. Rechazo con blacklist sigue siendo silencioso (sin fila).
- **`INV-S07`** — El `_failureLogger.LogAsync(...)` que dispara cuando `!isValid` sigue siendo fire-and-forget; no cambia.
- **`INV-ET02`** — Mismo patrón.

### Reglas de arquitectura

- **300 líneas máximo por archivo `.cs`**. El archivo `EmailOutboxService.Enqueue.cs` quedó en ~115 líneas tras el Chat 2 — este cambio reduce ~5 líneas, sigue muy por debajo del cap.
- Structured logging con placeholders (ya respetado — no cambia).
- Sin migración SQL — es un cambio puramente de código.

### Regla específica del Chat 2.5

- **No tocar tests existentes sin motivo**. La mayoría de tests del `EmailOutboxServiceTests.cs` del Plan 22 F1 pasaron el Chat 2 tal cual — solo hay que **ajustar** los que explícitamente asuman que tipo no-asistencia + formato inválido → `PENDING`. Si no hay ninguno (lo probable), solo se **agregan** los nuevos tests. Reportarlo explícitamente en el cierre.

## APRENDIZAJES TRANSFERIBLES (del Chat 2)

Descubrimientos concretos que transfieren directo a este chat:

### Estructura del `EmailOutboxService` post-Chat 2

Es `partial class` dividido en 2 archivos:

- `Services/Notifications/EmailOutboxService.cs` — constructor + queries (`ListarAsync`, `ObtenerEstadisticasAsync`, `ObtenerCuerpoHtmlAsync`, `ObtenerTendenciasAsync`, `CleanupAsync`, `ReintentarAsync`).
- `Services/Notifications/EmailOutboxService.Enqueue.cs` — solo `EnqueueAsync` + `TiposValidadosAlEncolar` + `BuildFailureMessage`. **Este es el archivo a tocar**.

### Signatura del constructor

El Chat 2 agregó `IEmailBlacklistService? blacklistService = null` como 4º parámetro opcional. Los tests existentes que usan `new EmailOutboxService(ctx, logger)` siguen compilando. **NO tocar la signatura**.

### Patrón de tests existentes

`EmailOutboxServiceTests.cs` tiene helper interno `CreateService(ctx)` que construye el service con `NullLogger`. Hay también un `SpyLogger` para detectar errores fire-and-forget. Reutilizar esos helpers — NO crear factoría nueva. Método `EmailWith(string? to)` ya existe para armar el DTO.

### Contexto de tests InMemory

Usar `TestDbContextFactory.Create()` de `Educa.API.Tests/Helpers/Db/` — el Chat 2 ya lo extendió para relajar `EBL_RowVersion`. No hace falta nada nuevo.

### Convenciones de commit (`.claude/skills/commit/SKILL.md`)

- **Inglés** en subject y body, imperativo.
- Español solo entre `"..."` para términos de dominio (`"TiposValidadosAlEncolar"`, `"EmailOutbox"`, `"Asistencia"`, etc.).
- **NUNCA** `Co-Authored-By`.

### Tipos de correo actualmente encolados en producción

Del Chat 2 se mapeó: `"Asistencia"`, `"AsistenciaProfesor"`, `"NotificacionAdmin"`, `"ReporteUsuario"`, `"ReporteFallosCorreoAsistencia"`, `"AsistenciaCorreccion"`, `"AsistenciaCorreccionProfesor"`. Todos pasan a validación. Si algún tipo no-listado se agrega en el futuro, hereda la validación automáticamente.

## FUERA DE ALCANCE

- **Endpoint `GET /api/email-outbox/defer-fail-status`** (deuda D4, Plan 22 Chat B widget). Requiere diseñar el shape del agregado (ventana de tiempo, campos, agrupación por dominio/sender). Es un chat aparte — dejarlo para Chat 2.6 BE o fusionarlo con Plan 22 Chat B cuando se retome.
- **Vista admin FE para `EmailBlacklist`** (deuda D2). Sin cambio.
- **Validador en form de creación/edición de Estudiante/Profesor** (deuda D3). Sin cambio.
- **Chat 3 OPS** (inspección CrossChex + negociación umbral hosting). Independiente.
- **Chat 4 docs** (§18 `business-rules.md` con `INV-MAIL01/02/03`). No tocar.
- **Cualquier modificación al `EmailOutboxWorker` o `EmailBounceBlacklistHandler`**. Son correctos tal cual quedaron.
- **Modificar el `EmailValidator.Validate` o `Normalize`**. Son correctos.

## CRITERIOS DE CIERRE

```
PRE-WORK
[ ] Grep de tests con NotificacionAdmin/ReporteUsuario ejecutado y reportado al usuario

CÓDIGO
[ ] Whitelist TiposValidadosAlEncolar eliminado
[ ] Llamada a EmailValidator.Validate(email.To) sin condicional
[ ] Comentario nuevo referencia "Plan 29 Chat 2.5"
[ ] Archivo EmailOutboxService.Enqueue.cs sigue bajo 300 líneas

TESTS
[ ] Al menos 3 tests nuevos parametrizados en EmailOutboxServiceTests.cs cubriendo NotificacionAdmin + ReporteUsuario + ReporteFallosCorreoAsistencia con inputs inválidos
[ ] Al menos 2 tests del camino feliz (tipos no-asistencia + correo válido → PENDING)
[ ] Suite total ≥ 1247 verdes (baseline 1242 + ~5 nuevos)

VALIDACIÓN
[ ] dotnet build limpio (0 errores, warnings solo pre-existentes)
[ ] dotnet test verde
[ ] Ningún test existente del Plan 22 F1 fue modificado salvo justificación documentada en el commit

COMMIT
[ ] Un solo commit con mensaje sugerido (ver más abajo)
[ ] Mover 026-plan-29-chat-2-5-be-extender-validacion-formato.md a educa-web/.claude/chats/closed/
[ ] Actualizar maestro.md Plan 29: celda inventario (progreso ~55% → ~60%) + Foco + marcar Chat 2.5 cerrado + remover el gap (1) del bloque "Gaps conocidos"

POST-DEPLOY
[ ] Monitorear 48-72h que ningún tipo adicional rechazado inflate EmailOutbox con FAILED inesperado (si pasa, alguna fuente de encolado estaba pasando formato malo sistemáticamente — se trata como bug aparte)
```

## COMMIT MESSAGE sugerido

Un solo commit al cerrar el Chat 2.5 (respetando skill `commit`: inglés imperativo, español solo entre `"..."`, sin `Co-Authored-By`):

**Subject** (67 caracteres):

```
fix(email): Plan 29 Chat 2.5 — validate format for ALL outbox types
```

**Body**:

```
Close Plan 29 Chat 2.5 BE — gap fix from Chat 2.

Chat 2 preserved the Plan 22 F1 whitelist "TiposValidadosAlEncolar"
({"Asistencia","AsistenciaProfesor"}), so other types
("NotificacionAdmin", "ReporteUsuario", "ReporteFallosCorreoAsistencia",
admin correction emails, etc.) kept enqueuing with format-invalid
recipients, hit the SMTP, got rejected, and consumed the cPanel
"max_defer_fail_percentage" (5/h) quota — the exact cascade Plan 29
was meant to prevent.

Remove the whitelist. "EmailValidator.Validate(email.To)" now runs
for every call to "EmailOutboxService.EnqueueAsync". Behavior for
already-validated types ("Asistencia"/"AsistenciaProfesor") is
unchanged; non-asistencia types with invalid recipient now produce
"EO_Estado='FAILED'" with "EO_TipoFallo='FAILED_INVALID_ADDRESS'" /
"'FAILED_NO_EMAIL'" + fire-and-forget "ErrorLog" entry via
"EmailFailureLogger" (INV-ET02), instead of hitting SMTP.

Tests: +~5 parametrized cases covering "NotificacionAdmin",
"ReporteUsuario", "ReporteFallosCorreoAsistencia" with invalid inputs;
2 happy-path cases confirm valid recipients still enqueue "PENDING".

Suite BE: target ~1247 green (baseline 1242 from Chat 2).

"INV-MAIL01" now fully enforced across all outbox types.

Deferred: "DeferFailStatus" aggregate endpoint (debt D4) stays in
its own chat — see maestro.md Plan 29.
```

## CIERRE

Feedback a pedir al usuario al cerrar el Chat 2.5:

1. **Hallazgos inesperados al remover el whitelist** — si algún test existente asumía el bug, reportar cuáles fueron y cómo se ajustaron. Si ninguno, confirmar que el whitelist era pura deuda técnica sin consumidores legítimos.
2. **Contadores post-deploy** — ¿observamos bajada del contador `5/h` de cPanel en las próximas 48-72h? Si no baja, hay un tipo de correo adicional que algún service está encolando con formato malo sistemáticamente (tratar como bug aparte, no este chat).
3. **Siguiente prioridad** — con el Chat 2.5 cerrado, ¿arrancamos Chat 3 OPS (inspección CrossChex + negociación hosting) o Chat 2.6 BE (endpoint `DeferFailStatus` para D4)? El orden depende de prioridades del negocio, no técnico.

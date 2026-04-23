> **Repo destino**: `Educa.API` (backend, branch `master`) **+ secundario** `educa-web` (frontend, branch `main`) para el commit del maestro. Abrir el chat nuevo en `Educa.API` — trabaja primero BE y al cerrar conmuta al FE solo para el commit del maestro.
> **Plan**: 22 · **Chat**: A (cierre) · **Fase**: F5.1-F5.5 + F6 (merged) — cierre ejecución · **Estado**: 🟡 WIP — código y tests escritos en chat 011, falta validar build+test, ejecutar SQL en prueba+prod, y commit+push.

---

# Plan 22 Chat A — Cierre BE F5+F6: tests, migración SQL y deploy

## PLAN FILE

- **Maestro**: [`../../educa-web/.claude/plan/maestro.md`](../../educa-web/.claude/plan/maestro.md) — fila 22 ya actualizada en chat 011 (60%, F5+F6 BE ejecutado, Chat B FE pendiente).
- **Plan 22**: [`.claude/plan/asistencia-correos-endurecimiento.md`](.claude/plan/asistencia-correos-endurecimiento.md) — sección **"Chat A — F5+F6 (BE) — SMTP outbound throttle + multi-sender"** ya documentada.
- **Chat 011 (origen del código)**: [`../../educa-web/.claude/chats/011-plan-22-chat-a-be-smtp-throttle-multisender.md`](../../educa-web/.claude/chats/011-plan-22-chat-a-be-smtp-throttle-multisender.md) — lleva al closed al terminar este chat.

## OBJETIVO

Cerrar la ejecución de F5+F6 BE empezada en chat 011:

1. Validar `dotnet build` + `dotnet test` limpios (0 regresiones sobre baseline 853; esperado ~872 tests = 853 + 13 unit + 6 integration).
2. Ejecutar los 4 scripts SQL en BD prueba → validar → producción.
3. Commit BE + commit FE (maestro) + push origin.
4. Post-deploy: monitorear distribución entre los 7 senders y aparición de `FAILED_QUOTA_EXCEEDED`.

El usuario ya confirmó (2026-04-21):

- Backend local detenido (PID 24232 muerto).
- Los 7 buzones creados en cPanel.
- Las 23 env vars (18 de senders + 5 throttle) configuradas en App Service y restart aplicado.

## PRE-WORK OBLIGATORIO

### 1. Validar que no hay drift desde chat 011

Chat 011 dejó el repo `Educa.API` con archivos modificados/creados pero **sin commit todavía**. Verificar:

```bash
cd /c/Users/Asus\ Ryzen\ 9/EducaWeb/Educa.API
git status
git diff --stat
```

Esperar ver ~16 archivos tocados en este conjunto:

- **Nuevos**: `SenderConfig.cs`, `IQuotaThrottleService.cs`, `QuotaThrottleService.cs`, `EmailOutboxWorker.Sender.cs`, `QuotaThrottleServiceTests.cs`.
- **Modificados**: `EmailSettings.cs`, `EmailOutbox.cs`, `SmtpErrorClassifier.cs`, `IEmailService.cs`, `EmailService.cs`, `EmailOutboxWorker.cs`, `appsettings.json`, `ServiceExtensions.cs`, `EmailOutboxWorkerTests.cs`, `.claude/plan/asistencia-correos-endurecimiento.md`.

En `educa-web`: solo `maestro.md` modificado.

### 2. Confirmar con el usuario antes de ejecutar SQL en producción

Los scripts 3.1-3.4 van primero a BD **prueba**. Tras validar, el usuario los ejecuta en **prod**. **No ejecutar prod sin confirmación explícita del usuario.**

### 3. NO commitear los archivos `educa-web/.claude/chats/*.md`

La skill `next-chat` lo prohíbe — los chats son contexto de transición, no deliverable.

## ALCANCE

### 3.1 Validar build + test (BE)

```bash
cd /c/Users/Asus\ Ryzen\ 9/EducaWeb/Educa.API
dotnet build Educa.API/Educa.API.csproj --nologo
dotnet test Educa.API.Tests/Educa.API.Tests.csproj --nologo -v minimal
```

Esperado: **0 errores de compile, 872+ tests pasan** (baseline 853 + 13 unit de `QuotaThrottleServiceTests` + 6 nuevos en `EmailOutboxWorkerTests`). Si falla alguno:

- Revisar el mensaje, corregir el código/test.
- Re-ejecutar hasta verde.
- **No seguir al commit hasta que esté verde.**

Puntos probables de fallo (predicción basada en chat 011):

| Causa probable | Archivo | Fix |
|---|---|---|
| `TestDbContextFactory.RelaxedDbContext` no accesible desde test nuevo | `EmailOutboxWorkerTests.cs` L~414 | La clase ya es `public sealed` — debería funcionar |
| `AddSingleton(typeof(ILogger<>), typeof(NullLogger<>))` no resuelve | `EmailOutboxWorkerTests.cs` L~421 | Usar FQN: `Microsoft.Extensions.Logging.Abstractions.NullLogger<>` (ya está así) |
| Tests legacy rompen por nueva signature de `SendEmailOnceAsync` | `EmailOutboxWorkerTests.cs` | El `StubEmailService` ya se actualizó en chat 011 para recibir `SenderConfig` |
| `Options.Create(settings)` no compila por ambigüedad | `EmailOutboxWorkerTests.cs` | `using Microsoft.Extensions.Options;` ya está |

### 3.2 Ejecutar scripts SQL

El chat 011 dejó los 4 scripts listos. **Ejecutar primero en prueba** con el usuario, validar la query de verificación, luego aplicar en prod.

```sql
-- ==========================================================================
-- Plan 22 F5+F6 — Migración SQL (Chat A cierre, 2026-04-21)
-- Orden: 3.1 → 3.2 → 3.3 → 3.4 → verificación
-- Primero en BD de prueba, validar, luego en prod.
-- ==========================================================================

-- 3.1 — Columna nueva: buzón remitente usado
ALTER TABLE EmailOutbox
ADD EO_Remitente NVARCHAR(200) NULL;
GO

-- 3.2 — Backfill histórico con sistemas@laazulitasac.com (único sender histórico)
UPDATE EmailOutbox
SET EO_Remitente = 'sistemas@laazulitasac.com'
WHERE EO_Remitente IS NULL;
GO

-- 3.3 — Índice filtrado per-sender
CREATE INDEX IX_EmailOutbox_Remitente_FechaEnvio_Sent
ON EmailOutbox(EO_Remitente, EO_FechaEnvio)
WHERE EO_Estado = 'SENT' AND EO_FechaEnvio IS NOT NULL;
GO

-- 3.4 — Contador de diferidos por cuota (separado de EO_Intentos)
ALTER TABLE EmailOutbox
ADD EO_IntentosPorCuota INT NOT NULL
    CONSTRAINT DF_EmailOutbox_EO_IntentosPorCuota DEFAULT 0;
GO

-- Verificación — sin_remitente debe ser 0
SELECT
  COUNT(*)                                              AS total,
  COUNT(EO_Remitente)                                   AS con_remitente,
  COUNT(*) - COUNT(EO_Remitente)                        AS sin_remitente,
  COUNT(CASE WHEN EO_IntentosPorCuota = 0 THEN 1 END)   AS con_contador_cero
FROM EmailOutbox;
```

### 3.3 Commit BE + push

Un solo commit en `Educa.API/master`:

```
feat(correos): Plan 22 F5+F6 — SMTP outbound throttle with 7 senders

Add sliding-window quota throttle (per-sender 50/h + per-domain 200/h)
and multi-sender support (7 mailboxes, round-robin selection) in
EmailOutboxWorker. Effective hosting ceiling rises from 50/h (single
sender) to 200/h (domain-bound with 7 senders). Historical production
peak of 320/h on 2026-04-20 still exceeds the new ceiling but common
peaks (97-115/h) now fit comfortably.

- EmailSettings keeps existing Address/Password/DisplayName (sender 1)
  and adds flat pairs Address2-Address7, Password2-Password7,
  DisplayName2-DisplayName7. New computed Senders list materializes
  from the 7 slots, filtering empty ones. Non-breaking for deploy:
  if slots 2-7 are empty the system behaves as single-sender
- New "EO_Remitente" column on EmailOutbox persists which mailbox sent
  each row (audit + per-sender counter). New "EO_IntentosPorCuota"
  column counts quota-deferred attempts independent of "EO_Intentos"
  (SMTP retry counter from F2)
- New IQuotaThrottleService with SelectAvailableSenderAsync (round-robin
  with saturation skip) and CheckQuotaAsync (sliding 60-min window)
- Worker picks sender at send time: first available in round-robin
  order; if all saturated, re-enqueue with "EO_ProximoIntento" = oldest
  envio in domain window + 60 min + jitter(1-5 min)
- After ThrottleMaxReintentosCuota deferred attempts: mark FAILED with
  "FAILED_QUOTA_EXCEEDED"
- EmailService.SendEmailOnceAsync now accepts a SenderConfig parameter
  (breaking — the caller, worker, passes the chosen sender)
- EmailOutboxWorker declared partial class, logic split across
  EmailOutboxWorker.cs + EmailOutboxWorker.Sender.cs to keep each file
  under the 300-line cap
- SQL migration: add "EO_Remitente" NVARCHAR(200) NULL, add
  "EO_IntentosPorCuota" INT NOT NULL DEFAULT 0, backfill historical
  rows with sistemas@laazulitasac.com, create filtered index
  IX_EmailOutbox_Remitente_FechaEnvio_Sent
- Config-driven limits (ThrottleEnabled, ThrottleLimitPerHour,
  ThrottleLimitPerDomainPerHour, ThrottleJitterMaxMinutes,
  ThrottleMaxReintentosCuota) allow tuning without redeploy
- 19 new tests (13 unit for QuotaThrottleService, 6 integration in
  EmailOutboxWorkerTests covering sender available, first saturated,
  all saturated re-enqueue, domain saturated, FAILED_QUOTA_EXCEEDED,
  throttle disabled)

F5.6 (FE widget per-sender + domain counters) is Chat B, scheduled
next. Plan 24 shares the 7-sender pool, no dedicated sender needed.

Close Plan 22 F5.1-F5.5 and F6.1-F6.3.
```

```bash
cd /c/Users/Asus\ Ryzen\ 9/EducaWeb/Educa.API
git add Educa.API/ Educa.API.Tests/ .claude/plan/asistencia-correos-endurecimiento.md
git commit -m "<mensaje arriba>"
git push origin master
```

### 3.4 Commit FE (maestro) + push

```
docs(maestro): Plan 22 F5+F6 landed — update inventory and SMTP section

Reflect the merged F5+F6 (SMTP outbound throttle with 7-sender
round-robin) in inventory row 22 (F1-F3 closed, F5+F6 Chat A shipped,
F5.6 Chat B FE pending). Mark decisions taken in the "Restriccion
critica SMTP" section. Update Plan 24 row: no dedicated sender
needed, the 7-pool suffices.
```

```bash
cd /c/Users/Asus\ Ryzen\ 9/EducaWeb/educa-web
git add .claude/plan/maestro.md
git commit -m "<mensaje arriba>"
git push origin main
```

### 3.5 Post-deploy — validación

Tras el deploy (Azure App Service toma el push de master automáticamente si el pipeline está configurado así, o manual desde el portal si no):

```sql
-- 24-48h tras deploy: distribución entre los 7 senders
SELECT EO_Remitente, COUNT(*) AS enviados
FROM EmailOutbox
WHERE EO_FechaEnvio >= DATEADD(DAY, -1, SYSDATETIME())
  AND EO_Estado = 'SENT'
GROUP BY EO_Remitente
ORDER BY enviados DESC;
```

Esperado: distribución pareja entre los 7 senders (ligero bias hacia sender[0] aceptable por el restart del worker que resetea `_lastSenderIndex` a -1). Si algún sender está en 0 mientras otros en 50+, revisar:

- ¿Env var del sender sin configurar? `SELECT EO_Remitente FROM EmailOutbox WHERE EO_FechaEnvio >= DATEADD(HOUR, -1, SYSDATETIME()) GROUP BY EO_Remitente;` debería listar los 7.
- ¿Error de auth SMTP en ese buzón? Revisar logs del worker (`EmailOutboxWorker`): mensajes `"Email {Id} [...]" marcado FAILED_UNKNOWN` con ese remitente.

```sql
-- Aparición de FAILED_QUOTA_EXCEEDED (si > 0 en 48h, ajustar ThrottleMaxReintentosCuota)
SELECT COUNT(*) AS bloqueados_por_cuota
FROM EmailOutbox
WHERE EO_TipoFallo = 'FAILED_QUOTA_EXCEEDED'
  AND EO_FechaReg >= DATEADD(DAY, -2, SYSDATETIME());
```

Si `bloqueados_por_cuota > 0`: el sistema difirió 5 veces seguidas sin encontrar slot. Posibles acciones:

1. Subir `Email__ThrottleMaxReintentosCuota` de 5 → 10 (config-driven, no requiere redeploy).
2. Diseñar jobs "deferred-by-design": aprobaciones masivas programadas a la noche, cuando la cuota está libre.
3. Revisar si algún proceso legítimo satura el dominio > 5h (ej. import de usuarios con envío masivo).

## TESTS MÍNIMOS

Ya escritos en chat 011. Re-ejecutar y verificar:

| Test suite | Casos nuevos | Ubicación |
|---|---|---|
| `QuotaThrottleServiceTests` | 13 unit | `Educa.API.Tests/Services/Notifications/QuotaThrottleServiceTests.cs` |
| `EmailOutboxWorkerTests` | 6 integration (casos g-l) | `Educa.API.Tests/Services/Notifications/EmailOutboxWorkerTests.cs` |

Validar:

- Los 853 tests previos siguen verdes (0 regresiones de F1/F2/F3).
- Los 19 nuevos pasan.

Comando: `dotnet test Educa.API.Tests/Educa.API.Tests.csproj --nologo -v minimal`.

## REGLAS OBLIGATORIAS

- **INV-S07** (fire-and-forget): el throttle NO debe tumbar el worker si falla. Fallback a sender[0]. Ya está implementado en `EmailOutboxWorker.Sender.cs:SelectSenderOrApplyQuotaSaturationAsync`.
- **INV-AD01**: `EnqueueAsync` acepta todo, throttle solo en el worker.
- **Cap 300 líneas** en `.cs` (backend.md). `EmailOutboxWorker.cs` quedó en 293 ln (tight). Si el build sugiere agregar lógica, extraer a `EmailOutboxWorker.Sender.cs` o nuevo partial.
- **AsNoTracking()** en queries del sliding window. Ya está en `QuotaThrottleService.cs`.
- **Structured logging** con placeholders (no interpolation).
- **NUNCA loguear passwords**.
- **NUNCA** `Co-Authored-By` en commits (skill `commit` lo prohíbe).
- **NUNCA** skip tests bajo `--no-build` para "ir más rápido" — si un test falla, se corrige antes del commit.
- **Mostrar SQL al usuario** antes de cada migración. Usuario ejecuta en prueba → valida → prod → confirma.

## APRENDIZAJES TRANSFERIBLES (del chat 011)

1. **Educa.API.exe corriendo local bloquea el copy al bin/**. Síntoma: `MSB3021`/`MSB3027` en cada build. Fix: `taskkill /F /PID <pid>` antes de intentar build. El usuario ya lo mató antes de abrir este chat.
2. **Visual Studio también bloquea DLLs** (Scalar.AspNetCore.dll) durante debug session. Si el build sigue fallando con otro `MSB3027`, cerrar VS o stop debug.
3. **`EmailOutboxWorker.cs` declarado `partial class`** — dividido en `EmailOutboxWorker.cs` (293 ln, main loop + policies F2) y `EmailOutboxWorker.Sender.cs` (106 ln, throttle logic F5+F6). Ambos bajo cap 300.
4. **Signature de `SendEmailOnceAsync`** cambió a `(Email, SenderConfig)`. El stub de tests (`StubEmailService`) y la legacy `SendEmailAsync` (construye un `SenderConfig` desde los fields de ctor) se adaptaron en chat 011.
5. **Decisión de usuario: Opción 2 para el contador** — `EO_IntentosPorCuota` es columna separada de `EO_Intentos`. Evita que correos legítimos caigan a FAILED tras solo 2 diferidos cuando `EO_MaxIntentos=2` (política F2).
6. **Los 4 scripts SQL son idempotentes excepto el UPDATE del backfill**. Si se corre el UPDATE dos veces, la segunda no toca nada porque `WHERE EO_Remitente IS NULL` ya no matchea.
7. **El índice `IX_EmailOutbox_FechaEnvio_Sent` ya existe** desde el chat de diseño (010). No re-crearlo. El nuevo es `IX_EmailOutbox_Remitente_FechaEnvio_Sent` (per-sender).
8. **Warning XML en `IQuotaThrottleService.cs`** — originalmente faltaba el `<param name="ct">`, corregido en chat 011. Si el build tira un warning similar nuevo, agregarlo.
9. **Lint del editor removió `CopiaAsistenciaEmail` de `appsettings.json`** (intencional según system-reminder). El property sigue en `EmailSettings.cs` con default `""`, binding desde env vars en Azure funciona. NO revertir.
10. **`EmailOutboxWorkerTests.cs` quedó en 498 ln** (supera cap 300, pero aplica solo a `.cs` de código, no tests). Si en el futuro se divide, extraer los 6 nuevos casos (g-l) a `EmailOutboxWorkerThrottleTests.cs`.
11. **Rollback barato**: borrar `Email__Address2..7` en App Service → la computed `Senders` filtra vacíos → sistema vuelve a single-sender sin redeploy.
12. **Plan 24 (CrossChex job) NO requiere sender dedicado** — decisión Q5 del chat de diseño, ya documentada en maestro.

## FUERA DE ALCANCE

- **Chat B — F5.6 FE** (widget `/api/email-outbox/throttle-status` + componente en `/intranet/admin/bandeja-correos`): ya queda documentado pendiente en maestro fila 22. Generar un nuevo chat file (`013-plan-22-chat-b-fe-throttle-widget.md`) cuando se quiera arrancar.
- **Endpoint BE `/api/email-outbox/throttle-status`** que leerá los 7 counters + domain counter: también queda para Chat B (aunque es BE, va junto con el FE que lo consume).
- **Plan 24 (CrossChex job)**: sin cambios, comparte los 7 senders.
- **Distribución entre 2 dominios**: fuera de alcance — el diseño asume todos los senders en `@laazulitasac.com`. Si el usuario distribuye en el futuro, counter de dominio debe agrupar por `SUBSTRING(EO_Remitente, CHARINDEX('@', EO_Remitente)+1, LEN(EO_Remitente))`. Queda como chat posterior.
- **Reclasificación de 7 FAILED históricos del bug auth F2** (2026-04-07): NO tocar.
- **Routing inteligente por tipo** (ej. asistencia→sender[0], admin→sender[3]): NO. Round-robin es más simple y balancea mejor.

## CRITERIOS DE CIERRE

```
Build + tests
[ ] `dotnet build Educa.API/Educa.API.csproj` limpio
[ ] `dotnet test Educa.API.Tests/Educa.API.Tests.csproj` = 872+ verdes, 0 regresiones
[ ] `EmailOutboxWorker.cs` ≤ 300 líneas (actualmente 293)
[ ] `EmailOutboxWorker.Sender.cs` ≤ 300 líneas (actualmente 106)
[ ] `QuotaThrottleService.cs` ≤ 300 líneas (actualmente 160)
[ ] `EmailSettings.cs` ≤ 300 líneas (actualmente 117)

SQL
[ ] Script 3.1 (ALTER EO_Remitente) ejecutado en prueba → validado → prod
[ ] Script 3.2 (UPDATE backfill con sistemas@laazulitasac.com) ejecutado → sin_remitente = 0 en ambas
[ ] Script 3.3 (CREATE INDEX IX_EmailOutbox_Remitente_FechaEnvio_Sent) ejecutado en prueba → prod
[ ] Script 3.4 (ALTER EO_IntentosPorCuota) ejecutado en prueba → prod
[ ] Query verificación corrida en prod: sin_remitente = 0, con_contador_cero = total

Commits
[ ] Commit BE en `Educa.API/master` con el mensaje exacto del template F5+F6
[ ] Commit FE en `educa-web/main` con el mensaje del maestro
[ ] Push BE + FE a origin
[ ] Azure App Service recibió el deploy del BE (verificar en portal o Kudu)

Post-deploy (24-48h)
[ ] Distribución SQL ejecutada: los 7 senders enviando (ninguno en 0)
[ ] bloqueados_por_cuota = 0 o documentado por qué no lo es
[ ] Feedback al usuario según sección CIERRE de este archivo

Limpieza
[ ] Mover `011-plan-22-chat-a-be-smtp-throttle-multisender.md` a `closed/`
[ ] Mover este archivo (`012-plan-22-chat-a-cierre-tests-sql-deploy.md`) a `closed/`
[ ] Maestro: marcar Plan 22 fila 22 como "F5+F6 ✅ cerrado 2026-04-21 (Chat A + Chat A cierre)" y subir % a ~70-75% (queda Chat B FE + F4 BE/FE)
```

## COMMIT MESSAGE sugerido

**Para el BE** (`Educa.API/master`):

Usar el mensaje del template F5+F6 incluido arriba en §3.3. Reglas cubiertas:

- Idioma inglés, modo imperativo.
- Español solo entre `"..."` para dominio: `"EO_Remitente"`, `"EO_IntentosPorCuota"`, `"EO_Intentos"`, `"EO_TipoFallo"`, `"EO_ProximoIntento"`, `"FAILED_QUOTA_EXCEEDED"`.
- NO `Co-Authored-By`.
- Subject ≤ 72 chars (`feat(correos): Plan 22 F5+F6 — SMTP outbound throttle with 7 senders` → 70 chars ✓).

**Para el FE** (`educa-web/main`):

```
docs(maestro): Plan 22 F5+F6 landed — update inventory and SMTP section

Reflect the merged F5+F6 (SMTP outbound throttle with 7-sender
round-robin) in inventory row 22 (F1-F3 closed, F5+F6 Chat A shipped,
F5.6 Chat B FE pending). Mark decisions taken in the "Restriccion
critica SMTP" section. Update Plan 24 row: no dedicated sender
needed, the 7-pool suffices.
```

Reglas:

- Inglés, modo imperativo.
- Español solo entre `"..."` para referencia textual al nombre de sección.
- NO `Co-Authored-By`.
- Subject `docs(maestro): Plan 22 F5+F6 landed — update inventory and SMTP section` = 71 chars ✓.

## CIERRE

Al terminar el chat, pedir feedback sobre:

1. **Distribución observada entre los 7 senders** en 24-48h post-deploy (query en §3.5). Si hay disparidad > 30% entre más usado y menos usado, revisar round-robin (posible bias por restart del worker que resetea `_lastSenderIndex = -1`).
2. **Eventos `FAILED_QUOTA_EXCEEDED`** en 48h. Si aparecen > 0:
   - ¿Qué operación legítima saturó los 7 senders 5h seguidas? (probablemente batch admin)
   - ¿Subir `Email__ThrottleMaxReintentosCuota` (5 → 10)?
   - ¿Diseñar un job "deferred-by-design" para esa operación?
3. **¿Los 7 buzones quedaron en el mismo dominio?** Si el usuario distribuyó entre 2 dominios, el counter de dominio debe agrupar por `SUBSTRING(EO_Remitente, ...)`. Queda como chat posterior si aplica.
4. **Widget FE de Chat B**: ¿arranca inmediato (antes de acumular datos reales) o espera 1-2 semanas para tener distribución real? Ambas válidas. Recomendación: arrancar con mocks/seed data y esperar datos reales para refinar.
5. **¿Cómo reaccionó el volumen de correos?** Pre-Chat A eran ~2788/30d descartando ~270 en picos. Post-deploy debería enviar > 98% de los encolados.

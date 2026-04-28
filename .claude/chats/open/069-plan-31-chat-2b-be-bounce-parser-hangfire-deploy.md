> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Plan**: 31 · **Chat**: 2b · **Fase**: F2.BE · **Estado**: ⏳ pendiente arrancar — bloqueado hasta que 038 (Chat 2a) cierre.
> **Creado**: 2026-04-28 · **Modo sugerido**: `/execute` directo (scope chico).

---

# Plan 31 Chat 2b — Wiring Hangfire del bounce parser + smoke prod

## CONTEXTO

Derivado del split de 038 el 2026-04-28. El Chat 2a (038) implementa todo el código del parser IMAP — modelos, parser puro, correlator, service orquestador, wrapper `IImapMailClient` y los 14 tests con stub. **No registra el job de Hangfire ni configura credenciales IMAP**, así que sale a producción dormido (clases existen pero nadie las invoca).

Este chat es la pieza final: registrar el job, cargar credenciales en App Service y validar end-to-end en producción.

## PRE-REQUISITO

✅ **Chat 2a (038) cerrado y mergeado a `master`** — todas las clases del parser deben existir y la suite BE pasar verde.

✅ **Decisión 1 del usuario**: lista de los 7 buzones del pool + estrategia de credenciales IMAP. Opciones:
- **A**. Reusar credenciales del pool SMTP existente (`Email:Senders[i].Username/Password`) — asume mismo usuario para SMTP saliente e IMAP entrante. Requiere que el hosting cPanel use mismo login.
- **B**. Sub-objeto separado `Email:BounceParser:ImapCredentials[]` con `Mailbox` + `Username` + `Password` por buzón. Más flexible si las credenciales difieren.

Recomendación: **A** si los buzones SMTP del pool son las mismas direcciones que reciben NDRs (es lo normal en cPanel). El parser lee `EmailSettings.Senders` que ya está configurado.

✅ **Decisión 2 del usuario**: política de carpeta `Processed/`.
- **A**. El parser la crea automáticamente la primera vez en cada buzón con `personal.CreateAsync("Processed", true, ct)`. Fail-safe si ya existe.
- **B**. El usuario crea manualmente las 7 subcarpetas desde Roundcube antes del primer ciclo. El parser solo verifica existencia y escribe.

Recomendación: **A** — sin overhead manual, idempotente, alineado con cómo `EmailService.SaveToSentFolder` ya maneja la carpeta `Sent`.

## ALCANCE

### Archivos a CREAR (1)

| # | Archivo | Rol |
|---|---------|-----|
| 1 | `Educa.API/Services/Sistema/BounceParserJob.cs` | Wrapper Hangfire (~40 ln). Constructor `IServiceScopeFactory`, método `EjecutarAsync()` que crea scope, resuelve `IBounceParserService`, llama `RunCycleAsync(CancellationToken.None)`. Sigue patrón de `ReporteFallosCorreoAsistenciaJob.cs`. INV-S07 obligatorio. |

### Archivos a MODIFICAR (3)

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `Educa.API/Constants/Sistema/HangfireJobs.cs` | Agregar `public const string BounceParser = "bounce-parser-imap";` |
| 2 | `Educa.API/Extensions/HangfireExtensions.cs` | Registrar al final de `UseHangfireServices` con `RecurringJob.AddOrUpdate<BounceParserJob>(HangfireJobs.BounceParser, job => job.EjecutarAsync(), settings.Enabled ? "*/5 * * * *" : Cron.Never(), peru)`. El gate `Enabled` permite rollback rápido sin redeploy. |
| 3 | `Educa.API/Extensions/ServiceExtensions.cs` (o donde se hace DI) | Registrar `BounceParserJob` como Scoped. |

### Configuración App Service (Azure Portal — ejecuta el usuario)

Confirmar que estas env vars (ya configuradas el 2026-04-24 según pre-work del brief original):

```
Email__BounceParser__Enabled=true
Email__BounceParser__PollingIntervalMinutes=5
Email__BounceParser__FoldersToScan__0=INBOX
Email__BounceParser__FoldersToScan__1=INBOX.Junk
Email__BounceParser__FoldersToScan__2=INBOX.Trash
Email__BounceParser__ProcessedFolderName=Processed
Email__BounceParser__FallbackMatchWindowMinutes=120
Email__BounceParser__MaxNdrsPerBuzonPerCycle=50
```

Si la decisión 1 es **B** (credenciales separadas), agregar también:

```
Email__BounceParser__ImapCredentials__0__Mailbox=sistemas1@laazulitasac.com
Email__BounceParser__ImapCredentials__0__Username=...
Email__BounceParser__ImapCredentials__0__Password=...
... (×7)
```

### TESTS MÍNIMOS

| # | Caso |
|---|------|
| 1 | `BounceParserJob` — `EjecutarAsync` resuelve scope y llama `RunCycleAsync` |
| 2 | `BounceParserJob` — INV-S07: si `RunCycleAsync` lanza, log error + return (no propaga) |
| 3 | `HangfireExtensions` (si testeable) — registra `bounce-parser-imap` con cron `*/5 * * * *` cuando `Enabled=true` |
| 4 | `HangfireExtensions` — registra con `Cron.Never()` cuando `Enabled=false` |

Tests #3-#4 requieren testing infra de Hangfire que puede no estar disponible. Si no, dejarlos como verificación manual post-deploy.

### Verificación post-deploy (smoke prod)

```
1. /hangfire/recurring → entrada "bounce-parser-imap" con last execution reciente, sin error
2. SELECT TOP 10 * FROM BounceParserProcessed ORDER BY BPR_FechaReg DESC
   → al menos 1 fila después del primer ciclo (5-10 min post-deploy)
3. Roundcube sistemas6@ → carpeta "Processed" creada, NDRs viejos del INBOX movidos ahí
4. Probar NDR fresco: enviar correo a buzón inválido → esperar NDR → verificar
   - BounceParserProcessed registra el NDR con BPR_CorrelationSource="header"
   - EmailOutbox.EO_BounceSource="async-imap"
   - EmailOutbox.EO_BounceDetectedAt poblado
5. Si tras 30 min hay 0 filas en BounceParserProcessed → bug de credenciales o de
   conexión IMAP. Revisar logs de App Service buscando "BounceParser" warnings.
```

## REGLAS OBLIGATORIAS

- ✅ **300 líneas máximo** por archivo (job es ~40 ln, sin riesgo)
- ✅ **INV-S07** en `BounceParserJob.EjecutarAsync` — try/catch global
- ✅ **Structured logging** con scope id

## FUERA DE ALCANCE

- ❌ NO modificar el código del parser (vive en 038)
- ❌ NO crear endpoint admin para listar `BounceParserProcessed` (Chat 3 FE)
- ❌ NO crear widget FE (Chat 3 — sigue como 070+ a definir)
- ❌ NO documentar INV-MAIL05 (Chat 3 FE)
- ❌ NO purgar carpeta `Processed/` (chat futuro si crece)

## CRITERIOS DE CIERRE

```
[ ] BounceParserJob.cs creado (~40 ln, INV-S07)
[ ] HangfireJobs.BounceParser constante agregada
[ ] HangfireExtensions registra el job con gate Enabled (cron */5 si on, Never si off)
[ ] BounceParserJob registrado como Scoped en DI
[ ] 2-4 tests del job verdes
[ ] Suite BE intacta
[ ] dotnet build · dotnet test verdes
[ ] Confirmación de credenciales IMAP en App Service (decisión 1 aplicada)
[ ] Deploy a Azure App Service
[ ] /hangfire muestra el job activo
[ ] Después de 10 min: ≥1 fila en BounceParserProcessed
[ ] Carpeta Processed/ creada en sistemas6@ (verificable en Roundcube)
[ ] NDR fresco end-to-end: bounce 5.x.x → BounceParserProcessed registrado, EO_BounceSource="async-imap"
[ ] Memoria nueva: "Bounce parser IMAP activo desde {fecha}"
[ ] Desbloquea Plan 37 Chat 1 (066)
```

## COMMIT MESSAGE sugerido

```
feat(email-outbox): wire bounce parser IMAP to Hangfire recurring job

- Add "BounceParserJob" Hangfire wrapper with scope factory pattern
  (consistent with "ReporteFallosCorreoAsistenciaJob")
- Register "bounce-parser-imap" recurring job at "*/5 * * * *" Peru
  time, gated by "BounceParserSettings.Enabled" — disabled flag swaps
  the cron to "Cron.Never()" enabling fast rollback without redeploy
- Add "HangfireJobs.BounceParser" constant for symbolic reference

Plan 31 Chat 2b — final wiring of the parser implemented in Chat 2a
(commit "<HASH-DEL-038>"). Activates async bounce detection in prod.
```

## DECISIONES PENDIENTES (al inicio del chat)

1. **Decisión 1 confirmada (A o B)** — credenciales IMAP del pool SMTP o sub-objeto separado.
2. **Decisión 2 confirmada (A o B)** — carpeta `Processed/` automática o manual.
3. **¿Plan 37 Chat 1 (066) lo arrancamos inmediatamente después del cierre exitoso de 069 + smoke prod, o esperamos N días de telemetría?** El Plan 37 extiende el parser con tipos de evento adicionales — si arranca antes de tener evidencia de que el parser base funciona, los nuevos eventos pueden contaminar la telemetría inicial. Recomendación: 24-48h de observación tras 069 antes de 066.

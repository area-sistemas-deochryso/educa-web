> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo.
> **Plan**: 22 · **Chat**: A (primero de F5+F6 merged) · **Fase**: F5.1-F5.5 + F6 (multi-sender) · **Estado**: ⏳ pendiente arrancar.

---

# Plan 22 Chat A — F5+F6 BE: SMTP outbound throttle + multi-sender (7 buzones)

## PLAN FILE

- **Maestro**: `../../educa-web/.claude/plan/maestro.md` — fila 22 del inventario + sección `🚨 Restricción crítica — Límites SMTP del hosting (cPanel)`.
- **Plan 22**: `Educa.API/.claude/plan/asistencia-correos-endurecimiento.md` — este chat agrega **F5** y **F6** (fusionadas).
- **Chat de diseño previo (cerrado)**: `../../educa-web/.claude/chats/closed/010-plan-22-design-smtp-throttle-saliente.md`.

## OBJETIVO

Implementar throttle saliente **por remitente y por dominio** en el `EmailOutboxWorker`, con selección dinámica de buzón remitente entre **7 configurados** (1 existente + 6 nuevos aprobados por el usuario). Respetar los techos del hosting cPanel:

- 50 envíos/hora por buzón individual
- **200 envíos/hora por dominio** ← cuello de botella efectivo real
- 300 envíos/hora por cuenta cPanel (cubierto por el de dominio)

Los picos históricos llegaron a **320/h** (20-abril 17:00), descartando silenciosamente ~270 correos. Con 7 remitentes el techo efectivo sube a 200/h (4× el actual). La mayoría de picos históricos (97-115/h) quedan dentro; solo los extremos requieren re-enqueue diferido.

**Entregable único**: docs (plan 22 + maestro) + código BE + migración SQL + tests + commit.

## PRE-WORK

### 1. Confirmación al arrancar el chat

El diseño asume:

- [ ] **Todos los 7 buzones están en el mismo dominio** (ej. `*@laazulitasac.com`). Si no, el counter de dominio necesita agrupar por dominio parseado de `EO_Remitente`.
- [ ] **Misma cuenta cPanel** y mismo servidor SMTP `mail.deochrysosac.com`.
- [ ] **Los 6 nuevos buzones ya están creados en cPanel** (o se crean durante este chat). El chat NO despliega a prod hasta que los 7 estén operativos.

Si alguna respuesta es distinta, pausar y revalidar.

### 2. Índice SQL del chat de diseño — ✅ YA EJECUTADO (2026-04-21)

Este índice sirve para el **counter por dominio** (COUNT sin filtrar por remitente):

```sql
CREATE INDEX IX_EmailOutbox_FechaEnvio_Sent
ON EmailOutbox(EO_FechaEnvio)
WHERE EO_Estado = 'SENT' AND EO_FechaEnvio IS NOT NULL;
```

### 3. Nuevas migraciones SQL de este chat

**Mostrar al usuario antes de ejecutar**. Primero en **prueba**, validar, luego **producción**.

```sql
-- 3.1 — Columna nueva para remitente (nullable en histórico)
ALTER TABLE EmailOutbox
ADD EO_Remitente NVARCHAR(200) NULL;

-- 3.2 — Backfill: marcar filas históricas con el remitente único que usaban
-- El valor exacto lo da el usuario (Email__Address actual en prod)
UPDATE EmailOutbox
SET EO_Remitente = '<EMAIL_ADDRESS_ACTUAL>'
WHERE EO_Remitente IS NULL;

-- 3.3 — Índice filtrado para counter per-sender
CREATE INDEX IX_EmailOutbox_Remitente_FechaEnvio_Sent
ON EmailOutbox(EO_Remitente, EO_FechaEnvio)
WHERE EO_Estado = 'SENT' AND EO_FechaEnvio IS NOT NULL;

-- 3.4 — Verificación del backfill
SELECT
  COUNT(*)                         AS total,
  COUNT(EO_Remitente)              AS con_remitente,
  COUNT(*) - COUNT(EO_Remitente)   AS sin_remitente
FROM EmailOutbox;
-- Esperado: sin_remitente = 0
```

## DECISIONES DEL DISEÑO (inmutables — acordadas con el usuario)

| # | Pregunta | Decisión |
|---|----------|----------|
| Q1 | Dónde throttle | **Worker (post-enqueue)**. Enqueue acepta todo (INV-S07). Worker elige remitente + chequea cuota pre-send |
| Q2 | Algoritmo | **Sliding window 60 min**. Dos counters: per-sender (≤ 50/h) + per-domain (≤ 200/h) |
| Q2-bis | ¿Contar bounces? | **No (solo SENT)** — supuesto verificable post-deploy |
| Q3 | Granularidad | **Per-sender + per-domain** (dos counters) |
| Q4 | Al saturar | Primero probar siguiente remitente (round-robin). Si TODOS saturan → re-enqueue con `EO_ProximoIntento = min(EO_FechaEnvio del domain window) + 60min + jitter(1-5 min)`. Tras `ThrottleMaxReintentosCuota` reintentos → `FAILED_QUOTA_EXCEEDED` |
| Q5 | Plan 24 | **Comparte los 7 senders**. NO requiere sender dedicado |
| **Q6** | Selección | **Round-robin stateful**: worker guarda `lastIndex` en memoria. Siguiente pick = `(lastIndex + 1) mod 7`. Si saturado, continúa hasta encontrar uno disponible. Si los 7 saturan → re-enqueue |

## ALCANCE

### Archivos a **crear**

| Archivo | Rol | LN |
|---------|-----|---:|
| `Educa.API/Models/Sistema/SenderConfig.cs` | Clase simple: `Address`, `Password`, `DisplayName` | ~15 |
| `Educa.API/Services/Notifications/QuotaThrottleService.cs` | Lógica pura: sliding window per-sender + per-domain + round-robin + cálculo de próximo slot con jitter | ~150-180 |
| `Educa.API/Interfaces/Services/Notifications/IQuotaThrottleService.cs` | Contrato: `SelectAvailableSenderAsync`, `CheckQuotaAsync`, `CalculateNextSlotAsync` | ~25 |
| `Educa.API.Tests/Services/Notifications/QuotaThrottleServiceTests.cs` | Unit tests | ~250-300 |

### Archivos a **modificar**

| Archivo | Cambio | LN |
|---------|--------|---:|
| `Educa.API/Models/Sistema/EmailSettings.cs` | **Non-breaking**. Mantener `Address`, `Password`, `DisplayName` existentes (sender 1). Agregar 6 pares planos: `Address2..Address7`, `Password2..Password7`, `DisplayName2..DisplayName7` (todos `string = ""` default). Agregar computed `IReadOnlyList<SenderConfig> Senders => BuildSenders()` que materializa la lista filtrando slots con Address vacío. Agregar 5 props de throttle con defaults (`ThrottleEnabled=true`, `ThrottleLimitPerHour=50`, `ThrottleLimitPerDomainPerHour=200`, `ThrottleJitterMaxMinutes=5`, `ThrottleMaxReintentosCuota=5`). Mantener `SmtpServer/ImapServer/SmtpPort/ImapPort/CopiaAsistenciaEmail` | 24→~75 |
| `Educa.API/Models/Sistema/EmailOutbox.cs` | Agregar prop `EO_Remitente` (NVARCHAR 200, nullable) | +5 |
| `Educa.API/Services/Notifications/EmailOutboxWorker.cs` | Inyectar `IQuotaThrottleService`. Pre-send: `SelectAvailableSenderAsync`. Asignar `entry.EO_Remitente = sender.Address`. Si ninguno disponible → re-enqueue con próximo slot. Max reintentos → `FAILED_QUOTA_EXCEEDED` | +60-80 (actual 273 → ≤ 340. Si supera 300 **dividir** extrayendo `ApplyQuotaPolicy` / `SelectSenderAndSend`) |
| `Educa.API/Services/Integraciones/EmailService.cs` | `SendEmailOnceAsync` acepta `SenderConfig` como parámetro (en vez de leer de config). Caller pasa el elegido | +10-15 |
| `Educa.API/Services/Notifications/EmailNotificationService.cs` | Si lee `EmailSettings.Address` directamente, refactorizar (el sender se elige al enviar, no al encolar) | +5-10 |
| `Educa.API/Helpers/Formatting/SmtpErrorClassifier.cs` | Agregar constante `FAILED_QUOTA_EXCEEDED` | +3-5 |
| `Educa.API.Tests/Services/Notifications/EmailOutboxWorkerTests.cs` | 6 casos nuevos (ver TESTS) | +150-200 |
| `Educa.API/appsettings.json` | Reemplazar bloque `Email` con estructura nueva (7 senders, passwords vacíos) + throttle settings | ~+25 |
| `Educa.API/Extensions/ServiceExtensions.cs` | DI: `IQuotaThrottleService` → `QuotaThrottleService` (Scoped) | +1 |

### Plan files a **actualizar**

| Archivo | Cambio |
|---------|--------|
| `Educa.API/.claude/plan/asistencia-correos-endurecimiento.md` | Sección **F5+F6 merged** con desglose F5.1-F5.5 + F6.1-F6.3 + 3 scripts SQL documentados |
| `../../educa-web/.claude/plan/maestro.md` | Fila 22: "F1-F4 cerrados, F5+F6 Chat A en progreso". Sección 🚨 SMTP con decisiones. Fila 24: "Plan 24 comparte 7-pool, sin F7 dedicado" |

## CONTADOR DE REINTENTOS POR CUOTA

Misma decisión que en diseño original — **Opción 1** (reutilizar `EO_Intentos`) por simplicidad. Si confusión en UI admin → migrar a columna nueva `EO_IntentosPorCuota` en chat posterior.

**Validar con el usuario al arrancar**: confirmar Opción 1 o preferir Opción 2.

## VARIABLES DE APP SERVICE (convención flat — usuario decidió no usar Key Vault)

Se mantienen las **3 vars existentes sin cambio** (sender primario). Se agregan **18 nuevas** (6 senders × 3 campos) + **5 nuevas de throttle**. **Total nuevas: 23 variables**. No se renombra ni elimina nada de lo existente.

**Throttle settings — nuevas (5):**

```
Email__ThrottleEnabled                = true
Email__ThrottleLimitPerHour           = 50
Email__ThrottleLimitPerDomainPerHour  = 200
Email__ThrottleJitterMaxMinutes       = 5
Email__ThrottleMaxReintentosCuota     = 5
```

**Sender 1 — existente, sin cambio:**

```
Email__Address      = <email1>     ← ya configurado en prod
Email__Password     = <pwd1>       ← ya configurado en prod
Email__DisplayName  = <nombre1>    ← ya configurado en prod
```

**Senders 2-7 — nuevas (6 × 3 = 18):**

```
Email__Address2     = <email2>
Email__Password2    = <pwd2>
Email__DisplayName2 = <nombre2>

Email__Address3     = <email3>
Email__Password3    = <pwd3>
Email__DisplayName3 = <nombre3>

Email__Address4     = <email4>
Email__Password4    = <pwd4>
Email__DisplayName4 = <nombre4>

Email__Address5     = <email5>
Email__Password5    = <pwd5>
Email__DisplayName5 = <nombre5>

Email__Address6     = <email6>
Email__Password6    = <pwd6>
Email__DisplayName6 = <nombre6>

Email__Address7     = <email7>
Email__Password7    = <pwd7>
Email__DisplayName7 = <nombre7>
```

**Rollback barato**: si se borran las vars `Email__Address2`..`Email__Address7` del App Service, el sistema vuelve automáticamente a single-sender sin redeploy — el modelo `BuildSenders()` filtra slots con `Address` vacío. El sender 1 (el original) sigue funcionando intacto.

**User Secrets locales** (dev):

```bash
cd Educa.API/Educa.API
# Sender 1 (ya debería estar configurado localmente, si no):
dotnet user-secrets set "Email:Address"  "<email1>"
dotnet user-secrets set "Email:Password" "<pwd1>"

# Senders 2-7 (nuevos):
dotnet user-secrets set "Email:Address2"  "<email2>"
dotnet user-secrets set "Email:Password2" "<pwd2>"
dotnet user-secrets set "Email:DisplayName2" "<nombre2>"
# ... repetir para 3-7
```

## TESTS MÍNIMOS

### `QuotaThrottleServiceTests.cs` (nuevo — 13 casos)

| Test | Setup | Esperado |
|------|-------|----------|
| `SelectSender_AllAvailable_ReturnsFirst` | 7 senders, 0 envíos | sender[0] |
| `SelectSender_RoundRobin_ReturnsNextAfterLast` | lastIndex=2 | sender[3] |
| `SelectSender_FirstSaturated_SkipsToNext` | sender[0]=50 envíos, resto=0 | sender[1] |
| `SelectSender_DomainSaturated_ReturnsNull` | 200 envíos totales últimos 60 min | null |
| `SelectSender_AllSendersSaturated_ReturnsNull` | 7× 50 envíos | null |
| `CheckQuota_WithZeroSent_ReturnsAvailable` | 0 SENT para sender X | available=true, count=0 |
| `CheckQuota_With49Sent_ReturnsAvailable` | 49 SENT de sender X | available=true, count=49 |
| `CheckQuota_With50Sent_ReturnsSaturated` | 50 SENT de sender X | available=false |
| `CheckQuota_OnlySentCountedNotFailed` | 10 SENT + 100 FAILED de sender X | count=10 |
| `CheckQuota_ExpiredWindow_NotCounted` | SENT hace 61+ min | count=0 |
| `CalculateNextSlot_AddsJitterWithinRange` | min(FechaEnvio) domain = 10:00 | next in [11:01, 11:05] |
| `Throttle_WhenDisabled_AlwaysReturnsFirstSender` | `ThrottleEnabled=false`, 1000 SENT | sender[0] sin chequear |
| `SelectSender_WhenNoSendersConfigured_Throws` | `Senders.Count==0` | `InvalidOperationException` |

### `EmailOutboxWorkerTests.cs` (ampliar — 6 casos)

| Test | Setup | Esperado |
|------|-------|----------|
| `ProcessNext_SenderAvailable_SendsNormally` | 7 senders, counters 0, correo PENDING | SENT, `EO_Remitente=sender[0]`, `EO_FechaEnvio` seteada |
| `ProcessNext_FirstSenderSaturated_UsesSecond` | sender[0]=50, sender[1]=0 | `EO_Remitente=sender[1]`, envío OK |
| `ProcessNext_AllSendersSaturated_ReEnqueuesWithNextSlot` | 7× 50 envíos | sigue PENDING, `EO_ProximoIntento` calculado, `EO_Intentos++`, `EO_Remitente` sigue NULL |
| `ProcessNext_DomainSaturated_ReEnqueues` | 200 totales, per-sender OK | sigue PENDING, `EO_ProximoIntento` seteado |
| `ProcessNext_SaturatedFiveTimes_MarksFailedQuotaExceeded` | 5ta vez diferido | FAILED, `EO_TipoFallo=FAILED_QUOTA_EXCEEDED` |
| `ProcessNext_ThrottleDisabled_UsesFirstSenderAlways` | `ThrottleEnabled=false`, 1000 envíos | Envía con sender[0] sin chequeo |

## REGLAS OBLIGATORIAS

- **INV-S07** (fire-and-forget): si `QuotaThrottleService` tira excepción inesperada, loguear `LogError` y proceder al envío normal con sender[0] (fail-open). NO tumbar el worker.
- **INV-AD01** (canales de mutación): `EnqueueAsync` sigue aceptando todo. Throttle vive solo en el worker.
- **Cap 300 líneas** en `.cs` (`backend.md`). Si `EmailOutboxWorker.cs` supera → extraer `ApplyQuotaPolicy` / `SelectSenderAndSend` a archivo separado. **Regla dura, sin excepciones salvo `ApplicationDbContext`.**
- **AsNoTracking()** en queries del sliding window (read-only).
- **Structured logging** con placeholders:
  ```csharp
  _logger.LogInformation("Sender {Address} saturated: {Count}/{Limit}, skipping", address, count, limit);
  _logger.LogWarning("All 7 senders saturated, re-enqueueing {EmailId} for {NextSlot}", id, nextSlot);
  ```
- **NUNCA loguear passwords**. Address sí (no es secreto).
- **Mostrar SQL al usuario** antes de cada migración. Usuario ejecuta en prueba → valida → prod → confirma.
- **Backfill cuidadoso**: antes del UPDATE de EO_Remitente, el usuario confirma el email actual del `Email__Address` en App Service prod.
- **INV-D02** (auditoría): el backfill SET debe ser 1 statement; no logear PII.

## APRENDIZAJES TRANSFERIBLES (del chat de diseño)

1. **Techo efectivo = 200/h por dominio** (no 350/h teórico). Dominio es el cuello de botella real.
2. **Worker solo setea `EO_FechaEnvio` en path SENT** (línea 145 actual). FAILED quedan con NULL. Eso valida contar solo SENT para cuota.
3. **7 FAILED históricos 2026-04-07** son memoria del bug de auth SMTP de F2. **No tocar** — `FAILED_UNKNOWN` permanece.
4. **F2 ya migró hoy** (`EO_TipoFallo`, índice `IX_EmailOutbox_EntidadOrigen_Estado_FechaReg`). No repetir.
5. **Volumen actual (2788/30d) es post-Plan 21 polimórfico** — crece. Config parametrizable = sin redeploy para ajustes.
6. **Picos recurrentes 7-17h** (mayoría 14h, batch post-jornada escolar). F5+F6 los cubre.
7. **Índice `IX_EmailOutbox_FechaEnvio_Sent` ya existe** — sirve para domain counter. Este chat agrega el per-sender.
8. **SMTP compartido**: `mail.deochrysosac.com` sirve todos los buzones del account cPanel. Solo cambian Address + Password.
9. **Errores "Invalid column" de SSMS** fueron caché de IntelliSense. `Ctrl+Shift+R` refresca.
10. **Binding .NET**: decisión del usuario fue convención flat con slots numerados (`Email__Address`, `Email__Address2`..`Email__Address7`) en vez de array nested (`Email__Senders__0__Address`). El modelo expone props planas + una computed `Senders` que materializa la lista filtrando slots con Address vacío. No requiere Key Vault — passwords como env vars directas. Sin breaking change en las 3 vars ya existentes.

## FUERA DE ALCANCE

- **F5.6 FE widget** (endpoint `/api/email-outbox/throttle-status` + widget en `/intranet/admin/bandeja-correos`). Va en **Chat B** (repo `educa-web`). El widget debe mostrar **7 counters** + counter global del dominio.
- **Política de retry F2** (0/1 por causa). Sin cambio. `FAILED_QUOTA_EXCEEDED` es razón nueva para diferir, no cambia clasificación SMTP.
- **Reclasificación de 7 FAILED históricos**. No tocar.
- **Routing inteligente por tipo** (asistencia→sender[0], admin→sender[3]): NO. Round-robin con descarte es más simple.
- **Plan 24** (CrossChex): NO requiere sender dedicado. Nota cruzada.
- **Distribución entre 2 dominios**: NO (asume 7 en 1 dominio). Si el usuario distribuye, ajustar counter de dominio en chat posterior.

## CRITERIOS DE CIERRE

### Implementación

- [ ] `EmailOutboxWorker.cs` ≤ 300 líneas (dividir si supera)
- [ ] `QuotaThrottleService.cs` + interface creados
- [ ] `SenderConfig.cs` creado
- [ ] `EmailSettings.cs` con 6 pares nuevos (Address2-7/Password2-7/DisplayName2-7) + computed `Senders` + throttle props. NO eliminar `Address`/`Password`/`DisplayName` (sender 1 existente)
- [ ] `EmailOutbox.cs` con `EO_Remitente`
- [ ] `EmailService.SendEmailOnceAsync` recibe sender como parámetro
- [ ] `appsettings.json` con nueva estructura
- [ ] DI registrado
- [ ] `FAILED_QUOTA_EXCEEDED` agregado

### Migración SQL

- [ ] Usuario confirmó email actual para el backfill
- [ ] Script 3.1 (ALTER) en prueba → validado → prod
- [ ] Script 3.2 (UPDATE backfill) en prueba → validado → prod, `sin_remitente=0`
- [ ] Script 3.3 (CREATE INDEX) en prueba → prod

### Tests

- [ ] `dotnet build` limpio
- [ ] `dotnet test` 853+ pasan, 0 regresiones
- [ ] 13 + 6 tests nuevos verdes

### Docs

- [ ] Plan 22 actualizado con F5+F6 completo
- [ ] Maestro fila 22, fila 24 (nota cruzada), sección 🚨 SMTP con decisiones tomadas
- [ ] 3 scripts SQL documentados en plan

### App Service (coordinación con usuario)

- [ ] 6 buzones nuevos creados en cPanel antes del deploy
- [ ] 26 env vars configuradas en App Service
- [ ] 7 secrets en Key Vault (`EmailPwd0`-`EmailPwd6`) + Managed Identity
- [ ] No hay vars legacy a eliminar (convención flat conserva las 3 existentes)

### Integración

- [ ] Post-deploy: verificar distribución:
  ```sql
  SELECT EO_Remitente, COUNT(*) FROM EmailOutbox
  WHERE EO_FechaEnvio >= DATEADD(HOUR, -1, SYSDATETIME()) AND EO_Estado = 'SENT'
  GROUP BY EO_Remitente;
  ```
- [ ] Simular saturación (bajar `ThrottleLimitPerHour` a 2 temporal), ver log del throttle, restaurar

### Cierre

- [ ] Commit único (mensaje abajo)
- [ ] Mover archivo a `../../educa-web/.claude/chats/closed/`
- [ ] Feedback al usuario (sección CIERRE)

## COMMIT MESSAGE sugerido

Un solo commit en `Educa.API`:

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
  each row (audit + per-sender counter)
- New IQuotaThrottleService with SelectAvailableSenderAsync (round-robin
  with saturation skip) and CheckQuotaAsync (sliding 60-min window)
- Worker picks sender at send time: first available in round-robin
  order; if all saturated, re-enqueue with "EO_ProximoIntento" = oldest
  envio in domain window + 60 min + jitter(1-5 min)
- After ThrottleMaxReintentosCuota deferred attempts: mark FAILED with
  "FAILED_QUOTA_EXCEEDED"
- EmailService.SendEmailOnceAsync now accepts a SenderConfig parameter
  (breaking — the caller, worker, passes the chosen sender)
- SQL migration: add "EO_Remitente" NVARCHAR(200) NULL, backfill
  historical rows with the primary sender address, create filtered
  index IX_EmailOutbox_Remitente_FechaEnvio_Sent
- Config-driven limits (ThrottleEnabled, ThrottleLimitPerHour,
  ThrottleLimitPerDomainPerHour, ThrottleJitterMaxMinutes,
  ThrottleMaxReintentosCuota) allow tuning without redeploy
- 19 new tests (13 unit for QuotaThrottleService, 6 integration in
  EmailOutboxWorkerTests)

F5.6 (FE widget per-sender + domain counters) is Chat B, scheduled
next. Plan 24 shares the 7-sender pool, no dedicated sender needed.

Close Plan 22 F5.1-F5.5 and F6.1-F6.3.
```

**Reglas commit** (`feedback_commit_style`):

- Idioma **inglés**, modo imperativo.
- Español solo entre `"..."` para dominio (`"EO_Remitente"`, `"EO_TipoFallo"`, `"FAILED_QUOTA_EXCEEDED"`, `"EO_FechaEnvio"`, `"EO_ProximoIntento"`).
- **NUNCA** `Co-Authored-By`.
- Subject ≤ 72 chars.

**Separado en `educa-web`** (si el maestro se actualiza en el mismo chat):

```
docs(maestro): Plan 22 F5+F6 landed — update inventory and SMTP section

Reflect the merged F5+F6 (SMTP outbound throttle with 7-sender
round-robin) in inventory row 22 (F1-F4 closed, F5+F6 Chat A shipped,
F5 Chat B FE pending). Mark decisions taken in the "🚨 Restricción
crítica — Límites SMTP" section. Update Plan 24 row: no dedicated
sender needed, the 7-pool suffices.
```

## CIERRE

Al terminar el chat, pedir feedback sobre:

1. **Distribución observada entre los 7 senders** en 24-48h post-deploy:
   ```sql
   SELECT EO_Remitente, COUNT(*) AS enviados
   FROM EmailOutbox
   WHERE EO_FechaEnvio >= DATEADD(DAY, -1, SYSDATETIME()) AND EO_Estado = 'SENT'
   GROUP BY EO_Remitente ORDER BY enviados DESC;
   ```
   Si hay disparidad alta entre más usado y menos usado, revisar round-robin (puede haber bias por persistencia del `lastIndex` entre restarts).
2. **Eventos `FAILED_QUOTA_EXCEEDED`** en 48h. Si aparecen muchos, alguna operación legítima satura los 7 senders > 5h — considerar subir `ThrottleMaxReintentosCuota` o diseñar "deferred-by-design" (aprobación masiva programada a la noche).
3. **¿Los 7 buzones quedaron en el mismo dominio?** Si el usuario distribuyó entre 2 dominios, counter de dominio necesita agrupar por dominio parseado. Chat posterior.
4. **Widget FE de Chat B**: ¿arranca inmediato o espera días con datos reales? Ambas válidas.

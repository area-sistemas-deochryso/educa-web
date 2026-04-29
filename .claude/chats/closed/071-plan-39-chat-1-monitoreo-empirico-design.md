> **Repo destino**: `Educa.API` + `educa-web` (cierre del design)
> **Plan**: 39 · **Chat**: 1 · **Fase**: F1.Design · **Estado**: ✅ **cerrado 2026-04-29 (design)** — chats 077-081 staged en `open/`
> **Creado**: 2026-04-29 · **Modo sugerido**: `/design` largo (sin `/execute`)
> **Plan paralelo**: Plan 38 (Blacklist) — comparten cross-links pero pueden avanzar en paralelo

---

# Plan 39 Chat 1 — Diseño cerrado del monitoreo basado en evidencia

## CONTEXTO INMEDIATO

Análisis empírico del cPanel Track Delivery (10 días, 327 fallos desde `sistemas*@laazulitasac.com`) hecho el 2026-04-29 reveló:

- **1 destinatario** (`kysa14.1994@gmail.com`) generó 218 hits en 5 días (67% del total). Habría sido prevenible con auto-blacklist al 2º hit.
- **Round-robin desbalanceado**: `sistemas4` lleva 52% de los fallos vs `sistemas3` con 2%. Hoy no se ve en ninguna pantalla.
- **Spike acumulativo**: 169 fallos el 27-abr arrastran al 28 (68) y al 29 (42 antes de las 10am).
- **6 categorías SMTP** con distribución conocida (61% retry pending Exim, 19% domain blocked, 15% mailbox full, 5% otros).

Plan completo: `.claude/plan/monitoreo-empirico-mejoras.md`. Datos crudos del análisis en `outputs/cpanel-fallos-historicos-2026-04-20-29.md` (output de este chat).

## DEPENDENCIAS

- ✅ Plan 35 (hub Monitoreo) ya en producción
- ✅ Plan 29 Chat 2.6 (widget defer-fail) ya tiene endpoint pull — este plan agrega push
- ⚠️ Plan 38 Chat 5 (FE Blacklist) — los cross-links del tile "Candidatos a blacklist" lo necesitan. Los Chats 2-4 BE de Plan 39 no dependen.

## OBJETIVO DE ESTE CHAT

Cerrar el diseño con:

1. SQL exacto de cada una de las 5 agregaciones (sender-stats, top-destinatarios, serie-temporal, dominios-receptores, candidatos-blacklist)
2. Contratos DTO con shape final
3. Mock visual de los 6 tiles del Dashboard (sketch ASCII o Mermaid)
4. Decisión final sobre **Chat 4 (importador SSH de logs Exim)**: GO / HOLD / NO-GO según OPS
5. Decisión sobre **Hub SignalR**: nuevo `EmailHub` o reusar `AsistenciaHub` con grupo

**No se escribe código en este chat.** Solo design + SQL + mocks.

## SCOPE DEL DISEÑO

### 1. SQL de las 5 agregaciones

#### 1.1 `sender-stats` (mapa por sender)

```sql
-- ventana parametrizable, default últimas 7d
SELECT
    EO_Remitente AS Sender,
    COUNT(*) AS Total,
    SUM(CASE WHEN EO_Estado = 'SENT'   THEN 1 ELSE 0 END) AS Enviados,
    SUM(CASE WHEN EO_Estado = 'FAILED' THEN 1 ELSE 0 END) AS Fallidos,
    SUM(CASE WHEN EO_Estado = 'PENDING' THEN 1 ELSE 0 END) AS Pendientes,
    MAX(EO_FechaReg) AS UltimoUso
FROM EmailOutbox
WHERE EO_FechaReg >= @desde
GROUP BY EO_Remitente
ORDER BY Total DESC;
```

#### 1.2 `top-destinatarios`

```sql
-- top N destinatarios con más fallos en ventana
SELECT TOP (@limit)
    EO_Destinatario,
    COUNT(*) AS HitsFallidos,
    COUNT(DISTINCT CAST(EO_FechaReg AS DATE)) AS DiasConFalla,
    SUM(CASE WHEN EO_TipoFallo = 'FAILED_MAILBOX_FULL' THEN 1 ELSE 0 END) AS MailboxFull,
    SUM(CASE WHEN EO_TipoFallo LIKE 'FAILED_%' AND EO_TipoFallo != 'FAILED_MAILBOX_FULL' THEN 1 ELSE 0 END) AS Otros5xx,
    -- ¿está blacklisted hoy?
    CASE WHEN EXISTS (
        SELECT 1 FROM EmailBlacklist b WHERE b.EBL_Correo = EO_Destinatario AND b.EBL_Estado = 1
    ) THEN 1 ELSE 0 END AS YaBlacklisteado
FROM EmailOutbox
WHERE EO_Estado = 'FAILED' AND EO_FechaReg >= @desde
GROUP BY EO_Destinatario
ORDER BY HitsFallidos DESC;
```

#### 1.3 `serie-temporal`

```sql
-- granularidad: 'hour' (last 24h) o 'day' (last 30d)
SELECT
    DATEADD(HOUR, DATEDIFF(HOUR, 0, EO_FechaReg), 0) AS Bucket, -- por hora
    SUM(CASE WHEN EO_Estado = 'SENT' THEN 1 ELSE 0 END) AS Enviados,
    SUM(CASE WHEN EO_Estado = 'FAILED' THEN 1 ELSE 0 END) AS Fallidos,
    SUM(CASE WHEN EO_TipoFallo = 'FAILED_QUOTA_EXCEEDED' THEN 1 ELSE 0 END) AS BloqueadosPorCuota
FROM EmailOutbox
WHERE EO_FechaReg >= @desde
GROUP BY DATEADD(HOUR, DATEDIFF(HOUR, 0, EO_FechaReg), 0)
ORDER BY Bucket;
```

#### 1.4 `dominios-receptores`

```sql
SELECT
    SUBSTRING(EO_Destinatario, CHARINDEX('@', EO_Destinatario) + 1, 100) AS Dominio,
    COUNT(*) AS Total,
    SUM(CASE WHEN EO_Estado = 'FAILED' THEN 1 ELSE 0 END) AS Fallidos
FROM EmailOutbox
WHERE EO_FechaReg >= @desde
GROUP BY SUBSTRING(EO_Destinatario, CHARINDEX('@', EO_Destinatario) + 1, 100)
ORDER BY Total DESC;
```

#### 1.5 `candidatos-blacklist`

```sql
-- destinatarios con ≥2 hits 4.2.2 en última 24h y NO blacklisteados
WITH HitsRecientes AS (
    SELECT EO_Destinatario, COUNT(*) AS Hits, MAX(EO_FechaReg) AS UltimoHit
    FROM EmailOutbox
    WHERE EO_TipoFallo = 'FAILED_MAILBOX_FULL'
      AND EO_FechaReg >= DATEADD(HOUR, -24, SYSUTCDATETIME())
    GROUP BY EO_Destinatario
    HAVING COUNT(*) >= @umbralHits  -- default 2
)
SELECT h.*
FROM HitsRecientes h
WHERE NOT EXISTS (
    SELECT 1 FROM EmailBlacklist b
    WHERE b.EBL_Correo = h.EO_Destinatario AND b.EBL_Estado = 1
)
ORDER BY h.Hits DESC;
```

### 2. Contratos DTO

```csharp
public record SenderStatDto(string Sender, int Total, int Enviados, int Fallidos, int Pendientes, DateTime UltimoUso, double TasaFalloPct);
public record TopDestinatarioDto(string Destinatario, int HitsFallidos, int DiasConFalla, int MailboxFull, int Otros5xx, bool YaBlacklisteado);
public record SerieTemporalPuntoDto(DateTime Bucket, int Enviados, int Fallidos, int BloqueadosPorCuota);
public record DominioReceptorDto(string Dominio, int Total, int Fallidos, double TasaFalloPct);
public record CandidatoBlacklistDto(string Destinatario, int Hits, DateTime UltimoHit);
```

### 3. Mock de los 6 tiles del Dashboard del día

```
┌──────────────────────────────────┐  ┌──────────────────────────────────┐
│ ⚡ DEFER/FAIL EN VIVO  4 / 5     │  │ 📊 SERIE TEMPORAL (24h)          │
│ ⚠️  Próximo al techo cPanel      │  │ ▁▁▂▂▃▅▇█▆▄▃▂▁▁ ...               │
│ Última actualización: 12s ago    │  │ pico: 13:00 (12 fallos)          │
└──────────────────────────────────┘  └──────────────────────────────────┘

┌──────────────────────────────────┐  ┌──────────────────────────────────┐
│ ✉️  SENDER MIX (7d)              │  │ 🎯 TOP DESTINATARIOS FALLIDOS 7d │
│ sistemas4 ████████████████ 52%   │  │ kysa14.1994@... 218  🚩          │
│ sistemas5 █████ 16%              │  │ delacruzsec... 34   ⚠️           │
│ sistemas  ████ 14%               │  │ evaavelle... 17     ✓ blacklist  │
│ ...                              │  │ + 17 con <10 hits                │
└──────────────────────────────────┘  └──────────────────────────────────┘

┌──────────────────────────────────┐  ┌──────────────────────────────────┐
│ 🌐 DOMINIOS RECEPTORES (7d)      │  │ 🚨 CANDIDATOS A BLACKLIST        │
│ gmail.com    1,245   3.2% fail   │  │ Ningún candidato hoy ✓           │
│ hotmail.com    198   8.1% fail   │  │ — — —                            │
│ outlook.com     45   2.2% fail   │  │ Cuando aparezcan: CTA "Bloquear" │
│ otros           23   0.0% fail   │  │ link a /monitoreo/correos/blist  │
└──────────────────────────────────┘  └──────────────────────────────────┘
```

### 4. Endpoints

| Verbo | Path | Query | Resp |
|---|---|---|---|
| GET | `/api/sistema/email-outbox/dashboard/sender-stats` | `?ventanaDias=7` | `ApiResponse<SenderStatDto[]>` |
| GET | `/api/sistema/email-outbox/dashboard/top-destinatarios` | `?ventanaDias=7&limit=10` | `ApiResponse<TopDestinatarioDto[]>` |
| GET | `/api/sistema/email-outbox/dashboard/serie-temporal` | `?granularidad=hour\|day&ventanaDias=` | `ApiResponse<SerieTemporalPuntoDto[]>` |
| GET | `/api/sistema/email-outbox/dashboard/dominios-receptores` | `?ventanaDias=7` | `ApiResponse<DominioReceptorDto[]>` |
| GET | `/api/sistema/email-outbox/dashboard/candidatos-blacklist` | `?umbralHits=2&ventanaHoras=24` | `ApiResponse<CandidatoBlacklistDto[]>` |

Auth: `[Authorize(Roles = Constants.Auth.Roles.Administrativos)]`.

### 5. SignalR — Hub

Decisión a cerrar: **`EmailHub` aparte** o reusar `AsistenciaHub`.

Recomendación: **`EmailHub` aparte**. Costo bajo (~30 LOC), mantiene separación de dominios, evita acoplar SignalR de asistencia con monitoreo de correos. Grupos: `email-alerts` (defer-fail-status), `email-blacklist-changes` (futuro).

Eventos:

- `DeferFailStatusUpdated(int hits, int limit, DateTime ventana)` — push cada vez que cambia el contador
- `CandidatoBlacklistDetectado(string destinatario, int hits)` — push cuando aparece nuevo candidato

## TESTS ESPERADOS

### BE (con seed reproducible del incidente 2026-04-20→29)

1. `EmailMonitoreoServiceTests.SenderStats_DesbalanceadoSistemas4` — `sistemas4` con 52% del volumen, resto distribuido
2. `EmailMonitoreoServiceTests.TopDestinatarios_KysaPrimeraEnDia2` — al día 2 del seed (22-abr) `kysa` ya aparece #1
3. `EmailMonitoreoServiceTests.SerieTemporal_DetectaSpike27Abr` — bucket del 27-abr tiene 169 fallos vs base ~10
4. `EmailMonitoreoServiceTests.DominiosReceptores_GmailDomina` — gmail.com aparece con mayor volumen
5. `EmailMonitoreoServiceTests.CandidatosBlacklist_FiltraYaBlacklisteados` — eva no aparece (ya en blacklist), kysa sí
6. `EmailMonitoreoControllerTests.Auth_NoAdministrativos_Returns403`
7. `EmailMonitoreoControllerTests.Get_VentanaInvalida_Returns400`
8. `EmailHubTests.DeferFailStatusUpdated_PusheaACorrectoGrupo`

### FE

1. Tile "Defer/Fail en vivo" actualiza con SignalR mock sin refresh
2. Tile "Sender mix" muestra barras proporcionales y % calculado
3. Tile "Top destinatarios" link a Blacklist con pre-fill del correo
4. Tile "Candidatos" CTA "Bloquear" abre dialog del Plan 38
5. Banner B9 aparece cuando hits ≥ 4 (mock)
6. Serie temporal toggle hour/day funciona

## DECISIONES A CERRAR EN ESTE CHAT

- [ ] Ventana default para `top-destinatarios`: 7d ó 14d (recomendado: 7d)
- [ ] Umbral de `candidatos-blacklist`: ≥2 hits en 24h (alineado con Plan 38 P1)
- [ ] **GO / HOLD / NO-GO Chat 4** (importador SSH logs Exim) — depende de OPS
- [ ] `EmailHub` aparte vs reusar `AsistenciaHub`
- [ ] Caché del endpoint defer-fail (30s) — sí/no
- [ ] Si los tiles del dashboard usan 1 endpoint agregado o 5 paralelos (recomendado: 5 paralelos, cada uno cacheable independiente)

## VERIFICACIÓN POST-DEPLOY

Smoke checks:

1. `GET /dashboard/top-destinatarios?ventanaDias=7` devuelve `kysa` o cualquier candidato actual.
2. Visualmente: en `/monitoreo/correos/dashboard` los 6 tiles cargan sin errores.
3. Banner B9: provocar 4 hits 4.2.2 en sandbox y verificar que aparece sin refresh.
4. Tile "Candidatos a blacklist" → CTA "Bloquear" → dialog Plan 38 prellenado con el correo.
5. SignalR: monitor con 2 pestañas abiertas, una hace POST mock al hub, la otra recibe el push.

## OUTPUT ESPERADO DE ESTE CHAT

Al cerrar:

- Mover este archivo a `.claude/chats/closed/071-plan-39-chat-1-monitoreo-empirico-design.md` con sección `## DECISIONES FINALES`.
- Crear chats 077-081 en `open/` (Plan 38 ya ocupó 072-076).
- Actualizar `.claude/plan/maestro.md` con entrada Plan 39 (después de Plan 38) y prioridad **ALTA**.
- Snapshot de los datos crudos del análisis (327 fallos) en `outputs/cpanel-fallos-historicos-2026-04-20-29.md` para tests-seed.
- Indicar a Cowork qué archivo abrir como Chat 2.

---

## DECISIONES FINALES (2026-04-29 cierre design)

### D1 · Ventana default `top-destinatarios` = 7d

- **Decisión**: ventana default `?ventanaDias=7`. Configurable hasta `30d` (cap defensivo).
- **Justificación**: el incidente del 2026-04-20→29 entró en 5d completos antes del bloqueo. 7d cubre con margen sin inflar el query plan. 14d duplicaría la ventana sin nuevo insight (los datos del 27-29 son los relevantes para "candidatos actuales"). 30d es el límite duro — más ventana erosiona la idea de "quién está rompiendo HOY".
- **Cap defensivo**: `if (ventanaDias > 30) ventanaDias = 30;` en el service. `if (limit > 50) limit = 50;` para top.

### D2 · Umbral `candidatos-blacklist` = ≥2 hits 4.2.2 en 24h

- **Decisión**: query default `umbralHits=2`, `ventanaHoras=24`. Alineado **exactamente** con `EmailSettings.MailboxFullThresholdHits` y `MailboxFullThresholdHours` que definió Plan 38 D1 (INV-MAIL07).
- **Justificación**: si el endpoint de candidatos usa otro umbral que el handler que blacklistea, el dashboard miente (muestra candidatos que ya estarían siendo blacklisteados o no muestra los que están a punto). Una sola fuente de verdad: los settings de `MailboxFull*`.
- **Implementación**: el service inyecta `IOptions<EmailSettings>` y usa `_settings.MailboxFullThresholdHits` / `MailboxFullThresholdHours` como **defaults reales** (no constantes hardcodeadas en la query). Los query params solo overridean para inspección manual.
- **Filtro**: el query siempre excluye destinatarios que ya están en `EmailBlacklist` con `EBL_Estado = true` (cualquier motivo, no solo `BOUNCE_MAILBOX_FULL` — un correo ya bloqueado por otro motivo no es candidato).

### D3 · Caché de `defer-fail-status` = SÍ, TTL 30s

- **Decisión**: caché en memoria del endpoint `defer-fail-status` (Plan 29 Chat 2.6) con TTL 30s vía `IMemoryCache`.
- **Justificación**: el widget del Plan 22 Chat B polea cada 60s (INV-MAIL04). Caché 30s asegura que dos admins simultáneos no disparen 2 queries seguidas a `EmailOutbox` por el mismo dato — el segundo polleo cae dentro del TTL del primero. Patrón SWR del proyecto: cache hit inmediato + refresh background al expirar.
- **Implementación**: extiende el service `RateLimitDeferFailStatusService` (o equivalente del Plan 29 Chat 2.6) con `IMemoryCache` keyed por dominio. NO aplica a las 5 queries del dashboard nuevo — esas son agregaciones más caras y se cachean según D4.
- **Invalidación**: el push SignalR del Chat B BE (078) **invalida la entrada de cache** antes de pushear el evento. Garantiza que el widget que pollea inmediatamente después del push obtenga el valor actualizado, no el viejo.

### D4 · 5 endpoints paralelos (no agregado), cada uno cacheable independiente

- **Decisión**: los 6 tiles del FE consumen 5 endpoints paralelos (`sender-stats`, `top-destinatarios`, `serie-temporal`, `dominios-receptores`, `candidatos-blacklist`) + 1 endpoint compartido del Plan 29 (`defer-fail-status`). Sin endpoint agregado tipo `/dashboard/all`.
- **Justificación**:
  1. Cada agregación tiene **ventana distinta** (sender-stats default 7d, candidatos default 24h, serie temporal según granularidad). Un endpoint agregado obliga a unificar ventanas o devolver 5 resultados inconsistentes.
  2. Cada tile **cachea independiente** según volatilidad: serie-temporal (24h) → TTL 60s; sender-stats (7d) → TTL 5min; candidatos-blacklist (24h) → TTL 30s; dominios-receptores → TTL 10min; top-destinatarios → TTL 5min. El service `EmailMonitoreoService` aplica `IMemoryCache` por método con keys `monitoreo:{metodo}:{params-hash}`.
  3. **Service Worker SWR**: el FE ya cachea las responses GET via SW (regla `service-worker.md`). 5 endpoints granulares = 5 cache keys independientes en IndexedDB. Un endpoint agregado invalida todo cuando cambia un solo dato.
  4. **Falla parcial**: si `dominios-receptores` falla, los otros 4 tiles cargan. Con endpoint agregado, una falla deja el dashboard vacío (a menos que el agregado tenga try-catch por sub-query, duplicando complejidad).
- **Implicancia**: el FE Chat C (079) carga los 6 tiles en paralelo con `forkJoin` o con `effect()` independiente por tile. Cada tile tiene su propio skeleton (regla `skeletons.md`).

### D5 · `EmailHub` SignalR — **extiende** el hub creado por Plan 39 Chat B (no Plan 38 Chat 6)

> **Hallazgo del pre-work**: Plan 38 D4 dejó implícito quién crea `EmailHub.cs` server-side. La nota *"el hub queda owned por Plan 38 Chat 6 (FE registra el listener)"* solo asignó el listener FE — no el hub server-side.

- **Decisión**: el archivo `Hubs/EmailHub.cs` server-side se crea en **Plan 39 Chat B BE (078)**, no en Plan 38. Plan 38 Chat 2 (072) registra `IEmailHubNotifier` en DI con una implementación **NoOp** (`NullEmailHubNotifier`) que loggea pero no pushea — permite que el handler `MailboxFullBlacklistHandler` invoque `notifier.NotifyBlacklistEntryCreatedAsync(...)` sin esperar al deploy del Chat B.
- **Plan 39 Chat B reemplaza la registration** de `IEmailHubNotifier` por la implementación real (`SignalREmailHubNotifier`) que dispara el push vía `IHubContext<EmailHub>`. Una vez deployado, el handler de Plan 38 ya cableado empieza a pushear de verdad sin tocar su código.
- **Eventos del hub** (todos los maneja Plan 39 Chat B):
  - `BlacklistEntryCreated(string correo, string motivo, int intentos)` — disparado por `MailboxFullBlacklistHandler` (Plan 38 Chat 2) y `EmailBounceBlacklistHandler` (existente refactorizado por Plan 38 Chat 2).
  - `DeferFailStatusUpdated(int hits, int limit, DateTime ventana)` — disparado por `RateLimitDeferFailStatusService` cuando el contador cambia (entry/exit de banda WARNING/CRITICAL — no en cada tick).
  - `CandidatoBlacklistDetectado(string destinatario, int hits)` — disparado por `MailboxFullBlacklistHandler` cuando un hit 4.2.2 acumula `hits == thresholdHits - 1` (es decir, un hit antes de auto-blacklist) — sirve como "early warning" al admin.
- **Grupos**: `email-alerts` (mismo grupo para los 3 eventos). Auth `[Authorize(Roles = Constants.Auth.Roles.Administrativos)]` en el hub.
- **Coordinación con Plan 38 Chat 6 FE (076)**: se ajusta el brief 076 para listar EXPLÍCITAMENTE que el listener escucha los 3 eventos (no solo `BlacklistEntryCreated`). El listener desambigua por nombre del evento.
- **Quitar de la cola**: el item Plan 38 Chat 6 sigue siendo FE-only (banner B9 + toast + listener). El Plan 39 Chat B BE (078) entrega el hub. Pre-req: 078 deployado **antes** que 076.

### D6 · Chat 4 (importador SSH logs Exim) = **HOLD**

- **Decisión**: HOLD (no GO, no NO-GO). Se difiere a Chat 081 stage en `open/` con flag `<!-- on-hold-criteria-pending -->`.
- **Justificación**: agregar SSH a la matriz operativa es costo permanente (credenciales en KeyVault, paridad dev/prod del path Exim, idempotencia por `messageId`, parser brittle frente a cambios de versión Exim). El Plan 38 Chat 2 (`MailboxFullBlacklistHandler`) **ataca el 67% del incidente del 2026-04-29** (218/327 hits eran de `kysa14.1994` con 4.2.2 crónico, exactamente el caso que cubre el handler). Las otras categorías (RETRY_PENDING 61%, DOMAIN_BLOCKED 19%) no las soluciona el importador SSH — las soluciona el Plan 38 Chat 2 + Plan 29 OPS Chat 3. Antes de invertir en el importador hay que medir cuánto destapa el Plan 38 Chat 2 en producción.
- **Criterios de reactivación a GO** (cualquiera de los 3 dispara):
  1. **30 días post-deploy de Plan 38 Chat 2 (072)**: si el contador `EmailBlacklistHits{motivo=BOUNCE_MAILBOX_FULL}` no captura ≥80% de los destinatarios que terminaron en `DOMAIN_BLOCKED` (medible cruzando `EmailBlacklist` con eventos de bloqueo del dominio en cPanel via OPS), el handler está perdiendo casos → SSH es necesario para análisis retrospectivo.
  2. **OPS aprueba SSH explícitamente** (Plan 29 Chat 3 OPS pendiente — si OPS abre acceso, el costo de credenciales ya está pagado).
  3. **Aparece un incidente que requiera análisis >10d retro** (cPanel pierde Track Delivery a 10d). Si pasa una vez, es ruido. Si pasa dos veces en un trimestre, GO.
- **Si ninguno se cumple en 90 días post-cierre del Plan 39 Chat A+B+C+D**: NO-GO definitivo. Migrar el item a `closed/` con motivo "no se justificó" y archivar el plan.

### D7 · SQL final de las 5 agregaciones (con índices, caps y proyección cerrada)

#### D7.1 · `sender-stats` (mapa por sender)

```sql
-- ventana parametrizable (cap 30d), default últimas 7d.
-- Índice esperado: IX_EmailOutbox_FechaReg_Estado_TipoFallo (creado en Chat A — D9).
DECLARE @desde DATETIME2 = DATEADD(DAY, -@ventanaDias, SYSUTCDATETIME());

SELECT
    EO_Remitente AS Remitente,
    COUNT(*) AS Total,
    SUM(CASE WHEN EO_Estado = 'SENT'    THEN 1 ELSE 0 END) AS Enviados,
    SUM(CASE WHEN EO_Estado = 'FAILED'  THEN 1 ELSE 0 END) AS Fallidos,
    SUM(CASE WHEN EO_Estado = 'PENDING' THEN 1 ELSE 0 END) AS Pendientes,
    MAX(EO_FechaReg) AS UltimoUso,
    -- Tasa de fallo en %, redondeada a 2 decimales. Pendientes NO suman al denominador
    -- (todavía no son ni éxito ni fallo). Mismo criterio en TasaFalloPct de los demás endpoints.
    CAST(
        CASE
            WHEN SUM(CASE WHEN EO_Estado IN ('SENT','FAILED') THEN 1 ELSE 0 END) = 0 THEN 0
            ELSE 100.0 * SUM(CASE WHEN EO_Estado = 'FAILED' THEN 1 ELSE 0 END)
                       / SUM(CASE WHEN EO_Estado IN ('SENT','FAILED') THEN 1 ELSE 0 END)
        END
        AS DECIMAL(5,2)
    ) AS TasaFalloPct
FROM EmailOutbox
WHERE EO_FechaReg >= @desde
  AND EO_Remitente IS NOT NULL  -- excluye filas pre-multi-sender (Plan 22 F6 backfill)
GROUP BY EO_Remitente
ORDER BY Total DESC;
```

#### D7.2 · `top-destinatarios`

```sql
-- top N destinatarios con más fallos en ventana, default 7d, cap N=50, cap ventana 30d.
-- "YaBlacklisteado" = existe entrada activa con cualquier motivo (no solo BOUNCE_MAILBOX_FULL).
DECLARE @desde DATETIME2 = DATEADD(DAY, -@ventanaDias, SYSUTCDATETIME());

SELECT TOP (@limit)
    EO_Destinatario AS Destinatario,
    COUNT(*) AS HitsFallidos,
    COUNT(DISTINCT CAST(EO_FechaReg AS DATE)) AS DiasConFalla,
    SUM(CASE WHEN EO_TipoFallo = 'FAILED_MAILBOX_FULL' THEN 1 ELSE 0 END) AS MailboxFull,
    SUM(CASE WHEN EO_TipoFallo IN ('FAILED_INVALID_ADDRESS','FAILED_REJECTED','FAILED_UNKNOWN') THEN 1 ELSE 0 END) AS Otros5xx,
    -- subquery escalar — barata por unique index activo de EmailBlacklist
    CAST(CASE WHEN EXISTS (
        SELECT 1 FROM EmailBlacklist b
        WHERE b.EBL_Correo = EO_Destinatario AND b.EBL_Estado = 1
    ) THEN 1 ELSE 0 END AS BIT) AS YaBlacklisteado
FROM EmailOutbox
WHERE EO_Estado = 'FAILED'
  AND EO_FechaReg >= @desde
GROUP BY EO_Destinatario
ORDER BY HitsFallidos DESC;
```

#### D7.3 · `serie-temporal`

```sql
-- granularidad: 'hour' (last 24h, cap) o 'day' (last 30d, cap).
-- ventana fija por granularidad para evitar query 720 buckets de hora en 30d (= 720 rows × N tipos = explosivo).
-- Si granularidad='hour': ventana 24h. Si granularidad='day': ventana 30d.
DECLARE @desde DATETIME2 = CASE
    WHEN @granularidad = 'hour' THEN DATEADD(HOUR, -24, SYSUTCDATETIME())
    ELSE DATEADD(DAY, -30, SYSUTCDATETIME())
END;

WITH Buckets AS (
    SELECT
        CASE
            WHEN @granularidad = 'hour'
                THEN DATEADD(HOUR, DATEDIFF(HOUR, 0, EO_FechaReg), 0)
            ELSE CAST(EO_FechaReg AS DATE)
        END AS Bucket,
        EO_Estado,
        EO_TipoFallo
    FROM EmailOutbox
    WHERE EO_FechaReg >= @desde
)
SELECT
    Bucket,
    SUM(CASE WHEN EO_Estado = 'SENT'                       THEN 1 ELSE 0 END) AS Enviados,
    SUM(CASE WHEN EO_Estado = 'FAILED'                     THEN 1 ELSE 0 END) AS Fallidos,
    SUM(CASE WHEN EO_TipoFallo = 'FAILED_QUOTA_EXCEEDED'   THEN 1 ELSE 0 END) AS BloqueadosPorCuota
FROM Buckets
GROUP BY Bucket
ORDER BY Bucket;
```

#### D7.4 · `dominios-receptores`

```sql
-- Trivial pero costoso por SUBSTRING en GROUP BY (no usa índice).
-- Cap ventana 30d, sin TOP — 99% de los apoderados están en ≤5 dominios (gmail/hotmail/outlook/yahoo/otros).
DECLARE @desde DATETIME2 = DATEADD(DAY, -@ventanaDias, SYSUTCDATETIME());

SELECT
    CASE
        WHEN CHARINDEX('@', EO_Destinatario) > 0
            THEN LOWER(SUBSTRING(EO_Destinatario, CHARINDEX('@', EO_Destinatario) + 1, 100))
        ELSE '(sin @)'
    END AS Dominio,
    COUNT(*) AS Total,
    SUM(CASE WHEN EO_Estado = 'FAILED' THEN 1 ELSE 0 END) AS Fallidos,
    CAST(
        CASE
            WHEN SUM(CASE WHEN EO_Estado IN ('SENT','FAILED') THEN 1 ELSE 0 END) = 0 THEN 0
            ELSE 100.0 * SUM(CASE WHEN EO_Estado = 'FAILED' THEN 1 ELSE 0 END)
                       / SUM(CASE WHEN EO_Estado IN ('SENT','FAILED') THEN 1 ELSE 0 END)
        END
        AS DECIMAL(5,2)
    ) AS TasaFalloPct
FROM EmailOutbox
WHERE EO_FechaReg >= @desde
GROUP BY
    CASE
        WHEN CHARINDEX('@', EO_Destinatario) > 0
            THEN LOWER(SUBSTRING(EO_Destinatario, CHARINDEX('@', EO_Destinatario) + 1, 100))
        ELSE '(sin @)'
    END
ORDER BY Total DESC;
```

#### D7.5 · `candidatos-blacklist`

```sql
-- destinatarios con ≥@umbralHits hits FAILED_MAILBOX_FULL en últimas @ventanaHoras y NO blacklisteados (cualquier motivo).
-- Defaults inyectados desde EmailSettings.MailboxFullThresholdHits/Hours (D2).
DECLARE @desde DATETIME2 = DATEADD(HOUR, -@ventanaHoras, SYSUTCDATETIME());

WITH HitsRecientes AS (
    SELECT
        EO_Destinatario AS Destinatario,
        COUNT(*) AS Hits,
        MAX(EO_FechaReg) AS UltimoHit
    FROM EmailOutbox
    WHERE EO_TipoFallo = 'FAILED_MAILBOX_FULL'
      AND EO_FechaReg >= @desde
    GROUP BY EO_Destinatario
    HAVING COUNT(*) >= @umbralHits
)
SELECT h.Destinatario, h.Hits, h.UltimoHit
FROM HitsRecientes h
WHERE NOT EXISTS (
    SELECT 1 FROM EmailBlacklist b
    WHERE b.EBL_Correo = h.Destinatario AND b.EBL_Estado = 1
)
ORDER BY h.Hits DESC, h.UltimoHit DESC;
```

### D8 · DTOs C# finales (records, naming en español)

Ubicación: `DTOs/Notifications/Monitoreo/`. Prefijo `Dashboard*Dto` para evitar colisión con DTOs preexistentes (`EmailBlacklistListadoDto`, `EmailDashboardDiaDto`).

```csharp
// DTOs/Notifications/Monitoreo/DashboardSenderStatDto.cs
public record DashboardSenderStatDto(
    string Remitente,
    int Total,
    int Enviados,
    int Fallidos,
    int Pendientes,
    DateTime UltimoUso,
    decimal TasaFalloPct);

// DTOs/Notifications/Monitoreo/DashboardTopDestinatarioDto.cs
public record DashboardTopDestinatarioDto(
    string Destinatario,
    int HitsFallidos,
    int DiasConFalla,
    int MailboxFull,
    int Otros5xx,
    bool YaBlacklisteado);

// DTOs/Notifications/Monitoreo/DashboardSerieTemporalPuntoDto.cs
public record DashboardSerieTemporalPuntoDto(
    DateTime Bucket,
    int Enviados,
    int Fallidos,
    int BloqueadosPorCuota);

// DTOs/Notifications/Monitoreo/DashboardDominioReceptorDto.cs
public record DashboardDominioReceptorDto(
    string Dominio,
    int Total,
    int Fallidos,
    decimal TasaFalloPct);

// DTOs/Notifications/Monitoreo/DashboardCandidatoBlacklistDto.cs
public record DashboardCandidatoBlacklistDto(
    string Destinatario,
    int Hits,
    DateTime UltimoHit);
```

`decimal` (no `double`) para `TasaFalloPct`: el SQL devuelve `DECIMAL(5,2)`, mantener tipo congruente evita rounding errors al serializar.

### D9 · Índice nuevo `IX_EmailOutbox_FechaReg_Estado_TipoFallo`

- **Justificación**: las queries `top-destinatarios` y `candidatos-blacklist` filtran por (`EO_Estado`, `EO_TipoFallo`) dentro de un rango temporal. El índice existente `IX_EmailOutbox_FechaReg` solo cubre el filtro de fecha — sin INCLUDE el query plan hace key lookups (~N por fila) para leer Estado/TipoFallo/Destinatario/Remitente. Con ~5k filas/mes en `EmailOutbox` (estimado por volumen actual), el cost se vuelve notable a 6+ meses de retención.
- **Script**: `Educa.API/Scripts/plan39_chat2_AddDashboardIndex.sql`. Idempotente (`IF NOT EXISTS`).

```sql
-- =============================================================================
-- Plan 39 Chat A — Índice covering para agregaciones del dashboard de monitoreo.
-- Idempotente. Reversible vía DROP en sección rollback.
-- =============================================================================

SET XACT_ABORT ON;
SET NOCOUNT ON;

BEGIN TRAN;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_EmailOutbox_FechaReg_Estado_TipoFallo'
      AND object_id = OBJECT_ID('EmailOutbox')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_EmailOutbox_FechaReg_Estado_TipoFallo
    ON EmailOutbox (EO_FechaReg DESC, EO_Estado, EO_TipoFallo)
    INCLUDE (EO_Destinatario, EO_Remitente);

    PRINT 'IX_EmailOutbox_FechaReg_Estado_TipoFallo creado.';
END
ELSE
BEGIN
    PRINT 'IX_EmailOutbox_FechaReg_Estado_TipoFallo ya existía — sin cambios.';
END;

COMMIT TRAN;

-- Verificación
SELECT name, type_desc, is_disabled
FROM sys.indexes
WHERE object_id = OBJECT_ID('EmailOutbox')
ORDER BY name;

-- Rollback
-- DROP INDEX IX_EmailOutbox_FechaReg_Estado_TipoFallo ON EmailOutbox;
```

- **Pre-req**: ejecutar en Azure SQL **antes** del deploy del Chat A BE (077). Ya tenemos el patrón validado del Plan 38 (`plan38_chat2_AddBounceMailboxFullMotivo.sql`).
- **Impacto en escritura**: ~3% extra en INSERT/UPDATE de `EmailOutbox` (1 índice más). Aceptable — el outbox se escribe N veces/min, no es write-heavy.

### D10 · Endpoints (firmas finales)

Controller: `Controllers/Sistema/EmailMonitoreoController.cs` (nuevo, separado de `EmailOutboxStatusController` y `EmailDashboardDiaController`).

| Verbo | Path | Query (defaults inyectados desde `EmailSettings`) | Resp | Cache TTL |
|---|---|---|---|---|
| GET | `/api/sistema/email-outbox/monitoreo/sender-stats` | `?ventanaDias=7` (cap 30) | `ApiResponse<List<DashboardSenderStatDto>>` | 5min |
| GET | `/api/sistema/email-outbox/monitoreo/top-destinatarios` | `?ventanaDias=7&limit=10` (caps: 30d, 50) | `ApiResponse<List<DashboardTopDestinatarioDto>>` | 5min |
| GET | `/api/sistema/email-outbox/monitoreo/serie-temporal` | `?granularidad=hour\|day` (default `hour`; ventanas 24h/30d fijas por granularidad) | `ApiResponse<List<DashboardSerieTemporalPuntoDto>>` | 60s (hour) / 10min (day) |
| GET | `/api/sistema/email-outbox/monitoreo/dominios-receptores` | `?ventanaDias=7` (cap 30) | `ApiResponse<List<DashboardDominioReceptorDto>>` | 10min |
| GET | `/api/sistema/email-outbox/monitoreo/candidatos-blacklist` | `?umbralHits=2&ventanaHoras=24` (defaults desde `EmailSettings.MailboxFullThreshold*`) | `ApiResponse<List<DashboardCandidatoBlacklistDto>>` | 30s |

- **Auth**: `[Authorize(Roles = Constants.Auth.Roles.Administrativos)]` a nivel controller.
- **Validación**: query binding tipado + clamp en service. `400 Bad Request` si `ventanaDias < 1`, `umbralHits < 1`, `granularidad ∉ {hour, day}`.
- **Caché**: `IMemoryCache` con keys `monitoreo:{metodo}:{paramsHash}`. TTL por método (tabla arriba). Patrón:
  ```csharp
  return await _cache.GetOrCreateAsync(key, entry =>
  {
      entry.AbsoluteExpirationRelativeToNow = ttl;
      return _service.GetXAsync(...);
  });
  ```
- **Fail-safe (INV-S07)**: try-catch en cada método del service; en error → log warning + retornar `[]` (lista vacía). El dashboard se ve vacío, no roto. Patrón heredado de `EmailDashboardDiaService`.

### D11 · Mock visual final (6 tiles del Dashboard)

Orden visual fijo (top-down, left-to-right, layout responsivo):

```text
┌──────────────────────────────┐  ┌──────────────────────────────────────────┐
│ ⚡ DEFER/FAIL EN VIVO        │  │ 📊 SERIE TEMPORAL                        │
│        4 / 5  ⚠️ WARNING     │  │ ┌─────────────────────────────────┐      │
│ Push SignalR · 12s ago       │  │ │   ▁▁▂▂▃▅▇█▆▄▃▂▁▁                │      │
│ [skeleton: rect 120×40]      │  │ │ pico: 13:00 (12 fallos)         │      │
│                              │  │ └─────────────────────────────────┘      │
│ tile A — Plan 29 + Plan 39 B │  │ Toggle: [Hora 24h] [Día 30d]             │
└──────────────────────────────┘  │ tile B — endpoint serie-temporal         │
                                  │ [skeleton: rect 100% × 120px]           │
                                  └──────────────────────────────────────────┘

┌──────────────────────────────┐  ┌──────────────────────────────────────────┐
│ ✉️ SENDER MIX (7d)           │  │ 🎯 TOP DESTINATARIOS FALLIDOS (7d)       │
│ sistemas4 ████████████ 52%   │  │ kysa14.1994@... 218  🚩 [Bloquear →]     │
│ sistemas5 ████ 16%           │  │ delacruzsec... 34   ⚠️ [Bloquear →]      │
│ sistemas  ███ 14%            │  │ evaavelle... 17    ✓ blacklist [Ver]     │
│ sistemas2 ██ 8%              │  │ 17 con <10 hits ↓                        │
│ sistemas7 █ 6%               │  │                                          │
│ sistemas6 █ 3%               │  │ tile D — endpoint top-destinatarios      │
│ sistemas3 ▏ 2%               │  │ [skeleton: app-table-skeleton 8×4]       │
│                              │  └──────────────────────────────────────────┘
│ tile C — endpoint            │
│ sender-stats                 │
│ [skeleton: 7 barras]         │
└──────────────────────────────┘

┌──────────────────────────────┐  ┌──────────────────────────────────────────┐
│ 🌐 DOMINIOS RECEPTORES (7d)  │  │ 🚨 CANDIDATOS A BLACKLIST                │
│ gmail.com    1245   3.2%     │  │ Ningún candidato ahora ✓                 │
│ hotmail.com   198   8.1%     │  │ — — —                                    │
│ outlook.com    45   2.2%     │  │                                          │
│ yahoo.com      12   0.0%     │  │ Cuando aparezcan:                        │
│ otros          23   0.0%     │  │   correo@... · 3 hits · CTA [Bloquear]   │
│                              │  │                                          │
│ tile E — dominios-receptores │  │ tile F — candidatos-blacklist            │
│ [skeleton: 5 filas]          │  │ Cross-link a Plan 38 dialog              │
└──────────────────────────────┘  └──────────────────────────────────────────┘
```

- **CTA "Bloquear"** en tiles D + F: navega a `/intranet/admin/email-outbox?tab=blacklist&action=add&correo=...`. El dialog del Plan 38 Chat 5 (075) lee el query param `correo` y prellena el form. **Requiere coordinación con Plan 38 Chat 5** — dejado documentado en el brief 075 al cerrar este chat (anotación cross-link).
- **Skeletons** (regla `skeletons.md`): cada tile tiene su propio skeleton independiente con `minHeight` correspondiente — el dashboard no muestra spinner global.
- **Banner B9** (overlay sobre todo el dashboard, sticky top): aparece cuando `defer-fail-status >= 4/5` o cuando un evento `BlacklistEntryCreated` llega via SignalR en últimos 5 min. Owned por Plan 38 Chat 6 (076), reusable acá vía componente compartido.
- **Mobile responsive**: en pantallas <768px los tiles se apilan en columna única. Tile A queda fijo en top (sticky) por criticidad.

### D12 · División en chats (Plan 39, refinada)

Con Plan 38 ocupando 072-076, Plan 39 arranca en 077. Numeración secuencial.

| # | Brief en `open/` | Repo | Modo | Pre-req |
|---|---|---|---|---|
| **077** | Plan 39 Chat A BE — `EmailMonitoreoService` + `EmailMonitoreoController` con 5 endpoints + DTOs D8 + caché D10 + tests con seed `kysa` 5d + script SQL D9 (índice covering) | `Educa.API` | `/execute` | Script SQL D9 ejecutado pre-deploy. NO depende de Plan 38 (independiente). |
| **078** | Plan 39 Chat B BE — `EmailHub` SignalR + `IEmailHubNotifier` real + dispatch de los 3 eventos (D5) + reemplazo de `NullEmailHubNotifier` registrado por Plan 38 Chat 2 + invalidación de caché defer-fail antes de pushear (D3) | `Educa.API` | `/execute` | Plan 38 Chat 2 (072) deployado (registra `IEmailHubNotifier` NoOp). Chat A 077 NO es pre-req duro pero conviene mergearlo antes (el endpoint candidatos sirve de fallback si SignalR cae). |
| **079** | Plan 39 Chat C FE — Tab "Mapa de envío" en `/intranet/admin/monitoreo/correos/dashboard` con los 6 tiles (D11) + skeletons + cross-links a tab Blacklist + listener SignalR para 3 eventos (D5) | `educa-web` | `/execute` | Chat A (077) deployado. Plan 38 Chat 5 (075) deployado (para que el cross-link "Bloquear" funcione). |
| **080** | Plan 39 Chat D FE — Banner B9 visible en TODAS las páginas de `/monitoreo/correos/*` (no solo dashboard) + tile "Aceptado vs Entregado" en `/monitoreo/correos/auditoria` + ajuste del listener SignalR de Plan 38 Chat 6 (076) para escuchar los 3 eventos del hub (D5) | `educa-web` | `/execute` | Chat B (078) + Chat C (079) deployados. Plan 38 Chat 6 (076) deployado. |
| **081** | Plan 39 Chat E BE (HOLD) — `ExpiredEximLogImportJob` (importador SSH logs Exim). En `open/` con flag de hold. | `Educa.API` | `/execute` | Criterio reactivación D6 cumplido. Sino → archivar a 90d. |

Total: **5 chats nuevos**. Chat E queda HOLD pero materializado como brief para no perder el contexto.

### D13 · Coordinación con Plan 38 (anotaciones cross-link)

Cierres requeridos en briefs Plan 38 al moverlos:

- **072 (Plan 38 Chat 2 BE)**: agregar nota *"Registrar `IEmailHubNotifier` con implementación `NullEmailHubNotifier` que loggea pero no pushea. Plan 39 Chat B (078) reemplaza la registration. El handler `MailboxFullBlacklistHandler` invoca `notifier.NotifyBlacklistEntryCreatedAsync(...)` y `notifier.NotifyCandidatoBlacklistDetectadoAsync(...)` sin esperar al deploy de 078."*
- **075 (Plan 38 Chat 5 FE)**: agregar nota *"El dialog 'Agregar a blacklist' debe leer query param `?correo=...` y prellenar el campo. Plan 39 Chat C (079) genera el cross-link desde el tile 'Top destinatarios' y 'Candidatos'."*
- **076 (Plan 38 Chat 6 FE)**: agregar nota *"El listener SignalR escucha 3 eventos del hub: `BlacklistEntryCreated` (Plan 38), `DeferFailStatusUpdated` y `CandidatoBlacklistDetectado` (Plan 39). Plan 39 Chat D (080) reusa este listener — coordinar el componente compartido si es necesario."*

Estas anotaciones se agregan al cerrar este chat 071 (mismo commit que el cierre).

### D14 · Invariante nueva `INV-MAIL08`

Texto canónico (se agrega a `business-rules.md` §15.14 y §18 en este chat):

> `INV-MAIL08` (EmailMonitoreoService) — Las 5 agregaciones del dashboard de monitoreo (`sender-stats`, `top-destinatarios`, `serie-temporal`, `dominios-receptores`, `candidatos-blacklist`) cachean su resultado en memoria via `IMemoryCache` con TTL configurable por método (defaults: 5min sender-stats, 5min top-destinatarios, 60s serie-temporal hora / 10min día, 10min dominios, 30s candidatos). Caps defensivos en input: `ventanaDias <= 30`, `limit <= 50`, `umbralHits >= 1`. Fail-safe (INV-S07) — si la query falla, retorna lista vacía sin romper el dashboard. La caché de `defer-fail-status` (Plan 29 Chat 2.6) se invalida antes de pushear `DeferFailStatusUpdated` por SignalR (INV-MAIL04). Enforcement: `EmailMonitoreoService` con métodos `IMemoryCache.GetOrCreateAsync` por endpoint + tests `EmailMonitoreoServiceTests` que validan caché hit + invalidación.

### D15 · Tests-spec (BE) — refinado

Los 8 originales del brief + 4 nuevos por las decisiones D2/D3/D5/D14:

1. `EmailMonitoreoServiceTests.SenderStats_DesbalanceadoSistemas4` — `sistemas4` con 52% del volumen.
2. `EmailMonitoreoServiceTests.TopDestinatarios_KysaPrimeraEnDia2` — al día 2 del seed `kysa` aparece #1 con badge.
3. `EmailMonitoreoServiceTests.SerieTemporal_DetectaSpike27Abr` — bucket 27-abr con 169 vs base ~10.
4. `EmailMonitoreoServiceTests.DominiosReceptores_GmailDomina` — gmail.com con mayor volumen.
5. `EmailMonitoreoServiceTests.CandidatosBlacklist_FiltraYaBlacklisteados` — eva no aparece (ya en blacklist), kysa sí.
6. `EmailMonitoreoControllerTests.Auth_NoAdministrativos_Returns403`.
7. `EmailMonitoreoControllerTests.Get_VentanaInvalida_Returns400`.
8. `EmailMonitoreoControllerTests.Get_VentanaExcedeCap_SeClampea` — `?ventanaDias=99` → service usa 30.
9. **NUEVO** `EmailMonitoreoServiceTests.CandidatosBlacklist_UsaSettingsDelHandler` — D2: el default del endpoint = `EmailSettings.MailboxFullThresholdHits` (no constante hardcodeada).
10. **NUEVO** `EmailMonitoreoServiceTests.SerieTemporal_HoraVsDia_VentanasFijas` — D7.3: hora=24h, día=30d (no se acepta granularidad+ventana arbitraria).
11. **NUEVO** `EmailMonitoreoCacheTests.SegundaLlamadaConMismosParametros_HitDeCache` — D14: el TTL respeta los defaults por método.
12. **NUEVO** `EmailHubTests.DeferFailStatusUpdated_PusheaACorrectoGrupo` (Chat B 078) — D5: grupo `email-alerts`, payload tipado.
13. **NUEVO** `EmailHubTests.NullEmailHubNotifier_NoLanzaExcepcion` (Chat A 077) — D5: con NoOp registrado, el handler no falla aunque el hub real no exista.

### D16 · Tests-spec (FE) — refinado

Los 6 originales del brief + 2 por D5/D11:

1. Tile "Defer/Fail en vivo" actualiza con SignalR mock sin refresh.
2. Tile "Sender mix" muestra barras proporcionales y % calculado.
3. Tile "Top destinatarios" → click "Bloquear" navega con query param `?correo=`.
4. Tile "Candidatos" CTA "Bloquear" abre dialog del Plan 38 prellenado.
5. Banner B9 aparece cuando hits ≥ 4 (mock SignalR).
6. Serie temporal toggle hora/día funciona y resetea cache local.
7. **NUEVO** Listener SignalR re-conecta automáticamente al perder y recuperar conexión (escenario común de la red móvil).
8. **NUEVO** Cuando llega `CandidatoBlacklistDetectado` por SignalR, el tile F refresca sin polling — patrón push-driven.

### D17 · Snapshot de datos crudos (`outputs/`)

- Crear `outputs/cpanel-fallos-historicos-2026-04-20-29.md` (chat 077 lo hace al arrancar) con:
  - 327 fallos clasificados por sender, destinatario, categoría SMTP, día.
  - Origen: análisis manual del cPanel Track Delivery del 2026-04-29.
  - Uso: seed reproducible para `EmailMonitoreoServiceTests` — los tests del Chat A consultan este snapshot.
- **NO** se commitea desde este chat 071 (el chat 077 tiene tareas concretas de seed que lo generan formal). Se documenta el archivo aquí.

### D18 · Conformidad con reglas del proyecto

Validación pre-cierre que el design cumple:

- ✅ `business-rules.md` — INV-MAIL08 nueva, cross-refs a INV-MAIL01/02/04/06/07.
- ✅ `pagination.md` — endpoints son agregaciones (no listados paginados); no aplica.
- ✅ `service-worker.md` — 5 endpoints granulares = 5 cache keys SWR independientes (D4).
- ✅ `skeletons.md` — cada tile tiene skeleton propio (D11).
- ✅ `crud-patterns.md` — son endpoints read-only de monitoreo, no CRUD; no aplica.
- ✅ `templates.md` — los tiles del FE usan `computed()` para % calculados, no funciones en template.
- ✅ `a11y.md` — CTAs "Bloquear" tendrán `aria-label` vía PrimeNG `pt`.
- ✅ `backend.md` §300 — services divididos por responsabilidad: `EmailMonitoreoService` (5 métodos read), `EmailHub` (push). Repository opcional si el service queda <300 líneas.
- ✅ `state-management.md` — `EmailMonitoreoFacade` orquesta los 6 endpoints, `EmailMonitoreoStore` mantiene estado FE de los tiles.
- ✅ `optimistic-ui.md` — endpoints de read-only, no aplica WAL.

---

## OUTPUT FINAL DEL CHAT

- ✅ Brief 071 movido a `chats/closed/071-plan-39-chat-1-monitoreo-empirico-design.md`.
- ✅ Briefs `077-081` creados en `chats/open/` con scope cerrado.
- ✅ `business-rules.md` §15.14 + §18 actualizado: `INV-MAIL08` agregado (D14).
- ✅ `plan/maestro.md` cola top actualizada con Plan 39 (después de Plan 38) y prioridad **ALTA**.
- ✅ Anotaciones cross-link agregadas a briefs `072`, `075`, `076` del Plan 38 (D13).

**Decisión de Cowork**: el Chat A (077) BE es el primero ejecutable de Plan 39. Cuando arranque, abrir el brief `chats/open/077-plan-39-chat-a-be-monitoreo-endpoints.md` vía `/go` o `/start-chat 077`.

> **Repo destino**: `Educa.API` + `educa-web` (cierre del design)
> **Plan**: 39 · **Chat**: 1 · **Fase**: F1.Design · **Estado**: ⏳ **running** — prioridad alta
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
- Crear chats 072-076 en `open/`.
- Actualizar `.claude/plan/maestro.md` con entrada Plan 39 (después de Plan 38) y prioridad **ALTA**.
- Snapshot de los datos crudos del análisis (327 fallos) en `outputs/cpanel-fallos-historicos-2026-04-20-29.md` para tests-seed.
- Indicar a Cowork qué archivo abrir como Chat 2.

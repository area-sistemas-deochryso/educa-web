# 146 · BE — Plan 22 Chat 7: guard de cesión automática en `EmailOutboxWorker`

> **Creado**: 2026-05-12 · **Estado**: ⏳ pendiente arrancar · **Repo**: `Educa.API` (master)
> **Modo sugerido**: `/execute` (scope acotado, sin decisiones abiertas — todas las decisiones se tomaron en el `/design` del brief 141 que cerró marcando Plan 44 como descartado y absorbiendo el scope mínimo viable acá).
> **Origen**: 2026-05-12 — conclusión del `/design` de Plan 44 (brief 141 closed). Plan 44 descartado por innecesario: las defensas INV-MAIL01/02/07/09 mantienen Educa en 0.27% FAILED rate (14/5208 sem). Reducir volumen (líneas A/D/C/E del brief 141) introduce fricción al apoderado y/o requiere ack del jefe sin mover la métrica relevante del contador 5/h. Línea F (corte CrossChex SMTP) descartada por restricción explícita del usuario. Líneas I/J (subdominio / SMTP relay externo) descartadas por restricción "sin aprobación adicional, sin costo, sin fricción". Queda **este guard** como palanca puramente defensiva BE-only: Educa cede automáticamente cuando el contador del dominio compartido con CrossChex se acerca al techo.

## Objetivo del chat

Implementar el guard de cesión automática en `EmailOutboxWorker` que formaliza **INV-MAIL10** (ya documentada en `business-rules.md §15.14`).

## Scope

### Archivos esperados a tocar

| Archivo | Acción | Justificación |
|---|---|---|
| `Educa.API/Constants/EmailSettings.cs` (o equivalente — confirmar ruta real al arrancar) | Agregar constante `DeferFailCessionThresholdPercentage` con default `80` | Configurable en caliente sin redeploy vía `appsettings.json` |
| `Educa.API/Constants/EmailEntidadOrigen.cs` (o equivalente) | Confirmar / agregar listas `EntidadesInformativas = { "Asistencia", "AsistenciaProfesor" }` y `EntidadesCriticasAdministrativas = { "AsistenciaCorreccion", "Justificacion", "ReporteFallosCorreoAsistencia", "RESET_PASSWORD", "REPORTE_USUARIO" }` | Tier de criticidad explícito, no string-match disperso |
| `Educa.API/Services/Email/EmailOutboxWorker.cs` | Agregar guard al inicio de `ProcessSingleEmailAsync`: si `EO_EntidadOrigen ∈ EntidadesInformativas` Y `/defer-fail-status` reporta `usage_pct ≥ threshold` → skip + `EO_UltimoError = "[DEFER_FAIL_CESSION] contador hosting al X%, esperando ventana"` (mantener `EO_Estado = PENDING`) | Implementación del guard |
| `Educa.API/Services/Email/Interfaces/IDeferFailStatusReader.cs` (si no existe) | Interfaz inyectable que el worker consume — wrapper sobre el endpoint `/defer-fail-status` o consulta directa a la fuente de verdad del contador (decidir al arrancar: ¿el worker hace HTTP a sí mismo, o consulta directo el `EmailMonitoreoService` que ya calcula el `usage_pct`?) | Testeable + fail-safe |
| `Educa.API.Tests/Services/Email/EmailOutboxWorkerDeferFailCessionTests.cs` (nuevo) | Tests del guard | Cobertura del comportamiento |

### Decisiones ya tomadas (del `/design` brief 141)

| # | Decisión |
|---|----------|
| 1 | Threshold default: **80%** del techo del hosting reportado por `/defer-fail-status`. Configurable en `appsettings.json` como `EmailSettings:DeferFailCessionThresholdPercentage`. Recomendado observar 30 días post-deploy y ajustar. |
| 2 | Tier de criticidad por `EO_EntidadOrigen` (no por usuario, no por hijo, no por hora). Informativos = correos al apoderado sobre marcaciones de asistencia (`Asistencia`, `AsistenciaProfesor`). Críticos administrativos = todo lo demás (correcciones, justificaciones, reportes admin, reset password, reportes usuario). |
| 3 | Las filas pausadas **NO se marcan FAILED**. Quedan en `PENDING` con `EO_UltimoError = "[DEFER_FAIL_CESSION] contador hosting al X%, esperando ventana"` y se reintentan en el próximo tick del worker. Cuando el contador baje del threshold, drenan solo. |
| 4 | Fail-safe (INV-S07): si la consulta a `/defer-fail-status` falla, el worker procede como si el contador estuviera en 0% — la cesión es **best-effort**, nunca bloquea correos cuando la telemetría no responde. Loggear `LogWarning` con el error de la consulta. |
| 5 | Sin UI nueva. Sin opt-in del apoderado. Sin ack del jefe. Palanca puramente defensiva en backend. |
| 6 | El guard se ejecuta **dentro del loop** del worker, no antes — porque el contador puede cambiar mid-batch y queremos chequear por fila procesada (no rechequear cada N segundos a nivel de tick global). Cost: 1 lectura de `IDeferFailStatusReader` por fila. Cache en memoria del último valor con TTL 30s para evitar martillar al endpoint si el worker procesa muchas filas en un tick. |
| 7 | Observabilidad: agregar log `LogInformation` con tag `[DEFER_FAIL_CESSION]` cuando el guard se dispara, incluyendo `usage_pct` + `EO_CodID` + `EO_EntidadOrigen`. Esto deja rastro auditable de cuántas filas se pausaron y cuándo. |
| 8 | Tests cubren al menos: (a) contador `<80%` → procesa todo; (b) contador `≥80%` → pausa informativos, procesa críticos; (c) telemetría falla → procesa todo; (d) fila pausada queda en `PENDING` con error específico, no `FAILED`; (e) cambio de `EmailSettings:DeferFailCessionThresholdPercentage` en caliente cambia el comportamiento sin restart. |

## Pre-work obligatorio

1. **Confirmar ruta real** de las constantes (`EmailSettings`, `EmailEntidadOrigen` o equivalente — el proyecto puede tenerlas en otros archivos). Grep antes de codificar.
2. **Confirmar qué consume hoy `/defer-fail-status`** — el widget admin FE lo poléa, pero ¿hay algún reader BE inyectable? Si no, crear `IDeferFailStatusReader` con wrapper sobre `EmailMonitoreoService` o consulta directa al modelo de datos.
3. **Auditar `EO_EntidadOrigen` reales en producción** — query SQL `SELECT EO_EntidadOrigen, COUNT(*) FROM EmailOutbox GROUP BY EO_EntidadOrigen ORDER BY COUNT(*) DESC` para confirmar que la tabla de tier cubre el 100% de valores existentes (no debería quedar ninguno sin clasificar). Si aparece alguno desconocido, decidir si va a `EntidadesInformativas` o `EntidadesCriticasAdministrativas` antes de arrancar.
4. **Releer business-rules.md §15.14 INV-MAIL10** (ya escrito 2026-05-12) — es el contrato exacto del guard, código debe matchear punto a punto.
5. **Releer business-rules.md §18 + INV-MAIL01-09** para entender la cadena de defensas actual y no romper invariantes adyacentes.

## Entregables del chat

1. Constante `EmailSettings:DeferFailCessionThresholdPercentage` agregada con default `80`.
2. Listas `EntidadesInformativas` + `EntidadesCriticasAdministrativas` documentadas y referenciadas en una sola fuente.
3. `IDeferFailStatusReader` (o equivalente) inyectable, con fail-safe interno.
4. Guard en `EmailOutboxWorker.ProcessSingleEmailAsync` con log estructurado `[DEFER_FAIL_CESSION]`.
5. Tests: 5+ casos cubriendo la matriz de decisión.
6. `business-rules.md §15.14 INV-MAIL10` referenciada desde el commit.

## Out of scope

- UI admin del estado de cesión (si hace falta, se agrega en chat siguiente — hoy basta con el log + el widget defer-fail existente).
- Métrica histórica de cesiones (cuántas filas se pausaron por día, etc.) — si la queremos, se agrega en chat siguiente sobre la base del log estructurado.
- Drop de eventos no críticos (línea D del Plan 44 descartado) — requiere ack del jefe, fuera de scope BE-only.
- Consolidación diaria, opt-out granular, push, subdominio, SMTP relay externo — todos descartados en el `/design` del brief 141 por restricciones del usuario.

## Aprendizajes transferibles

- **El contador `max_defer_fail_percentage` mira FAILED, no SENT.** Cuando el techo es bajo y compartido, reducir volumen total no mueve la aguja — lo que mueve la aguja es reducir FAILED y/o ceder cuando el contador está caliente.
- **Cesión > reducción** cuando el actor que satura el contador no se puede tocar (CrossChex). La cesión convierte a Educa en "buen ciudadano" del contador compartido sin romper UX del apoderado.
- **Tier de criticidad por `EntidadOrigen`** es más limpio que por usuario/hora/tipo. Es una decisión de producto declarada en una sola constante, no dispersa en runtime.

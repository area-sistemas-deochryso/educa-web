# Plan Maestro — Orden y Dependencias

> **Fecha**: 2026-04-14 (última revisión: 2026-04-17, Design System F4 cerrado — tokens hardcoded migrados a variables CSS del tema, deuda C1/C3/C4 resuelta)
> **Objetivo**: Ordenar los 11 planes dispersos entre `educa-web/.claude/` y `Educa.API/.claude/` en una secuencia con dependencias explícitas.
> **Principio rector** (actualizado 2026-04-16): "Features primero — el enforcement y la arquitectura son valiosos solo si soportan funcionalidad real. La deuda técnica se paga en paralelo, no como prerrequisito."

---

## Inventario de planes (11)

| # | Plan | Repo | Ruta | Estado | % |
|---|------|------|------|--------|---|
| 1 | Enforcement de Reglas | FE | `tasks/enforcement-reglas.md` (pendiente crear) | F1-F3 ✅ · F4 parcial ✅ (F4.4-F4.5 🔒) · F5 ⏳ | ~75% |
| 2 | Arquitectura Backend — Opciones A/B/C | BE | `Educa.API/.claude/plan/arquitectura-backend-opciones.md` (pendiente crear) | A ✅ · B 🔄 (5/8) · C ⏳ | ~33% |
| 3 | Domain Layer (Opción A) | BE | `Educa.API/.claude/plan/domain-layer.md` (pendiente crear) | Fases 1-3,5-6 ✅ · F4 🔒 (bloqueada por Matrícula) | ~85% |
| 4 | Consolidación Backend | FE | `plan/consolidacion-backend.md` (pendiente crear) | ⏳ | 0% |
| 5 | Consolidación Frontend | FE | `plan/consolidacion-frontend.md` (pendiente crear) | ⏳ | 0% |
| 6 | Asignación Profesor-Salón-Curso | BE+FE | `Educa.API/.claude/plan/asignacion-profesor-salon-curso.md` (pendiente crear) | ✅ F0-F6 cerrado | 100% |
| 7 | Error Trace Backend | BE | `Educa.API/.claude/plan/error-trace-backend.md` (pendiente crear) | ⏳ | 0% |
| 8 | Design Patterns Backend | FE | `tasks/design-patterns-backend.md` (pendiente crear) | Incremental | N/A |
| 9 | Design Patterns Frontend | FE | `tasks/design-patterns-frontend.md` (pendiente crear) | Incremental | N/A |
| 10 | Flujos Alternos (resiliencia) | FE | `plan/flujos-alternos.md` (pendiente crear) | ⏳ (bloqueado) | 0% |
| 11 | Refactor `eslint.config.js` (fix G10) | FE | `plan/eslint-config-refactor.md` | ✅ F1-F5 (F5.3 cerrado 2026-04-17 con guard spec) | 100% |
| 12 | Backend Test Gaps | BE | `Educa.API/.claude/plan/test-backend-gaps.md` | F1 ✅ (A+B+C, 23 tests en 4 archivos) · F2-F5 ⏳ | ~30% |
| 13 | Frontend Test Gaps | FE | `plan/test-frontend-gaps.md` (pendiente crear) | ⏳ | 0% |
| 14 | Contratos FE-BE | FE+BE | `plan/contratos-fe-be.md` (pendiente crear) | ⏳ | 0% |
| 15 | Release Protocol y Operaciones | FE+BE | `plan/release-operations.md` (pendiente crear) | F1 ✅ · F2 ✅ · F3-F5 ⏳ | ~40% |
| 16 | Auditoría de Seguridad | BE | `Educa.API/.claude/plan/security-audit.md` | F1 ✅ · F2-F5 ⏳ | ~20% |
| 17 | Enforcement max-lines BE (CI) | BE | (inline en maestro) | ⏳ | 0% |
| 18 | Tests de flujo de negocio E2E | BE+FE | (inline en maestro) | ⏳ | 0% |
| 19 | Comunicación: foro + mensajería + push | FE+BE | (pendiente planificar) | ⏳ | 0% |
| 20 | Design System — Estándar desde `usuarios` | FE | `tasks/design-system-from-usuarios.md` | F1 ✅ · F2 ✅ (F2.1-F2.5) · F3 ✅ · F4 ✅ · F5.1-F5.2 ✅ · F5.3 ⏳ (0/8) | ~96% |
| **21** | **✅ Asistencia de Profesores en CrossChex** | **BE+FE** | **`plan/asistencia-profesores.md`** | **✅ Cerrado 2026-04-21. Chats 1 + 1.5 + 2 + 3 + 4 + 6 + 7 (A/B/C) + 5 completos. **Chat 5 cerrado**: SQL FKs ejecutado en prueba+producción · deploy BE+FE en Azure/Netlify · sync histórico de profesores vía "Sobreescribir desde CrossChex" · `sp_rename 'Asistencia' → 'Asistencia_deprecated_2026_04'` · reglas actualizadas 2026-04-21: `business-rules.md` § 1.0 "Modelo polimórfico" + INV-AD06 nuevo en § 15.9; `permissions.md` sección "Jurisdicción sobre asistencia"; `domain.md` flujo 1 refleja polimorfismo E/P. **Deuda técnica lateral** (chats futuros, no bloquea cierre): `PermisoSaludAuthorizationHelper.cs:63` anti-pattern `DIR_DNI == dni`; `ErrorLog` en BD prueba le faltan 3 columnas (`ERL_RequestBody`, `ERL_RequestHeaders`, `ERL_ResponseBody`); DROP definitivo de `Asistencia_deprecated_2026_04` a los 60 días.** | **100%** |
| 22 | Endurecimiento correos de asistencia | BE+FE | `Educa.API/.claude/plan/asistencia-correos-endurecimiento.md` | 🟢 En progreso · **Chats 1 (F1) + 2 (F2) + 3 (F3.BE) + A (F5+F6) + A-cierre ✅ cerrados 2026-04-21**. **Chat A cierre (2026-04-21)**: build limpio · **1053 tests verdes** (baseline superado, 0 regresiones) · 4 scripts SQL ejecutados en BD prueba (11 filas) y producción (2789 filas) con `sin_remitente=0` y `con_contador_cero=total` en ambas · commits BE (`a2f4bfd` en `master`) y FE maestro (`b0c5832` en `main`) + push a origin · INV-AD05 actualizado en `business-rules.md` + `permissions.md` removiendo "BCC al colegio" (consistente con `CopiaAsistenciaEmail` eliminado de `appsettings.json`). **Chat A (F5+F6 merged — SMTP outbound throttle + multi-sender)**: techo efectivo 50/h (single) → 200/h (domain-bound) con 7 buzones `@laazulitasac.com`. Sliding window 60 min con dos counters (per-sender 50/h + per-dominio 200/h). `IQuotaThrottleService` + `QuotaThrottleService` (lógica pura, `AsNoTracking()`). `EmailOutboxWorker` `partial class` (293ln main + 106ln `.Sender.cs`) respetando cap 300ln; `SelectSenderOrApplyQuotaSaturationAsync` + `GetFallbackSender` (INV-S07 fail-open a sender[0]). Round-robin stateful `_lastSenderIndex`, skip de saturados. Re-enqueue con `min(FechaEnvio domain window) + 60 min + jitter(1..5 min)`. Tras `ThrottleMaxReintentosCuota=5` defers → FAILED `"FAILED_QUOTA_EXCEEDED"`. **Contador separado `EO_IntentosPorCuota`** (Opción 2 del usuario — no mezcla con `EO_Intentos` del retry SMTP F2). `EmailSettings` + 6 slots planos (Address2..7) + 5 props throttle; `Senders` filtra slots vacíos (rollback: borrar env vars 2-7 → single-sender sin redeploy). Nueva columna `EO_Remitente` + índice `IX_EmailOutbox_Remitente_FechaEnvio_Sent` + `EO_IntentosPorCuota INT NOT NULL DEFAULT 0`. 13 unit tests (`QuotaThrottleServiceTests`) + 6 integration tests nuevos (casos g-l). Post-deploy pendiente: monitoreo 24-48h (distribución 7 senders + `FAILED_QUOTA_EXCEEDED` > 0). **Chat B (F5.6 FE widget `/intranet/admin/bandeja-correos` + endpoint `/api/email-outbox/throttle-status`)** pendiente. Chat 4 (F3.FE) + Chats 5-6 (F4 BE+FE) también pendientes. | 75% |
| **23** | **✅ Extensión `/intranet/admin/asistencias` a Profesores** | **BE+FE** | **`plan/asistencia-admin-profesores.md`** | **✅ Cerrado 2026-04-21. Chats 1 BE + 2 FE + 3.A BE + 3.B FE + 4 BE+FE + 5 FE completos. **Chat 5 cerrado** (2026-04-21): (1) cross-link UI "Editar en admin" en `AttendanceDirectorComponent` tab profesores: botón icon-only per-row en vista día (`pi pi-pencil` + tooltip + `aria-label` "Editar asistencia del profesor") vía nuevos `showEditAdminAction` + `editAdmin` en `AttendancePersonaDayListComponent` (gated por flag, default `false`); botón contextual en vista mes junto al PDF. Navega a `/intranet/admin/asistencias?tab=gestion&tipoPersona=P&dni=...&fecha=YYYY-MM-DD` vía `Router.navigate`. (2) Query params ampliados en [attendances.component.ts:163-185](src/app/features/intranet/pages/admin/attendances/attendances.component.ts): ahora lee `tab` + `tipoPersona` + `dni` (aplica a search filter) + `fecha` (aplica a `fechaCalendar` + `dataFacade.onFechaChange`). Helpers `isValidDateIso` + `parseIsoDate` extraídos a `services/attendances-query-params.ts` (testables y reutilizables). `takeUntilDestroyed` respetado. (3) Auditoría de divergencia: ambas vistas consumen `AsistenciaPersona` (Plan 21) vía endpoints polimórficos coherentes con INV-C01/INV-C03 — sin divergencia esperada por código; smoke de campo delegado al Director en producción (sin archivo de hallazgo creado). Nuevo helper `@core/helpers/date.utils.ts` con `formatDateLocalIso(fecha)` (YYYY-MM-DD local, sin desfase UTC). Métodos PDF en profesores component consolidados (6 → 4) con `runPdf$(req$, handle)` genérico. Cap 300 líneas respetado en archivos tocados tras refactor. Lint + tsc + **1380 tests verdes** (sin regresión). **Chat 4 (enforcement INV-AD06 + correo profesor)**: `AsistenciaAdminController` ya tenía `[Authorize(Roles = Roles.Administrativos)]` (4 roles) desde Plan 21 — auditado. Nuevo `AsistenciaAdminControllerAuthorizationTests` (6 tests reflection). `IEmailNotificationService.EnviarNotificacionAsistenciaCorreccionProfesor`: destinatario = `PRO_Correo`, BCC = colegio, outbox tag `"ASISTENCIA_CORRECCION_PROFESOR"`. `EmailNotificationService` dividido en 2 partials respetando cap 300ln. `AsistenciaAdminEmailNotifierTests` (7 tests): routing E/P, fire-and-forget (INV-S07). FE: helper `notificarExito` en `AttendancesCrudFacade` emite toast diferenciado en los 5 puntos de mutación. Suite BE: 800 verdes. `business-rules.md` sección 1.8 + INV-AD05 + `permissions.md` jurisdicción actualizados. Deploy BE+FE en producción 2026-04-21. **Hardening adicional cerrado** (commit `332ef11`): INV-C01/C09/C10 — umbrales absolutos de tardanza/falta diferenciados por `TipoPersona` en periodo regular (E: 7:46/9:30 · P: 7:31/9:30); guards INV-C09 (salida estudiante <13:55) e INV-C10 (entrada <05:00).** | **100%** |
| 24 | 🟡 Sync CrossChex en Background Job | BE+FE | (inline en maestro) | ⏳ Plan nuevo 2026-04-20. Diagnóstico cerrado: `Task.Delay(30000)` entre páginas bloquea UI 2+ min; `.subscribe()` directo en FE no corre en background. 4 chats diseñados (BE job + SignalR + FE progreso + validar rate limit) | 0% |
| **25** | **✅ Paridad Excel para reportes PDF** | **BE+FE** | **(inline en maestro)** | **✅ Cerrado 2026-04-21. Chats 1 + 2 + 3 + 4 completos. 14 endpoints `/excel` mirror de los `/pdf` en BE (1 `ReportesAsistenciaController` + 2 `BoletaNotasController` + 11 `ConsultaAsistenciaController`). 5 páginas FE con menú dual 3-items (`Ver PDF` / `Descargar PDF` / `Descargar Excel`) vía helper `buildPdfExcelMenuItems`. `§17 Reportes exportables — paridad de formatos` en `business-rules.md` con INV-RE01/02/03 + checklist. Tests paridad: BE 930 (+26 nuevos, 0 regresiones sobre baseline 904); FE 1429 (+19 nuevos, 0 regresiones sobre baseline 1410). `attendance-reports.facade` migrado de ExcelJS client-side a endpoint BE. Tests contract usan `ControllerTestBase` + `ClaimsPrincipalBuilder` existentes (no se montó `WebApplicationFactory`).** | **100%** |
| **26** | **🟡 Rate limiting flexible** | **BE+FE** | **(inline en maestro)** | **🟡 F1 ✅ cerrada 2026-04-21 (Chat 1 BE + Chat 2 BE+FE). Telemetría viva en prod: tabla `RateLimitEvent` + middleware fire-and-forget (INV-S07 + INV-ET02) + endpoint admin + **vista admin `/intranet/admin/rate-limit-events`** (stats cards, filtros, drawer detalle, feature flag `rateLimitMonitoring` on en prod+dev). Chat 2 agregó **endpoint agregado `/stats?horas=24`** (opción B — SQL GroupBy server-side), **fix de orden del pipeline** (middleware ANTES de `UseRateLimiter` — sin esto ningún 429 se persistía; el limiter corta el pipeline al rechazar), **fix LINQ** (record con ctor no traducible → proyección anónima + map en memoria) y **quick-fix C**: `heavy` 5 → 15/min como parche revertible cuando F2 aterrice multiplier por rol. FE adicional Opción A: **eliminado banner global + `RateLimitService`** (sintetizaban 429s y bloqueaban toda la app ante UN solo 429) y **nuevo `RateLimitCountdownToast`** no-bloqueante (solo informa, tick reactivo fuera de zone). Tests: BE 1034 verdes (+6 nuevos Chat 2); FE 1466 verdes (+26 admin view + 15 countdown + 9 interceptor reescrito). F1.3 early warning >80% diferido a F2. Plan ~20%. **Siguiente**: F2 (multiplier por rol + `[RateLimitOverride]`) una vez la telemetría haya capturado 1-2 semanas reales.** | **20%** |

**Semáforo de readiness**:

| Dimensión | Estado | Gate mínimo |
|---|---|---|
| **Feature readiness** | 🟢 Listo | Carril A ✅ + QW4 ✅ — deploy completado |
| **Deploy readiness** | 🟢 Estable | FE (Netlify) + BE (Azure) desplegados 2026-04-16. 2026-04-17 sin incidentes reportados. |
| **Production reliability** | 🔴 Sin red | Falta: tests de contrato, auditoría endpoints, error trace, fallbacks P0 |

**Foco: Carril D (confiabilidad) + Design System F2.2-F2.5 en paralelo → Carril B (deuda)**.

---

## 🚨 Restricción crítica — Límites SMTP del hosting (cPanel)

> **Origen**: Dato confirmado por el usuario 2026-04-21. Estos son los **techos duros reales** que aplica el hosting (cPanel) al envío saliente para evitar que el dominio entre en listas negras por spam. Superarlos significa que el servidor **descarta silenciosamente** los correos excedentes dentro de la ventana de una hora — sin bounce, sin error, sin log.
>
> **Acción urgente**: afecta el diseño/estado de Plan 22, Plan 24 y Plan 26. Antes de retomar cualquiera de esos planes, revisar qué fases necesitan rediseño a la luz de estas cifras. No son "objetivo" ni "buena práctica" — son límites del hosting que no negociamos.

### Cifras exactas

| Ámbito | Envíos permitidos / hora |
|--------|--------------------------|
| **Por cuenta cPanel** (agregado de todos sus dominios) | 300 |
| **Por dominio** | 200 |
| **Por dirección de correo individual** (buzón remitente, ej. `sistemas@laazulitasac.com`) | 50 |
| **Por script PHP** | 30 |

Cuellos de botella efectivos para el sistema:

- **50/hora por buzón remitente** — el más restrictivo. Cualquier flujo que use un solo remitente (correcciones de asistencia, resumen diario, notificaciones admin) se topa con este primero.
- **200/hora por dominio** — techo conjunto si se usan varios buzones del mismo dominio. No se suma con el buzón: el más bajo aplica.
- **300/hora por cuenta cPanel** — holgura si hay múltiples dominios alojados.
- **30/hora por script PHP** — no aplica directamente (Educa.API es .NET, no PHP), pero es dato de referencia si alguna vez se migran correos transaccionales a otro canal.

### Qué planes revisar antes de seguir

- [x] **Plan 22 — Endurecimiento correos de asistencia** (75% avanzado, **F5+F6 + Chat A cierre shipped 2026-04-21**)
  - F1-F3 BE ✅ y F3.FE ✅ están bien. La validación y clasificación **no** son afectadas — de hecho, descartar temprano los inválidos **ayuda** a no consumir cuota.
  - **F4.BE pendiente (auditoría preventiva)**: NO afectada, es lectura.
  - **✅ F5+F6 (throttle saliente + multi-sender) — Chat A + Chat A cierre shipped 2026-04-21**: sliding window 60 min per-sender (50/h) + per-dominio (200/h); round-robin entre 7 buzones de `@laazulitasac.com`; re-enqueue con jitter y `FAILED_QUOTA_EXCEEDED` tras N defers. Contador separado `EO_IntentosPorCuota` (Opción 2 — no mezcla con retries SMTP de F2). **Techo efectivo sube de 50/h a 200/h**. Cierre (Chat A cierre): build limpio · 1053 tests verdes · 4 scripts SQL en prueba (11 filas) y producción (2789 filas) con `sin_remitente=0` · commits BE (`a2f4bfd`) + FE (`b0c5832`) + push. Pendiente monitoreo 24-48h y **Chat B FE (widget `/api/email-outbox/throttle-status`)** en repo `educa-web`.
  - La correlación `5 fallos/hora` que dio origen al Plan 22 (en el bounce histórico) **no es** el mismo techo — ese era bounces acumulados. Estos son **envíos totales aceptados**. Distinguirlo en la narrativa del plan.
- [x] **Plan 24 — Sync CrossChex en Background Job** (0%, 4 chats diseñados) — **no requiere sender dedicado** (decisión 2026-04-21 en Plan 22 Chat A)
  - Comparte los 7 senders de Plan 22 F6. La mayoría de picos (97-115/h) caben en 200/h; no vale aislar un pool dedicado.
- [ ] **Plan 26 — Rate limiting flexible** (20%, **F1 100% cerrada** 2026-04-21 con telemetría viva + vista admin + countdown toast no-bloqueante)
  - Dominio distinto (rate limit de requests HTTP entrantes vs envíos SMTP salientes), **no** se fusiona con esto. Pero el patrón de telemetría (`RateLimitEvent` + middleware fire-and-forget + vista admin con stats agregados) es **el molde probado** para una tabla análoga `EmailSendEvent` si el throttle saliente del Plan 22 F5/F6 lo amerita. Validado end-to-end en prod con datos reales (16 eventos/hora en primera sesión admin).

### Consecuencias de diseño transversales

- **Un solo buzón remitente = cuello de 50/h**. Si se requiere mayor volumen, la solución estructural es **rotar remitentes** (ej. `asistencia@`, `notificaciones@`, `reportes@` del mismo dominio) hasta el techo del dominio (200/h). No es un fix de código — es decisión de infraestructura que requiere crear los buzones en cPanel.
- **Correos masivos legítimos** (import de usuarios con notificación, aprobación masiva, resumen diario a muchos directores) pueden agotar la cuota en **minutos**. Antes de disparar, estimar volumen y decidir si se diferencia en el tiempo (spread) o se divide por remitentes.
- **No reintentar agresivamente**. El retry por bounce ya bajó de 5 → 2 en F2 del Plan 22. Pero incluso con retry bajo, un lote grande puede consumir cuota solo en primeros intentos. **El throttle saliente protege mejor que bajar más el retry.**

### Validación pendiente (pre-diseño de fases nuevas)

- [x] ~~Confirmar con el hosting: ¿las cifras son **rolling window de 60 min** o **hora del reloj** (00-59)? Cambia cómo se calcula el throttle.~~ **Asunción operativa en Plan 22 Chat A: rolling window 60 min.** Si el hosting aplica hora de reloj, el sliding window se reajustará como variante en chat posterior; en la práctica rolling es estrictamente más conservador que hora de reloj.
- [x] ~~Confirmar: ¿el contador se reinicia con bounces? Un 550 cuenta como "envío" para la cuota?~~ **Decisión en Plan 22 Chat A: counter cuenta solo `EO_Estado='SENT'` (ignora FAILED).** Asunción verificable post-deploy: si el hosting también cuenta los FAILED contra la cuota, ajustar el counter para incluir `FAILED` transitorios que llegaron al SMTP.
- [x] ~~Inventariar remitentes actuales~~ — en Plan 22 Chat A se asume un único remitente histórico (`sistemas@laazulitasac.com`) y el script SQL 3.2 hace backfill de `EO_Remitente` a ese valor en las 2.788 filas.

---

## ⚠️ Pendientes para el próximo deploy

> **Origen**: Conversación 2026-04-18. Migración de credenciales Firebase + JaaS a env vars de Azure App Service. Cambios commiteados localmente; push pendiente por política de no-deploy en fines de semana (solo lunes y jueves).

### Cambios listos (commit local hecho, push pendiente)

**Backend** — `Educa.API` (master, commit `89e48b3`):

- Mensaje: `feat(security): read Firebase credential from env var, return JaaS appId in token response`
- Archivos: `appsettings.json`, `Controllers/Videoconferencias/VideoconferenciaController.cs`

**Frontend** — `educa-web` (main, commit `b9b0e04`):

- Mensaje: `feat(security): get JaaS appId from backend response, drop from environment`
- Archivos: 3 environments (`environment.ts`, `environment.development.ts`, `environment.capacitor.ts`) + `videoconferencias.facade.ts` + `videoconferencia-sala.component.ts`

### Pre-deploy (Azure App Service `educa1` → Variables de entorno)

- [x] `Firebase__CredentialsJson` configurada con JSON válido (verificado 2026-04-18)
- [x] `JaaS__AppId` configurada con `vpaas-magic-cookie-ab31757bc7ba406d965de2c757d33c01` (verificado 2026-04-18)
- [ ] `ASPNETCORE_ENVIRONMENT=Production` aplicada explícitamente (creada en sesión, confirmar que el "Aplicar" final quedó guardado)

### Deuda SQL en BD de prueba (no bloqueante)

- [ ] Agregar columnas `ERL_RequestBody`, `ERL_RequestHeaders`, `ERL_ResponseBody` a `ErrorLog` en BD de prueba (el código es tolerante fire-and-forget INV-ET02, pero floodea warnings en logs)
- [ ] DROP de `Asistencia_deprecated_2026_04` a los 60 días del rename (fecha: ~2026-06-20) si no hay issues

### Pre-push — estandarizar idioma de commits pendientes a inglés

> **Origen**: Decisión 2026-04-20. A partir de ahora los mensajes de commit se redactan en inglés (ver skills `commit-back.md`, `commit-front.md`, `commit-local.md`). Los commits **ya pusheados** quedan como están — esto aplica solo a lo que aún no se ha subido.

**Regla**: type/scope/descripción en inglés. Nombres propios del dominio en español van **entre comillas** (ej: `"Mi asistencia"`, `"AsistenciaPersona"`). Scopes de Conventional Commits (nombres de carpeta/módulo) se mantienen sin comillas aunque sean en español: `feat(asistencia)`, `fix(home)`, `docs(maestro)`.

**Commits pendientes a reescribir (frontend, `main`, desde `origin/main`)**:

- [ ] `8b9c32d tweak(home): Plan 22 — threshold medium de 70 a 60` → `tweak(home): Plan 22 — medium threshold from 70 to 60`
- [ ] `0ef5a68 fix(home): Plan 22 — fallback hex en barras y badges` → `fix(home): Plan 22 — hex fallback in bars and badges`
- [ ] `55652cf feat(home): Plan 22 Chat 2 — widgets de asistencia del día por rol` → `feat(home): Plan 22 Chat 2 — day attendance widgets by role`
- [ ] `864ec72 fix(asistencia): Plan 21 Chat 7 — shell director delega setViewMode a profesores` → `fix(asistencia): Plan 21 Chat 7 — director shell delegates setViewMode to teachers`
- [ ] `43da0fb feat(asistencia): Plan 21 Chat 7.C — vista admin profesores armonizada` → `feat(asistencia): Plan 21 Chat 7.C — teachers admin view harmonized`
- [ ] `b84c159 feat(asistencia): Plan 21 Chat 7.B — day-list genérico y service API día-profesores` → `feat(asistencia): Plan 21 Chat 7.B — generic day-list and day-teachers API service`
- [ ] `d3d8708 style(asistencia): alinear tabs del shell profesor con el header de pagina` → `style(asistencia): align teacher shell tabs with page header`
- [ ] `e8c1aa6 style(asistencia): tabs transparentes en shell profesor` → `style(asistencia): transparent tabs in teacher shell`
- [ ] `e030b6d refactor(asistencia): Plan 21 Chat 6 - pivote "Mi asistencia" profesor = igual que estudiante` → `refactor(asistencia): Plan 21 Chat 6 — pivot teacher "Mi asistencia" to match student`
- [ ] `f02b695 feat(asistencia): Plan 21 Chat 6 - armonizacion UX "Mi asistencia" profesor` → `feat(asistencia): Plan 21 Chat 6 — UX harmonization of teacher "Mi asistencia"`
- [ ] `98beb3d feat(asistencia): Plan 21 Chat 4 - frontend profesor con p-tabs "Mi asistencia" + "Mis estudiantes"` → `feat(asistencia): Plan 21 Chat 4 — teacher frontend with p-tabs "Mi asistencia" + "Mis estudiantes"`
- [ ] `41fc77d docs(maestro): Plan 21 Chat 2 ✅ — backend feature profesor cerrado` → `docs(maestro): close Plan 21 Chat 2 — teacher backend feature`
- [ ] `e7f8bb8 docs(maestro): Plan 21 Chat 1.5 ✅ — reads + FKs migrados a AsistenciaPersona` → `docs(maestro): close Plan 21 Chat 1.5 — reads + FKs migrated to "AsistenciaPersona"`
- [ ] `52b81a7 docs(maestro): Plan 21 Chat 1 ✅ + Chat 1.5 agregado (B-split)` → `docs(maestro): close Plan 21 Chat 1 + add Chat 1.5 (B-split)`

**Commits pendientes a reescribir (backend, `master`, desde `origin/master`)**:

- [ ] `f59267e feat(asistencia): Plan 21 Chat 7.A — endpoint dia-profesores admin` → `feat(asistencia): Plan 21 Chat 7.A — admin day-teachers endpoint`
- [ ] `7ae6427 feat(asistencia): Plan 21 Chat 4 - endpoints self-service profesor + fixes repo` → `feat(asistencia): Plan 21 Chat 4 — teacher self-service endpoints + repo fixes`
- [ ] `a7426a6 feat(asistencia): Plan 21 Chat 2 — backend feature profesor (consulta + PDF + email + guard INV-AD06)` → `feat(asistencia): Plan 21 Chat 2 — teacher backend feature (query + PDF + email + INV-AD06 guard)`
- [ ] `59ace30 feat(asistencia): Plan 21 Chat 1.5 — reads + FKs + servicios secundarios migrados a AsistenciaPersona` → `feat(asistencia): Plan 21 Chat 1.5 — reads + FKs + secondary services migrated to "AsistenciaPersona"`
- [ ] `97ca115 feat(asistencia): dispatch polimórfico Profesor/Estudiante + tabla AsistenciaPersona` → `feat(asistencia): polymorphic Teacher/Student dispatch + "AsistenciaPersona" table`

**Commits ya correctos en inglés (no tocar)**: `b9b0e04`, `9f7d836`..`9d204fd` (frontend); `89e48b3`, `810d437`..`bd9f12a` (backend).

**Cómo ejecutar**:

- Usar `git rebase -i origin/main` en frontend y `git rebase -i origin/master` en backend.
- Cambiar `pick` por `reword` en cada commit a corregir.
- Guardar y editar cada mensaje con el texto nuevo. Preservar trailer `Co-Authored-By:` si existe.
- Validar con `git log --oneline origin/main..HEAD` que no quede ningún commit en español.
- Re-ejecutar `pre-push` (lint + tests) antes del push por si algún hook se disparó.

### Post-deploy

- [ ] Log stream del App Service: `Application started` sin errores `FirebaseException` ni `Unable to find credentials`
- [ ] DevTools → request a `/api/Videoconferencia/token` devuelve `{jwt, appId}` (no solo `{jwt}`)
- [ ] Sala de videoconferencia carga el iframe de Jitsi correctamente con audio/video
- [ ] Forzar un 500 (ej: `GET /api/Usuarios/999999999`) → response NO incluye stack trace (solo `mensaje` + `correlationId`)
- [ ] Si se ejercita un flujo que envía push notification (FCM), validar que sigue llegando

### Pendiente futuro (en otro chat, sin presión)

- [ ] Rotar credential Firebase en [Firebase Console](https://console.firebase.google.com) (la actual está expuesta en git history del backend)
- [ ] Actualizar `Firebase__CredentialsJson` en Azure con el JSON nuevo
- [ ] `git rm --cached Educa.API/educa-4f684-firebase-adminsdk-fbsvc-d5a369a2f9.json` + commit en backend
- [ ] (Opcional) Limpiar git history del archivo con `git-filter-repo` o BFG si el repo está en remoto público

> Nota de seguridad: ver hallazgos del audit (16/20 → 17/20 al cerrar estos tres puntos). Hallazgos descartados intencionalmente por priorizar UX (BCrypt 12, captcha en SessionEndpoints, sanitización exhaustiva de errores).

---

## 🟡 Asistencia de Profesores en CrossChex

> **Origen**: Investigación 2026-04-18 + diseño cerrado 2026-04-18. CrossChex ya envía marcaciones biométricas de profesores, pero el webhook del backend y el sync manual las descartan silenciosamente porque la tabla `Asistencia` solo tiene FK a `Estudiante`.
> **Impacto**: ~1 semana de registros de profesores pendientes de procesar. **No hay pérdida definitiva** — `AsistenciaSyncService.SobreescribirDesdeCrossChexAsync` recupera días históricos una vez corregido el dispatch.
> **Plan**: [`plan/asistencia-profesores.md`](asistencia-profesores.md) — Plan #21 del inventario.
> **Estado**: ✅ Chat 1 + Chat 1.5 + Chat 2 + Chat 3 + Chat 4 + Chat 6 cerrados (2026-04-20). Chat 6 cerró la deuda UX del Chat 4: vista "Mi asistencia" ahora usa la leyenda compartida, responde al pill día/mes del header y aplica severity coherente con el resto del módulo. Frontend: 1341 tests verdes. Backend: 766 tests verdes.
> **Próximo paso**: Chat 5 (deploy). Ejecutar `plan21_chat15_FkRepointAsistenciaPersona.sql` en prueba/producción → deploy backend → deploy frontend → sync histórico "Sobreescribir desde CrossChex" → rename legacy `Asistencia` → actualizar `business-rules.md` (INV-AD05/AD06) y `permissions.md`.

### Qué se decidió en investigación

- **Modelo**: Opción C — nueva tabla `AsistenciaPersona` con discriminador `ASP_TipoPersona ∈ {'E','P'}` y FK polimórfica.
- **Webhook**: dispatch por DNI en orden Profesor → Estudiante → rechazar.
- **Reutilización**: mismas ventanas horarias, invariantes horarios (INV-C01/02/03), cierre mensual (INV-AD03), origen manual (INV-AD02).
- **Invariantes nuevos/modificados**: INV-AD05 ampliado (profesor solo correo a sistemas), **INV-AD06 nuevo** (justificación de profesor requiere rol administrativo; profesor no puede autojustificarse ni justificar a colega), regla nueva de jurisdicción a `permissions.md`.
- **UI**: submenú Estudiantes/Profesores en `AttendanceDirectorComponent` para los 4 roles administrativos (Director + Asistente Admin + Promotor + Coordinador Académico); panel propio read-only en `AttendanceProfesorComponent`.

### Por qué es urgente

Cada día que pasa sin resolver esto, se pierden marcaciones biométricas de profesores en CrossChex. El costo marginal crece diario y no hay forma de reconstruir los datos retroactivamente a partir del webhook — el dispositivo los envía una sola vez.

### Dependencias

- **Ninguna dura**: el plan puede arrancar en paralelo a cualquier ola de Carril D.
- **Relacionado con**: Plan 1 F4 (INV-* en tests) — al formalizar INV-AD06 conviene que haya test unitario del guard de jurisdicción.
- **No toca**: `/intranet/admin/asistencias` (ese módulo queda fuera de este plan).
- **Sucesor agendado**: **Plan 22 — Endurecimiento correos de asistencia** (`Educa.API/.claude/plan/asistencia-correos-endurecimiento.md`) queda 🔒 congelado hasta que Plan 21 cierre. Razón: la lógica de distinción estudiante/profesor en el dispatcher y routing de correos se consolida en los Chat 3+ de Plan 21, y F1/F3/F4 del Plan 22 la necesitan para validar, notificar y auditar por tipo de persona.
- **Sucesor agendado**: **Plan 23 — Extensión `/intranet/admin/asistencias` a Profesores** (`plan/asistencia-admin-profesores.md`). Razón: Plan 21 cerró el dispatch y la tabla `AsistenciaPersona` pero la pantalla admin de gestión y reportes todavía asume universo "solo estudiantes". Plan 23 parametriza endpoints por `tipoPersona` y agrega toggle Estudiantes/Profesores/Todos sin duplicar vistas. Puede arrancar en paralelo a Plan 22 (tocan capas distintas: Plan 22 = outbox/SMTP, Plan 23 = UI admin + endpoints listar/crear/reportar).

---

## 🟡 Plan 23 — Extensión `/intranet/admin/asistencias` a Profesores

> **Origen**: Conversación 2026-04-20. Tras cerrar Plan 21, CrossChex sincroniza marcaciones de profesores y el backend las persiste en `AsistenciaPersona`, pero `/intranet/admin/asistencias` (tabs Gestión + Reportes) aún filtra/muestra solo estudiantes. El Director no puede auditar profesores ni corregir manualmente marcaciones biométricas de profesor desde el admin formal.
> **Plan**: [`plan/asistencia-admin-profesores.md`](asistencia-admin-profesores.md) — Plan #23 del inventario.
> **Estado**: ⏳ Plan nuevo, 5 chats diseñados (BE → FE Gestión → BE+FE Reportes → BE+FE INV-AD05/06 → deploy).
> **Puede arrancar en paralelo a Plan 22** — tocan capas distintas (Plan 22 = outbox/SMTP, Plan 23 = UI admin + endpoints listar/crear/reportar).

### Qué se decidió en diseño

- **Parametrizar, no duplicar**: query param `tipoPersona ∈ {E, P, todos}` en endpoints existentes. Default admin = `todos`.
- **UI**: toggle 3-opciones en tab Gestión con default `E` por retrocompatibilidad visual; columna "Grado" → "Contexto" polimórfico (`"1ro Secundaria A"` para E, `"Matemáticas — Secundaria"` para P).
- **Formulario "Nueva asistencia"**: pestaña Estudiante/Profesor con selector subyacente diferente (reutiliza UX de `AttendanceDirectorComponent` Chat 7).
- **Reportes**: eje `tipoPersona` adicional, header PDF dinámico, selector "Salones" oculto cuando tipo = Profesores/Todos.
- **Cross-link UI**: botón "Editar en admin" desde `AttendanceDirectorComponent` Chat 7 lleva a `/intranet/admin/asistencias?tab=gestion&tipoPersona=P&dni=...&fecha=...`.
- **Invariantes**: INV-AD05 ampliado (correo de corrección a profesor + Director, no apoderado); INV-AD06 reforzado con test de boundary.
- **Sin migración SQL nueva**: Plan 21 ya entregó `AsistenciaPersona`.

### Por qué importa

Cada día que pasa sin resolver, el Director acumula registros de profesores invisibles en la UI formal. La única vía de auditoría hoy es `AttendanceDirectorComponent` (Plan 21 Chat 7) que es read-only. No hay flujo formal para corregir marcaciones biométricas de profesor desde admin.

### Dependencias

- **Dura**: Plan 21 cerrado (tabla `AsistenciaPersona` + dispatcher Profesor→Estudiante existen).
- **Blanda con Plan 22**: si Plan 22 cierra antes, se hereda validación ASCII+RFC y clasificación SMTP automáticamente. Si Plan 23 cierra antes, Plan 22 encuentra universo completo sin rework.
- **Relacionado con**: Plan 12 F3 (Security boundary tests) — el test de INV-AD06 (rol Profesor no puede mutar otro profesor) calza en esa suite.

---

## 🟡 Plan 24 — Sincronización CrossChex en Background Job

> **Origen**: Conversación 2026-04-20. En `/intranet/admin/asistencias?tab=gestion`, "Sincronizar CrossChex" bloquea al usuario 2+ minutos sin feedback granular. Si el usuario navega, pierde el resultado (subscripción cancelada, request sigue viva en server).
> **Plan**: inline en este maestro (sin archivo separado — hacer otro día).
> **Estado**: ⏳ Diagnóstico cerrado 2026-04-20. 4 chats diseñados. Ningún cambio ejecutado.

### Diagnóstico

- **Backend (culpa principal)**: `CrossChexApiService.GetDayRecordsAsync:231` hace `await Task.Delay(30000)` **entre cada página** (páginas de 100 registros). Con ~500 personas/día → ~5 páginas → 4 delays = 2 min de espera pura entre páginas.
- **Por qué cada sync del mismo día tarda más**: las marcaciones se acumulan intradiariamente (8 AM = solo entradas, 6 PM = entradas + salidas + reentradas). A más tarde, más páginas, más delays. No es acumulación histórica — es acumulación del día en curso.
- **Frontend**: `AttendancesDataFacade.sincronizarDesdeCrossChex:129-154` usa `.subscribe()` directo con `takeUntilDestroyed`. Si el usuario navega, la suscripción muere pero la request HTTP sigue viva en el server — resultado perdido. Único feedback: signal `syncing()` → spinner en botón + toast al final.

### Qué diseñar (4 chats)

- **Chat 1 — Backend job + status endpoint**: mover `SobreescribirDesdeCrossChexAsync` a background task (Hangfire ya en el proyecto según `business-rules.md` §16.2). Endpoint `POST /api/asistencia-admin/sync` retorna `202 Accepted { jobId, estado: "QUEUED" }`. Nuevo `GET /api/asistencia-admin/sync/{jobId}/status` con progreso.
- **Chat 2 — SignalR broadcast de progreso**: reusar `AsistenciaHub` (ya en producción tras Plan 21). Emitir `"SyncProgress"` con `{ jobId, pagina, totalPaginas, fase: "DESCARGANDO" | "PROCESANDO" | "COMPLETADO" | "ERROR", mensaje }`. Frontend se suscribe antes de disparar el POST.
- **Chat 3 — Frontend: progreso visible + navegación libre**: reemplazar spinner por `p-progressBar` con mensaje dinámico ("Descargando página 3/5 — esperando CrossChex…", "Procesando 127 registros…"). Suscripción al hub vive en servicio singleton (sobrevive navegación). Toast al recibir `"COMPLETADO"` o `"ERROR"`. Usuario puede salir de la página — al volver, ve el estado final.
- **Chat 4 — Validar rate limit real + deploy**: investigar si los 30s de `Task.Delay` vienen de documentación de CrossChex o son paranoia del autor original. Si se puede reducir a 5-10s (o eliminarlo si el dispositivo soporta llamadas consecutivas), fix en la misma PR — es el mayor acelerador percibido. Deploy BE + FE.

### Por qué importa — UX bloqueante

El Director pierde 2+ minutos bloqueado cada vez que sincroniza (operación frecuente porque CrossChex entrega datos con delay). La UX actual desincentiva el uso del feature y genera la percepción de "cada vez más lento" aunque no haya degradación real del sistema.

### Dependencias

- **Ninguna dura**: puede arrancar después del deploy de Plan 21 para validar con marcaciones reales (profesores + estudiantes en la misma sincronización — mayor volumen por página).
- **Plan 26 F1 ✅ cerrada** — el riesgo de "429 invisibles" del job CrossChex (mencionado en el checklist pre-inicio del Plan 26) está **mitigado**: la telemetría está viva en prod, cualquier 429 que dispare el job aparecerá en `/intranet/admin/rate-limit-events` con `rol = "Anónimo"` o `null` (el job corre server-side sin `ClaimsPrincipal`). El middleware persiste igual — el Chat 4 de Plan 24 puede validar con datos reales post-deploy.
- **Relacionado con Plan 22** (endurecimiento correos): si Plan 22 cierra antes, el background job puede encolar correos de resumen al finalizar en el outbox consolidado.
- **No toca reglas de negocio**: INV-AD02 (precedencia manual), INV-AD03 (cierre mensual), INV-AD05 (correos diferenciados) se preservan tal cual. Cambio puramente infraestructural — mismo flujo, movido a background con progreso visible.

### Referencias clave

- BE: `Educa.API/Services/Integraciones/CrossChexApiService.cs:231` — el `Task.Delay(30000)` entre páginas
- BE: `Educa.API/Controllers/Asistencias/AsistenciaAdminController.cs:104-111` — endpoint actual síncrono
- BE: `Educa.API/Services/Asistencias/AsistenciaSyncService.cs:118-199` — `SobreescribirDesdeCrossChexAsync` (mover a job)
- FE: `src/app/features/intranet/pages/admin/attendances/services/attendances-data.facade.ts:129-154` — `.subscribe()` directo
- FE: `src/app/features/intranet/pages/admin/attendances/attendances.component.ts:209-225` — `onSincronizar` (reemplazar spinner por progress)

---

## ✅ Plan 25 — Paridad Excel para reportes PDF — CERRADO 2026-04-21

> **Origen**: Decisión 2026-04-21. Los usuarios (Director + Administrativos) necesitan los mismos reportes en Excel para analizar, filtrar y cruzar datos en hojas de cálculo. Hoy solo se entrega PDF — formato cerrado, no manipulable.
> **Plan**: inline en este maestro (sin archivo separado por ahora).
> **Estado**: ✅ **Cerrado 2026-04-21**. Chat 1 ✅ + Chat 2 ✅ + Chat 3 ✅ + Chat 4 ✅ + Chat 5A ✅ + Chat 5B ✅ (6 de 6 chats cerrados, 100%). Reapertura se cerró completamente — Chat 5A alineó colores + leyenda + nombres de mes en Excel; Chat 5B entregó división Verano/Regular del reporte anual (query param `periodo`) + espejo PDF de subtítulos en español + refactor `FechaFormatoHelper` compartido entre Excel y PDF.

### Regla nueva

> **"Todo endpoint o acción de UI que exporta un reporte en PDF debe ofrecer también la versión Excel equivalente."**

Aplica a reportes nuevos y a los 6+ existentes. Sin excepciones salvo justificación escrita (ej: layout puramente tipográfico sin datos tabulares — no aplica a ningún reporte actual).

### Reportes actuales a cubrir

Todos son BE (`Services/Reportes*`) consumidos por FE admin o cross-role:

- `ReporteFiltradoAsistenciaService` (441 ln) — reporte filtrado de asistencia (admin + reportes-asistencia)
- `ReporteFiltradoPdfService` (425 ln) — layout del anterior
- `ReporteAsistenciaDataService` (396 ln) — data para reporte agregado
- `ReporteAsistenciaConsolidadoPdfService` (389 ln) — consolidado por periodo
- `ReporteAsistenciaSalonPdfService` (314 ln) — por salón
- `BoletaNotasPdfService` (381 ln) — boleta de notas del estudiante
- PDF de asistencia de profesor (Plan 21 Chat 2, consulta-asistencia)

### Qué diseñar (4 chats estimados)

- **Chat 1 — BE: ClosedXML + `ReporteFiltradoAsistencia` Excel parity** ✅ **cerrado 2026-04-21**. Decisión práctica: NO abstraer `IReportBuilder` genérico (diferido a Plan 2/C.2) — entrega aditiva pura al lado del PDF, sin tocar servicios existentes. Se agregó `ClosedXML 0.104.*`, `IAsistenciaExcelService` + `AsistenciaExcelService` (base + partials `Estudiantes`/`Profesores`, todos <300 ln), endpoint `GET /api/reportes-asistencia/excel` con `[EnableRateLimiting("heavy")]` mirror del `/pdf`, 12 tests nuevos (877 total, 0 regresiones). Dos hojas separadas cuando `tipoPersona=todos`. DNI como texto (INV-D01), horas en Perú (INV-D04).
- **Chat 2 — BE: migrar 4 reportes PDF restantes a Excel** ✅ **cerrado 2026-04-21**. 4 services nuevos con sus interfaces: `IReporteAsistenciaSalonExcelService`, `IReporteAsistenciaConsolidadoExcelService`, `IReporteAsistenciaProfesorExcelService`, `IBoletaNotasExcelService`. 13 endpoints `/excel` mirror de los `/pdf` (11 en `ConsultaAsistenciaController` + 2 en `BoletaNotasController`), todos con `[EnableRateLimiting("heavy")]` y Content-Type correcto. **ExcelHelpers.cs estático extraído** (constantes + `EscribirDniComoTexto`, `FormatearHora`, `AplicarEstiloHeader`, `EscribirHeaders`, `PintarFilaAlterna`, `FinalizarHoja`, `EscribirSinResultados`) — consolidación de helpers duplicados de Chat 1, `AsistenciaExcelService` refactorizado para consumirlo. 27 tests nuevos (904 total, +27 sobre 877 baseline de Chat 1, 0 regresiones). Cap 300 ln respetado en los 8 archivos nuevos. NO se adelantó `IReportBuilder` (Plan 2/C.2) — la duplicación de mapeo se absorbió sin dolor con el partial pattern + helpers compartidos. Deuda: `ConsultaAsistenciaController.cs` quedó en 839 ln (ya estaba en 630 pre-Chat 2, split fuera de scope).
- **Chat 3 — FE: UI dual PDF/Excel** ✅ **cerrado 2026-04-21**. Inventario real en FE = 5 puntos (no 6): `estadisticas-dia`, `attendance-director-estudiantes`, `attendance-director-profesores`, `attendance-profesor-estudiantes`, `attendance-reports`. En lugar de un shared `<app-download-split-button>`, se extendió el patrón existente `<p-menu>` agregando "Descargar Excel" a cada `pdfMenuItems` — cada componente construye su menú según modo (día/mes/periodo/consolidado) y no justificaba un wrapper. Helper común `buildPdfExcelMenuItems()` en `consolidated-pdf.helper.ts` consolida los 3 items. Services: `DirectorAttendanceApiService` refactorizado con `downloadReport`/`downloadConsolidado` privados paramétricos por formato (PDF/Excel) — 7 métodos PDF + 7 Excel. `AsistenciaProfesorApiService`: 3 métodos Excel nuevos. Fachada `AttendanceService`: 7 wrappers Excel. `AttendancePdfService` scoped: helper `run(obs, handle)` común + métodos Excel espejo. `attendance-reports.facade.ts`: **reemplazado ExcelJS client-side por endpoint BE** `/api/ReportesAsistencia/excel` (consistencia con lo que hace PDF). 0 regresiones (1410 tests verdes), lint limpio, build OK. Dos escape hatches `max-lines` con justificación en los 2 componentes director (>300 ln por la cohesión de 2 modos × 2 formatos × 4 variantes de reporte).
- **Chat 4 — Documentación + tests de paridad end-to-end** ✅ **cerrado 2026-04-21**. Docs: `§17 Reportes exportables — paridad de formatos` agregado a `business-rules.md` con la regla operativa ("todo endpoint o acción UI que exporta PDF debe ofrecer Excel"), INV-RE01/02/03, inventario actual de 14 endpoints, excepción única (layouts tipográficos sin datos tabulares) y entrada de checklist backend. Tests BE: `ReportesAsistenciaExcelEndpointTests` + `BoletaNotasExcelEndpointTests` + `ConsultaAsistenciaExcelEndpointTests` — 26 tests contract por endpoint verifican (a) content-type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, (b) extensión `.xlsx` en `FileDownloadName`, (c) que PDF y Excel invocan el mismo data service con los mismos args (paridad estructural). Decisión: **NO** se montó `WebApplicationFactory` — tests unit de controller usando `ControllerTestBase` + `ClaimsPrincipalBuilder` existentes cubren lo mismo sin la infraestructura pesada. Tests FE: `consolidated-pdf.helper.spec.ts` (17 tests) cubre el helper compartido `buildPdfExcelMenuItems` — 3-item menu, dispatch a callbacks, `labelSuffix`, y la paridad del switch `getTodosSalonesObservable` ↔ `getTodosSalonesExcelObservable`. Siguiendo aprendizaje transferible #2 del handoff, **NO** se duplicó cobertura agregando specs por componente — el helper es la unidad de verdad. `attendance-reports.facade.spec.ts` extendido con 2 tests para `exportarExcel` (delegación al endpoint BE + short-circuit sin resultado). Suite BE: 930 verdes (+26). Suite FE: 1429 verdes (+19). Lint FE + build Angular verdes.
- **Chat 5A — BE: paridad visual Excel ↔ PDF (colores + leyenda + nombres de mes)** ✅ **cerrado 2026-04-21**. Reapertura del plan por feedback visual del usuario post-Chat 4: los Excel no seguían el color coding del PDF, no tenían leyenda de estados, y los subtítulos usaban rangos numéricos feos en vez de nombres de mes en español. Entrega: **(1)** catálogo compartido `Constants/Asistencias/EstadoAsistenciaColores.cs` — fuente única de verdad para los 6 códigos (T/A/F/J/-/X) con `Foreground` + `Background` + `Label` + `Orden` + helper `ToArgbNoHash` (convierte `"#506ad0"` → `"FF506AD0"` para ClosedXML). `AsistenciaPdfComposer.Colors.cs` refactorizado a facade (preserva API pública `ColorEstado`/`ColorEstadoBg`/`EstadosAsistencia` — zero breaking change para PDF). **(2)** `ExcelHelpers` extendido: `EscribirLeyendaEstados` (5 badges horizontales con fondos de color), `AplicarColorEstado` (pinta celda individual con fg+bg del catálogo), `FormatearMesAnio` (`"ABRIL 2026"`), `FormatearRangoSemana` (`"Semana del lunes 20 al domingo 26 de abril de 2026"`). **(3)** Celdas de estado pintadas en `AsistenciaExcelService.Estudiantes`/`.Profesores`, `ReporteAsistenciaProfesorExcelService.Tables` (día/mes/filtrado) y `ReporteAsistenciaSalonExcelService.Tables` (hoja Día). Consolidados por salón no pintan celdas (columnas de conteo, no de estado) pero tampoco llevan leyenda. **(4)** Leyenda invocada en fila 4 del reporte filtrado (estudiantes+profesores) y fila 3-4 de reportes de profesor (día/mes/filtrado) — headerRow pasó de 5→6 en esos services con los 10 tests hardcodeados actualizados. **(5)** Subtítulos con nombre de mes en español en todos los services de rango (consolidado, salón, profesor). El año consolidado queda simple `"AÑO 2026"` — Chat 5B lo enriquece con Verano/Regular. Decisiones pre-work: catálogo en Opción A (`Constants/Asistencias/`), espejo PDF de subtítulos diferido a 5B (PDF services ya están en 395/320 ln). Tests nuevos: `EstadoAsistenciaColoresTests` (15 tests catálogo + ToArgbNoHash + fallbacks), `AsistenciaPdfColoresParidadTests` (15 tests pinean paridad PDF↔catálogo — preventivo de drift), `ExcelHelpersLeyendaTests` (8 tests: leyenda + AplicarColorEstado + FormatearMesAnio + FormatearRangoSemana), `AsistenciaExcelServiceColorTests` (6 tests: 4 códigos × celda estudiante + celda profesor + leyenda en fila 4), extensión de `ReporteAsistenciaConsolidadoExcelServiceTests` (2 tests: subtítulo mes en español + "AÑO 2026" simple). Suite BE: **986 verdes** (+56 sobre 930 baseline de Chat 4, 0 regresiones). Cap 300 ln respetado en todos los archivos tocados. Agregado `InternalsVisibleTo("Educa.API.Tests")` al `.csproj` para testear helpers internos.
- **Chat 5B — BE + FE: división Verano/Regular del reporte anual + espejo PDF de subtítulos** ✅ **cerrado 2026-04-21**. Decisiones pre-work: **Opción B** (query param `periodo=ambos|verano|regular`, default `ambos`) + promover `FechaFormatoHelper` a shared para que PDF lo consuma sin acoplarse al namespace Excel. Entrega en 3 commits BE + 1 FE: **(1) refactor(reports) `d3188ed`** — `FormatearMesAnio`/`FormatearRangoSemana` movidos a `Helpers/Formatting/FechaFormatoHelper.cs`; `ExcelHelpers` mantiene delegates thin para no romper 6+ consumers. `FechaFormatoHelperTests` (6 tests) pinea contrato directo, los 8 tests de Chat 5A siguen verdes vía delegates. **(2) feat(reports) `7618021`** — `PeriodoAnual` constants class (ambos/verano/regular + `Normalizar`/`IncluyeVerano`/`IncluyeRegular`), `AnioDivididoDto` (Verano + Regular lists), `ObtenerDatosTodosSalonesAnioDividido` en `DataService` (partial `*.AnualDividido.cs` — principal ya estaba en 400 ln deuda pre-existente, no empeorada), `GenerarExcelTodosSalonesAnio` acepta `periodo` y genera 1-2 hojas (`Verano` / `Regular`), `GenerarPdfTodosSalonesAnio` acepta `periodo` y genera 1-2 páginas independientes. Controllers `/anio/pdf` y `/anio/excel` aceptan `[FromQuery] string? periodo`. **Cleanup de dead code**: 3 métodos nunca llamados (`ComposeSeccionBuenaAsistencia`, `ComposeSeccionBajaAsistencia`, `ComposeContentResumen`) eliminados de `ReporteAsistenciaConsolidadoPdfService` — archivo pasó de 395→295 ln, dentro del cap sin partial split. **(3) feat(reports) `98fa14f`** — subtítulos PDF en español vía `FechaFormatoHelper` en `ReporteAsistenciaConsolidadoPdfService` (semana/mes), `ReporteAsistenciaSalonPdfService` (mes — split a partial `*.Headers.cs` porque era 320 ln pre-existente, ahora 171+160), `ReporteAsistenciaProfesorPdfService` (mes). Cierra visual parity Excel↔PDF. **(4) feat(reports) FE `dd137f8`** — `TipoReporte` extendido con `todos-anio-verano` + `todos-anio-regular`; helper `getPeriodoFromTipo` mapea al query param BE; `TIPO_REPORTE_OPTIONS` expone 3 items ("Año (ambos periodos)", "Año — solo Verano (Ene-Feb)", "Año — solo Regular (Mar-Dic)"); filenames con sufijo de periodo. Tests nuevos: 3 DataService + 4 Excel consolidado + 3 PDF consolidado anual + 5 PDF subtítulos español + 6 FechaFormatoHelper = **20 BE nuevos**, suite **1006 verdes** (+20 sobre 986 Chat 5A, 0 regresiones). **5 tests FE nuevos** (3 routing per periodo + 3 filename suffix, 1 actualizado) → 22 vitest verdes en el helper. Cap 300 ln respetado en todos los archivos tocados (partial splits con nombre de responsabilidad explícito). INV-RE01 preservado — ambos endpoints PDF/Excel aceptan el mismo param. INV-C01 no se tocó (las reglas de umbral viven en Domain, Chat 5B solo separa el agregado).

### Por qué importa (Plan 25)

- **Operativo**: el Director y el equipo administrativo procesan datos en Excel — hoy deben re-transcribir desde el PDF o pedir exportación manual al área de sistemas.
- **Arquitectura**: obliga a terminar la abstracción `PdfBuilderService` (Plan 2/C.2) — si no se hace ahora, duplicar el código PDF en código Excel dobla la deuda. La regla **previene** que cada reporte nuevo nazca solo-PDF.

### Dependencias (Plan 25)

- **Plan 2/C.2 (PDF Builder genérico)**: diferida. Chat 1 decidió NO adelantar la abstracción genérica — entrega aditiva que no toca servicios PDF existentes. Chat 2 decidirá si la duplicación de mapeo de columnas justifica adelantar C.2 o seguir con services hermanos.
- **Backend Excel desde cero**: **no existe `ExcelService` en BE** (corrección a diseño original del plan — el `ExcelService` del monorepo es frontend). Chat 1 agregó `ClosedXML` como librería base y creó `AsistenciaExcelService` nuevo.
- **No toca reglas de negocio**: los datos exportados son los mismos, cambia solo el formato. Invariantes de dominio (INV-*) no se tocan.

### Referencias clave (Plan 25)

- BE: `Educa.API/Services/Excel/AsistenciaExcelService.cs` (+ partials) — Chat 1 entregado
- BE: `Educa.API/Interfaces/Services/Asistencias/IAsistenciaExcelService.cs` — contrato
- BE: `Educa.API/Services/Reportes*/` — los 5+ services de PDF restantes por migrar
- BE tests: `Educa.API.Tests/Services/Excel/` — 12 tests paridad + edge cases (DNI, horas, TipoPersona)
- Plan 2/C.2 en este maestro (sección Carril B) — abstracción PdfBuilder que se pospuso en Chat 1
- `backend.md` §Rate Limiting — política `heavy` aplica a ambos formatos

---

## Bloqueos activos (qué desbloquea qué)

> Lectura rápida para elegir próximo chat. Complementa al diagrama de dependencias.

| Si cierro… | Desbloqueo… | Por qué |
|------------|-------------|---------|
| ~~QW3 (specs rotos)~~ | ~~CI verde → F4.6 efectivo~~ | ✅ Cerrado 2026-04-16 |
| ~~Plan 6 (completo)~~ | ~~Plan 4 (Consolidación BE) + Plan 5 (Consolidación FE)~~ | ✅ Cerrado 2026-04-16 |
| Plan 2/B (3 state machines) | Plan 1 F4.4 (INV-T*) | Transiciones formales necesarias para tests de invariantes |
| Plan 3 F3.5 (Diseño UI matrícula) | Plan 3 F4 (implementación matrícula) | Diseño desbloquea implementación |
| Plan 3 F4 (Matrícula) | Plan 1 F4.5 (INV-M*) | Feature independiente |
| Carril B sustancialmente cerrado | Plan 10 F1+ (Flujos Alternos completo) | Requisito explícito: "proyecto limpio" (P0 extraído a Carril D, desbloqueado) |

**Carril A — CERRADO** ✅ (2026-04-16). Plan 6 completado en todas sus fases (F0-F6).

<details><summary>Historial Carril A (cerrado)</summary>

1. ~~**QW3**~~ ✅ — CI verde, 0 fallos.
2. ~~**Plan 6 F1**~~ ✅ — BD: tabla `ProfesorCurso` + migración + modelo EF.
3. ~~**Plan 6 F2**~~ ✅ — Domain validators: 4 archivos + 42 tests.
4. ~~**Plan 6 F3**~~ ✅ — BE Services: 7 archivos nuevos + 9 modificados. 741 tests.
5. ~~**Plan 6 F4**~~ ✅ — Frontend: tipos + badges + cursos que dicta. 25 archivos.
6. ~~**Plan 6 F5**~~ ✅ — Auditoría SQL: 0 violaciones INV-AS01/AS02.
7. ~~**Plan 6 F6**~~ ✅ — Tests facade + invariantes formalizados + error codes.

</details>

**QW4 — LINT LIMPIO + DEPLOY ✅** (2026-04-16): 0 errors, 0 warnings. 1321 tests. Build OK. **Push y deploy completados (FE+BE). 2026-04-17 sin incidentes reportados.**

**Próximo paso — Cierre de Carril D en 6 olas + Design System F5.3 en paralelo → Carril B (deuda)**:

> **Principio de orden**: cerrar primero lo empezado, luego abrir frentes independientes, consolidar auditoría de seguridad antes de tests de seguridad, contratos + observabilidad antes de fallbacks, E2E al final como verificación cross-layer. Cada ola tiene un **gate explícito**: no se abre la siguiente sin cerrar la anterior.

**Ya cerrado en Carril D** ✅: Plan 15 F1, Plan 15 F2 (health endpoint), Plan 16 F1 (auditoría endpoints), Plan 12 F1 completo (infra + Auth + Asistencia + Aprobación + ConsultaAsistencia + regla F1.C documentada). Suite BE: **764/764 tests verdes**.

---

**Ola 1 — Terminar Plan 12 F1 (cerrar lo iniciado)** ✅ CERRADA (2026-04-18)

1. ~~**Plan 12 F1.B.2** — `AprobacionEstudianteControllerTests`~~ ✅ (2026-04-18) — 4 tests: guard manual `GetEntityId`, default año Perú, mapeo tupla (exito, mensaje) → Ok/BadRequest. `AprobarMasivo` y consultas descartados (delegación pura → F1.C). Suite 756/756.
2. ~~**Plan 12 F1.B.3** — `ConsultaAsistenciaControllerTests`~~ ✅ (2026-04-18) — 8 tests: ownership apoderado→hijo (`Forbid()`), guard `sedeId=0 → UnauthorizedException`, fallback `GetEmail() ?? UsuarioActual`, mensaje según `Quitar`, mapeo bool→BusinessRuleException, validaciones inline de rangos de fecha en PDF período. `WithEmail` agregado a `ClaimsPrincipalBuilder`. Suite 764/764.
3. ~~**Plan 12 F1.C**~~ ✅ (2026-04-18) — Regla "no testear delegación pura" documentada en `Educa.API.Tests/Controllers/README.md` con definición operativa (4 criterios), ejemplos positivos (F1.B) y negativos (controllers pass-through enteros). Cierra la preocupación de "¿por qué no hay tests de UsuariosController?" sin escribirlos.

*Gate Ola 1*: ✅ Plan 12 F1 al 100% · infraestructura de controller tests documentada y replicable · 23 tests en 4 archivos de controller (Auth 6 + Asistencia 5 + Aprobación 4 + ConsultaAsistencia 8).

---

**Ola 2 — Frentes independientes de bajo riesgo** — 3 chats

1. **Plan 13 F1** — Interceptores core FE (api-response, clock-sync, sw-cache-invalidation, request-trace) — 1 chat
2. **Plan 17** — Script + CI gate `max-lines 300` para .cs (previene regresión cuando Plan 2/C cierre) — 1 chat, BE
3. **Plan 15 F3** — Queries SQL de consistencia post-deploy (estudiantes huérfanos, salones duplicados, horarios con profesor inactivo) — 1 chat

*Gate Ola 2*: cobertura mínima FE de interceptores · enforcement estructural BE activo · script de validación de datos disponible.

---

**Ola 3 — Cierre de auditoría de seguridad (Plan 16 completo)** — 4 chats, BE

1. **Plan 16 F2** — Secretos: grep de patrones + verificación `.gitignore` + `DniHelper.Mask()` en puntos de salida
2. **Plan 16 F3** — Headers y CORS
3. **Plan 16 F4** — Sesión y tokens (cookies, refresh, CSRF)
4. **Plan 16 F5** — Datos sensibles en respuestas (DTOs + enmascaramiento)

*Gate Ola 3*: Plan 16 cerrado · matriz de endpoints + superficie de seguridad completa · desbloquea Plan 12 F3 con contexto sólido.

---

**Ola 4 — Contratos + observabilidad mínima** — 3-4 chats

1. **Plan 14 F1** — Snapshot de DTOs backend (reflection → `dtos.snapshot.json`) — 1 chat, BE
2. **Plan 14 F2** — Test frontend que compara interfaces TS vs snapshot — 1 chat, FE
3. **Plan 7 F1** — Auditar `GlobalExceptionMiddleware` + verificar CorrelationId + contexto de `ErrorLog` — 1 chat, BE
4. **Plan 7 F2** — Verificar consumo `error-logs` admin + correlación `ReporteUsuario` → `ErrorLog` — 1 chat, FE+BE

*Gate Ola 4*: contratos FE-BE congelados (cualquier drift futuro rompe CI) · error trace verificable en producción.

---

**Ola 5 — Fallbacks P0 + tests de seguridad (consume olas 3+4)** — 4-5 chats

1. **Plan 10 P0.1** — API down / timeout: mensaje claro + retry UI — 1 chat, FE
2. **Plan 10 P0.2** — Auth token expirado / refresh falla: redirect limpio a login — 1 chat, FE
3. **Plan 10 P0.3** — Offline + WAL sync failure persistente — 1 chat, FE
4. **Plan 12 F3** — Security boundary tests (cross-role, tokens expirados, idempotencia, cuenta inactiva) — 1-2 chats, BE

*Gate Ola 5*: red de fallbacks críticos desplegada · tests de boundary protegen los invariantes de seguridad identificados en Ola 3.

---

**Ola 6 — E2E cross-layer (verificación final del carril)** — 3 chats

1. **Plan 18 F1** — Flujo asistencia: webhook CrossChex → estado → EmailOutbox → SignalR — 1 chat, BE
2. **Plan 18 F2** — Flujo calificación → aprobación → progresión — 1 chat, BE
3. **Plan 18 F3** — Flujo login → permisos → navegación + refresh transparente — 1 chat, FE

*Gate Ola 6*: **Carril D CERRADO** → abrir Carril B.

---

**Diferidos dentro de Carril D** (documentación, no chat-sized):

- Plan 15 F4 — Patrón de feature flags como safety net (docs, al toque de Ola 5)
- Plan 15 F5 — Monitoreo básico (evaluar RequestMetricsMiddleware y decidir gaps, al toque de Ola 4)

**Estimado total para cerrar Carril D**: ~19-21 chats.

---

**Carril B — Deuda técnica (cuando Carril D tenga base sólida)**:

1. **Plan 1 F5.3** — Re-exports cleanup `@shared` → `@intranet-shared` (48 archivos, FE, 3-4 chats)
2. **Plan 2/B** — State Machines (3 faltantes, BE) — desbloquea Plan 1 F4.4
3. **Plan 2/C** — Split archivos >300 líneas BE
4. **Plan 4** — Consolidación Backend
5. **Plan 5** — Consolidación Frontend

**Bloqueos duros (no ejecutables sin dependencia previa)**:

- Plan 1 F4.4 🔒 por Plan 2/B (state machines)
- Plan 1 F4.5 🔒 por Plan 3 F4 (Matrícula)
- Plan 3 F4 🔒 por Plan 3 F3.5 (diseño admin UI matrícula)
- Plan 10 F1+ 🔒 hasta que Carril B cierre sustancialmente (P0 desbloqueado en Carril D)

---

## Secuencia ordenada (3 carriles)

> Reorganizado 2026-04-16: features primero. La arquitectura limpia es un medio, no un fin.

### Carril A — Features ✅ CERRADO (2026-04-16)

> Plan 6 (Asignación Profesor-Salón-Curso) completado: BD + Domain + Backend + Frontend + Auditoría + Tests.
> Validators INV-AS01/AS02 enforced en HorarioService. 0 violaciones en producción. 1321 tests verdes.

### Carril D — Confiabilidad sistémica (post-push, ANTES de Carril B)

> "Funciona es condición necesaria, no suficiente. Verificable, reversible y observable es el estándar."

- **Plan 15** — Release Protocol: checklist, smoke checks, rollback, health endpoint
- **Plan 16** — Auditoría de Seguridad: endpoints, secretos, headers, sesiones
- **Plan 12** — Backend Test Gaps: controllers, repos, security, workers, concurrencia
- **Plan 13** — Frontend Test Gaps: interceptores, páginas admin, flujos, WAL/offline
- **Plan 14** — Contratos FE-BE: snapshots de DTOs, endpoints, enums
- **Plan 7** — Error Trace Backend: observabilidad de errores en producción (movido desde Carril B — tracing es confiabilidad, no deuda)
- **Plan 10 P0** — Fallbacks críticos: offline, auth failure, API down (subset mínimo extraído de Plan 10)
- **Plan 17** — Enforcement max-lines .cs en CI: script que falla el build si un .cs > 300 líneas (previene regresión post Plan 2/C)
- **Plan 18** — Tests de flujo de negocio E2E: asistencia, calificación→aprobación, login→permisos (tras Plan 12+13)

Estos se ejecutan inmediatamente después del push. Son la red de seguridad que el proyecto necesita antes de operar en producción con confianza.

### Carril B — Deuda técnica (cuando Carril D tenga base sólida)

> "La deuda se paga mientras se construye, no antes."

- **Plan 1 F5** — Wrappers exclusivos (re-exports cleanup)
- **Plan 2/B** — State Machines (3 faltantes)
- **Plan 2/C** — Split archivos >300 líneas BE
- **Plan 4** — Consolidación Backend
- **Plan 5** — Consolidación Frontend

Estos se ejecutan cuando el Carril D provea red de seguridad mínima (Plan 15 F1 + Plan 16 F1 + Plan 12 F1 P0 + Plan 7 F1).

### Carril C — Diferido (bloqueado o bajo prioridad)

- **Plan 3 F4** — Matrícula (🔒 diseño admin UI pendiente → ver Plan 3 F3.5 abajo para desbloquear)
- **Plan 19** — Comunicación: foro + mensajería + push (planificación pendiente)
- **Plan 10** — Flujos Alternos (🔒 proyecto limpio)
- **Planes 8-9** — Design Patterns (incrementales al tocar módulos)

---

## Diagrama de dependencias (actualizado 2026-04-16)

```
CARRIL A — FEATURES ✅ CERRADO
   QW3 ✅ ──► Plan 6 F1-F6 ✅ (completo)

CARRIL D — CONFIABILIDAD SISTÉMICA (foco actual, post-push)

   Plan 15 F1 (Checklist deploy) ── sin bloqueos ← ✅ HECHO
   Plan 16 F1 (Auditoría endpoints) ── sin bloqueos
   Plan 12 F1 (Controller tests P0) ── sin bloqueos
   Plan 13 F1 (Interceptores FE) ── sin bloqueos
   Plan 12 F3 (Security tests) ── tras Plan 16 F1 (necesita la matriz de endpoints)
   Plan 14 F1-F2 (Contratos DTOs) ── sin bloqueos
   Plan 15 F2 (Health endpoint) ── sin bloqueos
   Plan 7 F1-F2 (Error Trace) ── sin bloqueos (observabilidad = confiabilidad)
   Plan 10 P0 (Fallbacks P0) ── sin bloqueos (subset mínimo: offline, auth, API down)
   Plan 17 (Enforcement max-lines BE) ── sin bloqueos
   Plan 18 F1-F2 (E2E flujos BE) ── tras Plan 12 F1 (necesita infra de tests)
   Plan 18 F3 (E2E flujos FE) ── tras Plan 13 F1 (necesita infra de tests)

CARRIL B — DEUDA TÉCNICA (cuando Carril D tenga base)

   Plan 1 F5 (re-exports) ── sin bloqueos
   Plan 2/B (State Machines) ── desbloquea Plan 1 F4.4 (tests INV-T*)
   Plan 2/C (Split BE) ── sin bloqueos
   Plan 4 (Consolidación BE) ── tras Plan 2/B+C
   Plan 5 (Consolidación FE) ── tras Plan 4

CARRIL C — DIFERIDO

   Plan 3 F3.5 (Diseño UI matrícula) ── sin bloqueos (modo /design, 1 chat)
   Plan 3 F4 (Matrícula) 🔒 ── espera Plan 3 F3.5
   Plan 19 (Comunicación: foro+mensajería+push) ── planificación primero (F1)
   Plan 10 F1+ (Flujos Alternos completo) 🔒 ── espera Carril B cerrado
   Plan 7 F3+ (Error Trace avanzado) ── tras Plan 7 F1-F2 en Carril D
   Plan 22 (Endurecimiento correos asistencia) 🔒 ── espera Plan 21 cerrado
   Plan 23 (Admin asistencias a Profesores) ── espera Plan 21 cerrado (puede arrancar en paralelo a Plan 22)
```

---

## Cómo usar este maestro

1. **Al empezar sesión**: revisar el estado de cada plan en la tabla de inventario.
2. **Al elegir trabajo**: respetar las capas. No saltar a Capa 3 si Capa 2 no cerró sus piezas bloqueantes.
3. **Al agregar un plan nuevo**: encajarlo en la capa que le corresponda y declarar sus dependencias explícitas al inicio del archivo (siguiendo el patrón `Coordinación cross-plan:` ya existente).
4. **Al actualizar progreso**: marcar estado (⏳ / 🔄 / ✅ / 🔒) en la tabla de inventario de este archivo.

---

## Checklist ejecutable (tareas chat-sized)

> **Instrucciones para el chat que ejecute cualquier subfase de esta checklist** (aplican siempre, no hace falta repetirlas en el prompt):
>
> 1. Trabajar **una sola subfase por chat**. Si al abrirla se ve que excede el tamaño (≤10 archivos editados, ≤15 mensajes), cortarla y crear sub-bullet nuevo antes de ejecutar.
> 2. Al terminar el trabajo técnico, **antes de dar el cierre**:
>    - Actualizar el **plan base** (el `.md` original referenciado en la tabla de inventario) con el avance/resultado/decisiones tomadas.
>    - Actualizar en este maestro: marcar la subfase ✅ en la checklist y reflejar el nuevo estado en la tabla de inventario.
> 3. Una subfase **no se considera terminada** si falta cualquiera de los dos updates anteriores, aunque el código ya esté commiteado.
> 4. Si se descubren dependencias o bloqueos no previstos, agregarlos como sub-bullet en la misma subfase en lugar de saltar a otra.

---

### Carril A — Features (PRIORIDAD)

#### QW3 — CI verde (prerrequisito para mergear features)

- [x] QW3.1 `horarios.store.spec.ts` (26 fallos) — métodos renombrados en store ✅ (2026-04-16)
- [x] QW3.2 `error.interceptor.spec.ts` (13 fallos) — mocks desactualizados ✅ (2026-04-16)
- [x] QW3.3-QW3.6 Facades + login (6 fallos) — WAL pattern + role count ✅ (2026-04-16)
- [x] QW3.7 Verificar `npm test` con 0 fallos ✅ (2026-04-16) — 108 files, 1317 tests passed

#### Plan 6 — Asignación Profesor-Salón-Curso (tutor pleno vs por curso)

- [x] **F1 — BD** (1 chat, repo BE) ✅ (2026-04-16)
  - [x] F1.0 SELECT primero: inspeccionada estructura real de 6 tablas en prueba y producción
  - [x] F1.1 CREATE TABLE ProfesorCurso + 3 índices (único filtrado + 2 de consulta) — ejecutado en ambas BDs
  - [x] F1.2 Migración desde Horario: prueba 3 filas, producción 0 filas (sin horarios activos GRA_Orden ≥ 8)
  - [x] F1.3 Modelo EF (`ProfesorCurso.cs`) + `ProfesorCursoConfiguration.cs` + DbSet + nav properties en Profesor/Curso. Build OK.
  - [x] F1.4 Plan base y maestro actualizados

- [x] **F2 — Domain validators** (1 chat, repo BE) ✅ (2026-04-16)
  - [x] F2.1 `ModoAsignacionResolver` — función pura con umbral 7, sección V flexible
  - [x] F2.2 `TutorPlenoValidator` (INV-AS01) — Validar + Ensure con BusinessRuleException
  - [x] F2.3 `ProfesorCursoValidator` (INV-AS02) — Validar + Ensure con BusinessRuleException
  - [x] F2.4 Tests unitarios — 42 tests pasando (3 archivos)
  - [x] F2.5 Plan base + maestro actualizados

- [x] **F3 — Backend Services** (1 chat, repo BE) ✅ (2026-04-16)
  - [x] F3.1 `ProfesorCursoService` + `ProfesorCursoRepository` + DTOs (CRUD estándar)
  - [x] F3.2 `ProfesorCursoController` — 4 endpoints (GET profesor, GET curso, POST asignar, DELETE)
  - [x] F3.3 Integrar validators en `HorarioAsignacionService.AsignarProfesorAsync` + `HorarioService.UpdateAsync`
  - [x] F3.4 Regla desactivación tutor mid-año en `ProfesorStrategy.CambiarEstadoAsync`
  - [x] F3.5 Regla eliminar salón tutor pleno con horarios activos en `SalonesService.EliminarAsync`
  - [x] F3.6 DI registration + build OK + 741 tests OK
  - [x] F3.7 Plan base + maestro actualizados

- [x] **F4 — Frontend: horarios + salones + usuarios** (3 chats, repo FE) ✅ (2026-04-16)
  - [x] F4.1 Tipos: `ModoAsignacion` + `resolveModoAsignacion()` en `@data/models/classroom.models.ts`, `ProfesorCursoListaDto` en `profesor-curso.models.ts` ✅ (2026-04-16)
  - [x] F4.2 `modoAsignacion` computed en `SchedulesOptionsStore` + `profesoresParaAsignacion` filtrado por modo + `ProfesorCursoApiService` ✅ (2026-04-16)
  - [x] F4.3 Detail drawer: badge de modo + info contextual (tag Tutor/PorCurso/Flexible con tooltip) ✅ (2026-04-16)
  - [x] F4.4 Badge de modo en tabla de salones admin + `SalonDetailDialog` header ✅ (2026-04-16)
  - [x] F4.5 Sección "Cursos que dicta" en edición de profesor (`/admin/usuarios`) ✅ (2026-04-16)
  - [x] F4.6 Actualizar plan base + maestro ✅ (2026-04-16)

- [x] **F5 — Backfill y auditoría** (1 chat, repo BE) ✅ (2026-04-16)
  - [x] F5.1 Query SQL de violaciones existentes INV-AS01/AS02 — ejecutadas en ambas BDs
  - [x] F5.2 Resultado: **0 violaciones** en test y producción. No hay grandfathering que gestionar.
  - [x] F5.3 Actualizar plan base + maestro ✅

- [x] **F6 — Tests E2E + cierre** (1 chat) ✅ (2026-04-16)
  - [x] F6.1 Tests facade FE: 4 tests (INV-AS01 reject, INV-AS02 reject, tutor pleno OK, por curso OK). Suite: 1321 tests, 0 fallos.
  - [x] F6.2 Formalizar INV-AS01/02/03/04/05 en `business-rules.md § 15.12` + actualizar § 5.4 (umbrales corregidos, estado implementado)
  - [x] F6.3 Mapear 4 error codes nuevos en `UI_ERROR_CODES`
  - [x] F6.4 Actualizar plan base + maestro ✅

---

### QW4 — Lint limpio para producción (PRIORIDAD INMEDIATA)

> **Objetivo**: 0 errors, 0 warnings → push seguro. Estado inicial: 2 errors + ~185 warnings en 53 archivos.
> **Inventario** (2026-04-16):
>
> | Regla | Nivel | Issues | Archivos | Chat |
> |-------|-------|--------|----------|------|
> | `max-lines` | error | 2 | `error-reporter.service.ts` (310ln), `profesor-salones.component.ts` (320ln) | QW4.1 |
> | `no-unused-vars` | warn | 33 | 27 archivos (specs + services) | QW4.2 |
> | `no-compact-trivial-setter` | warn | 45 | 8 stores/facades | QW4.3 |
> | `no-explicit-any` | warn | 99 | 11 archivos (todos `.spec.ts`) | QW4.4 |
> | `use-lifecycle-interface` | warn | 3 | 3 archivos | QW4.5 |
> | `no-empty-lifecycle-method` | warn | 1 | 1 archivo | QW4.5 |
> | `layer-enforcement/imports-warn` | warn | 2 | 1 archivo (`profesor-salones`) | QW4.5 |

- [x] **QW4.1 — Lint errors: 2 archivos >300 líneas** ✅ (2026-04-16)
  - [x] `error-reporter.service.ts` — extraído tipos a `error-reporter.models.ts` + eliminado `#endregion` duplicado
  - [x] `profesor-salones.component.ts` — movido template inline a `.component.html` + estilos a `.component.scss`

- [x] **QW4.2 — `no-unused-vars`: 33 issues en 27 archivos** ✅ (2026-04-16)
  - [x] Eliminados imports no usados en 25 archivos
  - [x] Prefijo `_` en params de callback (5 casos en `usuario-validation.utils.ts` + 1 en spec)

- [x] **QW4.3 — `no-compact-trivial-setter`: 45 issues en 8 archivos** ✅ (2026-04-16)
  - [x] Expandidos 45 setters triviales de 1 línea a formato multi-línea
  - [x] 3 archivos resultantes >300 líneas → `eslint-disable max-lines` justificado (campus-admin.store, salones-admin.facade, calificaciones.facade)

- [x] **QW4.4 — `no-explicit-any`: 99 issues en 14 specs** ✅ (2026-04-16)
  - [x] Tipados con `unknown`, `Partial<T>`, `vi.mocked()`, `as unknown as T`, interfaces de test-access
  - [x] 14 archivos spec corregidos

- [x] **QW4.5 — Otros warnings: 6 issues** ✅ (2026-04-16)
  - [x] `use-lifecycle-interface` (3) — agregado `implements OnChanges`
  - [x] `no-empty-lifecycle-method` (1) — eliminado `ngOnInit` vacío + imports
  - [x] `layer-enforcement/imports-warn` (2) — eslint-disable con justificación (pendiente mover a @intranet-shared)

- [x] **QW4.6 — Verificación final y PUSH** ✅ (2026-04-16)
  - [x] `npm run lint` → 0 errors, 0 warnings ✅
  - [x] `npm test` → 1321 tests, 0 fallos ✅
  - [x] `npm run build` → build OK ✅
  - [x] Push FE (main) + BE (master) → deploy completado (Netlify + Azure) ✅
  - [ ] Validar estabilidad en producción (2026-04-17)

---

### Carril D — Confiabilidad sistémica (post-push, ANTES de Carril B)

> **"Corregir lo que duele es un fix. Tener red de seguridad antes de que duela es ingeniería."**
> Estas tareas se ejecutan inmediatamente después del push. Son la red de seguridad que falta para operar en producción con confianza.

#### Plan 15 — Release Protocol y Operaciones

- [x] **F1 — Checklist de deploy** (1 chat, proceso puro) ✅ (2026-04-16)
  - [x] F1.1 Pre-deploy checklist (build, tests, scripts SQL, orden de deploy)
  - [x] F1.2 Post-deploy smoke checks (~20 verificaciones manuales)
  - [x] F1.3 Rollback protocol (FE, BE, BD)
  - [x] Entregable: `DEPLOY.md` en raíz del proyecto

- [x] **F2 — Health check endpoint** (1 chat, BE) ✅ (2026-04-17)
  - [x] F2.1 `GET /api/health` `[AllowAnonymous]` — BD (`SELECT 1` con timeout 3s), EmailOutbox (counts PENDING stuck >1h + FAILED 24h), workers (heartbeat in-memory vía `IWorkerHealthTracker` singleton)
  - [x] F2.2 Response tipado: `ApiResponse<HealthStatusDto>` con `healthy`/`degraded`/`unhealthy` + por-check details. HTTP 200 para healthy/degraded, 503 solo para unhealthy (BD caída)
  - [x] F2.3 Archivos nuevos (8): `HealthStatusDto`, `HealthCheckDto`, `HealthStatusNames`, `IWorkerHealthTracker`, `WorkerHealthTracker`, `IHealthCheckService`, `HealthCheckService`, `HealthController`. Editados (3): `EmailOutboxWorker` + `EmailOutboxCleanupWorker` (pulse heartbeat), `ServiceExtensions` (DI). Build 0 warnings, 0 errors.

- [ ] **F3 — Validación datos post-deploy** (1 chat, SQL)
  - [ ] F3.1 Queries de consistencia (estudiantes huérfanos, salones duplicados, horarios con profesor inactivo)

- [ ] **F4 — Feature flags como safety net** (documentación)
  - [ ] F4.1 Patrón: flag=false en prod → smoke → flag=true → re-deploy

- [ ] **F5 — Monitoreo básico** (evaluar + cubrir gaps)
  - [ ] F5.1 Verificar que RequestMetricsMiddleware logea a destino consultable
  - [ ] F5.2 Si lo existente no alcanza: definir mínimo de alertas (5xx rate, latency P95, health degraded)

#### Plan 16 — Auditoría de Seguridad

- [x] **F1 — Auditoría de endpoints** (1 chat, BE) ✅ (2026-04-17)
  - [x] F1.1 Listar todos los endpoints con atributos de seguridad — 45 controllers, ~280 endpoints documentados
  - [x] F1.2 Matriz endpoints vs roles esperados — matriz completa por subdominio en `Educa.API/.claude/plan/security-audit.md`
  - [x] F1.3 Identificar endpoints sin [Authorize] que deberían tenerlo — 12 [AllowAnonymous] justificados técnicamente. **0 endpoints públicos accidentales.**
  - [x] F1.4 Identificar endpoints sin rate limiting que deberían tenerlo — 5 gaps (G1-G5): 1 ALTA (MigrarContrasenas), 2 MEDIA (SolicitarOtp enum, CerrarPeriodo), 2 BAJA (listados sin heavy, DELETEs admin)
  - [x] F1.5 Cruce con invariantes — INV-AD01/AD04/RU05 ✅ · INV-T01 ⚠️ (G4)

- [ ] **F2 — Auditoría de secretos** (1 chat, ambos repos)
  - [ ] F2.1 Grep de patrones de secretos en código
  - [ ] F2.2 Verificar .gitignore cubre archivos sensibles
  - [ ] F2.3 Verificar DniHelper.Mask() en todos los puntos de salida

- [ ] **F3 — Headers y CORS** (1 chat, BE)
- [ ] **F4 — Sesión y tokens** (1 chat, BE)
- [ ] **F5 — Datos sensibles en respuestas** (1 chat, BE)

#### Plan 12 — Backend Test Gaps

- [x] **F1 — Controller contract tests por patrones** ✅ (2026-04-18, 4 chats, BE)

  > **Principio rector**: el controller test verifica lo que pertenece a la capa controller — claims extraction, cookies, autorización, routing, status codes propios del controller. **No** se re-testea lo que ya cubre el service a nivel unitario (validaciones de negocio, cálculos, excepciones tipadas). Esto evita duplicación, reduce mantenimiento y mantiene cada test con ROI claro.
  >
  > **Decisión 2026-04-17**: el approach original "3 tests por endpoint × N endpoints × M controllers" producía ~60-90 tests de bajo valor (mayormente verificando que el controller llama al service). Se reemplaza por un enfoque estructurado en 3 subfases (A/B/C) que prioriza tests donde la capa controller agrega comportamiento propio.

  - [x] **F1.A — Infraestructura reutilizable + Auth ejemplar** ✅ (2026-04-17, 1 chat, BE)
    - [x] Helpers en `Educa.API.Tests/Controllers/Common/`:
      - [x] `ClaimsPrincipalBuilder` — builder fluent con `WithDni`, `WithRol`, `WithNombre`, `WithEntityId`, `WithSedeId` + `Anonymous()`
      - [x] `ControllerTestBase.AttachContext(...)` — monta `HttpContext` + `ControllerContext`; cookies vía header `Cookie` (DefaultHttpContext parsea automáticamente)
      - [x] `ApiResponseAssertions` — `.ShouldBeSuccess<T>()`, `.ShouldBeUnauthorized()`, `.ShouldBeBadRequest()`, `.ShouldBeOk()`
    - [x] `AuthControllerTests.cs` — 6 tests sobre lo que no cubre `AuthServiceTests`:
      - [x] Login setea las 3 cookies (auth + refresh + csrf) con valores correctos
      - [x] Logout extrae DNI de claims + deviceId de cookie, delega al facade, limpia cookies
      - [x] RefreshToken sin cookie `educa_refresh` → `UnauthorizedException("AUTH_REFRESH_NOT_FOUND")`
      - [x] RefreshToken con facade null → `UnauthorizedException("AUTH_REFRESH_INVALID")` + cookies limpiados
      - [x] ObtenerPerfil con claims completas → `PerfilUsuarioDto` con todos los campos del JWT
      - [x] CambiarContrasena sin claims → 401 sin delegar al facade
    - [x] README de `Educa.API.Tests/Controllers/` — guía operativa (test de valor para decidir cuándo agregar tests, helpers disponibles, patrón canónico)
    - [x] Plan base creado: `Educa.API/.claude/plan/test-backend-gaps.md`
    - [x] Suite completa: 747/747 tests verdes (+6 desde 741)

  - [x] **F1.B — Controllers con lógica propia de capa controller** ✅ 3/3 (1 chat c/u, BE)
    - [x] `AsistenciaControllerTests` ✅ (2026-04-17) — 5 tests: guard payload vacío (`ASISTENCIA_PAYLOAD_INVALIDO`), verificación firma CrossChex via FixedTimeEquals (sin header, firma incorrecta → `ASISTENCIA_FIRMA_INVALIDA`), fan-out SignalR al grupo `sede_{id}` con/sin `SignalRPayload`. Suite 752/752.
    - [x] `AprobacionEstudianteControllerTests` ✅ (2026-04-18) — 4 tests: guard manual `User.GetEntityId() == 0 → Unauthorized(ApiResponse.Fail(...))` (no usa RequireProfesorId), default `anio=0 → PeruNow().Year`, mapeo tupla (exito, mensaje) del service a `Ok`/`BadRequest` con `UsuarioActual` como auditoría. `AprobarMasivo` y listados descartados (delegación pura, caen en F1.C). Suite 756/756.
    - [x] `ConsultaAsistenciaControllerTests` ✅ (2026-04-18) — 8 tests: ownership apoderado→hijo (`Forbid()`), guard `sedeId=0 → UnauthorizedException("ASISTENCIA_SEDE_NOT_FOUND")`, fallback `GetEmail() ?? UsuarioActual`, mensaje dinámico según `request.Quitar`, mapeo `service=false → BusinessRuleException("ASISTENCIA_JUSTIFICACION_ERROR")`, 2 validaciones inline de rangos en `DescargarPdfAsistenciaPeriodo` (`anio<2026 → 400`, `inicio>fin → 400`). `WithEmail` agregado a `ClaimsPrincipalBuilder`. Los ~12 endpoints restantes (profesor/salones, director/grado, director/reporte, estudiante/mis, etc.) cayeron en F1.C. Suite 764/764.

  - [x] **F1.C — Controllers de delegación pura: descartar tests artesanales** ✅ (2026-04-18)
    - [x] Regla documentada en `Educa.API.Tests/Controllers/README.md` sección "Regla: no testear delegación pura" con definición operativa (4 criterios que debe cumplir TODO el endpoint).
    - [x] Ejemplos positivos (F1.B) y negativos (controllers pass-through enteros) en el README.
    - [x] Lista de controllers enteramente en esta categoría: Cursos, Salones, EventosCalendario, Notificaciones, Calificacion (listados), Vistas, Horario, mayoría de Usuarios/Administracion/PermisosUsuario/Campus, ReportesUsuario, sub-dominios completos Comunicacion/Integraciones/Videoconferencias/Sistema.
    - [x] Excepción documentada: si algunos endpoints tienen lógica propia, se crea `<Controller>Tests.cs` SOLO con esos. El resto queda intencionalmente sin tests (ejemplo: `ConsultaAsistenciaController` solo cubre 3 de ~15 endpoints).

- [ ] **F2 — Repository integration tests** (2-3 chats, BE)
  - [ ] F2.P0 Asistencia + EstudianteSalon + ProfesorSalon
  - [ ] F2.P1 Horario + Calificación + Aprobación

- [ ] **F3 — Security boundary tests** (1-2 chats, BE)
  - [ ] Cross-role access, tokens expirados, idempotencia, cuenta inactiva

- [ ] **F4 — Workers/jobs tests** (1 chat, BE)
- [ ] **F5 — Concurrencia e idempotencia** (1 chat, BE)

#### Plan 13 — Frontend Test Gaps

- [ ] **F1 — Interceptores core** (1 chat, FE)
  - [ ] api-response, clock-sync, sw-cache-invalidation, request-trace

- [ ] **F2 — Páginas admin críticas** (2 chats, FE)
  - [ ] asistencias admin, feedback-reports, health-permissions, email-outbox, error-logs

- [ ] **F3 — Flujos de integración UI** (1-2 chats, FE)
  - [ ] Login completo, Guard+Permisos, CRUD admin tipo, Error recovery

- [ ] **F4 — WAL/Offline/Cache** (1 chat, FE)
- [ ] **F5 — Componentes shared de alto uso** (1 chat, FE)

#### Plan 14 — Contratos FE-BE

- [ ] **F1-F2 — Snapshot de DTOs** (mínimo viable, 1-2 chats)
  - [ ] F1 Backend: reflection → dtos.snapshot.json
  - [ ] F2 Frontend: test que verifica interfaces vs snapshot

- [ ] **F3-F4 — Snapshot de endpoints** (1-2 chats)
- [ ] **F5 — Enums y constantes** (1 chat)
- [ ] **F6 — Automatización** (1 chat)

#### Plan 7 — Error Trace Backend (observabilidad — movido desde Carril B)

> Tracing de errores es confiabilidad, no deuda técnica. Sin observabilidad no hay producción segura.

- [ ] **F1 — Structured error logging** (1 chat, BE)
  - [ ] F1.1 Auditar qué logea GlobalExceptionMiddleware hoy y a dónde va
  - [ ] F1.2 Garantizar que CorrelationId aparece en todos los logs de error
  - [ ] F1.3 Verificar que ErrorLog persiste con suficiente contexto para diagnóstico

- [ ] **F2 — Error visibility mínima** (1 chat, FE+BE)
  - [ ] F2.1 Verificar que error-logs admin consume ErrorLog correctamente
  - [ ] F2.2 Verificar correlación ReporteUsuario → ErrorLog vía CorrelationId

- [ ] F3+ — Fases avanzadas (alertas, dashboards, métricas) → Carril C cuando F1-F2 estén cerrados

#### Plan 10 P0 — Fallbacks críticos (subset mínimo extraído de Plan 10)

> El Plan 10 completo espera Carril B. Pero estos 3 fallbacks son seguridad de producción.

- [ ] **P0.1 — API down / timeout** (1 chat, FE)
  - [ ] ¿Qué ve el usuario cuando el backend no responde? ¿Hay mensaje claro o pantalla rota?

- [ ] **P0.2 — Auth token expirado / refresh falla** (1 chat, FE)
  - [ ] ¿El usuario es redirigido a login limpiamente o queda en estado roto?

- [ ] **P0.3 — Offline + WAL sync failure** (1 chat, FE)
  - [ ] ¿Qué pasa con operaciones WAL encoladas cuando la reconexión falla persistentemente?

#### Plan 17 — Enforcement max-lines .cs en CI

> **Origen**: Auditoría de investigación (2026-04-16). El frontend tiene `max-lines` en ESLint que bloquea el build. El backend tiene la regla en `backend.md` pero nada la enforcea — resultado: 23 archivos la violan. Plan 2/C arregla los actuales, pero sin gate en CI volverán a aparecer.

- [ ] **F1 — Script o Roslyn analyzer** (1 chat, BE)
  - [ ] F1.1 Crear script (`scripts/check-max-lines.sh` o `.ps1`) que cuente líneas por archivo .cs y falle si alguno > 300
  - [ ] F1.2 Excepción explícita: `ApplicationDbContext.cs` (DbSets crecen linealmente)
  - [ ] F1.3 Integrar en CI (GitHub Actions o pre-push hook) — falla el build si viola
  - [ ] F1.4 Verificar que los 23 archivos actuales están exentos con `TODO` o que Plan 2/C ya los resolvió

#### Plan 18 — Tests de flujo de negocio E2E (cross-layer)

> **Origen**: Auditoría de investigación (2026-04-16). Plan 12 y 13 testan piezas aisladas. Nadie testa flujos completos como "profesor pasa lista → apoderado recibe correo → estadística se actualiza". Estos tests cruzan Controller → Service → Repository → SignalR/Email y verifican que el flujo de negocio funciona de punta a punta.
> **Dependencia**: ejecutar DESPUÉS de Plan 12 F1 y Plan 13 F1 (necesita infra de tests ya montada).

- [ ] **F1 — Flujo de asistencia completo** (1 chat, BE)
  - [ ] F1.1 Webhook CrossChex → AsistenciaService → estado calculado → EmailOutbox encolado → SignalR notificado
  - [ ] F1.2 Admin corrige asistencia → correo diferenciado → estado actualizado

- [ ] **F2 — Flujo de calificación → aprobación** (1 chat, BE)
  - [ ] F2.1 Profesor registra notas → promedio calculado → periodo se cierra → aprobación habilitada
  - [ ] F2.2 Aprobación masiva → progresión (siguiente grado, sección V, egreso)

- [ ] **F3 — Flujo de login → permisos → navegación** (1 chat, FE)
  - [ ] F3.1 Login → JWT cookie → guard permite ruta → permissionsGuard filtra por rol → UI muestra solo lo permitido
  - [ ] F3.2 Token expira → 401 → refresh → retry transparente

---

### Carril B — Deuda técnica (cuando Carril D tenga base sólida)

> Estas tareas se ejecutan después de que el Carril D provea red de seguridad mínima.

#### Plan 11 — Refactor `eslint.config.js` ✅ 100% (cerrado 2026-04-17)

<details><summary>Detalle (cerrado)</summary>

- [x] F1-F4 cerrados
- [x] F5.1-F5.2 cerrados, F5.4 cerrado
- [x] F5.3 Tests de guardia (2026-04-17) — `src/eslint-config-guards.spec.ts` con 13 tests que verifican via `ESLint.calculateConfigForFile()` que las reglas clave (layer-enforcement, barrel enforcement, globales) siguen aplicadas por capa. Falla el CI si un cambio futuro del config saca una regla de su scope.

</details>

#### Plan 1 — Enforcement de Reglas (~75%)

<details><summary>F3 — Lint de capas ✅ (cerrado)</summary>

- [x] F3.1-F3.6 cerrados (2026-04-14 a 2026-04-15). Detalle en `tasks/enforcement-reglas.md` (pendiente crear).

</details>

<details><summary>F4 — Tests de invariantes (parcial ✅)</summary>

- [x] F4.1 Catálogo (2026-04-15)
- [x] F4.2 Suite Cálculo FE — 35 tests (2026-04-16)
- [x] F4.3 Suite Seguridad FE — 25 tests (2026-04-16)
- [ ] F4.4 Suite Transiciones 🔒 Plan 2/B
- [ ] F4.5 Suite Vacacional/Matrícula 🔒 Plan 2/B + Plan 3 F4
- [x] F4.6 CI gate (2026-04-16) — rojo hasta QW3
- [x] F4.7 Actualizar plan base + maestro

</details>

- [ ] **F5 — Wrappers exclusivos**
  - [x] F5.1-F5.2 cerrados (0 violaciones)
  - [ ] F5.3 Re-exports `@shared` → `@intranet-shared` (48 archivos, 3-4 chats)
  - [ ] F5.4 Actualizar plan base + maestro

#### Plan 2 — Arquitectura Backend B/C

- [ ] **Opción B — State Machines (3 faltantes)** — desbloquea Plan 1 F4.4
  - [ ] B.1-B.6 (ver plan base)

- [ ] **Opción C — Split archivos >300 líneas BE** (auditoría 2026-04-16: 23 archivos violan, 34 en zona 200-300)
  - [ ] C.1 — **Patrón 1: Validators/Rules** — extraer lógica pura de services densos (1-2 chats, BE)
    - `HorarioService` (395) → extraer `HorarioConflictValidator`
    - `AprobacionEstudianteService` (381) → extraer `AprobacionRules`
    - `AuthService` (373) → extraer `PasswordMigrationHelper` o `AuthValidator`
    - `AsistenciaAdminCrudService` (323) → extraer validaciones de cierre mensual
    - `PasswordRecoveryService` (334), `GrupoContenidoService` (317), `ConversacionesService` (316), `ErrorLogService` (313) → evaluar caso por caso
  - [ ] C.2 — **Patrón 2: PDF Builder genérico** — separar config de layout en reportes (2-3 chats, BE)
    - [ ] C.2.1 Crear `PdfBuilderService` genérico compartido (recibe columnas, secciones, estilos como config → genera layout). **No solo split — abstracción reutilizable.**
    - [ ] C.2.2 Migrar cada service de reportes a config + builder:
      - `ReporteFiltradoAsistenciaService` (441) → config + builder compartido
      - `ReporteFiltradoPdfService` (425) → idem
      - `ReporteAsistenciaDataService` (396) → idem
      - `ReporteAsistenciaConsolidadoPdfService` (389) → idem
      - `BoletaNotasPdfService` (381) → idem
      - `ReporteAsistenciaSalonPdfService` (314) → idem
    - [ ] C.2.3 `EmailNotificationService` (375) → separar templates de correo a configs
  - [ ] C.3 — **Patrón 3: Repositories auxiliares** — dividir queries especializadas (1 chat, BE)
    - `UsuariosRepository` (460) → `UsuariosQueryRepository` + `UsuariosStatsRepository`
    - `ConsultaAsistenciaRepository` (427) → `ConsultaAsistenciaQueryRepository`
    - `CampusRepository` (421) → `CampusQueryRepository`
    - `HorarioRepository` (386) → `HorarioQueryRepository`
    - `CursoContenidoRepository` (348) → evaluar
    - `ProfesorEstudiantesQueryRepository` (318) → evaluar (ya es auxiliar)
  - [ ] C.4 — **Controller inflado** (1 chat, BE)
    - `ConsultaAsistenciaController` (400) → dividir por sub-dominio (diaria vs reportes)
  - [ ] C.5 — Verificación: `0 archivos > 300 líneas` (excepción: `ApplicationDbContext`)

#### Plan 4 — Consolidación Backend (tras Plan 2/B+C)

- [ ] F1-F6 (ver plan base)

#### Plan 5 — Consolidación Frontend (tras Plan 4)

- [ ] F1-F6 (ver plan base)

---

### Carril C — Diferido

#### Plan 3 F3.5 — Diseño UI admin de matrícula (desbloquea Plan 3 F4)

> **Origen**: Auditoría de investigación (2026-04-16). Plan 3 F4 está bloqueado por "diseño admin UI pendiente", pero ninguna tarea produce ese diseño. Este es el desbloqueador.

- [ ] **F3.5.1 — Diseño de la UI admin de matrícula** (1 chat, modo `/design`)
  - [ ] Wireframe: listado de estudiantes preasignados, flujo de matrícula (PREASIGNADO → PENDIENTE_PAGO → PAGADO → CONFIRMADO), formulario de pago, estados visuales
  - [ ] Definir qué endpoints nuevos se necesitan (o si los existentes bastan)
  - [ ] Definir qué DTOs faltan
  - [ ] Entregable: wireframe + lista de endpoints + lista de DTOs → desbloquea F4

#### Plan 3 F4 — Matrícula 🔒 (bloqueado por Plan 3 F3.5)

- [ ] Espera diseño admin UI (Plan 3 F3.5) + service layer

#### Plan 7 F3+ — Error Trace avanzado

- [ ] Alertas, dashboards, métricas — tras Plan 7 F1-F2 en Carril D

#### Plan 10 F1+ — Flujos Alternos completo 🔒

- [ ] Espera carriles A+B sustancialmente cerrados (P0 ya extraído a Carril D)

#### Plan 19 — Comunicación: foro + mensajería directa + push notifications

> **Origen**: Auditoría de investigación (2026-04-16). Chat (SignalR) y calendario/eventos funcionan. Pero foro, mensajería directa y push notifications están parcialmente implementados o con feature flags apagados. Ningún plan del maestro los cubría.

- [ ] **F1 — Planificación** (1 chat, modo `/design`)
  - [ ] F1.1 Inventario: qué existe hoy (código, feature flags, endpoints, plugins Capacitor)
  - [ ] F1.2 Priorizar: ¿qué necesita el colegio primero? (push > mensajería > foro probablemente)
  - [ ] F1.3 Definir fases con dependencias (push requiere Firebase config, mensajería requiere UI, foro requiere moderación)
  - [ ] F1.4 Estimar esfuerzo por fase

- [ ] **F2+ — Ejecución** (según lo que defina F1)

#### Planes 8-9 — Design Patterns

- [ ] Incrementales al tocar cada módulo

#### Plan 22 — Endurecimiento correos de asistencia 🟢 (plan file 2026-04-21 · Chat 1 + Chat 2 + Chat 3 F3.BE + Chat 4 F3.FE cerrados 2026-04-21 · pendientes F4.BE + F4.FE)

> **Origen**: Conversación 2026-04-20. Tres patrones de fallo silencioso en correos CrossChex detectados en el buzón `sistemas@laazulitasac.com`: caracteres no-ASCII (ñ/tildes) que rebotan como 550 no such user, bandejas llenas (4.2.2 over quota) y rate limit del SMTP saliente (`laazulitasac.com exceeded 5/5 failures/hour`) que descarta silenciosamente correos legítimos. El retry agresivo actual (5 intentos por bounce) amplifica el problema.
> **Plan**: [`Educa.API/.claude/plan/asistencia-correos-endurecimiento.md`](../../Educa.API/.claude/plan/asistencia-correos-endurecimiento.md) — Plan #22 del inventario.
> **Estado**: plan file creado 2026-04-21 con desglose de 6 chats atómicos (4 BE + 2 FE). Secuencia sugerida F1 → F2 → F3.BE → F3.FE → F4.BE → F4.FE. Chat 1 (F1) + Chat 2 (F2) + Chat 3 (F3.BE) + Chat 4 (F3.FE) cerrados 2026-04-21. **Próximo**: Chat 5 (F4.BE) en backend — endpoint `GET /api/sistema/auditoria-correos-asistencia` para auditoría preventiva de correos con formato inválido.
> **Dependencia dura**: Plan 21 cerrado ~92% (Chat 5 deploy pendiente). Diseño/ejecución de F1-F3 no lo bloquea; el deploy conjunto sí requiere Plan 21 en producción. Paralelizable con Plan 23.
> **Precede a Plan 24**: el outbox consolidado + `ErrorLog` + correo resumen diario que entrega este plan son insumo para el job CrossChex en background.

- [x] **Chat 1 — F1** ✅ (BE, 2026-04-21) — Validación ASCII+RFC al encolar. Helper `EmailValidator` (`FailedNoEmail`/`FailedInvalidAddress`, regex RFC 5322 básico + check de ASCII imprimible 0x20-0x7E). Guard en `EmailOutboxService.EnqueueAsync` solo para `tipo ∈ {Asistencia, AsistenciaProfesor}` → registro `FAILED` directo sin intento SMTP + `EO_UltimoError` prefijado `[FAILED_*]` (columna `EO_TipoFallo` se agrega en F2). Flujo pesado fuera de alcance: log `LogWarning` con destinatario + entidadOrigen+id. 22 unit tests + 8 integration tests (EF InMemory + `TestApplicationDbContext` que relaja `EO_RowVersion` requerido por SQL Server `[Timestamp]` pero no auto-generado por InMemory). 831/831 tests suite completa verde. `EmailOutboxService.cs` 286 ln (cap 300). INV-S07 respetado + test de regresión para tipo fuera de alcance.
- [x] **Chat 2 — F2** ✅ (BE + SQL, 2026-04-21) — Clasificación SMTP · helper `SmtpErrorClassifier` (constantes públicas `FailedInvalidAddress`/`FailedMailboxFull`/`FailedRejected`/`FailedUnknown`/`Transient`; regex enhanced `[245]\.\d+\.\d+` con prioridad sobre `StatusCode` plano; red/timeout → `TRANSIENT`) · columna `EO_TipoFallo NVARCHAR(50) NULL` + índice filtrado `IX_EmailOutbox_EntidadOrigen_Estado_FechaReg` creados en prueba + producción (7 filas históricas marcadas `FAILED_UNKNOWN` — error real era `535 Incorrect authentication data`, auth SMTP mal configurada) · default `EO_MaxIntentos` bajado de 5 → 2 · DTO `EmailOutboxListaDto.TipoFallo` propaga al frontend · `EmailOutboxService` F1 ahora puebla `EO_TipoFallo` en la columna (sin prefijo `[FAILED_*]` en `EO_UltimoError`) · `EmailOutboxWorker.ApplyAsistenciaPolicy` (retry 0/1 con `+60s` entre intentos, `FAILED_TRANSIENT` tras 2 fallos consecutivos) solo para `EO_EntidadOrigen ∈ {Asistencia, AsistenciaProfesor}` · `ApplyLegacyPolicy` con backoff `[2s, 10s, 1min, 5min, 30min]` intacto para el resto · `TestDbContextFactory` extraído (aprendizaje F1) con `Create()` + `CreateScopeFactory()` · 13 tests unit `SmtpErrorClassifierTests` (enhanced permanentes/transitorios, 2xx defensivo, StatusCode plano, prioridad enhanced>status, red/timeout, unknown) + 6 tests integration `EmailOutboxWorkerTests` casos a–f (incluye regresión `NotificacionAdmin` con `MaxIntentos=5` y legacy backoff 2s) + tests F1 actualizados para verificar `EO_TipoFallo` en columna · 853 tests suite backend verdes, 0 regresiones · `EmailOutboxService.cs` 288 ln, `EmailOutboxWorker.cs` 240 ln (ambos <300) · INV-S07 respetado.
- [x] **Chat 3 — F3.BE** ✅ (BE, 2026-04-21) — Notificación triple lado backend · `EmailFailureLogger` scoped con DI (`ApplicationDbContext` + `ILogger` + `IHttpContextAccessor?`) escribe directo a `DbContext.ErrorLogs` con `ERL_Severidad=WARNING`, `ERL_ErrorCode=tipoFallo` y JSON completo en `ERL_RequestBody` (keys exactas `tipoFallo/entidadOrigen/entidadId/destinatario/outboxId/dniPersona?`) · DNI enmascarado via `DniHelper.Mask()` (***1234, nunca crudo) · CorrelationId desde header `X-Correlation-Id` si hay `HttpContext`, null en worker · INV-ET02 respetado con try/catch interno → `LogWarning` · hook en `EmailOutboxService.EnqueueAsync` (F1 guard, tras `SaveChangesAsync` con el `EO_CodID` real) y en `EmailOutboxWorker.ProcessSingleEmailAsync` (resuelto del mismo scope por iteración, condición `FAILED && IsPoliticaNueva` una sola vez — firma de `ApplyAsistenciaPolicy` intacta) · `ReporteFallosCorreoAsistenciaJob` Hangfire `0 7 * * *` zona Lima que consulta outbox `FAILED` del día anterior con `AsNoTracking()`, filtra `EO_EntidadOrigen ∈ {Asistencia, AsistenciaProfesor}`, agrupa por `EO_TipoFallo` (top 10 ejemplos/tipo), resuelve directores via `IDirectorRepository.ListarTodosAsync()` (primer activo `To` + resto `Bcc`), silencio positivo si 0 fallos o sin directores, try/catch defensivo para romper vector recursivo · `EO_EntidadOrigen="ReporteFallosCorreoAsistencia"` del propio correo encolado queda fuera del filtro (NO vector recursivo) · plantilla HTML `EmailNotificationService.BuildResumenFallosDiarios` con estilo azul admin (#1976D2) consistente con correcciones existentes, `WebUtility.HtmlEncode` en todos los datos · 6 unit tests `EmailFailureLoggerTests` + 6 integration tests `ReporteFallosCorreoAsistenciaJobTests` (casos a-f incluyendo silencio positivo, agrupación tipificada, filtro contaminación, sin directores, ventana temporal, NO vector recursivo) · **865/865 tests verdes** (antes 853, +12 nuevos) · caps respetados `EmailOutboxService.cs` 296/300, `EmailOutboxWorker.cs` 273/300, `ReporteFallosCorreoAsistenciaJob.cs` 199/300.
- [x] **Chat 4 — F3.FE** ✅ (FE, 2026-04-21, repo `educa-web`) — UI admin `/admin/email-outbox` con visibilidad de `tipoFallo`. Models feature-scoped `tipo-fallo.models.ts` (`TIPOS_FALLO` const, `TipoFallo` type, `TIPOS_PERMANENTES` array, helper `esPermanente` que trata `null`/string desconocido como no-permanente). Pipes puros `TipoFalloLabelPipe` (etiqueta user-friendly: `"Dirección inválida"`, `"Sin correo"`, `"Bandeja llena"`, `"Rechazado por servidor"`, `"Error desconocido"`, `"Transitorio agotado"`, `"En reintento"`, `"Sin clasificar"` para null; string crudo para desconocidos — forward-compat con nuevos tipos backend) y `TipoFalloSeverityPipe` (permanentes → `danger`, transitorios/unknown → `warn`, TRANSIENT/null → `info`). DTO `EmailOutboxLista` extendido con `tipoFallo: string | null`. Columna "Tipo de fallo" agregada a la tabla (`<p-tag>` con severity semántico + tooltip con `ultimoError`), sortable. Filtro dropdown nuevo "Tipo de fallo" en filter bar con `appendTo="body"`, **filtrado 100% client-side** via `filteredItems` computed en store (sin refetch — backend ya entrega el universo). Botón "Reintentar" `disabled` cuando `esPermanente(tipoFallo)` con tooltip explicativo ("No se puede reintentar: fallo permanente. Corregir el registro origen primero.") y `aria-label` dinámico via `pt` (a11y.md). Detalle drawer muestra `tipoFallo` técnico para correlación con backend/logs. Export Excel incluye columna `tipoFallo`. Store + data facade extendidos con `_filterTipoFallo`/`setFilterTipoFallo`/`onFilterTipoFalloChange`. **30 tests Vitest nuevos verdes** (10 label + 10 severity + 10 esPermanente), 1410/1410 suite completa sin regresiones. `npm run lint` limpio, `npm run build` OK. Archivos nuevos: 5 (models + 2 pipes + 2 specs + spec del helper). Archivos modificados: 7 (DTO base + store + data-facade + filters + table + component host + email-outbox.component.html).
- [ ] **Chat 5 — F4.BE** (BE, 1 chat) — Endpoint `GET /api/sistema/auditoria-correos-asistencia` · repository + service + controller + authorization tests · reusa `EmailValidator` de F1 · pre-work obligatorio: mostrar `SELECT` de inspección al usuario y confirmar estructura/universo antes de codificar (regla DB SELECT first)
- [ ] **Chat 6 — F4.FE** (FE, 1 chat, repo `educa-web`) — Pantalla `/intranet/admin/auditoria-correos` · feature flag `auditoriaCorreos` · menú módulo Sistema submenú Monitoreo · accesible solo a Director + Asistente Administrativo

---

## 🔵 Plan 26 — Rate limiting flexible (rol × endpoint × contexto + telemetría)

> **Origen**: Conversación 2026-04-21. El uso admin normal dispara 429 "Demasiadas solicitudes" con frecuencia — caso testigo: exportar 4-5 reportes de asistencia seguidos agota la política `heavy` (5/min por usuario). Las 6 políticas actuales (`global` reads/writes, `login`, `refresh`, `biometric`, `heavy`) son demasiado gruesas: no distinguen rol, no permiten override por endpoint, no aprovechan contexto (horario escolar vs fuera de horario, ráfaga legítima vs sostenido) y no hay visibilidad de quién/qué está hitting 429.
>
> **Plan**: inline en maestro. Si al iniciar el primer chat el diseño crece, mover a `Educa.API/.claude/plan/rate-limit-flexible.md`.
>
> **Estado**: 🔵 Pendiente diseño. Ejes aprobados (2026-04-21): **B + C + D + E**. A (config externa) diferido a F5 sin prerrequisito duro.
>
> **Precede a Plan 24**: sin telemetría (F1) el job CrossChex en background puede disparar rate limits invisibles. Conviene cerrar F1 antes o junto con Plan 24.

### Decisiones de diseño aprobadas

- **B. Multiplier por rol** — Diccionario `roleMultipliers` (inicial en código, luego appsettings en F5): `{ Director: 3.0, AsistenteAdmin: 2.5, Profesor: 2.0, Apoderado: 1.0, Estudiante: 1.0 }`. Refleja que roles administrativos tienen patrón de uso masivo legítimo (reportes, imports, batch).
- **C. Modifier por endpoint** — Attribute custom `[RateLimitOverride(policy: "reports", multiplier: 2.0)]` que ajusta la cuota base sin crear policy nueva. Complementa (no reemplaza) `[EnableRateLimiting]`.
- **D.1 Time-of-day** — Franja escolar (**7am-5pm Lima, L-V**) aplica multiplier global `x1.5`. Fuera de horario queda en cuota base. Leer con `IClock` inyectable (no `DateTime.Now` directo).
- **D.2 Burst + sustained** — Token bucket con dos ventanas concéntricas: **burst** (10 tokens / 30s refill) permite ráfagas legítimas; **sustained** (200 tokens / 5min refill) corta abuso prolongado. Request consume ambos.
- **E. Telemetría** — Tabla `RateLimitEvent` (userId, rol, endpoint, policy, límiteEfectivo, fueRechazado, correlationId, timestamp). Vista admin con top usuarios/endpoints rechazados últimas 24h y timeline.

### Guardrails

- **Cap máximo de multiplier acumulado**: `5x` sobre cuota base. Rol × endpoint × franja no puede superarlo.
- **Policies de auth/biometric NO se tocan**: `login`, `refresh`, `biometric` ya están calibradas y son sensibles a abuso. D.2 aplica solo a `reports`, `batch`, `global`.
- **Testing obligatorio en F4**: integración con `TestServer` + `TestClock` manipulable. La combinatoria rol × endpoint × franja × burst/sustained es grande y los 429 son difíciles de reproducir en QA.
- **Retención `RateLimitEvent`**: 90 días con purge nocturno (job Hangfire). INV-S07 (fire-and-forget) — un error al escribir el log NO falla la request.
- **Reemplazo de `heavy`**: F2 introduce `reports` (reportes PDF/Excel — lectura pesada) y `batch` (imports y aprobación masiva — escritura pesada). `heavy` se deprecia gradualmente.

### Fases

- [x] **F1 — Telemetría sobre policies actuales** ✅ 2026-04-21 (Chat 1 BE + Chat 2 FE + stats BE)
  - [x] F1.1 Tabla `RateLimitEvent` + modelo EF + script SQL ejecutado en BD de prueba y producción ✅ 2026-04-21
  - [x] F1.2 Middleware `RateLimitTelemetryMiddleware` que intercepta respuestas 429 y persiste fire-and-forget (INV-S07 + INV-ET02) ✅ 2026-04-21
  - [~] F1.3 También loguear requests que pasaron pero consumieron >80% de la cuota — **diferido a F2**: ASP.NET Core 9 `RateLimiter` nativo no expone tokens restantes. El método `LogEarlyWarningAsync` queda implementado pero sin llamador; se activa en F2 con custom limiter
  - [x] F1.4 Endpoint `GET /api/sistema/rate-limit-events` con filtros (dni/rol/endpoint/policy/rango/soloRechazados) + `[Authorize(Roles = Roles.Administrativos)]` + DNI enmascarado en DTO ✅ 2026-04-21
  - [x] F1.5 Vista admin FE `/intranet/admin/rate-limit-events` — stats cards (total/rechazados/top-rol/top-endpoint), tabla con filtros (endpoint/rol/policy/rango/soloRechazados), drawer detalle con copy de correlationId ✅ 2026-04-21 (Chat 2)
  - [x] F1.6 Feature flag `rateLimitMonitoring` (on en prod + dev) + menú módulo Sistema submenú Monitoreo + endpoint BE `/stats?horas=24` (opción B — agregados server-side) ✅ 2026-04-21 (Chat 2)
  - **Estado**: F1 100%. BE Chat 1: 9 archivos nuevos + 3 modificados. Chat 2 BE: +1 DTO (`RateLimitStatsDto`) + 3 interfaces/repo/service modificados + 5 tests nuevos (28 totales en módulo, suite 1034 verdes). Chat 2 FE: 17 archivos nuevos (models + services + 4 sub-componentes + page + tests) + 4 modificados (environment x2, routes, menu, permisos). 26 tests FE nuevos (suite 1460 verdes). Cap 300 líneas respetado. Plan 26 pasa a ~20% con F1 completo.

- [ ] **F2 — B + C (multiplier por rol + modifier por endpoint)** (2 chats, BE)
  - [ ] F2.0 **Revertir parche C del Chat 2**: `heavy` está en 15/min como mitigación temporal (Plan 26 Chat 2, 2026-04-21). Al introducir multipliers, volver base a 5/min para que `Director x3 = 15` efectivo sea el mismo comportamiento con el modelo correcto. Buscar en `RateLimitingExtensions.cs` el comentario "parche temporal" como marcador.
  - [ ] F2.1 Custom attribute `[RateLimitOverride(policy, multiplier)]` + resolver que combina con `[EnableRateLimiting]`
  - [ ] F2.2 Partition key resolver que extrae rol del `ClaimsPrincipal` y aplica `roleMultipliers[rol]`
  - [ ] F2.3 Definir multipliers iniciales en constante tipada (no appsettings aún — F5)
  - [ ] F2.4 Reemplazar `heavy` por `reports` (multiplier por defecto x1) + `batch` (x1). Aplicar `[RateLimitOverride("reports", 2.0)]` en los 14 endpoints de reportes (ver Plan 25 cerrado) para compensar exportaciones en serie. Considerar también `[RateLimitOverride("reports", 3.0)]` en **las 2 vistas de observabilidad admin** (`/api/sistema/rate-limit-events` y `/api/sistema/errors`) — en la primera sesión admin real ambas se auto-rate-limitaban con policy `heavy`, y son páginas de diagnóstico que no deberían pelear por cuota con reportes de negocio
  - [ ] F2.5 Tests integración: mismo endpoint, roles distintos → límites efectivos distintos. Cap 5x verificado
  - [ ] F2.6 Verificar con telemetría F1 que las 429 caen en los roles/endpoints esperados. **Dato ya capturado** (Chat 2, primera sesión admin): top endpoint `/api/sistema/errors` con 5/16 rechazos — alimenta la calibración de F2.4
  - **Entregable**: Director/Asistente Admin ya no chocan con límite en uso normal (ej: exportar 8-10 reportes seguidos).

- [ ] **F3 — D.1 Time-of-day modifier** (1 chat, BE)
  - [ ] F3.1 Helper `SchoolHoursResolver` — inyectable, lee `IClock` + zona Lima, expone `IsSchoolHours(DateTimeOffset): bool`
  - [ ] F3.2 Integrar en resolver de F2 como capa adicional (antes del cap 5x)
  - [ ] F3.3 Tests con `TestClock` — lunes 10am L-V → multiplier x1.5 aplicado; domingo 10am → no aplicado; lunes 18:30 → no aplicado
  - **Entregable**: ventana de tolerancia extra en horario de uso intensivo administrativo.

- [ ] **F4 — D.2 Burst + sustained** (2 chats, BE)
  - [ ] F4.1 Custom `PartitionedRateLimiter` con dos buckets concéntricos (token bucket biventana). Request consume 1 token de cada bucket
  - [ ] F4.2 Migrar `reports` y `batch` al limiter biventana. `global` reads se evalúa caso por caso
  - [ ] F4.3 Tests de ráfaga: 10 requests en 10s → OK; 20 requests en 10s → throttled; burst recuperado en 30s
  - [ ] F4.4 Tests de sustained: 200 requests distribuidos en 5min → OK; 210 → throttled
  - [ ] F4.5 Monitorear con F1 que las 429 bajan sin explosión de uso indebido (comparar métricas pre vs post)
  - **Entregable**: ráfagas legítimas permitidas sin abrir boquete para bots.

- [ ] **F5 — A Config externa** 🔒 (diferido, sin prerrequisito duro)
  - [ ] F5.1 Migrar `roleMultipliers`, franja escolar, parámetros de token bucket a `appsettings.json`
  - [ ] F5.2 Integrar Azure App Configuration para cambio sin redeploy
  - [ ] F5.3 Hot reload de config (o graceful restart)
  - **Cuándo**: cuando el equipo necesite tunear en prod sin ciclo de release. No bloquea F1-F4.

### Dudas a resolver durante el diseño

- ¿Profesor con import de notas en bulk necesita multiplier `x2` o más? (responder con datos de F1 tras 1-2 semanas)
- ¿`biometric` (webhook CrossChex) necesita ajuste? Hoy 30/min IP; en colegios grandes con 1000+ marcaciones en 10min puede chocar. **Tentativamente NO se toca** — usar telemetría para confirmar
- ¿Multipliers por rol son fijos o varían por tipo de endpoint? (ej: Director `x3` en reports pero `x1.5` en writes). F2 comienza con fijo; escalar a matriz solo si telemetría lo pide
- ¿La vista admin de F1 permite *acción* (ej: "bloquear este user 1h") o solo *observación*? Arrancar con observación; acciones son otro plan
- ¿Qué hacer cuando un usuario anónimo (pre-login) hitting 429 en `/api/sistema/reportes-usuario` (Plan §16)? Hoy parte de IP — mantener sin multiplier de rol (rol = "Anónimo")

### Relaciones con otros planes

- **Plan 22 (Correos)**: independiente. Ambos tocan telemetría pero dominios distintos (correos vs requests HTTP)
- **Plan 7 (Error Trace BE)**: complementario. `RateLimitEvent` es paralelo a `ErrorLog` — 429 no es error, no debe mezclarse
- **Plan 24 (Sync CrossChex en Background)**: el job opera server-side sin userId → partición por "system" con cuota propia. **F1 ✅ cerrada** — Plan 24 ya puede arrancar con la red de telemetría puesta; cualquier 429 del job aparecerá en la vista admin con `rol = "Anónimo"`
- **Plan 16 (Auditoría de seguridad)**: rate limit es capa de defensa. F1 aporta visibilidad que el audit puede requerir para recomendaciones
- **Plan 25 (Paridad Excel)**: fue el detonante — 14 endpoints `/pdf` + 14 `/excel` duplican el consumo potencial de `heavy`. F2 los marca con `[RateLimitOverride("reports", 2.0)]`

### Checklist pre-inicio

```
[ ] ¿Usuario confirma multipliers iniciales por rol (3.0 / 2.5 / 2.0 / 1.0 / 1.0)?
[ ] ¿Usuario confirma franja escolar 7am-5pm L-V?
[ ] ¿Usuario confirma burst 10/30s + sustained 200/5min como punto de partida?
[ ] ¿Usuario confirma retención 90 días de RateLimitEvent?
[x] ¿Usuario confirma que F1 (telemetría) va primero — 1-2 semanas de datos antes de tocar policies? ✅ 2026-04-21 (F1 cerrada; recolección de datos en curso)
[x] Si se arranca Plan 24 antes que Plan 26 F1, ¿se acepta el riesgo de 429 invisibles del job CrossChex? ✅ 2026-04-21 (ya no aplica — F1 cerrada antes de que Plan 24 arranque)
```

---

## Quick wins cerrados

- [x] **QW1 — Migrar `health-permissions` a WAL** ✅ (2026-04-15)
- [x] **QW2 — Limpiar ruido de lint en build artifacts** ✅ (2026-04-15)
- [x] **QW3 — CI verde** ✅ (2026-04-16) — 6 spec files fixed (40 fallos → 0). 108 files, 1317 tests.

---

## Auditoría WAL + Cache (standalone, 3 chats)

> **Origen**: Auditoría modo Validar (2026-04-16). Hallazgos en `tasks/wal-cache-audit-fixes.md` (pendiente crear).

- [ ] **H1** — Bug interceptor PascalCase + H8/H9 módulos incompletos y versiones (P0, 1 chat)
- [ ] **H7** — Normalizar naming `WAL_CACHE_MAP` (P1, 1 chat)
- [ ] **H2-H6, H10** — Fixes cosméticos y duplicación de patrones (P2, 1 chat)

---

## Design System — Estándar desde `usuarios` (standalone, ~8 chats restantes)

> **Origen**: Conversación 2026-04-17. Tras cerrar parches de transparencia (tablas, paginadores, stat-cards, wrappers), se eleva `/intranet/admin/usuarios` como referencia canónica de diseño. Detalle en `tasks/design-system-from-usuarios.md`.
> **Sin prerrequisitos · Ejecutable en paralelo a Carril D**

- [x] **F1 — Globales sin polémica** ✅ (2026-04-17)
  - [x] Reset de inputs/selects en `styles.scss` (transparente, foco text-color) — scoped a `app-intranet-layout`
  - [x] Override global de `p-button-text` y `p-button-outlined` (text-color + surface-300) — scoped a `app-intranet-layout`
  - [x] Utility class `.label-uppercase` en `styles.scss`
  - [x] Renombrado `rules/table-transparency.md` → `rules/design-system.md` con secciones para A2, A3, A4
  - [x] CLAUDE.md actualizado con nueva referencia
  - [x] F1.0 Decisión A1 resuelta 2026-04-17: **Opción C — semántica explícita** (`tag-neutral` opt-in para informativos, `severity` nativo para críticos)

- **F2 — Aplicar decisión sobre `p-tag`** (opción C elegida, dividido en 5 subfases)
  - [x] **F2.1 — Infraestructura + canonical** ✅ (2026-04-17) — `.tag-neutral` agregado a `styles.scss`, convención documentada en `design-system.md` (sección 5), `styleClass="tag-neutral"` aplicado en 4 archivos de usuarios (7 tags de 8; el tag de error de validación queda crítico). Build OK.
  - [x] **F2.2 — Estados operativos** ✅ (2026-04-17) — Audit de 11 archivos (asistencia/aprobación/error-logs/feedback-reports/cierre-periodo/notas): **0 violaciones**. Todos los tags operativos usan `severity` apropiadamente. 2 `severity="secondary"` en stacks informativos (httpMethod, contadores) se conservan por consistencia cromática del grupo. Tipo de evaluación (`simulador-notas`, `notas-curso-card`) queda para F2.4.
  - [x] **F2.3 — Metadatos admin** ✅ (2026-04-17) — 8 tags en 7 archivos migrados a `tag-neutral`: permisos-roles/usuarios/detail-drawer/edit-dialog (6 tags de rol), eventos-calendario (tipo), notificaciones-admin (tipo+destinatario), email-outbox (tipo). Estados críticos (prioridad, estado operativo, FAILED) mantienen `severity`. Build OK.
  - [x] **F2.4 — Académico** ✅ (2026-04-17) — 22 tags en 17 archivos migrados a `tag-neutral`: modo asignación (3), "Tutor" badges (2), tipo calificación (2), grado.nombre (1), cursos como chips (2), contadores (6), tipo de evaluación (5), "Tutor" de profesor-salones (1). Notas con severity por aprobación, estados operativos, stats de aprobados/desaprobados, y alertas (warn) mantienen `severity`. Build OK.
  - [x] **F2.5 — Misc y cross-role** ✅ (2026-04-17) — 10 tags en 7 archivos migrados a `tag-neutral`: videoconferencias (salonDescripcion), mensajeria-tab + foro-tab (labels), ctest-k6 (contadores del header), credentials-dialog (rol, 2 tags + eliminación de `getRolSeverity` helper ya no usado), campus (piso.nombre + conexion.tipo), user-info-dialog (userRole con clase combinada). Auditados sin cambios (mantienen severity, críticos operativos): mensajería no-leídos (danger), campus bidireccional/unidireccional (info/warn), health-justification, horarios-import, student-task-submissions, student-files. Build OK.

- [x] **F3 — `rules/design-system.md` con pautas B1-B11** ✅ (2026-04-17)
  - [x] Sección 6 agregada con B1-B11: container con border no background, page header, stat card, tabla, row actions triplet, filter bar, botones canónicos, dialogs, alert banners con `color-mix()`, drawer detalle, dev banners. Todos los ejemplos extraídos literalmente de `/intranet/admin/usuarios`.
  - [x] Cross-refs: CLAUDE.md ya incluía `rules/design-system.md`; agregado cross-ref bidireccional en `rules/primeng.md` (header introductorio).
  - [x] Intro del archivo reescrito con tabla A (globales) vs B (pautas) y criterio de decisión. Historial actualizado.

- [x] **F4 — Migración de tokens hardcoded** ✅ (2026-04-17) — `#e24c4c → var(--red-500)`, `#dc2626 → var(--red-600)`, `#1e40af → var(--blue-800)` en ~30 archivos (admin, shared, cross-role, profesor, estudiante). Regla global A5 en `styles.scss`: `p-button-success` con `color: var(--white-color)` → eliminado `style="color: white"` inline en usuarios-header. Design-system.md: secciones 5 (A5) + 8 (D: Tokens de color con mapa canónico) agregadas, deuda C1/C3/C4 resuelta, B7/B8/B3 ejemplos actualizados. Excepciones justificadas documentadas (Sass color functions, Canvas API, avatar palettes). Build OK.

- [x] **F5.1-F5.2 — Auditoría + priorización de páginas admin** ✅ (2026-04-18) — 14 páginas admin inspeccionadas contra B1/B2/B3/B6. Backlog de 8 migraciones priorizado en `tasks/design-system-from-usuarios.md § F5`. Divergencias principales: 4 páginas sin `<app-page-header>` (feedback-reports, attendances, email-outbox, campus), 1 página con `bg: #fff` literal (email-outbox L57), ~8 componentes con residuo anti-B1 (`bg: surface-card` + `box-shadow`). Subcomponentes con shadows decorativos legítimos (drag & drop, canvas) marcados como excepción.

- [ ] **F5.3 — Migración 1 página por chat** (8 chats, en orden de backlog F5.2)
  - [ ] F5.3.1 `feedback-reports` (falta app-page-header)
  - [ ] F5.3.2 `attendances` (falta app-page-header)
  - [ ] F5.3.3 `email-outbox` (falta app-page-header + `bg: #fff`)
  - [ ] F5.3.4 `vistas` (remover `bg: surface-card` + shadow de stat-card)
  - [ ] F5.3.5 `cursos` (remover shadow de filters-bar)
  - [ ] F5.3.6 Stats residuales (permisos-roles, permisos-stats-cards, usuarios-stats)
  - [ ] F5.3.7 `horarios/schedules` root shadows
  - [ ] F5.3.8 `campus` (header solo; documentar canvas como excepción)

---

## Deuda estructural diferida (chat dedicado)

- [ ] **DS1 — Split estructural de `wal-sync-engine.service.ts`** — ver `tasks/wal-sync-engine-split.md` (pendiente crear)
  - **Origen**: F3.5.B (2026-04-15). Archivo en 303 líneas efectivas (límite 300). Fix temporal con `eslint-disable max-lines` justificado en el encabezado del archivo. No es quick-win: requiere entender el loop del engine + tests mínimos previos + extracción cohesiva (candidato principal: Error Handling como helper puro).
  - **Por qué diferido**: preexistente al F3.5.B, no bloquea ninguna tarea activa, y el escape hatch honesto es preferible a un refactor cosmético que colapse comentarios para pasar el umbral sin resolver el fondo.

---

## Notas de ubicación

- Planes en `educa-web/.claude/plan/` son los de **alcance amplio** (incluyen refs cruzadas al backend).
- Planes en `educa-web/.claude/tasks/` son **transversales al proyecto** pero con granularidad de tarea (enforcement, design patterns).
- Planes en `Educa.API/.claude/plan/` son **exclusivos del backend**.
- Este maestro vive en `educa-web/.claude/plan/maestro.md` porque es el punto donde convergen más referencias cross-repo.

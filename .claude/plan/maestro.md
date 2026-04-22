# Plan Maestro — Orden y Dependencias

> **Fecha**: 2026-04-14 (última revisión: 2026-04-22, **Plan 28 🟢 Chat 2 BE ✅ cerrado** — modelo polimórfico `'A'` + dispatch 3 pasos `Profesor → AsistenteAdmin → Estudiante` + queries admin extendidas + migración SQL ejecutada. 14 archivos prod + 3 archivos test. Colisión real Vivian Canchari (dual AA+Profesor, CodIDs 3 y 4) resuelta por first-match-wins → cae como `'P'`; los otros 3 AAs puros. Hallazgo: discriminador del rol es `DIR_UsuarioReg='Asistente Administrativo'` (convención pre-existente, no hay columna `DIR_Rol`). **+18 tests BE, 1185 verdes.** Siguiente: Chat 3 BE (reportes PDF/Excel extendidos + correo diferenciado AA + bandeja admin + composer notificaciones + authz `INV-AD08`). Plan 27 Chat 5c ✅ cerrado — pendiente solo validación del jefe post-deploy)
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
| 6 | Asignación Profesor-Salón-Curso | BE+FE | `Educa.API/.claude/plan/asignacion-profesor-salon-curso.md` | ✅ **100% — archivado 2026-04-22** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-6) | — |
| 7 | Error Trace Backend | BE | `Educa.API/.claude/plan/error-trace-backend.md` (pendiente crear) | ⏳ | 0% |
| 8 | Design Patterns Backend | FE | `tasks/design-patterns-backend.md` (pendiente crear) | Incremental | N/A |
| 9 | Design Patterns Frontend | FE | `tasks/design-patterns-frontend.md` (pendiente crear) | Incremental | N/A |
| 10 | Flujos Alternos (resiliencia) | FE | `plan/flujos-alternos.md` (pendiente crear) | ⏳ (bloqueado) | 0% |
| 11 | Refactor `eslint.config.js` (fix G10) | FE | `plan/eslint-config-refactor.md` | ✅ **100% — archivado 2026-04-22** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-11) | — |
| 12 | Backend Test Gaps | BE | `Educa.API/.claude/plan/test-backend-gaps.md` | F1 ✅ (A+B+C, 23 tests en 4 archivos) · F2-F5 ⏳ | ~30% |
| 13 | Frontend Test Gaps | FE | `plan/test-frontend-gaps.md` (pendiente crear) | ⏳ | 0% |
| 14 | Contratos FE-BE | FE+BE | `plan/contratos-fe-be.md` (pendiente crear) | ⏳ | 0% |
| 15 | Release Protocol y Operaciones | FE+BE | `plan/release-operations.md` (pendiente crear) | F1 ✅ · F2 ✅ · F3-F5 ⏳ | ~40% |
| 16 | Auditoría de Seguridad | BE | `Educa.API/.claude/plan/security-audit.md` | F1 ✅ · F2-F5 ⏳ | ~20% |
| 17 | Enforcement max-lines BE (CI) | BE | (inline en maestro) | ⏳ | 0% |
| 18 | Tests de flujo de negocio E2E | BE+FE | (inline en maestro) | ⏳ | 0% |
| 19 | Comunicación: foro + mensajería + push | FE+BE | (pendiente planificar) | ⏳ | 0% |
| 20 | Design System — Estándar desde `usuarios` | FE | `tasks/design-system-from-usuarios.md` | F1 ✅ · F2 ✅ (F2.1-F2.5) · F3 ✅ · F4 ✅ · F5.1-F5.2 ✅ · F5.3 ⏳ (0/8) | ~96% |
| 21 | Asistencia de Profesores en CrossChex | BE+FE | `plan/asistencia-profesores.md` | ✅ **100% — archivado 2026-04-22** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-21). Deuda lateral pendiente: `PermisoSaludAuthorizationHelper.cs:63`; cols `ERL_*` en BD prueba; DROP `Asistencia_deprecated_2026_04` ~2026-06-20 | — |
| 22 | Endurecimiento correos de asistencia | BE+FE | `Educa.API/.claude/plan/asistencia-correos-endurecimiento.md` | 🟢 En progreso · **Chats 1 (F1) + 2 (F2) + 3 (F3.BE) + A (F5+F6) + A-cierre ✅ cerrados 2026-04-21** · **Chat B (F5.6 FE widget) ✅ cerrado 2026-04-22**. **Chat B (2026-04-22)**: endpoint BE `GET /api/sistema/email-outbox/throttle-status` con `EmailOutboxMonitoringService` que orquesta `IQuotaThrottleService.CheckQuotaAsync` por sender + 1 query de dominio `AsNoTracking()` sobre índice `IX_EmailOutbox_FechaEnvio_Sent` (Chat A). Emails enmascarados en BE (`sistemas@***.com`) antes de devolverse al cliente. Widget FE `<app-throttle-status-widget>` presentacional (OnPush, inputs/outputs) integrado en `/intranet/admin/bandeja-correos` entre chart y filtros: 7 cards per-sender + 1 card full-width de dominio con severity por ratio count/limit (success/info/warn/danger). Polling opcional 30s togglable (switch PrimeNG + botón refresh manual + colapsable). Preferencias `emailOutboxThrottleWidget` (feature flag OFF prod, ON dev) + `throttleWidgetAutoRefresh/Collapsed` persistidas via `StorageService`. **+10 tests BE** (5 service + 5 reflection authz, `1063 tests verdes`) · **+12 tests FE** (6 widget + 6 facade polling con vitest fake timers, `1478 tests verdes`) · lint + build OK en ambos repos. **Chat A cierre (2026-04-21)**: build limpio · 1053 tests · 4 scripts SQL (11 + 2789 filas) · commits `a2f4bfd` (BE) + `b0c5832` (FE) · INV-AD05 sin BCC. **Chat A (F5+F6 merged)**: techo 50/h → 200/h con 7 buzones, sliding window 60 min, round-robin, re-enqueue jitter, `FAILED_QUOTA_EXCEEDED`, `EO_IntentosPorCuota` separado. Post-deploy Chat A pendiente monitoreo 24-48h. Chat 4 (F3.FE) + Chats 5-6 (F4 BE+FE) pendientes. | 90% |
| 23 | Extensión `/intranet/admin/asistencias` a Profesores | BE+FE | `plan/asistencia-admin-profesores.md` | ✅ **100% — archivado 2026-04-22** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-23) | — |
| 24 | 🟡 Sync CrossChex en Background Job | BE+FE | (inline en maestro) | ⏳ Plan nuevo 2026-04-20. Diagnóstico cerrado: `Task.Delay(30000)` entre páginas bloquea UI 2+ min; `.subscribe()` directo en FE no corre en background. 4 chats diseñados (BE job + SignalR + FE progreso + validar rate limit) | 0% |
| 25 | Paridad Excel para reportes PDF | BE+FE | (archivado en historial) | ✅ **100% — archivado 2026-04-22** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-25). Regla §17 en `business-rules.md` con INV-RE01/02/03 | — |
| **26** | **🟡 Rate limiting flexible** | **BE+FE** | **(inline en maestro)** | **🟡 F1 ✅ cerrada 2026-04-21 + F2 Chat 1 ✅ cerrado 2026-04-22 (máquina del multiplier). F2 Chat 2 ⏳ pendiente aplicar `[RateLimitOverride]` a 14 endpoints reportes + 2 vistas admin. F2 Chat 1: `RateLimitOverrideAttribute` + `RoleMultipliers` (Director 3.0 / Asistente Admin / Promotor / Coordinador Académico 2.5 / Profesor 2.0 / resto 1.0) + `RateLimitPartitionResolver` (cache reflection, cap 5x acumulado) + nuevas policies `reports` y `batch` con base 5/min + resolver. `heavy` revertido a 5/min (parche temporal Chat 2 removido) y deja como deprecated funcional para los 14 controllers de Plan 25 que aún la usan (Chat 2 los migra). Telemetría viva en prod desde F1 (RateLimitEvent, INV-S07/ET02). FE intacto: la vista admin `/intranet/admin/rate-limit-events` ya rotula por rol; los datos nuevos aparecerán automáticamente cuando las 429 caigan. Tests: +28 unit (`RoleMultipliersTests`, `RateLimitPartitionResolverTests`) + 6 integración con `TestServer` real + `TestAuthHandler` reusable. Suite BE 1097 verdes (baseline 1063 + 34 nuevos). Plan ~30%. **Siguiente**: F2 Chat 2 (aplicar overrides a 14+2 endpoints) y luego observar telemetría 1-2 semanas antes de F3.** | **30%** |
| **28** | **🟢 Inclusión de Asistentes Administrativos en reportes de profesores** | **BE+FE** | **(inline en maestro — decisión confirmada post-Chat 1: 6 chats no justifican archivo dedicado)** | **🟢 Chat 2 BE ✅ cerrado 2026-04-22 — modelo + dispatch + queries. Migración SQL ejecutada (CHECK expandido a `('E','P','A')`). 14 archivos prod tocados: constante `TipoPersona.AsistenteAdmin = "A"`, lookup `GetAsistenteAdminActivoConSedeByDniAsync` filtrando `DIR_UsuarioReg='Asistente Administrativo'` (discriminador del rol es `DIR_UsuarioReg`, no `DIR_Rol` — convención pre-existente del proyecto), dispatch `Profesor → AsistenteAdmin → Estudiante → rechazar` en `AsistenciaService.ResolverPersonaAsync`, rama 'A' en 3 queries de `AsistenciaRepository` + nuevo método `ListarAsistentesAdminDelDiaAsync` en `AsistenciaAdminQueryRepository` + selector admin extendido + helper `ContextoAsistenteAdmin` + DTO estadísticas con campos AA + tupla `(E,P,A)` en `ContarEditados` + log sync service. Colisión real resuelta por dispatch: Vivian Canchari existe dual (AA+Profesor) → cae como `'P'` por first-match-wins (3 AAs puros: Ricardo/Ray/Diana). **+18 tests** (6 lookup, 6 dispatch, 6 `TardanzaRegular`) → **1185 BE verdes**. Commit en Educa.API branch master. **🟢 Chat 1 `/design` ✅ cerrado 2026-04-22 con 8 decisiones: (1) alcance B-amplio acotado al rol "Asistente Administrativo" (4 personas hoy: RICARDO REY, VIVIAN CANCHARI, RAY ORTIZ, DIANA TUESTA — rol = "Asistente Administrativo" explícito, se excluyen Director/Promotor/Coord Académico); filas IN del inventario 11 = {1-3 asistencia admin + 9-10 comunicación (correos + notificaciones)}; filas OUT = {4-5 filtros rol usuarios/tutores, 6-8 horarios/cursos/salones tutoreados, 11 permisos} — criterio: si no es reporte de asistencia o función que el AA no cumple, no entra; (2) `TipoPersona='A'` en `AsistenciaPersona` con `ASP_PersonaCodID` → `Director.DIR_CodID` (extiende dispatch polimórfico Plan 21 con 3er tipo); (3) dispatch webhook `Profesor → Director(rol=AA) → Estudiante → rechazar` — **modifica el orden del Plan 21** (hoy `Profesor → Estudiante`) por regla §7.1 "menor a mayor volumen"; (4) correos diferenciados: helper nuevo `EnviarNotificacionAsistenciaCorreccionAsistenteAdmin` reusa plantilla azul administrativa con saludo propio, destinatario `Director.DIR_Correo`, `TipoEntidadOrigen='AsistenciaAsistenteAdmin'`; (5) self-service "Mi asistencia" generalizado — componente `attendance-profesor-personal` se renombra a `attendance-personal` parametrizado por `TipoPersona` (reusa tabla mensual + día puntual + widget home); (6) horarios = profesor (periodo regular 07:31 tardanza / 09:30 falta, apertura INV-C10 sí aplica, INV-C09 salida temprana no aplica — es `'E'`-only); (7) `INV-AD08` principio general "ningún rol administrativo corrige asistencia de su propio rol" → AA no puede mutar `TipoPersona='A'`; jurisdicción `Roles.SupervisoresAsistenteAdmin = {Director, Promotor, Coordinador Académico}`; (8) alcance persona acotado al rol "Asistente Administrativo" específicamente (Director, Promotor, Coord Académico NO entran al scope — son roles distintos con funciones no operativas-auxiliares). **Plan inline, 6 chats confirmados**: Chat 1 ✅ + Chat 2 BE (modelo + dispatch + queries) + Chat 3 BE (reportes PDF/Excel + correos + bandeja + notificaciones) + Chat 4 FE (admin UI + badge + self-service generalizado + widget home) + Chat 5 cierre docs (INV-AD08/09 en business-rules.md §15.9 + §17 Excel paridad) + Chat 6 gap fix reservado (patrón probado Plan 27). **Chat 2 bloqueado hasta validación del jefe Plan 27 post-deploy** (evita PRs simultáneos sobre `AsistenciaPersona` + `EmailNotificationService`). Invariantes a formalizar en Chat 5: `INV-AD08`, `INV-AD09`, nota cruzada en `INV-AD06`.** | **~15%** |
| **27** | **🟢 Filtro temporal asistencia diaria por grado (5to Primaria +)** | **BE+FE** | **(inline en maestro — el diseño cupo en 1 chat, no se promueve a archivo dedicado)** | **🟢 Cerrado docs 2026-04-22 (pendiente validación del jefe post-deploy). Los 5 chats completaron: Chat 1 `/design` + Chat 2 BE webhook/admin/correos (1130 verdes) + Chat 3 BE reportes + nota (1149 verdes) + Chat 4 BE mínimo `GraOrden` self-service + FE completo banner/per-student/widget (1155 BE + 1507 FE verdes) + Chat 5 cierre docs `INV-C11` en `business-rules.md §1.11 + §15.4` + **Chat 5b (fix gap) 2026-04-22**: 2 queries de `ConsultaAsistenciaRepository` (`ObtenerEstudiantesPorGradoConAsistenciasAsync` + `ObtenerEstudiantesPorDiaAsync`) quedaban sin filtrar → endpoints `profesor/grado`, `profesor/asistencia-dia`, `director/grado`, `director/asistencia-dia` devolvían listas con `Asistencias = []` y el FE calculaba 100% falta. Fix: filtro `GRA_Orden >= 8` + `SalonProfesorDto.GraOrden` expuesto + `salonFueraAlcance` computed en `attendance-profesor-estudiantes` y `profesor-attendance-widget` del home (reutiliza `AttendanceScopeStudentNoticeComponent` del Chat 4). **+6 tests BE** (4 filtro + 2 `GraOrden`) → **1161 verdes**. **+2 tests FE** (widget INV-C11) → **1509 verdes**. **Chat 5c (gap fix bulk email) 2026-04-22**: la proyección dedicada `AsistenciaEmailDataRow` consumida por `AsistenciaAdminBulkEmailService.EnviarCorreosMasivosAsync` (`POST /api/AsistenciaAdmin/correos-masivos`) no traía `GraOrden`, así que el early-return de `EmailNotificationService` nunca disparaba y el reenvío masivo salía para estudiantes con `GRA_Orden < 8`. Fix: `AsistenciaEmailDataRow` gana `int? GraOrden` · `GetEmailDataByIdsAsync` + `GetEmailDataByIdAsync` agregan subquery correlacionada con filtro `ESS_Estado=true && SAL_Estado=true && SAL_Anio=anioActual` (INV-D09) · el service propaga `asistencia.GraOrden` en entrada y salida. **+6 tests BE** (4 repo + 2 service) → **1167 verdes**. FE sin cambios (1509 verdes). 10 decisiones acordadas preservadas. Reversibilidad documentada (bajar la constante en ambos repos + redeploy; job catch-up opcional sin data loss). Una vez que el jefe valide el comportamiento post-deploy, el plan pasa a `history/planes-cerrados.md`.** | **100%** |

**Semáforo de readiness**:

| Dimensión | Estado | Gate mínimo |
|---|---|---|
| **Feature readiness** | 🟢 Listo | Carril A ✅ + QW4 ✅ — deploy completado |
| **Deploy readiness** | 🟢 Estable | FE (Netlify) + BE (Azure) desplegados 2026-04-16. 2026-04-17 sin incidentes reportados. |
| **Production reliability** | 🔴 Sin red | Falta: tests de contrato, auditoría endpoints, error trace, fallbacks P0 |

**Foco (actualizado 2026-04-22, post-Chat 2 Plan 28)**: 🟢 **Plan 28 Chat 2 BE ✅ cerrado** — modelo polimórfico `'A'` + dispatch 3 pasos + queries admin extendidas + migración SQL ejecutada en BD desarrollo. **18 tests nuevos, 1185 BE verdes**. Siguiente: **Chat 3 BE** (reportes PDF/Excel extendidos a `'A'` + correo diferenciado `EnviarNotificacionAsistenciaCorreccionAsistenteAdmin` con saludo propio + bandeja admin filtro por `TipoEntidadOrigen` + `INotificacionesAdminService` composer expande rol "Profesor" a `{Profesor, AsistenteAdmin}` + `[Authorize(Roles = Roles.SupervisoresAsistenteAdmin)]` en mutaciones sobre `TipoPersona='A'` para enforzar `INV-AD08`). **Hallazgo Chat 2 importante**: el discriminador del rol AA es `DIR_UsuarioReg='Asistente Administrativo'` (convención pre-existente, no hay columna `DIR_Rol` en el modelo). Vivian Canchari es dual Profesor+AA — dispatch lo resuelve por first-match-wins como `'P'`. 🟢 **Plan 27 cerrado en docs + código completo** — `INV-C11` formalizado en `business-rules.md` (§1.11 + §15.4), pendiente solo validación del jefe post-deploy para archivarse en `history/planes-cerrados.md`. **Frentes abiertos sin bloqueo**: Plan 22 F4/F5.6 BE, Plan 26 F2 Chat 2 (aplicar `[RateLimitOverride]` a 14+2 endpoints), Design System F5.3, Carril D Olas 2+.

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
- [ ] **Plan 26 — Rate limiting flexible** (30%, **F1 100% cerrada** 2026-04-21 + **F2 Chat 1 cerrado** 2026-04-22 con `[RateLimitOverride]` + `RoleMultipliers` + resolver + policies `reports`/`batch` + 1097 tests verdes; F2 Chat 2 ⏳ aplicar overrides a 14+2 endpoints)
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

## 🟢 Plan 28 — Inclusión de Asistentes Administrativos en reportes de profesores

> **Origen**: Requerimiento del usuario 2026-04-22. **MÁXIMA PRIORIDAD nueva**.
> **Plan**: **inline en este maestro** — decisión confirmada post-Chat 1. 6 chats totales no justifican archivo dedicado (mismo criterio que Plan 27).
> **Estado**: 🟢 **Chat 1 `/design` ✅ cerrado 2026-04-22** con 8 decisiones resueltas. Chat 2 BE **bloqueado hasta validación del jefe del Plan 27 post-deploy**.
> **Validación**: diseño validado por el usuario en Chat 1. Resultado final post-deploy requiere OK explícito antes de archivar.

### Qué se quiere

> Cita literal del usuario (2026-04-22): *"En reportes donde aparezcan profesores ahora también saldrán de director los que sean asistentes administrativos."*

Los **Asistentes Administrativos** comparten login y tabla con los Directores (`Director`, ver business-rules.md §7.1 y `Roles.Administrativos`). Hoy aparecen en pantalla bajo "Director" o "Asistente Administrativo" según el campo de rol, pero **no figuran** en los reportes/listados que muestran profesores — pese a que operativamente cumplen funciones cercanas a docentes auxiliares (acompañamiento académico, suplencias, etc.).

El requerimiento (acotado en Chat 1 decisión 8): **donde el sistema muestra "profesores" en un reporte de asistencia o comunicación relacionada, también debe incluir a los Director cuyo rol = "Asistente Administrativo"** (explícitamente — NO Director, Promotor ni Coordinador Académico, que cumplen funciones no operativas-auxiliares). Hoy existen **4 AAs** activos en producción: RICARDO REY YARUPAITA MALASQUEZ, VIVIAN COLET CANCHARI RIVAS, RAY ORTIZ PEREZ, DIANA PATRICIA TUESTA MOYOHURA.

### Por qué importa ahora

- **Plan 21** (asistencia polimórfica `TipoPersona = 'E' | 'P'`) cerró 2026-04-22 — habilitó que profesores tengan registros propios en `AsistenciaPersona`.
- **Plan 23** (extensión de `/intranet/admin/asistencias` a profesores) cerró 2026-04-22 — admin ya gestiona asistencia de profesores en la misma UI que estudiantes.
- Plan 28 es la **3ra extensión natural**: incluir a los asistentes admin en el mismo flujo. Sin esto, los reportes recién extendidos a profesores quedan **incompletos** desde el punto de vista del Director (le falta visibilidad de su propio personal auxiliar).
- Los AAs ya marcan en CrossChex físicamente hoy — sus marcaciones caen en el dispatch como **rechazadas silenciosamente** (DNI no encontrado en `Profesor` ni en `Estudiante`). Hay marcaciones **perdidas** que el webhook devuelve HTTP 200 pero nunca registra. Confirmado por el usuario en pre-work Chat 1 (P3).

### Las 8 decisiones (Chat 1 cerrado 2026-04-22)

| # | Tema | Decisión | Justificación |
|---|------|----------|---------------|
| **1** | **Alcance del término "reportes"** | **Opción B (amplio) con P5 extendido**. Aplica a **todo reporte de asistencia** que hoy lista profesores Y a **comunicación relacionada** (correos + notificaciones), pero **acotado al rol "Asistente Administrativo"** (ver decisión 8). Filas IN del inventario 11 = {1-3 asistencia admin, 9-10 comunicación}. Filas OUT = {4-5, 6-8, 11}. Principio operativo del usuario: *"si hay algo relacionado a un reporte de asistencia, priorizar implementarlo sin inconsistencias"*. | El alcance literal del requerimiento apunta a "reportes que listan profesores" — asistencia cubre la mayoría. Académico (horarios, cursos, salones tutoreados), filtros por rol en usuarios/permisos NO aplican porque el AA no cumple esas funciones estructuralmente. |
| **2** | **Modelo de datos `AsistenciaPersona`** | **Opción A**: `TipoPersona = 'A'` agregado al CHECK constraint. `ASP_PersonaCodID` apunta a `Director.DIR_CodID` cuando `TipoPersona = 'A'`. | Continuación natural del patrón polimórfico del Plan 21 (ya estable). CHECK constraint reversible con PR + script SQL. Queries de Plan 21/23 ya tocadas solo necesitan agregar contemplar `'A'`. Requiere validación cross-tabla DNI antes del deploy (Estudiante + Profesor + Director activos no pueden compartir DNI). |
| **3** | **Dispatch webhook CrossChex** | **Opción A con orden custom**: `Profesor → Director(rol=AA) → Estudiante → rechazar`. **Modifica el orden del Plan 21** (hoy `Profesor → Estudiante`). | Regla de `business-rules.md §7.1` ("menor a mayor volumen"): Profesor (~decenas) → AA (4) → Estudiante (miles). Cambio al Plan 21 documentado explícitamente en Chat 5. Consecuencia: las marcaciones hoy rechazadas silenciosamente de los 4 AAs empiezan a registrarse tras el deploy. |
| **4** | **Correos (INV-AD05)** | **Opción B**: helper nuevo `EnviarNotificacionAsistenciaCorreccionAsistenteAdmin` reusa plantilla azul administrativa con saludo propio *"Estimado/a asistente administrativo/a"*. Destinatario = `Director.DIR_Correo`. Etiqueta outbox: `TipoEntidadOrigen = "AsistenciaAsistenteAdmin"` (bandeja admin separada). | Simetría con lo que Plan 23 sentó para profesor. Volumen despreciable (4 AAs × N correcciones/mes ≪ 200/h). Saludo genérico mentiría — P5 extendido exige trato diferenciado correcto. |
| **5** | **Self-service "Mi asistencia"** | **Opción A + sub-decisión (i) generalizar**: componente `attendance-profesor-personal` se renombra a `attendance-personal` parametrizado por input `TipoPersona`. El AA usa tabla mensual + día puntual + widget home idénticos al profesor. Sin botones de autojustificación (read-only por INV-AD06/08). | P5 extendido (pre-work) exige simetría con profesor. Generalizar evita duplicación de ~3 componentes FE. Nueva ruta `/intranet/asistente-administrativo/me/*` o reuso parametrizado con guard de rol. |
| **6** | **Ventanas horarias §1.1** | **Opción A**: idéntico a profesor. Periodo regular: tardanza `[07:31, 09:30)`, falta `≥ 09:30`. Apertura `< 05:00` (INV-C10) sí aplica. Salida temprana `< 13:55` (INV-C09) **NO aplica** (es `'E'`-only). Verano: fórmula inicio+delta común. | Confirmado por el usuario en pre-work P4. Zero branch nuevo en `EstadoAsistenciaCalculator` ni `CoherenciaHorariaValidator` — `'A'` cae en el branch de `'P'`. Tabla §1.1 de business-rules.md muestra "P o A" en Chat 5. |
| **7** | **Permisos e INV-AD06 / AD08** | **Opción B refinada por el usuario con principio general**: *"ningún rol administrativo corrige asistencia de su propio rol"*. El AA NO puede mutar `TipoPersona = 'A'` (propia ni colega). Jurisdicción sobre `'A'` = `Roles.SupervisoresAsistenteAdmin = {Director, Promotor, Coordinador Académico}`. El AA conserva jurisdicción sobre `'E'` y `'P'` (hereda Plan 21/23). | Principio anti conflicto de interés. Generaliza el patrón ya establecido para profesor (INV-AD06). Enforcement controller-level con autorización condicional por `TipoPersona` del target. Formaliza `INV-AD08` con texto del principio general. |
| **8** | **Alcance persona acotado** | **Solo rol "Asistente Administrativo"**. Director puro, Promotor y Coordinador Académico **NO** entran al scope del Plan 28. | Aclaración detectada por asistente en Chat 1. El pedido literal dice *"asistentes administrativos"* — los otros 3 roles administrativos cumplen funciones distintas (jefatura, relaciones externas, supervisión académica) y su asistencia formal no es parte del requerimiento. Puede extenderse en un Plan futuro si el usuario lo pide. |

### Alcance confirmado post-Chat 1 — inventario 11 vistas

| # | Categoría | Vista/endpoint | ¿Incluir AA? | Razón |
|---|-----------|----------------|-------------|-------|
| 1 | Asistencia (Plan 21+23) | `attendance-director-profesores` + tab "Profesores" admin | ✅ SÍ | Corazón del requerimiento. Tab se renombra o agrega filtro de tipo persona. |
| 2 | Asistencia (Plan 21+23) | Reportes mensual / día puntual / filtrado / consolidado PDF+Excel profesor | ✅ SÍ | Incluye `ReporteFiltradoAsistenciaService` y todos los exportables del inventario §17 que tocan profesores. Badge visible para distinguir AA de Profesor. |
| 3 | Asistencia (Plan 21+23) | Widget home director "Asistencia profesores" | ✅ SÍ | Visibilidad del personal operativo. |
| 4 | Administración | `/intranet/admin/usuarios` filtro `rol = Profesor` | ❌ NO | Filtro por rol de usuario, no reporte. El AA ya se filtra con su propio rol "Asistente Administrativo". Mezclar rompería la semántica. |
| 5 | Administración | Listado de tutores en `/intranet/admin/salones` | ❌ NO | Tutor = profesor con `PRS_EsTutor = true`. El AA no es tutor por definición (Plan 6). Incluirlo mentiría. |
| 6 | Académico | Horarios por profesor | ❌ NO | El AA no dicta horarios formales. Si en el futuro lo hace, aparece naturalmente via `Horario`. |
| 7 | Académico | `ProfesorCurso` (Plan 6) — dicta qué cursos | ❌ NO | El AA no está en `ProfesorCurso`. |
| 8 | Académico | Salones tutoreados | ❌ NO | Mismo criterio que #5. |
| 9 | Comunicación | Bandeja admin de correos — filtro destinatario | ✅ SÍ | Correos de corrección al AA (INV-AD09) deben aparecer. Filtro ampliado o `TipoEntidadOrigen = "AsistenciaAsistenteAdmin"` para separar. |
| 10 | Comunicación | Notificaciones admin enviadas a profesores | ✅ SÍ | Si se envía "a todos los profesores", el AA recibe también (simetría P5 extendido). Filtro `rol = Profesor` se amplía a `rol IN {Profesor, Asistente Administrativo}` en el composer de destinatarios. |
| 11 | Permisos | `/intranet/admin/permisos-usuario` filtro rol Profesor | ❌ NO | Filtro por rol — mismo criterio que #4. |

**Auto-inclusión por P5 = A**: Self-service "Mi asistencia" del AA (tabla mensual + día puntual + widget home). Es reporte de asistencia del propio AA — entra vía generalización del componente profesor (decisión 5).

### Plan de ejecución post-Chat 1 (6 chats confirmados)

| Chat | Alcance | Repo | Tamaño |
|------|---------|------|--------|
| **Chat 1 — `/design`** | ✅ **Cerrado 2026-04-22** — 8 decisiones resueltas. Plan queda inline. | N/A | 1 chat |
| **Chat 2 — BE: modelo + dispatch + queries** | ✅ **Cerrado 2026-04-22** — Migración SQL ejecutada en BD desarrollo (CHECK `('E','P')` → `('E','P','A')`, constraint `CK_AsistenciaPersona_TipoPersona`). 14 archivos de producción tocados: constante `TipoPersona.AsistenteAdmin = "A"` + `Roles.SupervisoresAsistenteAdmin` (subset de Administrativos sin AA) + `AsistenciaRules.TardanzaRegular` extendido a rama P ("A" reutiliza 7:31) + lookup nuevo `GetAsistenteAdminActivoConSedeByDniAsync` en `IAsistenciaRepository`/`AsistenciaRepository` filtrando por `DIR_UsuarioReg = 'Asistente Administrativo'` + `DIR_Estado = 1` + `DIR_DNI_Hash` (discriminador del rol via `DIR_UsuarioReg` confirmado como convención pre-existente del proyecto, no hay columna dedicada `DIR_Rol`) + dispatch extendido en `AsistenciaService.ResolverPersonaAsync` con 3er paso `Profesor → AsistenteAdmin → Estudiante → rechazar` (record `ResolucionPersona` gana campo `Director? AsistenteAdmin`) + rama 'A' en `GetDnisConAsistenciaCompleta/EditadaAsync` + fallback AA en `GetAsistenciaPendientePorDniAsync` + `ListarAsistentesAdminDelDiaAsync` en `AsistenciaAdminQueryRepository` (partial AsistenciaAdminRepository) + `ListarAsistentesAdminParaSeleccionInternalAsync` en `AsistenciaAdminSeleccionRepository` + helper `ContextoAsistenteAdmin` + `AsistenciaAdminEstadisticasDto.TotalAsistentesAdmin/CompletasAsistentesAdmin` + `ContarEditadosDelDiaPorTipoAsync` tupla `(E, P, A)` + log `PreservadosA` en `AsistenciaSyncService`. **Colisión cross-table detectada y resuelta por diseño**: Vivian Canchari existe activa como `DIR_CodID=3` (AA) + `PRO_CodID=4` (Profesor). First-match-wins del dispatch la asigna como `'P'` (Profesor cae primero); los otros 3 AAs (Ricardo/Ray/Diana) son puros. Deuda técnica documentada: `DIR_UsuarioReg` dual-uso (auditoría + discriminador de rol); CodIDs 9-10 duplicados en Director (Medalith Trejo mismo DNI Hash); `AsistenciaService.cs` 456 líneas y `AsistenciaAdminQueryRepository.cs` 346 líneas sobre cap 300 (pre-existente + deuda nueva del chat). **+18 tests BE nuevos** (6 lookup AA, 6 dispatch incluyendo dual Profesor+AA, 6 `TardanzaRegular` con P/A → 7:31 y E/null → 7:46). Baseline 1167 → **1185 verdes**. Commit `feat(asistencia): Plan 28 Chat 2 — add "TipoPersona='A'" for Asistente Admin` en Educa.API branch master. | BE | 1 chat |
| **Chat 3 — BE: reportes + correos + bandeja + notificaciones** | Paridad PDF/Excel extendida a `'A'` (§17 Plan 25): los 14 endpoints pdf/excel que tocan profesores ahora incluyen AA cuando hay data. Badge textual *"Asistente Admin"* en celdas de reportes. Nuevo helper `EnviarNotificacionAsistenciaCorreccionAsistenteAdmin` en `EmailNotificationService`. Bandeja admin: filtro por `TipoEntidadOrigen`. `INotificacionesAdminService` — composer de destinatarios cuando rol filtro = "Profesor" expande a `{Profesor, AsistenteAdmin}`. Tests contract + paridad Excel. | BE | 1 chat |
| **Chat 4 — FE: admin + badge + self-service + widget + notificaciones** | Generalización `attendance-profesor-personal` → `attendance-personal` parametrizado (Input `TipoPersona`). Widget home generalizado. Badge `tag-neutral` para AA (design-system §6). `attendance-director-profesores` incluye tab o filtro para AA. Bandeja admin FE muestra correos AA con tag distinto. Notificaciones admin — composer FE incluye chip "Asistente Administrativo" junto a "Profesor". Nueva ruta `/intranet/asistente-administrativo/me/*` o reuso con guard de rol. Menú `intranet-menu.config.ts` — módulo "Seguimiento" visible para AA. Tests vitest. | FE | 1 chat |
| **Chat 5 — Cierre docs + invariantes** | Formalizar `INV-AD08` e `INV-AD09` en `business-rules.md §15.9`. Ampliar nota cruzada en `INV-AD06` ("principio general que se instancia por rol"). Actualizar tabla §1.1 ventanas horarias con "P o A" en periodo regular. Actualizar §17 (paridad Excel) con referencia a `'A'`. Actualizar `Roles.cs` con constante `SupervisoresAsistenteAdmin`. Mover chat files a `closed/`. | docs | 1 chat |
| **Chat 6 — Gap fix reservado** | Reservado como patrón probado (Plan 27 tuvo Chat 5b y 5c post-cierre para queries/proyecciones que escaparon). Si no se usa, se cierra sin trabajo. | BE+FE | 1 chat (opcional) |

**Total**: 5 chats de trabajo activo + 1 reservado. El Chat 6 es opcional — se abre solo si aparece gap post-cierre Chat 5.

### Reversibilidad

- **`TipoPersona = 'A'`** (decisión 2): revertir CHECK a `('E','P')` + PR que deshace dispatch + queries. Registros `'A'` históricos permanecen en BD (no se eliminan); las queries dejan de mostrarlos. Reversible vía PR + script SQL simétrico.
- **Orden del dispatch** (decisión 3): revertir a `Profesor → Estudiante → rechazar` (orden Plan 21 original). Las marcaciones futuras de AAs vuelven a rechazarse silenciosamente (HTTP 200). Sin data loss.
- **Correos diferenciados** (decisión 4): desactivar helper `EnviarNotificacionAsistenciaCorreccionAsistenteAdmin`. Si se necesita continuar enviando, migrar a helper de profesor o genérico. Sin data loss.
- **Self-service generalizado** (decisión 5): el componente generalizado sigue sirviendo a profesor — no hay que des-generalizar. El AA simplemente deja de verlo si se le revoca permiso.
- **`INV-AD08`** (decisión 7): desactivar la autorización condicional deja a los 4 roles administrativos con poder simétrico sobre `'A'`. Sin data loss, aunque se pierde gobernanza anti-conflicto-de-interés.

### Dependencias y coordinación

- **🔒 Bloqueo duro — Plan 27**: Chat 2 BE no arranca hasta validación del jefe Plan 27 post-deploy. Ambos planes tocan `AsistenciaPersona` + `EmailNotificationService`. PRs simultáneos generarían merge conflicts asegurados. El Chat 1 `/design` ya cerró sin tocar código (no entró en el bloqueo).
- **Coordinación con Plan 22 (cuotas SMTP)**: correos de corrección al AA (INV-AD09) = 4 AAs × N correcciones/mes → despreciable contra el techo 200/h. No requiere ajuste del throttle ni nuevos senders.
- **Coordinación con Plan 26 (rate limit flexible)**: el rol "Asistente Administrativo" ya tiene multiplier 2.5 en `RoleMultipliers` (Chat 1 F2 cerrado 2026-04-22) — no hay riesgo de 429 cuando empiece a usar reportes pesados ni self-service.
- **Coordinación con Plan 27 (INV-C11)**: el filtro `GRA_Orden >= 8` aplica solo a `TipoPersona = 'E'`; `'A'` queda fuera del filtro por construcción. Cubierto en `business-rules.md §1.11` ("OUT: Profesores").
- **Base estable**: Plan 21 (polimórfico) y Plan 23 (admin extensión profesores) ya cerrados. La migración aditiva (CHECK expandido a `'A'`) no rompe registros históricos.

### Checklist pre-Chat 2 `/execute`

```text
[ ] Validación del jefe Plan 27 post-deploy recibida (desbloquea Chat 2)
[ ] Script SQL de verificación cross-tabla DNI preparado: confirmar que ningún DNI activo coexiste en Estudiante + Profesor + Director simultáneamente (heredar de Plan 21 Chat 1 + agregar 3er bucket Director)
[ ] Los 4 DNIs de AAs cargados y activos en tabla Director con rol = "Asistente Administrativo"
[ ] Script SQL migración CHECK constraint preparado: ALTER TABLE AsistenciaPersona + constraint rename + CHECK nuevo ('E','P','A')
[ ] Constante nueva Roles.SupervisoresAsistenteAdmin definida en backend (Director + Promotor + Coordinador Académico)
[ ] Chat file 023-plan-28-chat-2-be-modelo-dispatch-queries.md creado con /next-chat
[ ] Branch feature/plan-28-chat-2-tipo-persona-a creada desde master en Educa.API
[ ] README de Chat 2 con contexto: decisiones 2/3/6/7, archivos esperados, tests esperados
```

### Invariantes a formalizar en Chat 5

| ID | Invariante (texto final) | Enforcement |
|----|--------------------------|-------------|
| `INV-AD08` | **Principio general**: *"ningún rol administrativo corrige asistencia de su propio rol"*. Instancia concreta Plan 28: un usuario con rol "Asistente Administrativo" no puede mutar (crear / editar / justificar / eliminar) registros de `AsistenciaPersona` con `TipoPersona = 'A'`, ya sea la propia o la de un colega AA. Solo los roles administrativos distintos al propio pueden corregir `'A'`: Director, Promotor, Coordinador Académico (`Roles.SupervisoresAsistenteAdmin`). Este principio generaliza `INV-AD06` (profesor no corrige profesor) — extensible a nuevos roles en el futuro. | `AsistenciaAdminController` con autorización condicional por `TipoPersona` del target + tests por reflection (~2 tests: "AA corrige profesor ✓", "AA corrige AA ✗") |
| `INV-AD09` | El correo de corrección de asistencia sobre un registro con `TipoPersona = 'A'` se envía al propio AA (`Director.DIR_Correo` del Director cuyo rol = "Asistente Administrativo"), **nunca al apoderado**. Helper dedicado `EnviarNotificacionAsistenciaCorreccionAsistenteAdmin` con saludo *"Estimado/a asistente administrativo/a"* + `TipoEntidadOrigen = "AsistenciaAsistenteAdmin"` en outbox. Fire-and-forget (hereda INV-S07). | `EmailNotificationService.EnviarNotificacionAsistenciaCorreccionAsistenteAdmin` + `IAsistenciaAdminEmailNotifier` polimórfico por `TipoPersona` |
| Nota cruzada en `INV-AD06` | Agregar al final: *"Este invariante es una instancia del principio general de `INV-AD08`: ningún rol administrativo corrige asistencia de su propio rol."* | Doc-only (business-rules.md §15.9) |
| Extensión §17 Plan 25 | Los 14 reportes PDF/Excel que hoy muestran profesores también deben mostrar AAs cuando haya data. Paridad fila-a-fila preservada (INV-RE01). Badge textual en celda distingue "Profesor" de "Asistente Admin". | Tests `*ExcelEndpointTests.cs` + tests de presencia de fila AA en el inventario §17 |

---

## 🔴 Plan 27 — Filtro temporal de asistencia diaria por grado (5to Primaria en adelante)

> **Origen**: Requerimiento del usuario 2026-04-22. **MÁXIMA PRIORIDAD**.
> **Plan**: inline en este maestro. El diseño cupo en 1 chat de `/design` — **no se promueve** a archivo dedicado.
> **Estado**: 🟢 **Chats 1-5 + 5b + 5c ✅ cerrados 2026-04-22** — diseño + BE + FE + documentación + gap fix completos. Chat 4 incluyó BE mínimo (`GraOrden` en DTOs self-service, commit `a967e21`, 1155 verdes) + FE completo (scope constants + banner admin + per-student notice + widget home verificado, commit `3c5061e`, 1507 verdes). Chat 5 formalizó `INV-C11` en `business-rules.md §1.11` + fila en §15.4. Chat 5b cerró 2 huecos de filtro en `ConsultaAsistenciaRepository` (endpoints de stats profesor/director) + `SalonProfesorDto.GraOrden` + notice FE profesor en tabla mensual/día y widget home. Chat 5c cerró el último hueco `INV-C11` en el envío masivo de correos admin (`AsistenciaAdminBulkEmailService` + `AsistenciaEmailDataRow.GraOrden` vía subquery INV-D09 en `AsistenciaAdminRepository.GetEmailDataByIdsAsync`/`GetEmailDataByIdAsync`). Baselines finales: BE **1167** + FE **1509**. **Solo pendiente validación del jefe post-deploy** para archivar el plan en `history/planes-cerrados.md`.
> **Validación**: Diseño validado por el usuario. El resultado final (post-deploy) requiere OK del jefe — Chat 5 de cierre no se considera definitivo hasta esa validación.

### Qué se quiere

De forma **temporal**, el colegio deja de contemplar a estudiantes de **Inicial a 4to de Primaria** (`GRA_Orden ≤ 7`, según §5.1 de `business-rules.md`) en el flujo de **asistencia diaria CrossChex** y en los **correos relacionados**. Solo se mantiene el flujo completo para estudiantes de **5to de Primaria en adelante** (`GRA_Orden ≥ 8`).

**Mapeo de grados confirmado con la BD real** (Chat 1, 2026-04-22):

| `GRA_Orden` | Grado              | Estado en Plan 27       |
|-------------|--------------------|-------------------------|
| 1-3         | Inicial 3/4/5 años | ❌ Excluido              |
| 4-7         | 1ro-4to Primaria   | ❌ Excluido              |
| **8**       | **5to Primaria**   | ✅ **Límite inferior**   |
| 9           | 6to Primaria       | ✅ Incluido              |
| 10-14       | 1ro-5to Secundaria | ✅ Incluido              |

Primaria tiene **6 grados** (orden 4-9), no 5. El umbral `UMBRAL_GRADO_ASISTENCIA_DIARIA = 8` coincide circunstancialmente con `UMBRAL_TUTOR_PLENO = 7` (decisión 10 de Chat 1: mantener separadas — conceptualmente distintas).

### Qué entra en el alcance (IN)

- Webhook CrossChex (`AsistenciaService.RegistrarAsistencia` tras el dispatch polimórfico, rama `TipoPersona = 'E'`).
- Admin `/intranet/admin/asistencias` — listados, stats, correcciones formales, justificaciones, exportaciones.
- Reportes de **asistencia diaria** (`ReporteAsistencia*Service`, `ConsultaAsistenciaService`, endpoints `/pdf` + `/excel`).
- Correos de asistencia (de marcación en tiempo real y de corrección formal — INV-AD05 — para estudiantes; apoderados de `GRA_Orden < 8` dejan de recibirlos mientras dure la restricción).
- Self-service estudiante / apoderado — vistas de "Mi Asistencia" / "Asistencia de mi hijo" para grados afectados.

### Qué NO entra en el alcance (OUT)

> El usuario fue explícito: **"no aplica a más áreas"**. Confirmar en Chat 1 que cada uno de estos NO se toca.

- Calificaciones (§3), aprobación y progresión (§4), periodos académicos (§9, §14.4).
- Horarios (§6).
- **Asistencia por curso** (§2) — modelo independiente; profesor sigue marcando `P/T/F` en clase.
- Matrícula y pagos (§14.2).
- **Profesores** (Plan 21) — su flujo polimórfico `TipoPersona = 'P'` no se toca; sigue operando normal.
- Datos históricos — se preservan. El filtro opera sobre reads y sobre writes nuevos, no borra nada.

### Decisiones tomadas en Chat 1 (`/design` ✅ 2026-04-22)

**Preguntas bloqueantes (pre-decisiones)**:

- **Umbral definitivo**: `GRA_Orden >= 8` (5to Primaria en adelante). Validado contra tabla `Grado` real de BD.
- **Duración**: indefinida — justifica **constante** hardcoded, no AppSetting.
- **Validación**: diseño validado por el usuario; resultado final post-deploy validado por el jefe (Chat 5 no se cierra hasta su OK).

**Las 10 decisiones de diseño**:

| # | Tema | Decisión |
|---|------|----------|
| 1 | Mecanismo de gating | **Constante en código** `UMBRAL_GRADO_ASISTENCIA_DIARIA = 8` en `Constants/Asistencias/AsistenciaConstants.cs` con comentario explícito (fecha, razón, cómo revertir) |
| 2 | Webhook CrossChex | **Descartar silencioso** — agregar `MarcacionAccion.IgnorarGradoFueraAlcance` en `CoherenciaHorariaValidator` (patrón molde INV-C10). Log `Information` con DNI enmascarado (`DniHelper.Mask()`) + `GRA_Orden`. HTTP 200 al dispositivo. Aplica a periodo regular y verano |
| 3 | Admin UI | **Banner fijo** (no dismissible) en `/intranet/admin/asistencias`. Texto: *"Asistencia diaria limitada temporalmente a estudiantes de 5to Primaria en adelante. Los grados inferiores no tienen dispositivo biométrico asignado."* Colores `--blue-100` fondo + `--blue-800` texto. **Nota en PDF/Excel**: `"Datos filtrados: GRA_Orden ≥ 8"` en header de cada reporte |
| 4 | Correos | **Early-return a nivel negocio** en `EmailNotificationService.EnviarNotificacionAsistencia*`. El outbox queda genérico (no sabe de reglas de grado). Cubre ambos tipos de correo: marcación en tiempo real y corrección formal admin (INV-AD05) |
| 5 | Self-service estudiante/apoderado | **Opción B** — mostrar ruta con mensaje *"La asistencia diaria está suspendida temporalmente para este grado. Las evaluaciones y asistencia por curso continúan normalmente."* **Apoderado con hijos mixtos**: mensaje **por-hijo** (si uno es `GRA_Orden=5` y otro `GRA_Orden=10`, se muestra data del segundo + mensaje para el primero) |
| 6 | Correcciones admin sobre registros históricos | **Opción A** — permitir edición/justificación de registros existentes. Los writes nuevos del webhook se bloquean, pero admin mantiene control sobre data histórica (crítico por INV-AD03 de cierres mensuales). **Consecuencia: NO se introduce `INV-AD07`** |
| 7 | Reportes históricos PDF/Excel | **Filtrar uniforme** — todos los reportes generados desde el sistema aplican `GRA_Orden ≥ 8`, incluidos periodos cerrados. Sin endpoint de escape. Si se requiere histórico completo: consulta SQL directa |
| 8 | Alcance extendido | **Widget "Asistencia de Hoy" (home)**: aplicar filtro (numerador y denominador, 47% → ~90%). **Búsqueda de estudiantes**: NO filtrar (el estudiante sigue existiendo para perfil/calificaciones/matrícula). **Reportes cross-módulo**: nota *"Asistencia diaria filtrada: GRA_Orden ≥ 8"* en footer |
| 9 | Nombre de la constante | `UMBRAL_GRADO_ASISTENCIA_DIARIA` (alineado con `UMBRAL_TUTOR_PLENO`). Comentario adjunto obligatorio (ver bloque abajo) |
| 10 | Consolidar con `UMBRAL_TUTOR_PLENO` | **Mantener SEPARADAS**. Conceptualmente distintas (tutor pleno vs CrossChex). Coincidir hoy es accidente del modelo educativo. Comentario cruzado documenta la coincidencia |

**Comentario obligatorio de la constante** (para Chat 2):

```csharp
// Plan 27 — 2026-04-22 — Filtro temporal de asistencia diaria CrossChex.
// Solo estudiantes con GRA_Orden >= UMBRAL_GRADO_ASISTENCIA_DIARIA (8 = 5to Primaria) se registran.
// Los grados inferiores no tienen biométrico asignado.
// Revertir: bajar a 1 cuando el colegio reincorpore grados bajos.
// Ver: business-rules.md §1 + INV-C11.
// NO consolidar con UMBRAL_TUTOR_PLENO (7): conceptos distintos, coincidencia circunstancial.
public const int UMBRAL_GRADO_ASISTENCIA_DIARIA = 8;
```

### Plan de ejecución (confirmado post-Chat 1)

| Chat | Alcance | Repo | Tamaño |
|------|---------|------|--------|
| **Chat 1 — /design** | ✅ **Cerrado 2026-04-22** — 10 decisiones acordadas | N/A | 1 chat |
| **Chat 2 — BE: webhook + admin queries + correos** | ✅ **Cerrado 2026-04-22** — `UmbralGradoAsistenciaDiaria = 8` en `Constants/Asistencias/AsistenciaGrados.cs` + `MarcacionAccion.IgnorarGradoFueraAlcance` en `CoherenciaHorariaValidator.Clasificar(..., int? graOrden)` + lookup `GetGraOrdenEstudianteActivoAsync` en `IAsistenciaRepository` + `IAsistenciaAdminRepository` + guard en `AsistenciaService.ClasificarYRegistrarMarcacionAsync` (rama E) con log `Information` + `DniHelper.Mask()` + filtros `GRA_Orden >= 8` en `ConsultaAsistenciaRepository` (3 queries) + `AsistenciaAdminQueryRepository` (listar día estudiantes + estadísticas, profesores intactos) + early-return opcional `int? graOrden = null` en `EmailNotificationService.EnviarNotificacionAsistencia` y `EnviarNotificacionAsistenciaCorreccion` + propagación via `PersonaAsistenciaContext.GraOrden` → `IAsistenciaAdminEmailNotifier`. **11 tests BE nuevos** (3 validator, 3 service, 5 email). Baseline 1097 → **1130 verdes**. | BE | 1 chat |
| **Chat 3 — BE: reportes + tests** | ✅ **Cerrado 2026-04-22** — `AsistenciaGrados.NotaReportePlan27` constante + filtro `GRA_Orden >= 8` aplicado en las 3 queries de `ReporteAsistenciaRepository` (`ObtenerSalonesActivosAsync` / `ObtenerEstudiantesConAsistenciaDiaAsync` / `ObtenerEstudiantesConAsistenciaRangoAsync`) + helper `AsistenciaPdfComposer.ComposeNotaPlan27` (PDF) + `ExcelHelpers.EscribirNotaPlan27` (Excel) + nota aplicada en headers de los 6 reportes de estudiantes (3 PDF consolidado + 1 PDF salón + 1 PDF filtrado + 3 Excel paralelos). Reportes solo-profesor mantenidos sin filtro (INV-C11 no aplica). Split `ReporteAsistenciaConsolidadoPdfService.cs` → `.Headers.cs` para respetar cap 300 ln. **16 tests nuevos** (10 `ReporteAsistenciaRepositoryPlan27Tests` + 2 `ReporteAsistenciaConsolidadoExcelServiceTests` nota + 2 `ReporteAsistenciaSalonExcelServiceTests` nota + 2 `AsistenciaExcelServiceTests` paridad E/P). Baseline 1133 → **1149 verdes**. | BE | 1 chat |
| **Chat 4 — FE: admin + self-service + widget home** | ✅ **Cerrado 2026-04-22** — BE complementario commit `a967e21` (`ResumenAsistenciaDto.GraOrden` + `HijoApoderadoDto.GraOrden` + `ObtenerGraOrdenEstudianteAsync` en `IConsultaAsistenciaRepository`, +7 tests, 1130 → 1155 verdes). FE commit `3c5061e`: `@shared/constants/attendance-scope` con `UMBRAL_GRADO_ASISTENCIA_DIARIA = 8` + catálogo `GRADO_ORDEN_MAP` + helpers `esGradoAsistenciaDiaria` / `resolverGraOrden`. `AttendanceScopeBannerComponent` (presentational, OnPush) en `/intranet/admin/asistencias` cubre ambas tabs (gestión + reportes). `AttendanceScopeStudentNoticeComponent` reutilizado en `attendance-estudiante` (consume `resumen.graOrden`) y `attendance-apoderado` (por `selectedHijo().graOrden`; selector de hijos sigue activo para mixtos). Widget `AttendanceSummaryWidgetComponent` verificado sin cambios — ya consume `getEstadisticasDirector` que el BE filtró en Chat 2; tests agregados fijan el contrato. +26 tests FE (11 scope constants + 4 banner + 5 notice + 3 estudiante + 4 apoderado + 2 widget). Baseline 1481 → **1507 verdes**. Lint limpio + build OK. | BE+FE | 1 chat |
| **Chat 5 — Cierre** | ✅ **Cerrado docs 2026-04-22** — `business-rules.md §1.11 "Filtro temporal por grado"` agregada (qué, por qué, dónde aplica/no aplica, fuente de verdad con doble constante BE+FE, reversibilidad). Fila `INV-C11` insertada en §15.4 tras `INV-C10` con mapa de enforcement completo. Chat file 020 movido a `closed/` | FE | 1 chat |
| **Chat 5b — Gap fix** | ✅ **Cerrado 2026-04-22** — 2 queries de `ConsultaAsistenciaRepository` detectadas sin filtro post-docs (`ObtenerEstudiantesPorGradoConAsistenciasAsync` monthly + `ObtenerEstudiantesPorDiaAsync` día puntual) que alimentaban tabla/día de profesor/director. Fix BE: filtro `GRA_Orden >= 8` aplicado + `SalonProfesorDto.GraOrden` + ambos métodos que lo proveen lo llenan. Fix FE: `salonFueraAlcance` computed en `attendance-profesor-estudiantes` (tabla mensual + día) + `profesor-attendance-widget` del home; reutiliza `AttendanceScopeStudentNoticeComponent` del Chat 4 con el `nombreSalon` como sujeto. BE 1155 → **1161** (+6 tests). FE 1507 → **1509** (+2 tests). Docs §1.11 + §15.4 actualizadas con conteo final (4 queries en `ConsultaAsistenciaRepository`) + nueva fila "Vistas profesor" en el alcance IN | BE+FE | 1 chat |
| **Chat 5c — Gap fix bulk email** | ✅ **Cerrado 2026-04-22** — último hueco `INV-C11` detectado en la auditoría post-Chat 5b: el endpoint admin `POST /api/AsistenciaAdmin/correos-masivos` (servicio `AsistenciaAdminBulkEmailService.EnviarCorreosMasivosAsync`) leía la proyección dedicada `AsistenciaEmailDataRow` desde `AsistenciaAdminRepository.GetEmailDataByIdsAsync`, que no incluía `GraOrden`, así que las 2 invocaciones a `IEmailNotificationService.EnviarNotificacionAsistencia` pasaban `null` y el early-return del filtro nunca disparaba. Fix BE: `AsistenciaEmailDataRow` gana campo `int? GraOrden`; `GetEmailDataByIdsAsync` y `GetEmailDataByIdAsync` (singular, deadcode mantenido por simetría) agregan subquery correlacionada contra `EstudianteSalon + Salon + Grado` filtrada por `ESS_Estado=true && SAL_Estado=true && SAL_Anio=anioActual` (INV-D09); el service propaga `asistencia.GraOrden` en las 2 invocaciones (entrada + salida). **+6 tests BE** (`AsistenciaAdminRepositoryPlan27Tests` con 4 casos — salón activo / null INV-D09 / grado bajo umbral / singular + `AsistenciaAdminBulkEmailServicePlan27Tests` con 2 casos — propaga valor real y null). Baseline 1161 → **1167 verdes**. FE sin cambios (1509 verdes). Docs §1.11 "Dónde se aplica" tabla "Correos" + §15.4 fila `INV-C11` actualizadas sumando `AsistenciaAdminBulkEmailService.EnviarCorreosMasivosAsync` al enforcement. **Pendiente validación del jefe post-deploy** para archivar Plan 27 en `history/planes-cerrados.md` | BE+FE (docs) | 1 chat |

**Total confirmado**: 7 chats (1 `/design` ✅ + 3 `/execute` BE + 1 cierre docs + 2 gap fix BE+FE).

### Invariantes a formalizar en Chat 5

| ID | Invariante | Enforcement |
|----|-----------|-------------|
| `INV-C11` | Marcaciones CrossChex de estudiantes con `GRA_Orden < UMBRAL_GRADO_ASISTENCIA_DIARIA` se descartan silenciosamente (log `Information`, sin registro). Aplica a periodo regular y verano mientras la constante esté en 8. Revertir = bajar la constante | `CoherenciaHorariaValidator.Clasificar` → `MarcacionAccion.IgnorarGradoFueraAlcance`, consumido por `AsistenciaService.RegistrarAsistencia` rama estudiante |
| ~~`INV-AD07`~~ | **DESCARTADO** (decisión 6 de Chat 1 = A). Admin mantiene control sobre writes de registros históricos | — |

### Reversibilidad (sin cambios respecto al diseño inicial)

Plan diseñado para ser **completamente reversible**:

1. PR que cambia `UMBRAL_GRADO_ASISTENCIA_DIARIA` de `8` a `1` (o al valor nuevo que defina el colegio).
2. Deploy BE — la próxima marcación de CrossChex ya crea registros para los grados reincorporados.
3. (Opcional) Job de "catch-up" si el colegio quiere generar estados `F` para los días que pasaron sin captura. No es obligatorio: el flujo normal de `F` por ausencia requiere que el día haya terminado sin marcación, y eso ya lo calcula `EstadoAsistenciaCalculator` para fechas futuras.
4. Emails retoman su flujo normal sin cambios de código adicionales.

**No se eliminan datos históricos.** Los registros que ya existen en `AsistenciaPersona` de grados afectados siguen en BD; los endpoints filtran pero no borran. Consultas SQL directas siguen mostrándolos.

### Dependencias y coordinación

- **Ninguna dura** — Chat 2 puede arrancar inmediatamente.
- **Positivo para Plan 22 (cuota SMTP)**: al reducir volumen de correos por estudiante fuera de alcance, baja la presión sobre el techo 200/h por dominio. Si el monitoreo post-deploy de Plan 22 mostraba picos, Plan 27 los suaviza.
- **No interfiere con Plan 24** (sync CrossChex en background): el job sigue trayendo marcaciones; el filtro opera aguas abajo en `AsistenciaService.RegistrarAsistencia`. Si el job procesa 100 marcaciones de un estudiante `GRA_Orden = 5`, las 100 se descartan silenciosamente — sin registros, sin correos, sin 429.
- **No interfiere con Plan 26** (rate limit): dominio distinto.
- **Alineado con Plan 21** (asistencia polimórfica): el dispatch ya separa `TipoPersona E/P`. El filtro se aplica solo en la rama `E` después del dispatch; la rama `P` (profesores) queda intacta.

### Prioridad y descongelamiento de otros frentes

Chat 1 cerrado → **los congelamientos se levantan**. Otros frentes pueden avanzar en paralelo según capacidad:

- Plan 22 (F4 y F5.6 BE pendiente).
- Plan 26 F2 Chat 2 (aplicar overrides a 14+2 endpoints).
- Design System F5.3.
- Carril D Olas 2+.

Plan 27 mantiene prioridad **alta** — Chats 2-5 no deben perder tracción hasta cerrar.

### Checklist pre-inicio Chat 2 `/execute` BE

```text
[x] Chat 1 /design cerrado con 10 decisiones acordadas
[x] Umbral confirmado: GRA_Orden >= 8 (5to Primaria)
[x] Mecanismo confirmado: constante (no AppSetting)
[x] Comunicación UI confirmada: banner fijo + nota en PDF/Excel
[x] Alcance confirmado: webhook + admin queries + correos + reportes + self-service + widget home + NO búsqueda
[x] Invariante nuevo definido: INV-C11. INV-AD07 descartado
[x] Chat file 016 movido a .claude/chats/closed/
[x] Prompt de Chat 2 generado (/next-chat → 017)
[x] Chat 2 cerrado 2026-04-22 — BE implementado, 1130 tests verdes
```

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

## Bloqueos activos (qué desbloquea qué)

> Lectura rápida para elegir próximo chat. Complementa al diagrama de dependencias.

| Si cierro… | Desbloqueo… | Por qué |
|------------|-------------|---------|
| 🔴 **Plan 27 Chat 1 (/design)** | **Resto de frentes** (Plan 22 F4, Plan 26 F2 Chat 2, Design System F5.3, Carril D Ola 2+) | **Congelamiento explícito** hasta tener el diseño de filtro por grado aprobado. Sin Chat 1, no se abren chats nuevos en otros planes |
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

**Ola 1 — Terminar Plan 12 F1 (cerrar lo iniciado)** ✅ CERRADA (2026-04-18) — archivada en [history/planes-cerrados.md](../history/planes-cerrados.md#ola-1-carril-d--terminar-plan-12-f1--cerrada-2026-04-18).

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

#### Plan 11 — Refactor `eslint.config.js` ✅ 100% (archivado 2026-04-22)

Ver [history/planes-cerrados.md](../history/planes-cerrados.md#plan-11).

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

- [~] **F2 — B + C (multiplier por rol + modifier por endpoint)** (2 chats, BE) — **Chat 1 ✅ cerrado 2026-04-22 (máquina del multiplier). Chat 2 ✅ cerrado 2026-04-22 (overrides aplicados en 10 controllers). F2.6 ⏳ observación post-deploy.**
  - [x] F2.0 ✅ 2026-04-22 — Parche C del Chat 2 revertido: `heavy` vuelve a 5/min, comentario citando Plan 26 F2 Chat 1 reemplaza el "parche temporal". Sigue funcional sin resolver para no alterar los 14 controllers de Plan 25 que aún la usan; F2 Chat 2 los migra a `reports`/`batch`.
  - [x] F2.1 ✅ 2026-04-22 — `[RateLimitOverride(policyName, multiplier)]` (`Educa.API/Attributes/`) + lectura por reflection con cache `ConcurrentDictionary<Endpoint, RateLimitOverrideAttribute?>` en el resolver.
  - [x] F2.2 ✅ 2026-04-22 — `RateLimitPartitionResolver` (`Educa.API/RateLimiting/`) extrae `rol` (`ClaimTypes.Role`) + `userId` (`EntityId`) del `ClaimsPrincipal`, aplica `RoleMultipliers.GetMultiplier(rol)`, combina con override de endpoint, clampa a Cap 5x y devuelve `RateLimitPartition.GetFixedWindowLimiter` con partition key `policy:rol:userId:effective` (incluir `effective` separa ventanas cuando dos endpoints tienen overrides distintos).
  - [x] F2.3 ✅ 2026-04-22 — `RoleMultipliers.cs` con valores aprobados: Director 3.0 · Asistente Admin / Promotor / Coordinador Académico 2.5 · Profesor 2.0 · Apoderado / Estudiante / anónimo 1.0. `Cap = 5.0` aplicado en `ResolveEffectiveLimit` (no espera a F3). Lookup case-insensitive vía `Roles` constants.
  - [x] F2.4 ✅ 2026-04-22 — **39 instancias** de `[EnableRateLimiting("heavy")]` migradas a `reports` (31) / `batch` (8) en 10 controllers. `[RateLimitOverride("reports", 2.0)]` aplicado en **28 endpoints** de reportes (`ConsultaAsistencia` 22 + `BoletaNotas` 4 + `ReportesAsistencia` 2 — cubre los 14 del Plan 25 + los nuevos desde entonces). `[RateLimitOverride("reports", 3.0)]` aplicado en `ReportarError` de `/api/sistema/errors` (`[AllowAnonymous]` POST sobrecargado según F1: 5/16 rechazos) y en `Listar` + `Stats` de `/api/sistema/rate-limit-events`. `UsuariosController.ExportarCredenciales` → `reports` sin override (15/min para Director es suficiente). `heavy` queda registrada en `RateLimitingExtensions.cs` sin consumidores — comentario actualizado a "eliminar en F5". **Cap a considerar en F5**: dividir `ConsultaAsistenciaController` (863 líneas, excede 300) como deuda técnica.
  - [x] F2.5 ✅ 2026-04-22 — Tests: 28 unit (`RoleMultipliersTests`, `RateLimitPartitionResolverTests`) + 6 de integración con `TestServer` real + `TestAuthHandler` reusable (`Educa.API.Tests/Helpers/Auth/`). Casos cubiertos: cuota base por rol, override por endpoint, cap 5x al exceder, anónimo por IP, regresión de `heavy` (sigue 5/min plano sin resolver). Suite completa BE: **1097/1097 verdes** (baseline 1063 + 34 nuevos). **Chat 2 agrega** `Plan26F2Chat2RateLimitContractTests.cs` con **22 tests por reflection** que validan que cada controller migrado tiene la policy + override correctos (override 3.0 en `/api/sistema/errors`, `/api/sistema/rate-limit-events`; override 2.0 en los endpoints de reportes; `batch` en imports/uploads/batch ops; regresión: ningún controller usa ya `heavy`). Suite completa BE post-Chat 2: **1119/1119 verdes**.
  - [~] F2.6 Verificar con telemetría F1 que las 429 caen en los roles/endpoints esperados. **Dato ya capturado** (Chat 2, primera sesión admin): top endpoint `/api/sistema/errors` con 5/16 rechazos — motivó el override 3.0 en F2.4. **Pendiente**: revisar `/intranet/admin/rate-limit-events` 1-2 semanas post-deploy para confirmar que los 429 restantes corresponden a roles sin holgura (Estudiante, Apoderado) y no a Director/Admin en flujos normales.
  - **Entregable Chat 1**: máquina del multiplier lista (atributo + resolver + policies `reports` y `batch`). Aún no aplicada a endpoints reales. **Entregable Chat 2**: Director/Asistente Admin ya no chocan con límite en uso normal (ej: exportar 8-10 reportes seguidos) gracias a `[RateLimitOverride]` aplicado en los 28 endpoints de reportes + 3 endpoints de observabilidad admin.

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

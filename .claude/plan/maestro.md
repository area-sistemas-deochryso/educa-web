# Plan Maestro — Orden y Dependencias

> **Fecha**: 2026-04-14 (última revisión: 2026-04-22, **🔴 Plan 29 nuevo — MÁXIMA PRIORIDAD** — descubierto 2026-04-22 en investigación de correos fallidos `261ochapa@gmail.com`: cPanel/Exim bloquea el dominio entero durante 60 min cuando llega a **5 defers+fails/h por dominio** (`max_defer_fail_percentage`). Es un techo separado de los 50/h buzón / 200/h dominio / 300/h cuenta documentados en `project_smtp_limits.md`. CrossChex está mandando desde SMTP compartido con correos inválidos de su lista interna → agota el contador → todos los correos legítimos de Educa se descartan silenciosamente. **Plan 29 inline** con 4 chats: pre-filtro + blacklist + corte SMTP CrossChex + docs INV-MAIL01/02/03. Plan 22 Chat B (widget) se posterga hasta cerrar Plan 29. **Plan 28 Chat 2 BE ✅ cerrado** — modelo polimórfico `'A'` + dispatch 3 pasos + queries admin extendidas + migración SQL ejecutada. +18 tests BE, 1185 verdes. Plan 27 Chat 5c ✅ cerrado — pendiente solo validación del jefe post-deploy)
> **Objetivo**: Ordenar los 11 planes dispersos entre `educa-web/.claude/` y `Educa.API/.claude/` en una secuencia con dependencias explícitas.
> **Principio rector** (actualizado 2026-04-16): "Features primero — el enforcement y la arquitectura son valiosos solo si soportan funcionalidad real. La deuda técnica se paga en paralelo, no como prerrequisito."
>
> 🛠️ **Meta-tooling 2026-04-27** (chat 054, en `awaiting-prod/`): bucket nuevo `chats/awaiting-prod/` + comando `/verify <NNN>` para resolver el bottleneck de chats con verificación post-deploy pendiente. `/end` ahora pregunta gate post-deploy. Backlogs pasaron de 6 a 7. 9 briefs backfilled de `closed/` → `awaiting-prod/`. Hook `backlog-check.sh` cuenta el bucket y dispara aviso si excede 8. Ver [rules/backlog-hygiene.md](../rules/backlog-hygiene.md) y [commands/verify.md](../commands/verify.md).

---

## Inventario de planes (13)

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
| 22 | Endurecimiento correos de asistencia | BE+FE | `Educa.API/.claude/plan/asistencia-correos-endurecimiento.md` | 🟢 **CERRADO 100% 2026-04-23** · **Chats 1 (F1) + 2 (F2) + 3 (F3.BE) + A (F5+F6) + A-cierre ✅ cerrados 2026-04-21** · **Chat B throttle-widget ✅ cerrado 2026-04-22** · **Chat B defer-fail-widget ✅ cerrado 2026-04-23** · **Chat 5 F4.BE ✅ cerrado 2026-04-23** · **Chat 6 F4.FE ✅ cerrado 2026-04-23**. **Chat 6 F4.FE (2026-04-23)**: pantalla admin read-only `/intranet/admin/auditoria-correos` con feature flag `auditoriaCorreos` (OFF prod, ON dev) + entrada menú Sistema → Monitoreo. Consume `GET /api/sistema/auditoria-correos-asistencia` del Chat 5 BE (commit `a1082eb`). Arquitectura Facade + Store + Service — store con filtros client-side (tipo + search por nombre/dni/correo) + stats del universo completo (NO se recalculan al filtrar). 9 archivos nuevos: 1 page smart + 4 sub-componentes presentacionales (stats con 4 cards total/estudiantes/apoderados/profesores, filters con search+select+clear, table con columnas UPPERCASE + tags neutral/danger/warn + empty state diferenciado por filtros activos, skeleton reusando `<app-stats-skeleton>` + `<app-table-skeleton>`) + models (DTO 1:1 camelCase con BE + tipo semántico `TipoOrigenAuditoria` + `TIPO_FALLO_LABEL`/`SEVERITY` maps) + service + store + facade. Banner informativo B9 con `color-mix(in srgb, --blue-500 12%, transparent)` explicando caracteres invisibles. Navegación desde tabla: opción B (clipboard + toast + navigate to `/admin/usuarios`) — `/admin/usuarios` no acepta query params hoy y el DNI viene enmascarado (no sirve para prefiltrar). Guard SSR en `copyToClipboard` (`typeof navigator === 'undefined'`). Permiso `ADMIN_AUDITORIA_CORREOS` agregado al registry. Feature flag agregado a ambos environment. Ruta con spread condicional + `permissionsGuard` heredado del layout. **+16 tests** (7 store + 7 facade + 2 stats component) → **1535 FE verdes** (baseline 1519). Escape hatch `max-lines` justificado en `intranet.routes.ts` (309 líneas tras el nuevo spread; refactor transversal a `intranet-admin.routes.ts` diferido como deuda técnica menor). Lint + build OK. **Plan 22 cerrado al 100%**. **Chat 5 F4.BE (2026-04-23)**: endpoint admin `GET /api/sistema/auditoria-correos-asistencia` (commit `a1082eb` en Educa.API `master`) con `[Authorize(Roles = Roles.Administrativos)]` a nivel clase. Repository con 3 queries `AsNoTracking()` sobre `Estudiante` / `Apoderado` / `Profesor` activos con correo no vacío (filtra `_Estado = 1`, INV-D03), proyecta al record interno `AuditoriaCorreoFuente` con DNI y correo crudos. Service combina el repo con `EmailValidator.Validate()` en memoria — mismo validador que `EmailOutboxService.EnqueueAsync` (INV-MAIL01) — y retorna solo los inválidos enmascarando DNI vía `DniHelper.Mask()` (`***1234`) + correo vía helper privado `MaskEmail` (`pa***añ@gmail.com` para local ≥ 4 chars; `***@dominio` para local < 4; `***` para correos sin `@`). DTO `AuditoriaCorreoAsistenciaDto` con `TipoOrigen/EntidadId/Dni/NombreCompleto/CorreoActual/TipoFallo/Razon`. Orden determinista `TipoOrigen ASC, EntidadId ASC`. Respuesta envuelta en `ApiResponse<List<AuditoriaCorreoAsistenciaDto>>.Ok()` (INV-D08). Pre-work SQL (universo 192 filas: 180 Estudiante + 0 Apoderado + 12 Profesor) confirmó que no necesita paginación ni ahora ni tras la duplicación gradual esperada (~400). Sample query 3 confirmó casos reales de caracteres invisibles (zero-width space, NBSP) que el ojo no detecta pero SMTP rechaza — justifica el endpoint. DI registrado en `RepositoryExtensions.AddRepositories` + `ServiceExtensions.AddApplicationServices` (mismo pattern que `IEmailOutboxStatusService`). `Program.cs` intacto. **+21 tests BE** (11 service integration con `TestDbContextFactory` cubriendo válido/inválido/null/vacío/inactivo por tipo + universo sano + orden + zero-width space real; 10 authz por reflection — 4 roles admin pass + 3 no-admin rejected + route + HttpGet) → **1295 BE verdes** (baseline 1274). Cap 300 líneas respetado (max 277 en test del service). **Chat B defer-fail-widget (2026-04-23)**: widget FE `<app-defer-fail-status-widget>` complementario al throttle — consume `GET /api/sistema/email-outbox/defer-fail-status` (Plan 29 Chat 2.6 BE, commit `7b2a962`). Renderiza 3 secciones: (1) hora actual vs techo cPanel (`DeferFailCount/Threshold + PercentUsed%` con semáforo OK/WARNING/CRITICAL del BE — badge con icono check/exclamation-triangle/ban + tinte del border/background por nivel via color-mix), (2) breakdown 24h por `EO_Estado` + `EO_TipoFallo` con 8 stats tipificados (ok/info/retry/cpanel/pre-smtp — pre-SMTP con border dashed para diferenciar que no cuentan para cPanel), (3) resumen blacklist por `EBL_MotivoBloqueo` (4 motivos + oldest/newest). Guard `isProbableTelemetryFailure()` muestra banner sutil cuando el BE devuelve CRITICAL con todos los counters en 0 (probable fallback INV-S07). Polling opcional 60s togglable (switch + botón refresh + colapsable) espejando el patrón del throttle. Preferencias `emailOutboxDeferFailWidget` (feature flag OFF prod, ON dev) + `deferFailWidgetAutoRefresh/Collapsed` persistidas via `StorageService`/`PreferencesStorageService` con keys propias. Modelos TS 1:1 al DTO BE: `DeferFailStatus` + `DeferFailStatusLevel` + 3 sub-interfaces. Data facade reusa estructura del throttle (hidratación preferencias → `loadDeferFailStatus()` → polling 60s con `setInterval` + cleanup en `destroyRef.onDestroy`). **+10 tests FE** (loading, OK/WARNING/CRITICAL render, breakdown 24h, blacklist vacía, banner telemetría, refresh/toggle/collapse outputs) → **1519 FE verdes** (baseline 1509). Lint + build OK. **Chat B throttle-widget (2026-04-22)**: endpoint BE `GET /api/sistema/email-outbox/throttle-status` con `EmailOutboxMonitoringService` que orquesta `IQuotaThrottleService.CheckQuotaAsync` por sender + 1 query de dominio `AsNoTracking()` sobre índice `IX_EmailOutbox_FechaEnvio_Sent` (Chat A). Emails enmascarados en BE (`sistemas@***.com`) antes de devolverse al cliente. Widget FE `<app-throttle-status-widget>` presentacional (OnPush, inputs/outputs) integrado en `/intranet/admin/bandeja-correos` entre chart y filtros: 7 cards per-sender + 1 card full-width de dominio con severity por ratio count/limit (success/info/warn/danger). Polling opcional 30s togglable (switch PrimeNG + botón refresh manual + colapsable). Preferencias `emailOutboxThrottleWidget` (feature flag OFF prod, ON dev) + `throttleWidgetAutoRefresh/Collapsed` persistidas via `StorageService`. **+10 tests BE** (5 service + 5 reflection authz, `1063 tests verdes`) · **+12 tests FE** (6 widget + 6 facade polling con vitest fake timers, `1478 tests verdes`) · lint + build OK en ambos repos. **Chat A cierre (2026-04-21)**: build limpio · 1053 tests · 4 scripts SQL (11 + 2789 filas) · commits `a2f4bfd` (BE) + `b0c5832` (FE) · INV-AD05 sin BCC. **Chat A (F5+F6 merged)**: techo 50/h → 200/h con 7 buzones, sliding window 60 min, round-robin, re-enqueue jitter, `FAILED_QUOTA_EXCEEDED`, `EO_IntentosPorCuota` separado. Post-deploy Chat A pendiente monitoreo 24-48h. Chat 4 (F3.FE) + Chat 6 (F4.FE) pendientes. | 97% |
| 23 | Extensión `/intranet/admin/asistencias` a Profesores | BE+FE | `plan/asistencia-admin-profesores.md` | ✅ **100% — archivado 2026-04-22** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-23) | — |
| 24 | 🟡 Sync CrossChex en Background Job | BE+FE | (inline en maestro) | ⏳ Chat 1 + Chat 2 + Chat 3 cerrados. **Chat 4 (A') ✅ cerrado 2026-04-24** (commit `862d4ca` en `Educa.API master`, +2 tests → 1373 BE verdes): `CrossChexPollingOptions` expone el delay entre páginas como `IOptions` + instrumentación Stopwatch (ConfiguredMs / ElapsedMs / Drift) para telemetría. Default 30000ms preservado. Falta subfase B del Chat 4 (medir 48-72h en prod + bajar delay vía config si el proveedor lo permite, sin redeploy) | ~85% |
| 25 | Paridad Excel para reportes PDF | BE+FE | (archivado en historial) | ✅ **100% — archivado 2026-04-22** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-25). Regla §17 en `business-rules.md` con INV-RE01/02/03 | — |
| **26** | **🟡 Rate limiting flexible** | **BE+FE** | **(inline en maestro)** | **🟡 F1 ✅ cerrada 2026-04-21 + F2 Chat 1 ✅ cerrado 2026-04-22 (máquina del multiplier) + F2 Chat 2 ✅ cerrado 2026-04-22 (overrides aplicados en 10 controllers / 28 endpoints reportes + 3 observabilidad admin, 1119 BE verdes). F2.6 ⏳ observación post-deploy 1-2 semanas antes de F3. F2 Chat 1: `RateLimitOverrideAttribute` + `RoleMultipliers` (Director 3.0 / Asistente Admin / Promotor / Coordinador Académico 2.5 / Profesor 2.0 / resto 1.0) + `RateLimitPartitionResolver` (cache reflection, cap 5x acumulado) + nuevas policies `reports` y `batch` con base 5/min + resolver. F2 Chat 2: 39 instancias de `[EnableRateLimiting("heavy")]` migradas a `reports`/`batch` en 10 controllers + `[RateLimitOverride("reports", 2.0)]` en 28 endpoints de reportes + `[RateLimitOverride(3.0)]` en `/api/sistema/errors` y `/api/sistema/rate-limit-events` (motivado por top endpoint `/api/sistema/errors` con 5/16 rechazos visto en telemetría F1). `heavy` queda registrada sin consumidores (comentario "eliminar en F5"). Telemetría viva en prod desde F1 (RateLimitEvent, INV-S07/ET02). FE intacto: la vista admin `/intranet/admin/rate-limit-events` ya rotula por rol. Tests acumulados: 28 unit + 6 integración (Chat 1) + 22 contract tests por reflection (Chat 2) → Suite BE **1119 verdes**. Plan ~30%. **Decisión de calibración F3** (2026-04-23, usuario): la franja escolar 7am-5pm L-V es el rango normal, NO el único posible — se permiten casos anormales (reuniones, trabajo tarde). Diseño F3 debe dar margen suave fuera de franja (ej: multiplier x1.5 dentro → x1.2 fuera), NO corte duro. Valor exacto definir con telemetría real. **Siguiente**: F2.6 observación 1-2 semanas post-deploy antes de F3 (hoy +13 días hasta ~2026-05-06).** | **30%** |
| **28** | **🟢 Inclusión de Asistentes Administrativos en reportes de profesores** | **BE+FE** | **(inline en maestro — decisión confirmada post-Chat 1: 6 chats no justifican archivo dedicado)** | **🟢 Chat 2 BE ✅ cerrado 2026-04-22 — modelo + dispatch + queries. Migración SQL ejecutada (CHECK expandido a `('E','P','A')`). 14 archivos prod tocados: constante `TipoPersona.AsistenteAdmin = "A"`, lookup `GetAsistenteAdminActivoConSedeByDniAsync` filtrando `DIR_UsuarioReg='Asistente Administrativo'` (discriminador del rol es `DIR_UsuarioReg`, no `DIR_Rol` — convención pre-existente del proyecto), dispatch `Profesor → AsistenteAdmin → Estudiante → rechazar` en `AsistenciaService.ResolverPersonaAsync`, rama 'A' en 3 queries de `AsistenciaRepository` + nuevo método `ListarAsistentesAdminDelDiaAsync` en `AsistenciaAdminQueryRepository` + selector admin extendido + helper `ContextoAsistenteAdmin` + DTO estadísticas con campos AA + tupla `(E,P,A)` en `ContarEditados` + log sync service. Colisión real resuelta por dispatch: Vivian Canchari existe dual (AA+Profesor) → cae como `'P'` por first-match-wins (3 AAs puros: Ricardo/Ray/Diana). **+18 tests** (6 lookup, 6 dispatch, 6 `TardanzaRegular`) → **1185 BE verdes**. Commit en Educa.API branch master. **🟢 Chat 1 `/design` ✅ cerrado 2026-04-22 con 8 decisiones: (1) alcance B-amplio acotado al rol "Asistente Administrativo" (4 personas hoy: RICARDO REY, VIVIAN CANCHARI, RAY ORTIZ, DIANA TUESTA — rol = "Asistente Administrativo" explícito, se excluyen Director/Promotor/Coord Académico); filas IN del inventario 11 = {1-3 asistencia admin + 9-10 comunicación (correos + notificaciones)}; filas OUT = {4-5 filtros rol usuarios/tutores, 6-8 horarios/cursos/salones tutoreados, 11 permisos} — criterio: si no es reporte de asistencia o función que el AA no cumple, no entra; (2) `TipoPersona='A'` en `AsistenciaPersona` con `ASP_PersonaCodID` → `Director.DIR_CodID` (extiende dispatch polimórfico Plan 21 con 3er tipo); (3) dispatch webhook `Profesor → Director(rol=AA) → Estudiante → rechazar` — **modifica el orden del Plan 21** (hoy `Profesor → Estudiante`) por regla §7.1 "menor a mayor volumen"; (4) correos diferenciados: helper nuevo `EnviarNotificacionAsistenciaCorreccionAsistenteAdmin` reusa plantilla azul administrativa con saludo propio, destinatario `Director.DIR_Correo`, `TipoEntidadOrigen='AsistenciaAsistenteAdmin'`; (5) self-service "Mi asistencia" generalizado — componente `attendance-profesor-personal` se renombra a `attendance-personal` parametrizado por `TipoPersona` (reusa tabla mensual + día puntual + widget home); (6) horarios = profesor (periodo regular 07:31 tardanza / 09:30 falta, apertura INV-C10 sí aplica, INV-C09 salida temprana no aplica — es `'E'`-only); (7) `INV-AD08` principio general "ningún rol administrativo corrige asistencia de su propio rol" → AA no puede mutar `TipoPersona='A'`; jurisdicción `Roles.SupervisoresAsistenteAdmin = {Director, Promotor, Coordinador Académico}`; (8) alcance persona acotado al rol "Asistente Administrativo" específicamente (Director, Promotor, Coord Académico NO entran al scope — son roles distintos con funciones no operativas-auxiliares). **Plan inline, 6 chats confirmados**: Chat 1 ✅ + Chat 2 BE (modelo + dispatch + queries) + Chat 3 BE (reportes PDF/Excel + correos + bandeja + notificaciones) + Chat 4 FE (admin UI + badge + self-service generalizado + widget home) + Chat 5 cierre docs (INV-AD08/09 en business-rules.md §15.9 + §17 Excel paridad) + Chat 6 gap fix reservado (patrón probado Plan 27). **Chat 2 bloqueado hasta validación del jefe Plan 27 post-deploy** (evita PRs simultáneos sobre `AsistenciaPersona` + `EmailNotificationService`). Invariantes a formalizar en Chat 5: `INV-AD08`, `INV-AD09`, nota cruzada en `INV-AD06`.** | **~15%** |
| **29** | **🔴 Corte de cascada SMTP (`max_defer_fail_percentage`)** | **BE+OPS** | **(inline en maestro — 5/6 chats cerrados, no justifica archivo dedicado)** | **🟢 Chat 4 docs ✅ cerrado 2026-04-23. `§18 Correos Salientes y Protección del Canal SMTP` agregada a `business-rules.md` después de §17 (contexto cPanel, defensas en capas, qué cuenta vs qué no cuenta, coordinación con throttle Plan 22). `§15.14 Invariantes de Correos Salientes` agregada al Registro con los 4 IDs `INV-MAIL01/02/03/04` (wording literal del maestro, sin parafrasear). `INV-MAIL04` (monitoreo + widget) es nuevo en este chat — formaliza el endpoint de Chat 2.6 + widget de Plan 22 Chat B. Checklist final extendido con bloque "CORREOS SALIENTES (Sección 18)" con 6 items. Comentarios `<!-- TBD post-OPS -->` sobre el `5/h` en §18.1, §18.5, `INV-MAIL03`, `INV-MAIL04` y checklist — fácil de encontrar por grep para el swap de 1 línea cuando Chat 3 OPS cierre. §15.11 "Cómo Usar Este Registro" preservado al final del §15 (convención vigente del archivo, no renumerar). Queda pendiente solo Chat 3 OPS (no es código — lo ejecuta el usuario con el admin cPanel) + micro-chat post-OPS para swap del threshold negociado si aplica. 🟢 Chat 2.6 BE ✅ cerrado 2026-04-23 (commit `7b2a962` en Educa.API `master`). Gap (2) del Chat 2 resuelto y deuda D4 cerrada: endpoint `GET /api/sistema/email-outbox/defer-fail-status` (`[Authorize(Roles = Roles.Administrativos)]`) devuelve `DeferFailStatusDto` con 4 secciones empaquetadas — `CurrentHour` (contador hora actual + threshold configurable `Email:DeferFailThresholdPerHour` default 5 + PercentUsed + Status OK/WARNING/CRITICAL por bandas 0-60/60-100/100+), `Last24h` (breakdown por `EO_Estado` + `EO_TipoFallo`: Sent/Pending/Retrying + 5 tipos FAILED), `Blacklist` (total activos + 4 motivos + oldest/newest), `GeneratedAt` Perú. Service con 3 queries secuenciales + fallback-CRITICAL en try/catch (INV-S07). Route namespace `/api/sistema/email-outbox/*` coherente con `EmailBlacklistController` (no `/api/email-outbox/*` del brief). Sin rate limit especial — GlobalLimiter (200 GETs/min por userId) protege el poll del widget cada 30-60s. **+21 tests** (11 service + 10 authz) → **1274 BE verdes** (baseline 1253). **Plan 22 Chat B desbloqueado** — el widget FE puede consumir el endpoint. Señal anotada para chat futuro: usuario expresó preocupación sobre retry automático del worker (con 5/h de techo por dominio + 7 buzones, retries automáticos pueden agotar quota más rápido que retries manuales; exponer `Retrying` como métrica separada facilita eventual migración a retry manual). 🟢 Chat 2.5 BE ✅ cerrado 2026-04-23 (commit `0580983`, +11 tests, 1253 verdes). 🟢 Chat 2 BE ✅ cerrado 2026-04-22 (commit `674e86a`, +35 tests, 1242 verdes). 🟢 Chat 1 `/design` ✅ cerrado 2026-04-22. **Siguiente: Chat 3 OPS (inspección CrossChex + negociación umbral hosting)** + eventual micro-chat post-OPS para swap del `5` en los 5 `<!-- TBD post-OPS -->` si OPS sube el techo.** | **~90%** |
| **27** | **🟢 Filtro temporal asistencia diaria por grado (5to Primaria +)** | **BE+FE** | **(inline en maestro — el diseño cupo en 1 chat, no se promueve a archivo dedicado)** | **🟢 Cerrado docs 2026-04-22 (pendiente validación del jefe post-deploy). Los 5 chats completaron: Chat 1 `/design` + Chat 2 BE webhook/admin/correos (1130 verdes) + Chat 3 BE reportes + nota (1149 verdes) + Chat 4 BE mínimo `GraOrden` self-service + FE completo banner/per-student/widget (1155 BE + 1507 FE verdes) + Chat 5 cierre docs `INV-C11` en `business-rules.md §1.11 + §15.4` + **Chat 5b (fix gap) 2026-04-22**: 2 queries de `ConsultaAsistenciaRepository` (`ObtenerEstudiantesPorGradoConAsistenciasAsync` + `ObtenerEstudiantesPorDiaAsync`) quedaban sin filtrar → endpoints `profesor/grado`, `profesor/asistencia-dia`, `director/grado`, `director/asistencia-dia` devolvían listas con `Asistencias = []` y el FE calculaba 100% falta. Fix: filtro `GRA_Orden >= 8` + `SalonProfesorDto.GraOrden` expuesto + `salonFueraAlcance` computed en `attendance-profesor-estudiantes` y `profesor-attendance-widget` del home (reutiliza `AttendanceScopeStudentNoticeComponent` del Chat 4). **+6 tests BE** (4 filtro + 2 `GraOrden`) → **1161 verdes**. **+2 tests FE** (widget INV-C11) → **1509 verdes**. **Chat 5c (gap fix bulk email) 2026-04-22**: la proyección dedicada `AsistenciaEmailDataRow` consumida por `AsistenciaAdminBulkEmailService.EnviarCorreosMasivosAsync` (`POST /api/AsistenciaAdmin/correos-masivos`) no traía `GraOrden`, así que el early-return de `EmailNotificationService` nunca disparaba y el reenvío masivo salía para estudiantes con `GRA_Orden < 8`. Fix: `AsistenciaEmailDataRow` gana `int? GraOrden` · `GetEmailDataByIdsAsync` + `GetEmailDataByIdAsync` agregan subquery correlacionada con filtro `ESS_Estado=true && SAL_Estado=true && SAL_Anio=anioActual` (INV-D09) · el service propaga `asistencia.GraOrden` en entrada y salida. **+6 tests BE** (4 repo + 2 service) → **1167 verdes**. FE sin cambios (1509 verdes). 10 decisiones acordadas preservadas. Reversibilidad documentada (bajar la constante en ambos repos + redeploy; job catch-up opcional sin data loss). Una vez que el jefe valide el comportamiento post-deploy, el plan pasa a `history/planes-cerrados.md`.** | **100%** |
| **33** | **🟡 Auditoría de paginación de tablas (count real)** | **BE+FE** | **[plan/pagination-audit.md](./pagination-audit.md)** | **🟡 Plan abierto 2026-04-25 tras fix puntual de `error-logs admin`. Origen: el paginador mostraba "Página 1 de 2" al cargar y revelaba el total real (30 páginas) solo avanzando una a una. Fix de referencia ya aplicado: `Educa.API master 7e9d10b` (endpoint `/count`) + `educa-web main 1a13062` (consumo + fallback). Regla canónica: `.claude/rules/pagination.md`. Inventario inicial: ✅ usuarios/horarios/vistas/permisos-roles (wrapper paginado con `total`), ✅ error-logs (count separado, fixed), ❌ ninguna pendiente confirmada, 🔍 8 features a auditar (`attendances admin`, `attendance-reports cross-role`, `email-outbox-diagnostico`, `email-outbox-dashboard-dia`, `attendance-day-list`, `responsive-table`, `student-attendance-tab`, `attendance-summary-panel`). Cierre del plan: cada 🔍 con status final + cada ❌ con fix asociado + suite verde + browser check. **Siguiente**: chat dedicado de auditoría que clasifique los 8 candidatos y aplique fix donde corresponda.** | **5%** |
| **34** | **🟡 Saneamiento de errores con estados y agrupación por huella** | **BE+FE** | **[plan/saneamiento-errores.md](./saneamiento-errores.md)** | **🟡 Plan abierto 2026-04-25. Chat 1 `/design` ✅ cerrado con 15 decisiones (modelo `ErrorGroup` + huella precomputada SHA-256 + máquina de estados `NUEVO/VISTO/EN_PROGRESO/RESUELTO/IGNORADO` + auto-reapertura desde `RESUELTO` + `IGNORADO` no auto-reabre + purga selectiva 7/30/180d + sin backfill + vista Kanban default con drag-drop CDK + tabla coexistente + observación opcional al cambiar estado + mobile a explorar con scroll horizontal+long-press → fallback tabla si no funciona). Invariantes nuevos: `INV-ET03/04/05/06/07`. Plan 32 (correlation hub) preservado intacto — sub-drawer de ocurrencia sigue usando `<app-correlation-id-pill>`. **🟢 Chat 2 BE ✅ cerrado 2026-04-25** (commit `bcd1532` en `Educa.API master`) — SQL ejecutado por usuario en BD prueba (`CREATE TABLE ErrorGroup` con auditoría + ROWVERSION, `UNIQUE INDEX UX_ErrorGroup_Fingerprint`, `IX_ErrorGroup_Estado_UltimaFecha`, FK opcional `ERL_ERG_CodID` en `ErrorLog` con `ON DELETE CASCADE`, `IX_ErrorLog_ErrorGroup`). 5 archivos C# nuevos: `Constants/Sistema/ErrorGroupEstados.cs`, `Models/Sistema/ErrorGroup.cs` (auditoría completa + `[Timestamp] ERG_RowVersion` + nav), `Helpers/Sanitization/ErrorFingerprintCalculator.cs` (función pura SHA-256 con normalización de mensaje [GUID/ISO date/long-id strip + collapse whitespace] y URL [lowercase + strip query + segmentos numéricos `:id`]), partial `Services/Sistema/ErrorLogService.Upsert.cs` (UPSERT atómico vía single `SaveChangesAsync` = transacción implícita SQL Server, reapertura auto desde `RESUELTO → NUEVO` con `ContadorPostResolucion++` + `LogInformation`, `IGNORADO` no muta estado pero cuenta), tests del helper + service. 3 archivos modificados: `Models/Sistema/ErrorLog.cs` (+`ERL_ERG_CodID`+nav), `Data/ApplicationDbContext.cs` (+`DbSet<ErrorGroup>`), `Tests/Helpers/Db/TestDbContextFactory.cs` (relajación `ERG_RowVersion` en EF InMemory). Refactor adicional: split `ErrorLogService` en 3 partials (235+164+113 ln) por cap 300 — main estaba en 380 (deuda preexistente del Chat 32-2). Tests: 24 nuevos (9 fingerprint + 15 upsert con `[Theory]` expandido) → suite BE **1421 verde** (baseline post-Plan 32 era 1397), 0 warnings nuevos, build limpio. Decisión partial vs helper estático documentada en brief: partial elegido por simetría con `EmailOutboxService.Enqueue.cs` y porque la lógica necesita `_context`/`_logger` de instancia. **Estimado**: 5 chats (1 design ✅ + 2 BE [1✅+1] + 2 FE), ~85 tests nuevos totales, ~45 archivos. **Riesgo**: bajo en BE, medio en FE Chat 5 (drag-drop CDK touch en mobile). **🟢 Chat 3 BE ✅ cerrado 2026-04-25** (commit `0b67b04` en `Educa.API master`). 4 DTOs nuevos en `DTOs/Sistema/ErrorGroups/` (Lista, Detalle, Ocurrencia, CambiarEstado), `IErrorGroupRepository` + `ErrorGroupRepository` (queries `AsNoTracking()` + filtros compartidos `AplicarFiltros` para listado/count + UPDATE con RowVersion + purga selectiva con fallback InMemory), `IErrorGroupService` + `ErrorGroupService` (191 ln) split en partial `.Purga.cs` (49 ln) — listar/count/detalle/ocurrencias paginadas/`CambiarEstadoAsync` con state machine + `ConflictException("INV-ET07_ESTADO_INVALIDO" / "INV-ET07_ROW_VERSION_STALE")`. State machine en `Domain/Common/StateMachine/StateMachines.cs` (siguiendo el patrón existente, no archivo separado): matriz INV-ET07 (activos transicionan libre, RESUELTO/IGNORADO solo a NUEVO). `ErrorGroupController` (123 ln) con `[Authorize(Roles = Roles.Director)]` + 5 endpoints: `GET /` paginado, `GET /count` (variante B `pagination.md`), `GET /{id:long}`, `GET /{id:long}/ocurrencias` paginado, `PATCH /{id:long}/estado`. `ErrorLogPurgeJob` reescrito a 2 llamadas: `ErrorGroupService.PurgarGruposPorEstadoAsync` (selectiva 7d IGNORADO / 30d NUEVO+VISTO+EN_PROGRESO / 180d RESUELTO desde `ERG_UltimaFecha`) + `ErrorLogService.PurgarOcurrenciasHuerfanasAsync(7)` (rama legacy: `ERL_ERG_CodID = NULL`). DI registrado en `ServiceExtensions.AddApplicationServices` y `RepositoryExtensions.AddRepositories`. **+45 tests verdes** (6 state machine matriz/idem/terminal + 13 service: listar+filtros/count/ocurrencias/cambio estado feliz path/transición prohibida/RowVersion stale via Mock/idempotencia/NotFound/estado inválido + 13 controller authz por reflection + 7 purga selectiva con fallback InMemory documentado + 6 helpers preexistentes) → suite BE **1466 verde** (baseline post-Chat 2 era 1421). Build limpio (0 errores), todos archivos producción bajo cap 300. **Decisión menor**: state machine convertida a entry en `StateMachines.cs` (no archivo separado `Domain/StateMachines/ErrorGroup.cs`) para mantener simetría con las 7 máquinas ya documentadas. Error code es `ERRORGROUP_TRANSICION_INVALIDA` (auto-generado por `StateTransitionValidator`) — se documenta en INV-ET07 mapping. **Pendiente FE Chat 4-5**. Entra a cola de `next-chat` después de Plan 31-2 / Plan 30 FE / Plan 24 Chat 4 B. **🟢 Chat 4 FE ✅ cerrado 2026-04-25** en `educa-web main`. Feature `error-logs/` renombrado a `error-groups/` con ruta pública `/intranet/admin/trazabilidad-errores` preservada (cambia solo el `loadComponent` interno de `intranet.routes.ts`). 18 archivos producción nuevos: `models/error-groups.models.ts` (DTOs Lista/Detalle/Ocurrencia/CambiarEstado + tipos semánticos `ErrorGroupEstado`/`ErrorOrigen`/`ErrorSeveridad` + `ESTADO_TRANSITIONS_MAP` espejo INV-ET07 + maps de UI), `services/` (5 archivos: `service.ts` espejo de los 5 endpoints BE, `store.ts` con mutaciones quirúrgicas + filtro client-side `visibleItems` para "ocultar resueltos/ignorados", multi-facade `data + crud + ui`), `config/error-groups.config.ts` (opciones de filtro + skeleton para mantener componente bajo cap 300), 3 componentes nuevos: `error-group-detail-drawer/` (tabs `p-tabs` Resumen/Ocurrencias con tabla paginada server-side), `error-occurrence-drawer/` (movido desde `error-log-detail-drawer/` legacy preservando la pill `<app-correlation-id-pill>` Plan 32 + botón "Ver eventos correlacionados" — sin botón eliminar, esa acción ya no aplica a nivel ocurrencia), `change-group-status-dialog/` (select que solo lista destinos válidos según `ESTADO_TRANSITIONS_MAP[grupo.estado]` — el idem X→X queda inalcanzable desde UI, defensa en profundidad — `confirmStatus`/`cancelStatus` outputs renombrados desde `confirm`/`cancel` por ESLint `no-output-native`), `error-groups.component.ts/html/scss` (página con header + 4 stat cards + filter bar con search debounced 300ms en facade + select estado/severidad/origen + checkbox "Ocultar resueltos/ignorados" ON por defecto + tabla con paginador de count real variante B `pagination.md`). WAL optimista en `cambiarEstado`: `apply` muta store + cierra dialog inmediato; `rollback` restaura snapshot exacto al estado y rowVersion previos; `onError` mapea `INV-ET07_ROW_VERSION_STALE` → refetch del grupo + warning "El grupo fue modificado", `ERRORGROUP_TRANSICION_INVALIDA` → error específico, 404 → `removeGroup` + warning. Filtros sincronizados con URL via `router.navigate([], { queryParams, queryParamsHandling: 'merge', replaceUrl: true })` para deep-link y back button. Carpeta vieja `pages/admin/error-logs/` eliminada (sin imports rotos confirmado por grep). 4 archivos de test nuevos: `services/error-groups.store.spec.ts` (12 tests: setGroups, setTotalCount, updateGroupEstado happy + no-op, removeGroup decrementa total, setFilters/clearFilters, drawer open/close, `visibleItems` filtra resueltos/ignorados con/sin filtro estado, stats por severidad), `services/error-groups.service.spec.ts` (7 tests: getList con/sin filtros, getCount, getDetalle, getOcurrencias paginadas, cambiarEstado PATCH, getOcurrenciaCompleta legacy endpoint), `services/error-groups-crud.facade.spec.ts` (6 tests: WAL execute con apply/rollback, snapshot restore exacto, onError stale → refetchGroup + warning, transición prohibida → showError, 404 → removeGroup, onCommit → showSuccess), `components/change-group-status-dialog/.spec.ts` (8 tests: opciones desde NUEVO, RESUELTO, IGNORADO, canSubmit, onConfirm con observación trim, observación vacía → null, reset al abrir). **+33 tests** → **1630 FE verdes** (baseline 1600 — exactamente el target del brief). Lint OK (0 errores; 1 warning preexistente fuera de scope), build production OK, cap 300 ln respetado en todos los archivos producción. **Plan 34 ahora al 80%** — pendiente Chat 5 FE (vista Kanban + drag-drop CDK + toggle vista + exploración mobile). **🟢 Chat 5 FE ✅ cerrado 2026-04-27** en `educa-web main` (commit pendiente, acumula también el Chat 4 FE). Vista Kanban con 5 columnas (NUEVO/VISTO/EN_PROGRESO/RESUELTO/IGNORADO), header con `nombre + contador`, top 20 cards por columna ordenadas por `ultimaFecha DESC`, "Cargar más" client-side por columna (no pega al BE — incrementa el cap visible local). Drag-drop CDK reusando el barrel `@intranet-shared/directives/drag-drop` con `cdkDropListEnterPredicate` espejo de `ESTADO_TRANSITIONS_MAP` (defensa en profundidad — el BE rechaza con `BusinessRuleException("ERRORGROUP_TRANSICION_INVALIDA")`). Visual feedback al iniciar drag: columnas válidas se iluminan con `--green-500` 8% mix, inválidas se atenúan a `opacity 0.45 + cursor: not-allowed` — el estado del drag vive en signal local `draggingFrom`. WAL handler `moveCardOptimistic(group, toEstado)` en `error-groups-crud.facade.ts` re-valida la transición (short-circuit si inválida sin pegar al BE), construye dto `{ estado, observacion: null, rowVersion }` y delega en el `cambiarEstado` ya implementado en Chat 4 — apply muta store + cierra dialog, rollback restaura snapshot exacto, errorCodes se mapean igual (stale → refetch + warning, transición inválida → showError, 404 → removeGroup). 3 componentes nuevos: `error-group-card/` (presentational OnPush, ~80px alto, severidad badge + mensaje truncado 2 líneas + footer origen+fecha + badge `+N` cuando `contadorPostResolucion>0`, `role="button"` + `tabindex="0"` + handlers `keydown.enter/space` con `preventDefault` para a11y), `error-groups-kanban-board/` (smart container 137 ln efectivas — computa `columns` desde `groups` input, drop predicate factory por columna, `dropListIds` para `cdkDropListConnectedTo`, `pageSizeByColumn` con Map<estado, number> para "Cargar más"), `error-groups-view-toggle/` (segmented `p-selectButton` Kanban/Tabla, lee y persiste vía `StorageService.getErrorGroupsViewMode/setErrorGroupsViewMode` — los componentes nunca tocan `PreferencesStorageService` directo, respetando la regla `no-restricted-imports` que protege el wrapper). Default `kanban` primera vez. `PreferencesStorageService` extendido con la key `educa_pref_error_groups_view_mode` y exportado el tipo `ErrorGroupsViewMode = 'kanban' \| 'table'` desde el barrel `@core/services/storage` para uso público. Componente principal renderiza Kanban o Tabla según `viewMode` signal; oculta el filtro estado en modo Kanban (las columnas son los estados); toggle "Ocultar resueltos/ignorados" oculta esas dos columnas completas. Click en card abre el mismo drawer del Chat 4 (sin duplicar carga de detalle/ocurrencias). **+18 tests** nuevos: 3 preferences-storage (default kanban / set table / set kanban), 3 error-group-card (render con todos los campos / badge `+N` / cardClick por host click), 4 view-toggle (init default kanban + emite, init con table desde storage, onModeChange persiste y emite, ignora null), 6 kanban-board (5 columnas vacías cuando no hay groups, distribución y orden DESC por `ultimaFecha`, predicate desde NUEVO permite los 4 destinos, predicate desde RESUELTO solo permite NUEVO, cardClick output, hideResolvedIgnored oculta RESUELTO/IGNORADO), 2 facade `moveCardOptimistic` (transición válida llama cambiarEstado con dto correcto, transición prohibida hace short-circuit) → **1648 FE verdes** (baseline post-Chat 4 era 1630). Lint OK (0 errores; 1 warning preexistente fuera de scope), build production OK. Cap 300 ln respetado: kanban-board 137 efectivas, card 56, view-toggle 45, crud-facade 113, error-groups.component 286 efectivas, preferences-storage 193. **Decisión 13 (mobile) — pendiente validación real-device**: CDK habilita touch automáticamente en `cdkDrag`, así que la implementación lleva el toggle visible en pantallas <768px. La elección final ("Kanban en mobile" vs "fallback a tabla con toggle oculto") se documenta cuando el usuario pruebe en dispositivo real — si long-press confunde con scroll horizontal o el feedback es ruidoso, abrir mini-plan derivado para forzar `viewMode='table'` cuando `window.matchMedia('(max-width: 768px)').matches`. **No se toma esa decisión sin evidencia real-device** (este chat no tiene browser interactivo). **Plan 34 ahora al 100%** — listo para mover a `history/planes-cerrados.md` cuando el usuario confirme la verificación browser-real (kanban renderiza, drag-drop desktop, drop predicates rechazan inválidos, optimistic+rollback en 409, toggle persiste entre recargas) + decisión mobile.** | **100%** |
| **32** | **✅ Centralización de errores vía Correlation ID** | **BE+FE** | **[plan/correlation-id-links.md](./correlation-id-links.md)** | **✅ Plan 32 cerrado al 100% — 2026-04-25. Chat 4 FE ✅ cerrado 2026-04-25 (commit `a70b8d3` en `educa-web main`). Hub `/intranet/admin/correlation/:id` que agrega las 4 fuentes (`ErrorLog`, `RateLimitEvent`, `REU_ReporteUsuario`, `EmailOutbox`) en una sola vista, alimentado por `GET /api/sistema/correlation/{id}` (Chat 3 BE). Pill reusable `<app-correlation-id-pill>` en `@shared/components/correlation-id-pill/` (standalone, OnPush, tag-neutral, aria-label dinámico, click navega vía Router; modo compact trunca a 8 chars + tooltip). Wiring en los 4 dashboards admin: **error-logs** (drawer reemplaza span mono por pill + botón "Ver eventos correlacionados"; store + facade leen query param `correlationId`), **rate-limit-events** (pill compact en columna; drawer con pill; `onBuscarEnErrorLog` redirige al hub; filter `correlationId` agregado al modelo + service — BE no lo soporta hoy, filter aplicado client-side en facade; query param init), **feedback-reports** (pill en row del CorrelationId; flujo cross-link al drawer de error-logs **eliminado** — la pill al hub es la nueva navegación canónica más informativa; component lee query param; **deuda menor**: `ReporteUsuarioListaDto` BE no incluye `correlationId`, así que el filter por ese campo no es factible en la lista — el deep-link conserva el id en URL pero no filtra), **email-outbox** (nueva columna "Correlation" 110px con pill compact; `EmailOutboxLista` extendido con `correlationId: string\|null` reflejando lo que BE ya retornaba desde Chat 2; filter client-side en `filteredItems` computed; query param init). Permiso reusado vía nuevo override `data.permissionPath: 'intranet/admin/trazabilidad-errores'` en `permisos.guard.ts:getFullPath` (retrocompatible). Sin entrada de menú; sin permiso nuevo en el registry. **+24 tests** (5 pill + 1 service + 4 facade + 3 hub component + 3 error-logs.store + 8 rate-limit.store extendido) → **1600 FE verdes** (baseline 1535+). Lint OK (1 warning preexistente). Build OK. ~22 archivos tocados (4 pill + 14 feature correlation + 4 wiring de dashboards + 1 routes + 1 guard). **Pendiente verificación post-deploy del usuario**: 5 flujos de browser (drawers→hub, deep-link, id ficticio→4 empty states, back button preserva filtros). 🟢 Chat 3 BE ✅ cerrado 2026-04-25 (commit `7184bab` en `Educa.API master`). Endpoint `GET /api/sistema/correlation/{id}` agrega las 4 fuentes (`ErrorLog`, `RateLimitEvent`, `REU_ReporteUsuario`, `EmailOutbox`) en un único snapshot. Patrón Plan 30 canónico: `ApplicationDbContext` directo, 4 queries `AsNoTracking()` secuenciales (DbContext NO es thread-safe), cada query con try/catch independiente + lista vacía como fallback (INV-S07 por tabla); catch global vía `CorrelationSnapshotFactory.BuildEmpty(eco, generatedAt)`. Caps defensivos: 100 filas por tabla, 200 chars en `ERL_Mensaje`/`EO_UltimoError`/`REU_Descripcion`/`REU_Propuesta`. DNIs enmascarados antes de salir del service vía `DniHelper.Mask` (excepto `ERL_UsuarioDni` que ya viene enmascarado del `EmailFailureLogger`). Controller valida `id` no-empty + cap defensivo 64 chars + trim; retorna `ApiResponse<CorrelationSnapshotDto>` (INV-D08) con `[Authorize(Roles = Roles.Administrativos)]`. Índices BD: 2 ya existían (`IX_ErrorLog_CorrelationId`, `IX_REU_CorrelationId` — ambos `WHERE ... IS NOT NULL`); los 2 faltantes (`IX_RateLimitEvent_CorrelationId`, `IX_EmailOutbox_CorrelationId`) los creó manualmente el usuario en este chat con el mismo patrón filtrado. **+18 tests** (9 service: universo vacío, mix 4 fuentes, filtrado por id, DNI enmascarado, anónimo INV-RU05, cap 100 filas, contexto disposed, truncado descripción/ultimoError; 9 controller authz por reflection + path id contract) → **1397 BE verdes** (baseline 1379). 12 archivos producción + 1 fix `TestDbContextFactory` (relajación `REU_RowVersion` en EF InMemory, en línea con el patrón existente para `EmailOutbox`/`EmailBlacklist`/`CrossChexSyncJob`). `CorrelationService.cs` 239 líneas (cap 300 respetado). 🟢 Chat 2 BE ✅ cerrado 2026-04-25 (commit `1ca1098`). 🟢 Chat 1 `/design` ✅ cerrado 2026-04-24. **Cierre**: Plan 32 al **100%** — listo para mover a `history/planes-cerrados.md` cuando el usuario confirme verificación post-deploy.** | **100%** |

| **36** | **🟡 Rediseño UX/UI páginas internas de Monitoreo** | **FE+BE** | **[plan/monitoreo-pages-redesign.md](./monitoreo-pages-redesign.md)** | **🟡 Chat 2 (#1 Bandeja) ✅ cerrado local 2026-04-27 (awaiting-prod) — 9 archivos tocados (`styles.scss` global agrega override `p-tabs` transparente; stats con tokens design-system; Excel a `p-button-success` filled; layout grid stats+chart side-by-side >1100px; filters con labels uppercase + placeholders distintivos; paginador `rows=5 / [5,10,15]`; eliminación de overrides de transparencia local ahora cubiertos por global). Lint ✅ · build ✅ · tests 1682/1683 (1 fail preexistente en `attendance-scope-banner` no relacionado, verificado contra `git stash`). **Plan 36 Chat 3 (#2 Dashboard tab Detalle) ✅ cerrado local 2026-04-27 (awaiting-prod)** — 4 KPI cards arriba del tab Detalle (Fallos · Bouncers únicos · Próximos a blacklist ≥3 · Tipos afectados) con variants success/danger/warning/info y zero-state, mirror del estilo de `dashboard-resumen`. Sin tocar facade/store/sub-tablas. 3 archivos modificados (`email-outbox-dashboard-dia.component.{ts,html,scss}`). Lint ✅ · tsc ✅ · vitest 19/19 ✅ · build ✅. **Plan 36 Chat 4b BE (#3 Diagnóstico — endpoint `buscar-personas`) ✅ cerrado local 2026-04-28 (awaiting-prod)** en `Educa.API master`. Nuevo endpoint `GET /api/sistema/email-outbox/diagnostico/buscar-personas?q={texto}` para typeahead del FE Chat 4: lookup polimórfico libre en las 4 tablas de persona (Estudiante/Profesor/Director/Apoderado) por `_Nombres LIKE %q%` OR `_Apellidos LIKE %q%`, con búsqueda adicional por `*_DNI_Hash == ComputeHash(q)` cuando `q` son 8 dígitos. Cap 10 por tabla → 10 final ordenado por apellido. Response devuelve correo plano + masked + DNI masked. Filtra `_Estado = true` (INV-D09) + correo no-vacío. INV-S07 fail-safe. Reusa patrón sibling de `EmailDiagnosticoPersonaLookup` (Plan 30 Chat 4) — nuevo `EmailDiagnosticoPersonaSearch.cs` (216 ln) + service convertido a `partial class` (`EmailDiagnosticoService.cs` 293 ln + `*.Busqueda.cs` 53 ln) para respetar cap 300. **+12 tests** (4 tipos persona + DNI hash + cap 10 + sin correo + inactivo + normalización + INV-S07) → **1482 BE verdes** (baseline 1470). Decisión revisada en pre-work SQL: el modelo expone `EST_DNI_Hash`/`PRO_DNI_Hash`/`DIR_DNI_Hash`/`APO_DNI_Hash` con SHA256, así que DNI search se incluyó en scope (originalmente brief lo dejaba como pregunta abierta). Limitación conocida documentada: búsqueda accent-sensitive (CI_AS de SQL Server + `.ToLower().Contains` de C# son ambos accent-sensitive) — "perez" no matchea "Pérez"; admin debe tipear con tilde si el dato la tiene. Follow-up menor: aplicar `EF.Functions.Collate(field, "Latin1_General_CI_AI")` si hay fricción. **Plan 36 Chat 6 FE (#5 Trazabilidad Kanban completar) ✅ cerrado local 2026-04-28 (awaiting-prod)** — flipear default `_hideResolvedIgnored: true → false` para que las 5 columnas (NUEVO/VISTO/EN_PROGRESO/RESUELTO/IGNORADO) se vean por defecto en el Kanban. Plumbing del Plan 34 ya tenía transitions map (INV-ET07) y predicates de drag-drop completos — el bug era solo el default ON del toggle filtraba RESUELTO/IGNORADO antes del render. Grid CSS `repeat(5, ...)` fijo → `grid-auto-flow: column + grid-auto-columns: minmax(240px, 1fr)` adaptativo (3 cuando toggle ON, 5 cuando OFF). 3 archivos: `error-groups.store.ts` (default + clearFilters), `error-groups-kanban-board.component.scss` (grid adaptativo), `error-groups.store.spec.ts` (+2 tests: default false + 5 estados visibles). Lint ✅ · tsc ✅ · build ✅ · vitest **1684/1685 verdes** (1 fail preexistente attendance-scope-banner no-relacionado). Tab transparente ya cubierto globalmente desde Chat 2 — verificado, sin fix adicional. **Plan 36 a ~67% (Chats 1+2+3+4b+5+6 de 9 cerrados)**. Pendiente verificación post-deploy: smoke test del nuevo endpoint con `q=garcia`, `q=12345678` (DNI hash), `q=""` (400), antes de desbloquear Chat 4 FE (059). Plan creado 2026-04-27 — continuación de Plan 35. Alcance: las 7 sub-páginas del submódulo Monitoreo (Bandeja / Dashboard día / Diagnóstico / Auditoría / Trazabilidad de Errores / Reportes de Usuarios / Rate Limit). El plan **arranca con Chat 1 `/investigate`** que pregunta al usuario los problemas concretos de diseño de cada página (3 preguntas guía por página) y produce decisión binaria ✅ rediseñar / 🟡 ajuste menor / ⏭️ no tocar. Cantidad y agrupación de chats de ejecución se decide DESPUÉS del Chat 1 según la respuesta del usuario (heurística: 1 chat/página si profundo, 1 chat/dominio si 3+, 1 chat de polish global si solo cambios visuales menores). Restricción dura: ningún chat toca funcionalidad — solo HTML/SCSS y refactor presentacional. Riesgo principal: Trazabilidad de Errores recién rediseñado en Plan 34 — el Chat 1 lo pregunta explícitamente, ⏭️ obligatorio si está bien. Reversibilidad 100%. No bloquea ni es bloqueado por otros planes.** | **67%** |
| **35** | **✅ Rediseño UX/UI submódulo "Monitoreo"** | **FE** | **[plan/monitoreo-redesign.md](./monitoreo-redesign.md)** | **🟢 Plan 35 cerrado al 100% — 2026-04-27. Chat 1 FE ✅ cerrado en `educa-web main`. Las 7 entradas planas del dropdown "Sistema → Monitoreo" (Errores + Bandeja + Dashboard día + Diagnóstico + Reportes Usuarios + Rate Limit + Auditoría Correos) ahora son **1 sola entrada → hub `/intranet/admin/monitoreo` con 3 cards (Correos / Incidencias / Seguridad)**. Hub landing: 3 cards declarativas filtradas por permiso individual + feature flag, links secundarios + CTA "Abrir Correos/Incidencias/Seguridad", empty state si user no tiene ningún permiso del cluster (auto-protección sin `permissionsGuard` en la ruta del hub). Shells minimalistas: `<p-tabs>` controlado por signal `activeTab` derivado de `route.firstChild.snapshot.url[0].path` vía `toSignal(router.events filter NavigationEnd)`, `(valueChange)` navega con `router.navigate([value], { relativeTo: route })`. Correos shell con 4 tabs (bandeja / dashboard / diagnostico / auditoria) — los 3 últimos respetan los flags `emailOutboxDashboardDia` / `emailOutboxDiagnostico` / `auditoriaCorreos`. Incidencias shell con 2 tabs (errores / reportes). Seguridad sin shell (1 página directa) gated por flag `rateLimitMonitoring`. **7 redirects** `MONITOREO_LEGACY_REDIRECTS: Route[]` con `pathMatch: 'full'` conservan bookmarks/links externos: `/admin/email-outbox` → `/admin/monitoreo/correos/bandeja`, etc. Las páginas hijo se cargan dentro del shell vía `loadComponent` lazy en `monitoreo.routes.ts` (children con guards individuales `[authGuard, permissionsGuard]` + `data: { permissionPath: 'intranet/admin/<vista>' }` para reusar permisos existentes sin agregar uno nuevo). Permiso del item del menú: `ADMIN_EMAIL_OUTBOX` (más universal entre admins de soporte) — el hub interno filtra cards por permiso individual. **NO se tocó lógica interna de las 6 páginas existentes**: stores, facades, services, components y tests intactos. **Decisión emergente**: shells SIN page-header propio (las páginas hijo ya tienen su header — habría sido doble header). 9 archivos nuevos en `pages/admin/monitoreo/` (1 routes + 3 hub TS/HTML/SCSS + 2 shells × TS+HTML + 1 SCSS compartido) + 2 modificados (`intranet.routes.ts`, `intranet-menu.config.ts`). Validación: lint exit 0 (1 warning preexistente fuera de scope), build prod exit 0 (28.6s, 9 rutas prerrenderizadas, warnings de budget/CommonJS/SSR navigator preexistentes), tests **1683/1683 verdes** (sin regresiones — refactor estructural puro). Fix puntual durante validación: `onTabChange(value: string \| number \| undefined)` con early return — PrimeNG 21 emite `undefined` en `valueChange` de `p-tabs`. **Pendiente verificación post-deploy del usuario**: smoke test browser → click menú "Sistema → Monitoreo" abre hub con 3 cards, click card abre primera tab del shell, refresh en sub-ruta carga tab correcto, las 7 URLs viejas redirigen al nuevo path.** | **100%** |

**Semáforo de readiness**:

| Dimensión | Estado | Gate mínimo |
|---|---|---|
| **Feature readiness** | 🟢 Listo | Carril A ✅ + QW4 ✅ — deploy completado |
| **Deploy readiness** | 🟢 Estable | FE (Netlify) + BE (Azure) desplegados 2026-04-16. 2026-04-17 sin incidentes reportados. |
| **Production reliability** | 🔴 Sin red | Falta: tests de contrato, auditoría endpoints, error trace, fallbacks P0 |

## 📋 Próximos 3 chats (cola ordenada)

> **Qué es esto**: cola explícita de los próximos 3 chats a abordar, ordenados por prioridad real (no cronológica). Fuente de verdad para `/next-chat` — si esta cola está poblada, el comando toma el primer item sin preguntar; si está vacía o hay empate, pregunta al usuario.
>
> **Regla de mantenimiento**: al cerrar un chat, actualizar esta cola (remover el item cerrado + agregar uno nuevo al final si se descubrió trabajo derivado). Si un chat en la cola se vuelve obsoleto por un cambio de rumbo, eliminarlo aquí aunque no se haya ejecutado.
>
> **Formato**: `N. [Plan·Chat·Repo·Tipo] — scope — razón de prioridad`. Tipo: BE / FE / OPS / docs / design. OPS no genera brief (no es código).

1. **[Plan 31 · Chat 2 · `Educa.API` · BE]** — Parser IMAP + Hangfire job + tabla `BounceParserProcessed`. `BounceParserService` + partial `.Imap.cs` + `Ndr3464Parser` + `BounceCorrelator` + `BounceParserJob` recurring `*/5 * * * *`. Procesa `INBOX`/`Junk`/`Trash` de los 7 buzones del pool Plan 22 F6. **Bloqueado hasta validación del header `X-Educa-Outbox-Id` en Roundcube post-deploy del Chat 1 (`c46dfa0` aún sin pushear)**. Brief en `.claude/chats/038-plan-31-chat-2-be-bounce-parser-imap-job.md` listo para cuando desbloquée.
2. **[Plan 24 · Chat 4 (B) · `Educa.API` · BE+OPS]** — subfase (A') cerrada 2026-04-24 con `CrossChexPollingOptions` + instrumentación Stopwatch (commit `862d4ca`). Falta (B): medir 48-72h de logs en prod (`ConfiguredMs / ElapsedMs / Drift`) y, si el proveedor lo permite, bajar `CrossChex:Polling:DelayBetweenPagesMs` de 30000 a 10000-15000 vía Azure App Configuration (sin redeploy). Cierra Plan 24 al 100%.
3. _(Plan 36 Chat 5 cerrado local 2026-04-27 — `awaiting-prod/` esperando smoke test del menú Auditoría en prod.)_

**Notas**:

- 🟢 **Plan 36 Chat 1 FE `/investigate` ✅ cerrado 2026-04-27** en `educa-web main` — Auditoría UX/UI de las 7 páginas internas de Monitoreo. Acta capturada con decisión binaria por página: 5 ✅ rediseñar (#1 Bandeja · #2 Dashboard tab Detalle · #3 Diagnóstico · #5 Trazabilidad Kanban · #6 reportes parcial), 3 🟡 ajuste menor (#4 flag flip · #6 métricas · #7 dato extra), 0 ⏭️. Bloqueador detectado: **#4 Auditoría no se ve por feature flag `auditoriaCorreos: false` en prod** — Chat 5 (060) lo flipea. Patrones cross-página: tab transparente (afecta múltiples shells, primer chat que toque lo resuelve global), header tabla transparente (debería estar en design-system pero verificar), botones text/outlined sin contraste (tokens del DS), slow requests #1+#3 fuera de scope FE. Plan: **8 chats derivados** (decisión usuario "1 chat por página") generados en `chats/open/` 056-063 — 7 FE + 1 BE Chat 4b (búsqueda diagnóstico por nombres/apellidos en `Educa.API`). Brief movido a `closed/055-plan-36-chat-1-fe-monitoreo-redesign-audit.md`. **Plan 36 a ~10%** (Chat 1 de 9 — 1 + 8 derivados). Orden recomendado: Chat 5 (flag flip · 5 min) → Chat 4b BE → Chat 2 (#1 Bandeja) → Chat 4 FE (#3) → Chat 6 (#5 Kanban) → Chat 3 (#2 Dashboard) → Chat 7 (#6) → Chat 8 (#7).

- 🟢 **Plan 35 Chat 1 FE ✅ cerrado 2026-04-27** en `educa-web main` — **Plan 35 al 100%**. Submódulo "Sistema → Monitoreo" reagrupado: 7 entradas planas → 1 hub `/intranet/admin/monitoreo` con 3 dominios (Correos / Incidencias / Seguridad). Hub con cards filtradas por permiso individual + feature flag, empty state si no hay permisos. Shells minimalistas (`<p-tabs>` + `<router-outlet>`, sin page-header propio porque las páginas hijo ya tienen el suyo) sincronizados con URL vía `toSignal(router.events filter NavigationEnd)` + `route.firstChild.snapshot.url[0].path`. Correos shell con 4 tabs (3 últimas con feature flags), Incidencias con 2, Seguridad sin shell (página directa con flag `rateLimitMonitoring`). Las 7 URLs viejas (`/admin/email-outbox`, `/admin/email-outbox/dashboard-dia`, `/admin/email-outbox/diagnostico`, `/admin/auditoria-correos`, `/admin/trazabilidad-errores`, `/admin/reportes-usuario`, `/admin/rate-limit-events`) viven ahora como `MONITOREO_LEGACY_REDIRECTS` con `pathMatch: 'full'`. Permisos individuales reutilizados vía `data.permissionPath` en cada child route — sin tocar el catálogo `permission-registry.ts` ni la BD. Permiso del item del menú: `ADMIN_EMAIL_OUTBOX` (más universal). **NO se tocó lógica interna de las 6 páginas existentes** — refactor estructural puro. 9 archivos nuevos + 2 modificados, ~410 ln. Validación: lint exit 0 (1 warning preexistente fuera de scope), build prod exit 0 (28.6s, 9 rutas prerrenderizadas), tests **1683/1683 verdes** (sin regresiones, sin tests nuevos — el chat fue refactor de routing/menú, no de componentes con lógica). Fix puntual durante validación: `onTabChange(value: string \| number \| undefined)` con early return — PrimeNG 21 emite `undefined`. **Pendiente verificación post-deploy del usuario**: smoke test browser → click menú "Sistema → Monitoreo" abre hub con 3 cards, click card abre primera tab del shell, refresh en sub-ruta carga tab correcto, las 7 URLs viejas redirigen al nuevo path. Brief movido a `closed/053-plan-35-chat-1-fe-monitoreo-redesign.md`.

- 🟢 **Plan 30b FE ✅ cerrado 2026-04-27** en `educa-web main` — **Plan 30b al 100%** (BE + FE). Espeja el DTO `EntradaConCorreoEnviado` (13 campos) y el campo `entradasConCorreoEnviado` en `correos-dia.models.ts`; computed + entry en `vm` del store; `correos-dia.facade.spec.ts` mock actualizado defensivamente. Componente nuevo `entradas-con-correo-table/` (4 archivos, ~30 ln TS / ~65 ln HTML / ~15 ln SCSS, todos cap-OK) con 8 columnas (DNI · Nombre · Salón · Entrada · Correo apoderado · Envío · Estado · Correlation), severity `success` en el tag de Estado (design-system A1 Opción C: positivo crítico, sin `tag-neutral`), `<app-correlation-id-pill [id]="row.correlationId" [compact]="true" />` que reusa la pill del Plan 32 Chat 4. 4to sub-tab `enviados` agregado al HTML del `tab-correos-dia` con `tab-badge--success` (badge verde via `color-mix(in srgb, var(--green-500) 15%, transparent)` + `var(--green-700)` texto, mismo dimensionamiento que `tab-badge--neutral`). `ENVIADOS_COLUMNS` definido en el smart-component para el `app-table-skeleton` durante loading. **+3 tests** del componente presentacional (renderiza filas con DNI/nombre/correo enmascarados; empty state "Aún no hay entradas con correo enviado hoy"; tag severity success por fila). **Hallazgo menor**: el input de la pill se llama `id`, no `correlationId` (el brief lo había sugerido como `correlationId` por mnemónica) — la pill ya maneja null internamente devolviendo `—`, así que no hace falta `@if` defensivo. Validación: lint exit 0 (1 warning preexistente fuera de scope), typecheck exit 0, tests scoped al feature 35/35 verdes, `npm run build` exit 0 (warnings ExcelJS/SSR navigator/bundle budget preexistentes, ninguno atribuible al feature). 7 archivos del Plan 30b FE (6 modificados + 1 nuevo dir con 4 archivos del componente). **Pendiente verificación post-deploy del usuario**: smoke test en browser → arrancar dev server, navegar a `/intranet/admin/email-outbox?tab=correos-dia` → click "Detalle" → confirmar 4to sub-tab "Entradas con correo (N)" con badge verde + tabla con la pill correlation funcional (click navega al hub Plan 32). Brief movido a `closed/052-plan-30b-fe-entradas-con-correo-tab.md`.

- 🟢 **Plan 30b BE ✅ cerrado 2026-04-27** (commit `0ee5848` en `Educa.API master`) — lista simétrica positiva agregada al endpoint `GET /api/sistema/asistencia/diagnostico-correos-dia`. Nuevo DTO `EntradaConCorreoEnviado.cs` (13 campos: ids + persona + correo enmascarado + Estado + FechaEnvio + Remitente + CorrelationId), campo `EntradasConCorreoEnviado` agregado al `DiagnosticoCorreosDiaDto` como `required`. **Hallazgo del pre-work**: el JOIN del Plan 30 Chat 3 NO usa `EO_TipoEntidadOrigen` + `EO_EntidadOrigenId` (como sugería el brief original) sino correlación por `EO_Destinatario = EST_CorreoApoderado` dentro del día — el sistema NO persiste `EO_EntidadId` para correos `ASISTENCIA`. Implementación adaptada al patrón real: `OutboxRow` extendido con `CodId`/`Remitente`/`CorrelationId`, `CargarOutboxAsistenciaDelDiaAsync` proyecta los nuevos campos, `DiagnosticoCorreosDiaCorrelator` ahora construye la lista positiva en el caso `SENT` de `ClasificarPorEstado` (helper `BuildEntradaConCorreo`), `CorrelacionResult` extendido, `SnapshotFactory.BuildEmpty` agrega lista vacía. **+4 tests nuevos** (3 happy path/filtro/INV-C11/retry SENT neutraliza FAILED + extensión del fail-safe `InvS07_ContextDisposed`) → 1470 BE verdes (sin regresiones). Cap 300 ln respetado en todos los archivos modificados (Correlator queda en 292 ln). Brief movido a `closed/051-plan-30b-be-entradas-con-correo-enviado.md`. Habilita Chat FE Plan 30b para consumir el nuevo campo y agregar el 4to sub-tab simétrico verde/success.

- 🟢 **Plan 30 FE ✅ cerrado 2026-04-27** en `educa-web main`. Auditoría reveló que el feature `email-outbox-diagnostico/` ya estaba implementado al ~90% (2 tabs `correos-dia` + `correo-individual`, services, stores, facades, 11 componentes presentacionales, routing, menú admin con permiso `ADMIN_EMAIL_OUTBOX_DIAGNOSTICO`). Brecha real era **0 specs** + flag flip. Models FE validados contra los 8 DTOs reales de los Chat 3 + Chat 4 BE (campos exactos, sin desviaciones). **+32 tests** nuevos (3 service Gap + 6 facade Gap + 3 service Correo + 6 facade Correo + 3 resumen-component + 3 entradas-table + 2 blacklist-card + 6 smart-component principal con mock de ActivatedRoute/Router) → todos verdes. Flag flip `emailOutboxDiagnostico: false → true` en `environment.ts` (prod). Lint OK, build production OK (warnings ExcelJS preexistentes). Estructura del feature distinta al brief original (tabs con query param `?tab=` en lugar de rutas hermanas) — mantenida porque cohesiona bajo `/admin/email-outbox/*`, comparte permiso parent y reusa el deep-link `?correo=`. Brief movido a `closed/050-plan-30-fe-diagnostico-correos-dia-y-correo.md`. **Hallazgo del usuario en validación browser (2026-04-27)**: el sub-tab "Detalle" muestra solo 3 tablas del lado del gap (negativo), falta la simétrica positiva de "entradas con correo enviado". Se decide abrir **Plan 30b** (BE+FE derivado) en lugar de improvisar — ver brief `.claude/chats/051-plan-30b-be-entradas-con-correo-enviado.md`. Plan 30 al **100%** sobre el alcance original; el Plan 30b agrega scope nuevo, no rellena un gap del Plan 30.

- 🟢 **Plan 34 Chat 4 FE ✅ cerrado 2026-04-25** en `educa-web main`. Feature `error-logs/` renombrado a `error-groups/` con la ruta pública `/intranet/admin/trazabilidad-errores` preservada — solo cambia el `loadComponent` interno de `intranet.routes.ts`. Multi-facade (data + crud + ui) consume los 5 endpoints del Chat 3 BE (`0b67b04`): listar paginado, count separado (variante B `pagination.md`), detalle, ocurrencias paginadas, PATCH cambio estado. Drawer del grupo con tabs `p-tabs` `Resumen` (metadata + observación) / `Ocurrencias` (tabla paginada server-side, click en fila abre sub-drawer). Sub-drawer de ocurrencia movido (no duplicado) desde `error-log-detail-drawer/` legacy con la pill `<app-correlation-id-pill>` Plan 32 + botón "Ver eventos correlacionados" intactos. Dialog cambio estado con select que solo lista destinos válidos según `ESTADO_TRANSITIONS_MAP[grupo.estado]` (defensa en profundidad — el BE rechaza con `ERRORGROUP_TRANSICION_INVALIDA`); idem X→X queda inalcanzable desde UI. Outputs renombrados a `confirmStatus`/`cancelStatus` por ESLint `no-output-native`. WAL optimista en `cambiarEstado`: `apply` muta store + cierra dialog inmediato; `rollback` restaura snapshot exacto a estado y rowVersion previos; `onError` mapea errorCodes específicos: `INV-ET07_ROW_VERSION_STALE` → `dataFacade.refetchGroup(id)` + warning "El grupo fue modificado", `ERRORGROUP_TRANSICION_INVALIDA` → showError "Transición no permitida", 404 → `removeGroup` + warning. Toggle "Ocultar resueltos/ignorados" ON por defecto via filtro client-side `visibleItems` en store cuando no hay filtro estado explícito (deuda menor: el BE acepta solo 1 estado a la vez — documentada en plan). Filtros con URL query params para deep-link y back button (`router.navigate([], { queryParams, queryParamsHandling: 'merge', replaceUrl: true })`). Carpeta vieja `pages/admin/error-logs/` eliminada (sin imports rotos confirmado por grep). Componente principal extraído opciones de filtro y skeleton a `config/error-groups.config.ts` para mantener cap 300 ln. **+33 tests** (12 store: setters/mutaciones quirúrgicas/visibleItems/stats; 7 service: 5 endpoints incluyendo getOcurrenciaCompleta legacy; 6 crud-facade: WAL apply/rollback/snapshot exacto/3 errorCodes específicos/onCommit success; 8 dialog: opciones por estado origen/canSubmit/onConfirm trim/reset al abrir) → **1630 FE verdes** (baseline 1600 — exactamente el target del brief). Lint OK (0 errores; 1 warning preexistente fuera de scope), build production OK, cap 300 ln respetado en todos los archivos. **Plan 34 ahora al 80%**. Brief en `.claude/chats/048-plan-34-chat-4-fe-error-groups-tabla-drawer-dialog.md` listo para mover a `closed/`. **Pendiente Chat 5 FE**: vista Kanban + drag-drop CDK + toggle vista + exploración mobile.

- 🆕 **Plan 33 abierto 2026-04-25** — `Auditoría de paginación de tablas (count real)`. Origen: `error-logs admin` mostraba "Página 1 de 2" al cargar, ocultando que en realidad había 30 páginas. El usuario tenía que avanzar uno a uno para descubrir el total — anti-patrón "estimación progresiva sola" (`offset + pageSize + 1`). Fix puntual aplicado en este chat: `Educa.API master 7e9d10b` (endpoint `GET /api/sistema/errors/count` con filtros compartidos vía `AplicarFiltros` privado static) + `educa-web main 1a13062` (`getCount` en service + `_totalCount` signal en store + fetch paralelo en facade + fallback a estimación si count falla). Mientras se aplicaba el fix se documentó el patrón general en regla nueva `.claude/rules/pagination.md` (variantes: A wrapper paginado `{ data, total, page, pageSize }`, B endpoint `/count` separado; client-side default cuando lista cabe; trampas como filtros divergentes, mutación que no decrementa total, doble fetch al paginar) y se abrió el plan `.claude/plan/pagination-audit.md` con inventario inicial. Estado: ✅ **5 features ya correctas** (usuarios admin / horarios admin / vistas admin / permisos-roles admin con wrapper paginado, + error-logs admin con count separado), ✅ **8 client-side correctas** (cursos / salones / events-calendar / notificaciones / email-outbox / rate-limit-events / feedback-reports / permisos-usuarios — PrimeNG conoce el total del array completo), 🔍 **8 a auditar** (attendances admin, attendance-reports cross-role, email-outbox-diagnostico, email-outbox-dashboard-dia, attendance-day-list, responsive-table, student-attendance-tab, attendance-summary-panel — riesgo bajo-medio: la mayoría son listas acotadas por día/curso/estudiante). Plan 5%, listo para chat dedicado que clasifique los 8 candidatos. No urgente — el fix de `error-logs` resolvió el síntoma reportado.
- ✅ **Plan 32 Chat 4 FE ✅ cerrado 2026-04-25** (commit `a70b8d3` en `educa-web main`) — Plan 32 al **100%**. Hub `/intranet/admin/correlation/:id` agrega las 4 fuentes (`ErrorLog`, `RateLimitEvent`, `REU_ReporteUsuario`, `EmailOutbox`) en una vista única alimentada por el endpoint `GET /api/sistema/correlation/{id}` cerrado en Chat 3 BE. Pill reusable `<app-correlation-id-pill>` en `@shared/components/correlation-id-pill/` (standalone, OnPush, `tag-neutral` styleClass per design-system A1 Opción C, aria-label dinámico per a11y.md, click navega via Router; modo `compact` trunca a 8 chars con tooltip que muestra el id completo). Wiring en los 4 dashboards: **error-logs** (drawer reemplaza span mono por pill + agrega botón "Ver eventos correlacionados"; store + facade + component leen query param `correlationId` desde el hub), **rate-limit-events** (pill compact en columna existente; drawer con pill; `onBuscarEnErrorLog` redirige al hub; filter `correlationId` agregado al modelo + service — el BE no lo soporta hoy, filter aplicado client-side en facade; component lee query param), **feedback-reports** (pill en row del CorrelationId; flujo cross-link al drawer de error-logs **eliminado** — la pill al hub es estrictamente más informativa; component lee query param), **email-outbox** (nueva columna "Correlation" 110px con pill compact; `EmailOutboxLista` extendido con `correlationId: string|null` reflejando lo que BE ya retornaba en `EmailOutboxListaDto` desde Chat 2; filter client-side en `filteredItems` computed). Permiso reusado vía override `data.permissionPath: 'intranet/admin/trazabilidad-errores'` en `permisos.guard.ts:getFullPath` (retrocompatible — rutas sin override siguen funcionando). Sin entrada de menú; sin permiso nuevo en el registry. **+24 tests** (5 pill: render, click navega, compact trunca, fallback null, edge case <8 chars; 1 service: GET con id encoded; 4 facade: load + 400 + 500 + empty id rejected; 3 hub component: load on init, 4 secciones siempre, sin :id no carga; 3 error-logs.store: filterCorrelationId default + setter + clear; +1 rate-limit.store extendido) → **1600 FE verdes** (baseline 1535+; suite completa 146 archivos). Lint OK (1 warning preexistente fuera de scope). Build OK. ~22 archivos producción tocados (4 pill + 14 feature correlation + 4 wiring de dashboards + 1 routes + 1 guard) + 6 archivos de test. **Limitaciones documentadas**: (a) `ReporteUsuarioListaDto` BE no incluye `correlationId` → filter por ese campo no factible en feedback-reports (deuda lateral menor — agregar el campo al DTO de lista habilitaría filter completo), (b) BE de rate-limit-events no acepta filtro `correlationId` aún → filter client-side. Cuando BE lo soporte, FE no requiere cambios — el query param ya se envía. **Pendiente verificación post-deploy del usuario**: 5 flujos de browser (drawers→hub, deep-link directo `/correlation/xxx`, id ficticio→4 empty states, back button preserva filtros, navegación entre dashboard y hub). **Cola top 3**: el usuario decide si Plan 32 sale ya (movido a `history/planes-cerrados.md`) o queda como ✅ 100% sin archivar hasta validación post-deploy. Brief en `.claude/chats/045-plan-32-chat-4-fe-correlation-hub-pill-wiring.md` listo para mover a `closed/`.
- 🟢 **Plan 32 Chat 3 BE ✅ cerrado 2026-04-25** (commit `7184bab` en `Educa.API master`). Endpoint `GET /api/sistema/correlation/{id}` agregando las 4 fuentes (`ErrorLog`, `RateLimitEvent`, `REU_ReporteUsuario`, `EmailOutbox`) en `ApiResponse<CorrelationSnapshotDto>` (INV-D08), `[Authorize(Roles = Roles.Administrativos)]`. Patrón Plan 30 canónico — `ApplicationDbContext` directo (sin repositorios separados), 4 queries `AsNoTracking()` secuenciales, cada una con try/catch independiente + lista vacía como fallback (INV-S07 por tabla), catch global vía `CorrelationSnapshotFactory.BuildEmpty(eco, generatedAt)`. Caps defensivos: 100 filas por tabla, 200 chars en `ERL_Mensaje`/`EO_UltimoError`/`REU_Descripcion`/`REU_Propuesta`. DNIs enmascarados con `DniHelper.Mask` antes de salir del service (excepto `ERL_UsuarioDni`, ya enmascarado upstream por `EmailFailureLogger`). Email destinatario también enmascarado. Controller valida path id (no-empty + cap 64 chars defensivo) + trim. Índices BD: 2 ya existían (`IX_ErrorLog_CorrelationId`, `IX_REU_CorrelationId` — naming inconsistente, este último sin sufijo `_ReporteUsuario`, no se consolidó); los 2 faltantes (`IX_RateLimitEvent_CorrelationId`, `IX_EmailOutbox_CorrelationId`) los creó manualmente el usuario con mismo patrón `WHERE ... IS NOT NULL`. **Hallazgo del pre-work**: la tabla real es `[Table("REU_ReporteUsuario")]` (no `ReporteUsuario`) — el SELECT de inspección fallaba si solo se filtraba `'ReporteUsuario'`. **Fix de tests**: tras correr la primera vez fallaron 4 tests por nullability de `REU_RowVersion` en EF InMemory; se agregó `modelBuilder.Entity<ReporteUsuario>().Property(r => r.REU_RowVersion).IsRequired(false)` al `RelaxedDbContext`, en línea con el patrón ya existente para `EmailOutbox`/`EmailBlacklist`/`CrossChexSyncJob`. **+18 tests** (9 service: universo vacío, mix 4 fuentes, filtrado por id, DNI enmascarado, anónimo INV-RU05, cap 100, contexto disposed, truncado descripción/ultimoError; 9 controller authz + contract path id) → **1397 BE verdes** (baseline 1379, +18). 13 archivos tocados (12 commit + 1 fix tests), `CorrelationService.cs` 239 líneas (cap 300 respetado). **Pendiente verificación post-deploy del usuario**: `GET /api/sistema/correlation/{id}` con un id real (lookup vía `SELECT TOP 1 ERL_CorrelationId FROM ErrorLog WHERE ERL_CorrelationId IS NOT NULL`) y confirmar que las 4 secciones llegan con el shape esperado. **Cola top 3**: el usuario decide si Chat 4 FE (hub page + pill + wiring, ~18-22 archivos FE — chat extenso, mejor sesión limpia) entra al top 3 ahora o queda como siguiente trabajo derivado del Plan 32.
- 🟢 **Plan 32 Chat 2 BE ✅ cerrado 2026-04-25** (commit `<pendiente>` en `Educa.API master`). `EO_CorrelationId NVARCHAR(36) NULL` ya existía en BD (creada por el usuario el 2026-04-24 durante el /design). Modelo `EmailOutbox` gana propiedad. **Hallazgo del pre-work**: `CorrelationIdMiddleware` solo inyectaba el id en el `BeginScope` del logger y en el header de RESPONSE — NO escribía a `HttpContext.Items`. Se agregó constante pública `CorrelationIdItemKey = "CorrelationId"` + `context.Items[CorrelationIdItemKey] = correlationId;` antes del `OnStarting`. Hook en `EmailOutboxService.EnqueueAsync` (partial `.Enqueue.cs`) consume la constante (no string mágico) vía helper `ResolveCorrelationId` con triple null válido (sin accessor / sin HttpContext / sin key) y try/catch global INV-S07. `IHttpContextAccessor?` agregado al constructor del service como parámetro opcional (patrón Plan 22 F3.BE de `EmailFailureLogger`). `EmailOutboxListaDto` + proyección de `ListarAsync` exponen `string? CorrelationId` para Chat 4 FE (no hay endpoint nuevo para el listado admin, ya existía). **+6 tests** (con id, sin HttpContext, sin key, valor no-string boxed → ToString + truncate a 36, ListarAsync hidrata DTO, INV-MAIL01 prevalece sobre el hook) → **1379 BE verdes** (baseline 1373). 6 archivos tocados, cap 300 respetado en todos (`EmailOutboxService.cs` ≈215, `Enqueue.cs` ≈140). Deuda detectada: `EmailFailureLogger.ExtractCorrelationId` lee `X-Correlation-Id` del REQUEST header (no del response que el middleware escribe) — puede devolver null si el cliente no lo manda; fuera del scope, anotada en plan file. **Pendiente verificación post-deploy del usuario**: ejecutar request admin (login, submit reporte) + `SELECT TOP 5 EO_CodID, EO_Destinatario, EO_CorrelationId, EO_FechaReg FROM EmailOutbox ORDER BY EO_CodID DESC;` para confirmar persistencia. **Cola top 3 sin cambios** — Plan 32 Chat 3 BE no desplaza a los existentes; posición a definir con el usuario.
- 🟢 **Plan 32 Chat 1 `/design` ✅ cerrado 2026-04-24** — 11 decisiones acordadas. Hub-and-spoke con pantalla dedicada + pill reusable. Endpoint unificado 4 fuentes con fail-safe INV-S07. EmailOutbox como 4ª fuente agregando `EO_CorrelationId` (scope extendido vs brief original). Plan file en `.claude/plan/correlation-id-links.md`. Brief en `.claude/chats/closed/042-plan-32-chat-1-design-correlation-id-links.md`. **Cola top 3 sin cambios** — Plan 32 Chat 2 BE no desplaza a los existentes; posición a definir al arrancar el primer /execute.
- 🆕 **Plan 32 creado 2026-04-24** — `Centralización de errores vía Correlation ID`. Origen: el usuario observó que los 3 dashboards admin (`trazabilidad-errores`, `rate-limit-events`, `reportes-usuario`) comparten el mismo GUID en BD pero el id no es clickeable ni cruza de un dashboard al otro. Frase motivadora: *"un id correlational que no se puede usar no sirve de nada"*. Investigación pre-work confirmó que el 30% del cableado ya existe (rate-limit → error-logs con query param funcional, feedback-reports → drawer reutilizado) pero error-logs.store no lee el query param, rate-limit-events BE no acepta filtro `correlationId`, y `EmailOutbox` no tiene columna de correlación (deuda latente). Plan 32 cierra las 3 brechas + agrega un hub central. 4 chats definidos: Chat 1 /design ✅ + Chat 2 BE (EmailOutbox column) + Chat 3 BE (endpoint + índices) + Chat 4 FE (hub + pill + wiring).
- 🟢 **Plan 30 Chat 4 F4.BE ✅ cerrado 2026-04-24** (commit `3c316a2` en `Educa.API master`) — diagnóstico por correo específico. Endpoint `GET /api/sistema/email-outbox/diagnostico?correo={email}` que cruza `EmailOutbox` (resumen + últimas 50 filas) + `EmailBlacklist` (estado activo/despejado) + 4 tablas de persona (lookup polimórfico `Estudiante`/`Profesor`/`Director`/`Apoderado`). Reemplaza el set manual M1-M8 de SSMS. DTO compuesto (`EmailDiagnosticoDto`) con `Resumen` (totales por estado + primer/último intento + `MostrandoUltimos`), `Historia[]` (metadatos, sin `CuerpoHtml`, `UltimoError` truncado a 200 chars), `Blacklist?` nullable, `PersonasAsociadas[]` con DNI enmascarado + `Campo` (qué columna guarda el correo). Input normalizado (trim + lower) antes de cualquier query — el DTO devuelve el eco normalizado en `CorreoConsultado`. Cap fijo 50 filas (decisión 1+3 del brief). Lookup de personas extraído a `EmailDiagnosticoPersonaLookup` (133 líneas) para mantener service bajo cap 300. Validación de input rudimentaria en controller: `CORREO_REQUERIDO` (vacío/null) / `CORREO_INVALIDO` (sin `@` o >200 chars). Fail-safe INV-S07 vía `EmailDiagnosticoSnapshotFactory.BuildEmpty`. **+16 tests** (10 service con `TestDbContextFactory` cubriendo universo vacío + historia mixta SENT/FAILED + blacklist activo/despejado + estudiante lookup con DNI enmascarado + duplicado E+P + normalización trim/case + cap 50 de 100 filas + UltimoError truncado + INV-S07 context disposed; 5 controller contract + 1 authz marker por reflection) → **1371 BE verdes** (baseline 1355, sin regresiones). Plan 30 a ~95%, solo FE consumer queda como tarea posterior (Chat 3 + Chat 4 combinables).
- 🟢 **Plan 30 Chat 3 F3.BE ✅ cerrado 2026-04-24** (commit `eb92ec2` en `Educa.API master`) — gap asistencia-vs-correos. Endpoint admin cruzando 4 tablas (AsistenciaPersona + Estudiante + EmailOutbox + EmailBlacklist) con correlación por destinatario+fecha, INV-C11 aplicado in-memory, DNI/correos enmascarados, fail-safe INV-S07. 19/19 tests del scope verde + 1355 BE verdes (sin regresiones).
- 🟢 **Plan 31 Chat 1 BE ✅ cerrado 2026-04-24** (commit `c46dfa0` en `Educa.API master`) — foundation desplegable: header `X-Educa-Outbox-Id` activo + handler split (sync/async) + columnas BD ya escribiéndose desde el worker. 24/24 tests del scope verde + 1336 BE verdes (sin regresiones). Brief movido a `closed/`. Chat 2 quedó **bloqueado por deploy pendiente**: el commit sigue sin pushear y no hay validación del header en Roundcube, precondición crítica del Chat 2. El brief `038-plan-31-chat-2-...md` permanece en `chats/` (no en `closed/`) hasta arrancar.
- 🆕 **Plan 31 creado 2026-04-24** — `BounceParserService` para detección asíncrona de NDRs via IMAP polling. Origen: capturas del usuario mostrando dashboard "0 fallos" cuando la bandeja `sistemas4@` tenía 8+ bounces reales (`550-5.1.1 User unknown` de Gmail). Resuelve violación silenciosa de INV-MAIL02 (no alimenta blacklist con bounces async) + ahorro indirecto de cuota cPanel (INV-MAIL03). 3 chats: Chat 1 foundation (BD+header+refactor), Chat 2 parser+job, Chat 3 FE widget. Scripts SQL ejecutados por el usuario 2026-04-24 (2 columnas `EmailOutbox` + tabla `BounceParserProcessed`). Env vars `Email__BounceParser__FoldersToScan__0/1/2` + `PollingIntervalMinutes=5` + `FallbackMatchWindowMinutes=120` + `MaxNdrsPerBuzonPerCycle=50` configuradas en Azure App Services.
- 🟢 **Plan 24 Chat 4 (A') ✅ cerrado 2026-04-24** (commit `862d4ca` en `Educa.API master`, +2 tests → 1373 BE verdes) — `CrossChexPollingOptions.DelayBetweenPagesMs` expuesto como `IOptions` (binding en sección `"CrossChex:Polling"`), default 30000ms preservado. El `Task.Delay` se envuelve con `Stopwatch` y loggea `ConfiguredMs / ElapsedMs / Drift` en cada espera — con 48-72h de logs en prod se decide si el delay puede bajar a 10-15s sin disparar 429 del proveedor. Subfase (B) queda pendiente: medir + bajar vía config sin redeploy.
- **Plan 31 Chat 3 FE** (widget dashboard async vs sync + INV-MAIL05 docs) fuera del top 3 hasta que el parser esté validado en prod.
- Chat 3 OPS del Plan 29 lo ejecuta el usuario con el hosting; el micro-chat post-OPS para swap del threshold entra a la cola solo si OPS negocia un valor nuevo.
- Plan 29 queda a ~90% tras Chat 4 docs cerrado. Solo faltan Chat 3 OPS + eventual micro-chat de swap.
- **Plan 22 ✅ CERRADO 100% 2026-04-23** — Chat 6 F4.FE completado (+16 tests → 1535 FE verdes). Pantalla admin `/intranet/admin/auditoria-correos` con feature flag OFF prod.
- **Plan 28 Chat 3 BE** (reportes AA) está **bloqueado por validación del jefe Plan 27 post-deploy** — vuelve a la cola cuando llegue esa señal. Hoy fuera del top 3.
- **Plan 26 F3** (time-of-day modifier) está **en espera de datos reales** — 1-2 semanas de telemetría F1/F2 post-deploy antes de calibrar el multiplier. Hoy fuera del top 3.
- **Design System F5.3** es la prioridad más baja — ajustes visuales mínimos, agrupar páginas afines en un chat cuando toque.
- Frentes sin bloqueo (Carril D Olas 2+) no entran aquí hasta que desplacen prioridad a uno de los 3 ítems activos.

---

**Foco (actualizado 2026-04-24, post-cierre Plan 30 Chat 3 F3.BE)**: 🟢 **Plan 30 Chat 3 F3.BE ✅ cerrado 2026-04-24** (`Educa.API master`, commit `eb92ec2`). Endpoint admin `GET /api/sistema/asistencia/diagnostico-correos-dia?fecha={yyyy-MM-dd}&sedeId={n}` que cruza 4 tablas (AsistenciaPersona + Estudiante + EmailOutbox + EmailBlacklist) y responde el dolor "marcaron entrada 62 pero solo salieron 56 correos — ¿quiénes son los 6?". **13 archivos nuevos** + 1 modificado (DI): constante `DiagnosticoRazones` con 5 valores canónicos (`SIN_CORREO` / `BLACKLISTED` / `FALLIDO` / `PENDIENTE` / `SIN_RASTRO`) · 5 DTOs bajo `DTOs/Sistema/` (compuesto + resumen + 3 listas drill-down) · `IDiagnosticoCorreosDiaService` · `DiagnosticoCorreosDiaSnapshotFactory` (fail-safe INV-S07) · `DiagnosticoCorreosDiaService` (167 líneas, DbContext directo con 3 queries secuenciales) · `DiagnosticoCorreosDiaCorrelator` (261 líneas, lógica pura separada para respetar cap 300 del service) · `SistemaAsistenciaDiagnosticoController` con validación fecha (reusa `TryResolverFecha` del Chat 1) + `sedeId` opcional (null = todas las sedes). **Decisiones del chat**: (1) nuevo controller dedicado bajo `/api/sistema/asistencia/` en vez de mezclar con `ConsultaAsistenciaController` — ruta natural, aislamiento limpio; (2) `sedeId` opcional con null = todas, validación positiva si presente; (3) razón `SIN_RASTRO` tal cual (caso preocupante: webhook procesó marca pero no encoló correo — puede indicar bug o ventana cruzada de day boundary); (4) shape del DTO aceptado al primer pase; (5) rate limit heredado del layer global sin override específico (Chat 1 del Plan 30 ya estableció el patrón — no duplicar). **Correlación clave**: el sistema NO persiste `EO_EntidadId` para correos ASISTENCIA (el enqueue los inserta con `EntidadOrigen="Asistencia"`/id=null), así que el join es por `EO_Destinatario = EST_CorreoApoderado` + ventana temporal del día. Precedencia de estado cuando hay múltiples filas outbox para un destinatario: SENT > PENDING/RETRYING > FAILED (un retry exitoso neutraliza un FAILED previo, como ocurre naturalmente con los retries del worker Plan 22). INV-C11 aplicado in-memory post-join con contador separado `EstudiantesFueraDeAlcance` (transparencia sin polluir la métrica). DNI + correos enmascarados (`DniHelper.Mask` + `EmailHelper.Mask` — INV-D09 spirit). INV-S07 garantiza que un fallo interno devuelve DTO ceros + LogWarning nunca 500. **+19 tests** (13 service con `TestDbContextFactory.Create()` cubriendo las 5 razones + INV-C11 split + filtro sedeId + SENT-over-FAILED + context disposed; 6 authz por reflection `[Theory]` sobre 4 roles admin + 3 no-admin) → **1355 BE verdes** (baseline 1336). Build sin warnings nuevos, cap 300 respetado. **Cola top 3 actualizada**: (1) **Plan 30 Chat 4 BE promovido a #1** (búsqueda diagnóstico por correo — cierra Plan 30 al 100%), (2) Plan 31 Chat 2 BE (parser IMAP — bloqueado hasta deploy del Chat 1 del Plan 31 + validación header en Roundcube; commit `c46dfa0` sin pushear), (3) Plan 30 FE del Chat 3 (pantalla admin que consume el endpoint nuevo — entra cuando el admin valide el shape en uso real). **Nota sobre brief Plan 31 Chat 2**: el brief `038-plan-31-chat-2-...md` permanece en `.claude/chats/` (no movido a `closed/`) porque el chat sigue pendiente; se commitea aquí para trackearlo y evitar que se mezcle con otras sesiones. **Decisión del chat sobre priorización**: el usuario no pudo pushear por un tiempo, entonces saltamos del Plan 31 Chat 2 (que requiere validación del header post-deploy del Chat 1) al Plan 30 Chat 3 que no depende de push. Patrón canónico del Chat 1 F1.BE del Plan 30 extraído y reusado: DbContext directo sin repo separado + snapshot factory para fail-safe + controller con `TryResolverFecha` copy-paste. 🟢 **Plan 31 Chat 1 F1.BE ✅ cerrado 2026-04-24** (`Educa.API master`, commit `c46dfa0`). Foundation del bounce parser asíncrono lista para deploy. **9 archivos**: 7 modificados + 2 creados. **Schema**: `EmailOutbox` model gana `EO_BounceSource` (nullable, max 20, valores `"sync"` | `"async-imap"`) + `EO_BounceDetectedAt` (DateTime?) — columnas BD ya desplegadas 2026-04-24, no hay migration manual. **Header de correlación**: `Email` model gana `long? OutboxId`; `EmailService.BuildMimeMessage` (ahora `internal static` para tests) inyecta `X-Educa-Outbox-Id: {EO_CodID}` con `CultureInfo.InvariantCulture` cuando el caller pasa `OutboxId`; `EmailOutboxWorker` setea `OutboxId = entry.EO_CodID` en cada envío. Path legacy `SendEmailAsync` no setea — sus correos no se rastrean por outbox y NO deben aparecer al parser. **Refactor handler**: `EmailBounceBlacklistHandler.HandleAsync` se renombra a `HandleSyncFailureAsync` (entry SMTP del worker — mantiene los 3 guards SSL/auth/throttle + delega), y se extrae `HandleBounceAsync(entry, destinatario, errorMessage, tipoFalloClassified, bounceSource, ct)` agnóstico de `Exception` para que el parser IMAP del Chat 2 lo invoque sin fabricar excepciones. **Decisión del test #9 del brief**: SÍ mutar `EO_BounceSource` + `EO_BounceDetectedAt` en TODO bounce permanente procesado (incluso 1er/2do que no llega al umbral 3) — info de auditoría valiosa por canal. PERO `OutboxEntryWasMutated` se mantiene `false` cuando no hay cambio de estado terminal — el worker sigue aplicando su policy normal. Conserva 100% el contrato actual con el worker (commit hash `c46dfa0`). **Constantes compartidas**: `Constants/Sistema/BounceParserConstants.cs` con `OutboxIdHeaderName = "X-Educa-Outbox-Id"`, `BounceSourceSync = "sync"`, `BounceSourceAsyncImap = "async-imap"`. **Tests**: 6 existentes del handler renombrados (`HandleAsync_*` → `HandleSyncFailureAsync_*`) + 2 nuevos (`HandleBounceAsync_TercerBounceAsyncImap_*` + `HandleBounceAsync_PrimerBounceAsyncImap_GrabaSourceComoAuditPeroNoEsEstadoTerminal`); test #5 actualizado para validar que graba source aunque no llegue al umbral. 3 tests nuevos de `EmailService.BuildMimeMessage` (header con OutboxId, sin OutboxId, con `long.MaxValue` para invariant culture). 1 test nuevo en `EmailOutboxWorkerTests` (`ProcessNext_AsignaOutboxIdAlEmail_ParaCorrelacionConParserImap`) capturando `LastEmailSent.OutboxId == seed.EO_CodID` via stub mejorado. **Resultado**: 24/24 tests del scope verde · 1336/1336 BE verdes (sin regresiones) · build sin warnings nuevos · `EmailBounceBlacklistHandler.cs` 267 líneas (bajo cap 300). Brief movido a `closed/`. **Pendiente post-deploy**: el usuario debe verificar en Roundcube que enviar un correo de prueba muestra el header `X-Educa-Outbox-Id: NNN` en `Sent` — premisa crítica de Chat 2 (cPanel/Exim NO debe strippear el header). Recomendable esperar 24-48h entre Chat 1 y Chat 2 para acumular NDRs reales con el header en producción. **Cola top 3 actualizada**: (1) **Plan 31 Chat 2 BE promovido a #1** (parser IMAP + Hangfire job), (2) Plan 30 Chat 3 BE, (3) Plan 30 Chat 4 BE. 🟢 **Plan 24 Chat 3 F3.FE ✅ cerrado 2026-04-24** (`educa-web main`). Reemplaza el spinner bloqueante del sync CrossChex por UX no-bloqueante basada en SignalR. Nuevo servicio singleton `CrossChexSyncStatusService` trackea el job via `AsistenciaHub` (reusa la `HubConnection` del `AttendanceSignalRService` existente vía nuevo `ensureConnected()` — no abre segunda conexión). Persistencia `sessionStorage` via wrapper `StorageService.get/setCrossChexJobId()` (respeta regla `no-restricted-globals`). `rehydrate()` tras F5 lee storage + `GET /sync/{jobId}/status` + re-suscribe al hub si sigue activo. Nuevo `CrossChexSyncBannerComponent` standalone OnPush con `p-progressBar` (QUEUED indeterminate, RUNNING con % por página, FAILED banner rojo con `color-mix()` + botón Reintentar). `AttendancesDataFacade.sincronizarDesdeCrossChex` refactorizado: POST 202 → `startTracking(jobId)`; 409 Conflict → extrae `data.jobId` del error body (interceptor NO unwrappea `success:false`) y re-suscribe al existente (UX conveniente). Botón sync con `[disabled]="syncActive()"` + tooltip contextual. `ngOnInit` suscribe `terminal$` → toast success + `loadData()` en COMPLETED, toast error + banner rojo en FAILED. **Decisiones aceptadas**: (1) servicio nuevo dedicado, (2) sessionStorage + rehydrate, (3) banner inline full-width no fixed, (4) botón disabled + 409 re-suscribe, (5) mensajes por fase según brief. Observación aceptada: DTO real usa `pagina/iniciadoEn/finalizadoEn` (no `paginaActual/fechaInicio/fechaFin` del brief). **+29 tests FE** (15 service + 12 banner + 2 netos facade por migración) → **1583 FE verdes** (baseline 1554). Lint global + build limpios. Plan 24 a **~75%** (Chat 3 de 4). **Cola top 3 actualizada**: (1) **Plan 24 Chat 4 BE promovido a #1** (validar `Task.Delay` + deploy — cierra el Plan 24), (2) Plan 30 Chat 3 BE, (3) Plan 30 Chat 4 BE. 🆕 **Plan 30 creado 2026-04-23** — `Dashboard Visibilidad Admin`. Origen: sesión de cierre del Plan 24 Chat 2 reveló que el admin depende de 25+ queries SQL manuales para verificar correos y asistencia cada día ("altamente impráctico"). Plan 30 convierte esas queries en pantallas admin reutilizables. 4 chats planeados: F1.BE dashboard correos del día (Q1/Q3/Q4/Q8+D1/D4), F2.BE gap asistencia-vs-correos (verificación INV-C11 + D2/D3/D5), F3.BE búsqueda diagnóstico por correo (M1-M8), F4.FE pantallas que consumen los 3 endpoints. Brief del Chat 1 en `.claude/chats/034-plan-30-f1-be-dashboard-correos-dia.md`. **Cola top 3 reordenada**: (1) Plan 29 Chat 3 OPS, (2) **Plan 30 F1.BE promovido a #2** sobre Plan 24 Chat 3 FE (decisión: dolor diario real vs UX pulida), (3) Plan 24 Chat 3 FE desplazado a #3. 🟢 **Plan 24 Chat 2 F2.BE ✅ cerrado 2026-04-23** (`Educa.API master`, commit `513c6cc`). Broadcast SignalR del progreso del sync CrossChex. `AsistenciaHub` expone `SubscribeToSyncJob` / `UnsubscribeFromSyncJob` con validación regex `^[a-f0-9]{32}$` (rechaza jobIds arbitrarios con `HubException`). `CrossChexSyncJobRunner` emite evento `"SyncProgress"` al grupo `"crosschex-sync-{jobId}"` en 4 transiciones (RUNNING, cada página del callback, COMPLETED, FAILED) vía helper privado `EmitirProgresoAsync` con try/catch + LogWarning (INV-S07: fallo del hub NUNCA falla el job). `AsistenciaAdminController` emite `QUEUED` inicial (decisión 3-A) justo tras crear el registro, cerrando el gap 0-500ms hasta el primer RUNNING del runner. Payload bit-a-bit idéntico al GET status via nuevo `CrossChexSyncStatusDtoMapper` estático (1 sola proyección para controller + runner). Decisiones del chat: (1) grupo `"crosschex-sync-{jobId}"` (prefijo largo), (2) NO auto-emitir al suscribir — feedback visual extra (timer, barra %) queda para Chat 3 FE usando campos del DTO actual, (3) emitir `QUEUED` desde controller. **+14 tests** (9 hub subscribe/regex/unsubscribe + 3 runner broadcasts/FAILED/INV-S07 resiliencia + 2 controller setup) → **1316 BE verdes** (baseline 1302). Build + test limpios. Plan 24 a **~50%** (Chat 2 de 4). **Cola top 3 actualizada**: (1) Plan 29 Chat 3 OPS, (2) Plan 24 Chat 3 FE (promovido), (3) pendiente (discutir al arrancar Chat 3). 🟢 **Plan 24 Chat 1 F1.BE ✅ cerrado 2026-04-23** (`Educa.API master`, commit `299db24`). Mueve `SobreescribirDesdeCrossChexAsync` de síncrono a background Hangfire. Nueva tabla `CrossChexSyncJob` + `POST /sync` retorna `202 Accepted { jobId, estado: "QUEUED" }` (rate limit `batch` + `[RateLimitOverride(3.0)]` = 15/min). Nuevo `GET /sync/{jobId}/status` con `CrossChexSyncStatusDto`. `409 Conflict` si hay job activo. Runner con callback async de progreso por página + correo resumen al admin disparador (COMPLETED/FAILED, fire-and-forget INV-S07). `Task.Delay(30000)` intacto con comentario (Chat 4 lo valida). **+7 tests** (5 controller + 2 runner) → **1302 BE verdes** (baseline 1295). Plan 24 a **~25%** (Chat 1 de 4). **Cola top 3 actualizada**: (1) Plan 29 Chat 3 OPS, (2) Plan 24 Chat 2 BE SignalR (promovido a #2), (3) pendiente (discutir al arrancar Chat 2). 🟢 **Plan 22 ✅ CERRADO 100% 2026-04-23**. Chat 6 F4.FE cerró la pantalla admin `/intranet/admin/auditoria-correos` (9 archivos FE + feature flag `auditoriaCorreos` OFF prod / ON dev + menú Sistema → Monitoreo + permiso `ADMIN_AUDITORIA_CORREOS`). Facade + Store + Service con filtros client-side + stats del universo, banner B9 sobre caracteres invisibles, navegación a Usuarios por clipboard+toast (opción B — `/admin/usuarios` no acepta query params hoy). **+16 tests** (7 store + 7 facade + 2 stats component) → **1535 FE verdes** (baseline 1519). Lint + build OK. **Cola top 3 actualizada**: (1) Plan 29 Chat 3 OPS (tu negociación cPanel), (2) Plan 24 Chat 1 design (sync CrossChex background — promovido), (3) pendiente (discutir al arrancar Plan 24). 🟢 **Plan 22 Chat 5 F4.BE ✅ cerrado 2026-04-23** (Educa.API `master`, commit `a1082eb`). Endpoint admin read-only `GET /api/sistema/auditoria-correos-asistencia` con `[Authorize(Roles = Roles.Administrativos)]` que lista los correos activos (Estudiante/Apoderado/Profesor) que fallan hoy `EmailValidator.Validate()` — mismo validador que el outbox (INV-MAIL01). Repository con 3 queries `AsNoTracking()`, service enmascara DNI (`DniHelper.Mask`) + correo (inline `MaskEmail`) antes de exponer, orden determinista. Pre-work SQL confirmó universo 192 filas (180+0+12) → sin paginación. **+21 tests** (11 service integration + 10 authz reflection) → **1295 BE verdes** (baseline 1274). Fila 22 a 97%. **Cola top 3 actualizada**: (1) Plan 29 Chat 3 OPS (tu negociación cPanel), (2) Plan 22 Chat 6 F4.FE (pantalla admin, cierra Plan 22 al 100%), (3) Plan 24 Chat 1 design (sync CrossChex background, arranca tras Chat 6). 🟢 **Plan 29 Chat 4 docs ✅ cerrado** (educa-web `main`, commit `5bad665`). `§18 Correos Salientes y Protección del Canal SMTP` + `§15.14 Invariantes de Correos Salientes` con 4 IDs `INV-MAIL01/02/03/04` agregados a `business-rules.md`. `INV-MAIL04` nuevo — formaliza endpoint `defer-fail-status` + widget. Checklist con bloque "CORREOS SALIENTES (Sección 18)". 5 comentarios `<!-- TBD post-OPS -->` sobre `5/h` para grep fácil cuando OPS cierre. 🟢 **Plan 22 Chat B defer-fail-widget ✅ cerrado 2026-04-23** (commit `5a74fdc`, +10 tests FE → 1519 verdes; fila 22 a 95%). 🟢 **Plan 29 Chats 2/2.5/2.6 BE ✅ cerrados 2026-04-22/23** (commits `674e86a`/`0580983`/`7b2a962`, acumulado +67 tests → 1274 BE verdes). 🟢 **Plan 26 F2 Chat 2 BE ✅ cerrado 2026-04-22** (overrides en 10 controllers/28 endpoints reportes + 3 observabilidad; 1119 verdes). Plan 29 a ~90% — queda solo Chat 3 OPS (tuyo) + eventual micro-chat swap. 🔴 **Cola del top 3 actualizada 2026-04-23** con decisiones del usuario post-sesión de priorización: (1) Plan 29 Chat 3 OPS — tu negociación con hosting cPanel, no es código; (2) **Plan 22 Chat 5 F4.BE** — endpoint `/api/sistema/auditoria-correos-asistencia` con pre-work SQL SELECT obligatorio; (3) **Plan 22 Chat 6 F4.FE** — pantalla `/intranet/admin/auditoria-correos` en sesión separada (decisión del usuario: BE y FE separados para menos riesgo). **Fuera del top 3** (decisiones 2026-04-23): Plan 28 Chat 3 BE bloqueado por validación jefe Plan 27, Plan 26 F3 en espera de telemetría ~2 semanas (decisión de calibración registrada: "margen suave fuera de franja, no corte duro"), Plan 24 prioridad baja pero obligatorio (arranca secuencial 1→4 tras cerrar Plan 22 F4), Design System F5.3 prioridad más baja (agrupar páginas afines). Post-deploy Chat 2.6: 48-72h monitoreo 0 `SslHandshakeException` + contador defer/fail cPanel bajando. Señal anotada: retry automático del worker peligroso con threshold bajo — evaluar migración a retry manual (el widget expone `Retrying` prominentemente para facilitar esto). 🟢 **Plan 27 cerrado en docs + código completo** — `INV-C11` formalizado, pendiente validación del jefe post-deploy. **Frentes sin bloqueo fuera del top 3**: Carril D Olas 2+.

---

## 🚨 Restricción crítica — Límites SMTP del hosting (cPanel)

> **Origen**: Dato confirmado por el usuario 2026-04-21 (cuotas de envío) y 2026-04-22 (bloqueo por defer/fail). Estos son los **techos duros reales** que aplica el hosting (cPanel) al envío saliente para evitar que el dominio entre en listas negras por spam. Superarlos significa que el servidor **descarta silenciosamente** los correos excedentes dentro de la ventana de una hora — sin bounce, sin error, sin log.
>
> **Hay DOS contadores independientes**. Uno limita envíos aceptados (cuotas); el otro bloquea el dominio entero cuando hay demasiados rebotes. Uno tiene holgura, el otro se agota con 5 correos inválidos. **Ambos hay que cuidar.**
>
> **Acción urgente**: afecta el diseño/estado de Plan 22, Plan 24, Plan 26 y motiva el nuevo **Plan 29** (corte de cascada defer/fail). Antes de retomar cualquiera de esos planes, revisar qué fases necesitan rediseño a la luz de estas cifras. No son "objetivo" ni "buena práctica" — son límites del hosting que no negociamos.

### Contador 1 — `max_defer_fail_percentage` (descubierto 2026-04-22, MOTIVA PLAN 29)

Techo: **5 defers+fails/hora por dominio**. Valor que el admin del hosting configuró; puede negociarse subirlo pero es bajísimo hoy.

Mensaje literal visto en la bandeja `sistemas6@laazulitasac.com`:

> *"Domain laazulitasac.com has exceeded the max defers and failures per hour (5/5 (100%)) allowed. Message discarded."*

**Qué cuenta** contra el contador:

- Bounces permanentes (550 NoSuchUser, 5.x.x)
- SSL/TLS handshake failures hacia el SMTP remoto (`SslHandshakeException`)
- Timeouts y 4xx temporales
- Defers internos de Exim

**Efecto cuando se agota**: 60 min de **bloqueo total** de envíos del dominio. Ningún correo legítimo sale, sin bounce ni log visible para el remitente. Es silencioso para la aplicación.

**Por qué importa tanto**: a diferencia de las cuotas de envío (200/h dominio es mucho), este contador llega a 5 **en minutos** si hay correos inválidos. Un solo correo mal escrito que rebote 2-3 veces por retry puede saturar el techo por sí solo. Y **Plan 22 F5/F6 NO protege contra esto** — el throttle cuenta envíos aceptados, no rebotes.

**Causa raíz identificada**: CrossChex comparte el pool SMTP saliente del dominio con Educa. Su lista interna de usuarios tiene correos desactualizados que ya no están en la BD Educa (`261ochapa@gmail.com` no aparece en `Estudiante`, `Profesor`, `Director`, `Apoderado` ni `EmailOutbox`). Cada rebote que genera CrossChex consume quota del dominio completo — y con 5/h bastan para bloquear a Educa.

Ver `Plan 29` más abajo para estrategia de mitigación.

### Contador 2 — Cuotas de envío aceptado

#### Cifras exactas

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

## 🔴 Plan 29 — Corte de cascada SMTP (`max_defer_fail_percentage`)

> **Origen**: Descubierto 2026-04-22 durante investigación de correos fallidos (`261ochapa@gmail.com`, `giovanna02@gmail.com`). **MÁXIMA PRIORIDAD ABSOLUTA** — mata correos legítimos en producción hoy.
> **Plan**: **inline en este maestro** — 4 chats, mismo criterio que Plan 27 y Plan 28.
> **Estado**: 🟢 **Chat 2.6 BE ✅ cerrado 2026-04-23** (commit `7b2a962`, +21 tests, 1274 BE verdes). Gap (2) agregados `DeferFailStatus` resuelto → **deuda D4 cerrada** + **Plan 22 Chat B desbloqueado**. 🟢 **Chat 2.5 BE ✅ cerrado 2026-04-23** (commit `0580983`, +11 tests, 1253 BE verdes). Gap (1) validación formato universal. 🟢 **Chat 2 BE ✅ cerrado 2026-04-22** (commit `674e86a`, +35 tests, 1242 BE verdes). 🟢 Chat 1 `/design` ✅ cerrado 2026-04-22. Siguiente: Chat 3 OPS (negociación hosting) + Chat 4 docs (`INV-MAIL01/02/03/04` en `business-rules.md §18`).
> **Validación**: post-deploy requiere 48-72h sin bloqueo del dominio antes de archivar.

### Qué se quiere

Impedir que un correo inválido (bounce 550) o una falla de SSL agote en minutos el contador `max_defer_fail_percentage` de cPanel y bloquee el dominio `laazulitasac.com` durante 60 min para TODOS los correos de Educa.

### Por qué importa ahora

- Hallazgo 2026-04-22: umbral configurado en **5 defers+fails/h**. Un solo correo mal escrito con retry agota el contador.
- **CrossChex comparte el pool SMTP del dominio** y envía desde su propia lista de usuarios (correos que no existen en la BD Educa). Sus rebotes consumen la cuota que necesita Educa.
- Los fallos de `luzbenitez19980405@gmail.com` y `Judithramos705@gmail.com` en el Outbox actual son `SslHandshakeException` — indica problema de configuración TLS en `EmailService` que también cuenta contra el umbral.
- **Plan 22 F5/F6 no protege esto**. El throttle per-sender cuenta envíos aceptados; el `max_defer_fail` cuenta rebotes. Son techos independientes y requieren defensas distintas.
- Durante el bloqueo, los correos legítimos de apoderados/profesores se **descartan en silencio** — sin bounce, sin log, sin error en la app. La víctima es el dominio completo.

### Diagnóstico confirmado

Queries ejecutadas por el usuario el 2026-04-22 buscando `261ochapa@gmail.com`:

| Tabla consultada | Resultado |
|------------------|-----------|
| `Estudiante.EST_CorreoApoderado` | 0 filas |
| `Profesor.PRO_Correo` | 0 filas |
| `Director.DIR_Correo` | 0 filas |
| `Apoderado.APO_Correo` | 0 filas (tabla vacía, no se usa) |
| `EmailOutbox.EO_Destinatario` | 0 filas |

Conclusión: **Educa.API no generó ese correo**. CrossChex (u otro sistema del cPanel compartido) lo envió desde su propia fuente.

> **Actualización 2026-04-22 (Chat 1 `/design`)**: el NDR de `durbyangelica19@gmail.com` inspeccionado durante el Chat 1 revela que **el correo bloqueado SÍ es de Educa** (`Subject: Registro de Entrada - CAYCHO RAMOS JULIO`, template HTML con banner `medylo.blob.core.windows.net`, `From: Sistemas Educa <sistemas3@laazulitasac.com>`, helo `webwk000002`). El caso original `261ochapa@gmail.com` sigue sin aparecer en Educa (hipótesis: viene de otro sistema cPanel o CrossChex para ese caso puntual), pero la causa **estructural** del bloqueo del dominio son los fallos propios de Educa (SSL handshake dominante). Query A (rebotes permanentes históricos) = 0 → no hay destinatarios muertos acumulados. El contador `5/h` lo consumen errores evitables nuestros. Ver sección "Las 8 decisiones" para el replanteo de las mitigaciones.

### Las 8 decisiones (Chat 1 cerrado 2026-04-22)

> **Hallazgo clave del Chat 1**: el NDR del 2026-04-22 (`durbyangelica19@gmail.com`) muestra que el correo rechazado por Exim es del template HTML de Educa (`Subject: Registro de Entrada - CAYCHO RAMOS JULIO`, `From: Sistemas Educa <sistemas3@laazulitasac.com>`, banner `medylo.blob.core.windows.net`, helo `webwk000002`). **CrossChex NO es el culpable estructural** — la hipótesis inicial queda descartada. Query A = 0 → no hay bounces permanentes históricos a blacklist. El contador `5/h` lo consumen fallos propios de Educa (SSL handshake dominante). Esto cambia el peso relativo de las decisiones pero no el diseño base.

| # | Tema | Decisión | Justificación |
|---|------|----------|---------------|
| **1** | **Regex + normalización pre-outbox** | Regex `^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$`. Normalización: `Trim()`, `ToLowerInvariant()`, strip de caracteres invisibles (zero-width, NBSP). **NO** validar MX. Aplica solo en `EmailOutboxService.EnqueueAsync` (validación en form admin FE queda como deuda). Caracteres invisibles: **rechazar con LogWarning**, no normalizar silenciosamente. | Data contaminada por copy-paste desde Excel o formularios web no debe llegar al outbox. Normalizar silenciosamente oculta bugs en las fuentes de captura. Rechazar explícito fuerza corrección aguas arriba. |
| **2** | **Esquema `EmailBlacklist`** | El del brief con 3 ajustes: `EBL_Correo` siempre normalizado (lookup también); `EBL_MotivoBloqueo` admite `'BOUNCE_5XX' \| 'MANUAL' \| 'BULK_IMPORT' \| 'FORMAT_INVALID'` (el 4to reservado para uso manual futuro); índice adicional `(EBL_Correo, EBL_Estado)` para lookup eficiente del `EnqueueAsync`. Auditoría completa (INV-D02) y `ROWVERSION` se quedan. | El índice único filtrado `WHERE EBL_Estado = 1` del brief original no es óptimo si hay mucho historial despejado — un índice secundario no filtrado acelera el path caliente. Normalización en storage evita inconsistencias `Gmail.com` vs `gmail.com`. |
| **3** | **Umbral auto-blacklist** | 3 bounces permanentes `5.x.x` → blacklist. Sin ventana temporal. SSL handshake, timeouts y `535 auth fail` **no cuentan**. **Nuevo del hallazgo**: el rechazo Exim `exceeded the max defers and failures per hour` **tampoco cuenta** para el destinatario — worker lo detecta por keyword y marca `FAILED_THROTTLE_HOST` sin imputárselo. | Imputar fallos que nunca llegaron al destinatario (throttle del host) penalizaría correos válidos. El umbral 3 queda porque equilibra protección (1-2 pueden ser transitorios en grises) vs cobertura (no tolerar más de 3 intentos muertos). |
| **4** | **Reversión blacklist** | Endpoint `DELETE /api/sistema/email-blacklist/{correo}` en Chat 2. `[Authorize(Roles = "Director,Asistente Administrativo")]`. Lanza `NotFoundException` si no existe. Vista admin FE **fuera del Plan 29** (deuda en maestro). Al despejar: nada automático, próximo `EnqueueAsync` funciona normal. | Endpoint mínimo viable desbloquea la operación manual. UI puede esperar sin costo — mientras tanto query SQL directa resuelve casos excepcionales. |
| **5** | **Política con CrossChex** | **Reformulada por hallazgo**: Chat 3 OPS confirma vía inspección del panel CrossChex que NO hay SMTP saliente activo. Si por sorpresa lo hay, se desactiva preventivamente (opción a). Resultado esperado: no cambia nada del problema actual. Queda como verificación de higiene. | NDR del 2026-04-22 prueba que Educa es el único remitente del correo bloqueado (template HTML, helo `webwk000002`, dominio `@laazulitasac.com`). Cortar CrossChex no resuelve el defer/fail hoy. Se mantiene la inspección por higiene (evitar sorpresas futuras si alguien vuelve a activar SMTP en CrossChex). |
| **6** | **Fix SSL handshake** | **Sube a prioridad máxima en Chat 2**. Orden: (1) `SecureSocketOptions.StartTls` explícito en puerto 587, (2) `SslProtocols.Tls12` mínimo, (3) `ServerCertificateValidationCallback` custom solo si (1)+(2) fallan. Rollback vía feature flag `EmailService:TlsStrictMode`. 3 envíos de prueba desde staging antes de prod. Criterio de éxito: 0 `SslHandshakeException` en 48h post-deploy. | El hallazgo reposiciona esto como el cambio con más impacto: si SSL handshake es el que consume el contador `5/h` (consistente con el brief y la memoria), fixarlo es el único cambio que directamente reduce defers+fails. Feature flag permite revertir sin redeploy si rompe envíos legítimos. |
| **7** | **Invariantes `INV-MAIL01/02/03`** | Sección nueva **§18 "Correos salientes y protección del canal SMTP"** en `business-rules.md` (no integrar a §16 Reportes de Usuario — dominios distintos). Wording final en el bloque "Invariantes a formalizar en Chat 4" más abajo. `INV-MAIL03` afirma explícitamente que el umbral `5/h` es política del hosting no configurable y que `INV-MAIL01/02` son las únicas defensas. | Hosting confirmado no negociable (jefe ya al tanto). `INV-MAIL03` pierde su salvedad "hasta que hosting aumente" — se redacta como restricción permanente. Sección propia (no §16) evita acoplar correos con reportes de usuario, que tienen ciclo de vida distinto. |
| **8** | **Saneamiento Outbox existente** | Query A = 0 → **no hay backfill a `EmailBlacklist`**. Script pre-deploy reducido: (a) `PROCESSING` con `EO_FechaReg < NOW - 2h` → `FAILED` con `EO_UltimoError = 'Worker cleanup — huérfano al deploy Plan 29'`; (b) `FAILED` con `EO_FechaReg < NOW - 30 días` → **archivar a tabla histórica** `EmailOutbox_Archive` (no purga — preservar trazabilidad forense como la que habilitó este mismo chat). Idempotente con `WHERE` excluyente. Script se muestra al usuario antes de mergear Chat 2. | Purgar hubiera perdido el NDR que sirvió de evidencia del hallazgo. Costo de almacenamiento despreciable. Archivar mantiene la opción de queries forenses sin penalizar el path caliente del worker (que solo lee `EO_Estado IN ('PENDING','RETRYING')`). |

**Deudas derivadas del Chat 1 (trackear en maestro)**:

| # | Item | Plan destino |
|---|------|-------------|
| D1 | Reputación degradada del dominio en ImunifyEmail (flags `IE_VL_PBL_*` en el NDR inspeccionado). Investigar si es estructural o respuesta al ritmo de envío | Plan futuro post-29, evaluar tras 48-72h de métricas post-deploy |
| D2 | Vista admin FE para `EmailBlacklist` (listar, buscar, despejar) | Chat separado — post Chat 2 del Plan 29 |
| D3 | Validador de formato en form de creación/edición de Estudiante y Profesor (FE + BE) | Plan futuro — no entra al alcance del Plan 29 |
| D4 | ✅ **Cerrado 2026-04-23 — Chat 2.6 BE** (commit `7b2a962`). Endpoint `GET /api/sistema/email-outbox/defer-fail-status` expone `DeferFailStatusDto` con 4 secciones empaquetadas (CurrentHour + Last24h + Blacklist + GeneratedAt). Threshold configurable `Email:DeferFailThresholdPerHour` (default 5). Plan 22 Chat B desbloqueado — widget FE puede consumir. +21 tests → 1274 BE verdes. |

### Plan de ejecución (4 chats)

#### Chat 1 — `/design` ✅ cerrado 2026-04-22

Las 8 decisiones se cerraron con los resultados del pre-work (NDR inspeccionado + Query A = 0 candidatos + hosting no negociable). Ver sección **"Las 8 decisiones (Chat 1 cerrado 2026-04-22)"** más abajo.

#### Chat 2 — BE (implementación) ✅ cerrado 2026-04-22

**Commit**: `674e86a` en Educa.API `master`. **Tests**: 1242 BE verdes (+35 nuevos sobre baseline 1207, target era 1220).

Entregado:

- `EmailHelper.Mask` para logging seguro + `EmailValidator.Normalize` (trim + lowercase, rechaza invisibles explícitamente).
- Entity `EmailBlacklist` (`Models/Notifications/`) + `EmailBlacklistConfiguration` con unique filtrado `WHERE EBL_Estado = 1` + covering index `(EBL_Correo, EBL_Estado) INCLUDE EBL_MotivoBloqueo`.
- `IEmailBlacklistRepository` + `EmailBlacklistRepository` con `AsNoTracking` en lecturas + upsert idempotente.
- `IEmailBlacklistService` + `EmailBlacklistService` que normaliza en el borde y delega al repo.
- `EmailBlacklistController` con único endpoint `DELETE /api/sistema/email-blacklist/{correo}` + `[Authorize(Roles = Roles.Administrativos)]` (4 roles administrativos, no los 2 del brief literal — coherente con el patrón Plan 21 INV-AD06).
- Hook `EnqueueAsync` (split a `EmailOutboxService.Enqueue.cs` partial para respetar 300 líneas): rechazo silencioso `if blacklist.IsBlacklistedAsync → LogWarning + return` **sin crear fila** (INV-MAIL01). Todos los logs que tocan `EO_Destinatario` pasan por `EmailHelper.Mask`.
- `EmailBounceBlacklistHandler` (helper nuevo): corre en `ProcessSingleEmailAsync.catch` **antes** de la policy Plan 22 F2. Cuenta bounces 5.x.x históricos del mismo destinatario; al 3er bounce INSERT blacklist + mutación `EO_Estado='FAILED_BLACKLISTED'` en el ChangeTracker (el `SaveChangesAsync` del worker persiste ambos atómicamente — sin `TransactionScope` explícito, equivalente funcional). Guards: `SslHandshakeException`, `AuthenticationException` / `535`, y keyword `exceeded the max defers` → `FAILED_THROTTLE_HOST` sin imputar al destinatario (INV-MAIL02).
- **Fix TLS (divergencia técnica aprobada vs brief)**: `StartTls` del brief requeriría puerto 587 que el provider `mail.deochrysosac.com` no expone. Se implementó `SslProtocols.Tls12 \| Tls13` forzado en `SmtpClient` manteniendo `SslOnConnect` + puerto 465 (SMTPS actual). Elimina el fallback a TLS 1.0/1.1 de cPanel que rompía el handshake. Flag `Email:TlsStrictMode` (NO `EmailService:*` — reutiliza binding `IOptions<EmailSettings>` existente) default `true`. Rollback sin redeploy → flag a `false`.
- 3 scripts SQL ejecutados manualmente en Azure antes del merge: (1) `EmailBlacklist`, (2) `EmailOutbox_Archive` con `CREATE TABLE` explícito (el `SELECT TOP 0 *` del brief original fallaba por `EO_RowVersion` ROWVERSION), (3) sanitize Outbox. Resultado: blacklist vacía consistente con Query A = 0, archive vacío (no había FAILED >30d), sanitize movió 0 PROCESSING huérfanos. Saneamiento `EO_FechaMod` removido del UPDATE — columna no existe en `EmailOutbox`.

**Gaps conocidos**:

1. ✅ **Cerrado 2026-04-23 — Chat 2.5 BE** (commit `0580983` en Educa.API `master`). Eliminado el whitelist `TiposValidadosAlEncolar`: `EmailValidator.Validate(email.To)` corre ahora sin condicional en cada `EnqueueAsync`. `NotificacionAdmin`, `ReporteUsuario`, `ReporteFallosCorreoAsistencia`, `AsistenciaCorreccion`, `AsistenciaCorreccionProfesor` con formato inválido producen fila `EO_Estado='FAILED'` + `EO_TipoFallo='FAILED_INVALID_ADDRESS'/'FAILED_NO_EMAIL'` + `ErrorLog` vía `EmailFailureLogger` (INV-ET02), ya no cruzan al SMTP. Hallazgo en pre-work: `Caso D` del `EmailOutboxServiceTests` asumía explícitamente el bug (`NotificacionAdmin + ñ → PENDING`) — ajustado al comportamiento correcto. **+11 tests parametrizados** (2 `[Theory]` para 5+3 tipos no-asistencia con inválidos, 1 sin-arroba, 1 `[Theory]` happy-path para 2 tipos con válido) → **1253 BE verdes** (baseline 1242). `INV-MAIL01` ahora universal.
2. ✅ **Cerrado 2026-04-23 — Chat 2.6 BE** (commit `7b2a962` en Educa.API `master`). Endpoint `GET /api/sistema/email-outbox/defer-fail-status` devuelve `DeferFailStatusDto` con los agregados empaquetados. Service con 3 queries secuenciales (`DbContext` no es thread-safe — el brief decía `Task.WhenAll` pero no se respetó por safety) + fallback-CRITICAL (INV-S07). Threshold configurable `Email:DeferFailThresholdPerHour` (default 5, ajustable sin redeploy cuando Chat 3 OPS negocie con hosting). Route bajo namespace `/api/sistema/email-outbox/*` para coherencia con `EmailBlacklistController`. Rate limit: sin decorador (GlobalLimiter 200 GETs/min por userId basta para el poll del widget cada 30-60s). **+21 tests** (11 service + 10 authz) → **1274 BE verdes**. Plan 22 Chat B desbloqueado. Señal anotada para chat futuro: considerar migración de retry automático a retry manual en el worker (con techo 5/h por dominio los retries automáticos pueden agotar quota más rápido que retries manuales; exponer `Retrying` como métrica separada facilita la migración).

**Tests BE nuevos (7 archivos, ~35 casos)**:

- `Helpers/Formatting/EmailHelperTests.cs` (mask normal, corto, null/empty, determinístico, no expone local-part)
- `Helpers/Formatting/EmailValidatorTests.cs` extendido con sección `Normalize` (trim + lowercase + rechazo de invisibles)
- `Repositories/Notifications/EmailBlacklistRepositoryTests.cs` (lookup activo/despejado, upsert idempotente al reactivar, despeje soft)
- `Services/Notifications/EmailBlacklistServiceTests.cs` (normalización en el borde, delegación al repo con motivo `BOUNCE_5XX`)
- `Services/Notifications/EmailOutboxServiceEnqueueValidationTests.cs` (blacklisted NO crea fila, no blacklisted encola, sin service inyectado fail-open, log enmascara)
- `Services/Notifications/EmailBounceBlacklistHandlerTests.cs` (3er bounce → INSERT + FAILED_BLACKLISTED, SSL no cuenta, auth 535 no cuenta, max defers → FAILED_THROTTLE_HOST, solo 2 acumulados no dispara, destinatario cruzado no cuenta)
- `Controllers/Sistema/EmailBlacklistControllerAuthorizationTests.cs` (reflection: 4 roles administrativos sí, 3 no-admin no — patrón Plan 21 INV-AD06)

#### Chat 3 — OPS (coordinación externa)

- Pedir al hosting **subir `max_defer_fail_percentage`** a 25-30% (o count absoluto ~50). Es negociación, no código. Trackear fecha/confirmación.
- Decidir y ejecutar política CrossChex del Chat 1 decisión 5: desactivar su SMTP / migrar / esperar Plan 24.
- Validación post-deploy Chat 2: 48-72h sin bloqueo del dominio, log de `EmailBlacklist` insertions, log de `EnqueueAsync` descartes por formato.

#### Chat 4 — docs + cierre

- Agregar nueva **§18 "Correos salientes y protección del canal SMTP"** en `business-rules.md` con `INV-MAIL01/02/03` (decisión 7 del Chat 1 — no integrar a §16 Reportes de Usuario).
- Actualizar `Registro de Invariantes` §15 en `business-rules.md`.
- Entrada en `history/planes-cerrados.md` una vez cerrado el post-deploy.
- Actualizar `project_smtp_defer_fail_block.md` con valores finales acordados (umbral negociado, tabla blacklist real, etc).

### Reversibilidad

- La tabla `EmailBlacklist` se puede vaciar con un `TRUNCATE` sin afectar el outbox ni BD de estudiantes.
- El pre-filtro de `EnqueueAsync` se puede desactivar con una feature flag (`environment.features.emailPreFilter`) si bloquea correos legítimos inesperadamente.
- El fix SSL handshake es estrictamente mejora — no hay revert necesario.

### Dependencias y coordinación

| Plan | Relación |
|------|----------|
| Plan 22 (endurecimiento correos) | **Complementario, no sustitutivo**. Throttle 50/h per-sender cuida cuota de envíos; Plan 29 cuida cuota de fallos. Ambos necesarios. |
| Plan 22 Chat B (widget throttle) | 🟢 **Desbloqueado 2026-04-23 (Plan 29 Chat 2.6)** — endpoint `GET /api/sistema/email-outbox/defer-fail-status` expone los agregados. El widget FE puede consumir junto con `GET /api/email-outbox/throttle-status` (Plan 22 Chat A) para la foto completa: throttle per-sender + defer/fail a nivel dominio. |
| Plan 24 (sync CrossChex background) | Habilitador futuro: si Educa consume CrossChex biométrico directamente, podemos cortar el SMTP de CrossChex sin perder funcionalidad. |
| Plan 26 (rate limit flexible) | Dominio distinto (HTTP entrante). No se fusiona. Patrón de telemetría (`EmailFailEvent` análogo a `RateLimitEvent`) puede inspirar auditoría. |
| Plan 28 Chat 3 (reportes AA) | ⚠️ **Posterga hasta Plan 29 Chats 1-2 cerrados**. Ambos tocan `EmailOutboxService` / `EmailNotificationService` y no queremos PRs simultáneos. |

### Invariantes a formalizar en Chat 4 (wording final cerrado 2026-04-22)

Van a nueva **§18 "Correos salientes y protección del canal SMTP"** en `business-rules.md` (después de §17 — no integrar a §16 Reportes de Usuario, son dominios distintos):

- **`INV-MAIL01` — Validación de destinatario pre-encolado**: Todo llamado a `EmailOutboxService.EnqueueAsync` valida el destinatario contra el regex canónico y consulta `EmailBlacklist`. Correos con formato inválido o presentes en blacklist con `EBL_Estado = 1` se rechazan silenciosamente con `LogWarning` (email enmascarado), sin crear registro en `EmailOutbox`.
- **`INV-MAIL02` — Auto-blacklist por bounces permanentes**: Cuando un destinatario acumula ≥ 3 rebotes con código SMTP `5.x.x`, `EmailOutboxWorker` lo inserta en `EmailBlacklist` (`MotivoBloqueo = 'BOUNCE_5XX'`) dentro de la misma transacción que actualiza el registro a `EO_Estado = 'FAILED_BLACKLISTED'`. SSL handshake, timeouts, `535 auth fail` y rechazos tipo `max defers and failures per hour` del MTA del hosting **no** cuentan para este umbral.
- **`INV-MAIL03` — Defensa contra `max_defer_fail_percentage`**: El hosting cPanel descarta silenciosamente todo correo del dominio `laazulitasac.com` cuando acumula 5 defers+fails en una hora. Este umbral es política del hosting y no es configurable. `INV-MAIL01` y `INV-MAIL02` son las únicas defensas disponibles — el sistema no controla el contador, solo qué envía al MTA. Cualquier fallo evitable (SSL handshake, auth, formato inválido) consume el contador y se considera deuda que agota la cuota para correos legítimos.

### Checklist pre-Chat 1 `/design` ✅ completado 2026-04-22

- [x] Memoria `project_smtp_defer_fail_block.md` creada
- [x] Sección en maestro.md
- [x] Inventario de planes actualizado (Plan 29 agregado)
- [x] Foco actualizado para reflejar máxima prioridad
- [x] Validar con el jefe el corte del SMTP de CrossChex — **jefe ya al tanto 2026-04-22**; decisión 5 reformulada por hallazgo (CrossChex no es culpable, el NDR prueba que Educa es el remitente)
- [x] Confirmar con hosting valores actuales de `max_defer_fail_percentage` — **confirmado no configurable (política externa fija 5/h)**
- [x] Inspeccionar headers de un rebote real — **NDR `durbyangelica19@gmail.com` inspeccionado 2026-04-22**; confirma Educa como remitente (template HTML, helo `webwk000002`, subject `Registro de Entrada - CAYCHO RAMOS JULIO`), descarta hipótesis CrossChex

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
> **Estado**: 🟢 **Chat 1 ✅ cerrado 2026-04-23** (commit `299db24` en `Educa.API master`, +7 tests → 1302 BE verdes). 🟢 **Chat 2 ✅ cerrado 2026-04-23** (commit `513c6cc` en `Educa.API master`, +14 tests → 1316 BE verdes). 🟢 **Chat 3 ✅ cerrado 2026-04-24** (commit pendiente en `educa-web main`, +29 tests → 1583 FE verdes). Plan al **~75%**. Falta Chat 4 (validar `Task.Delay` + deploy BE+FE).

### Diagnóstico

- **Backend (culpa principal)**: `CrossChexApiService.GetDayRecordsAsync:231` hace `await Task.Delay(30000)` **entre cada página** (páginas de 100 registros). Con ~500 personas/día → ~5 páginas → 4 delays = 2 min de espera pura entre páginas.
- **Por qué cada sync del mismo día tarda más**: las marcaciones se acumulan intradiariamente (8 AM = solo entradas, 6 PM = entradas + salidas + reentradas). A más tarde, más páginas, más delays. No es acumulación histórica — es acumulación del día en curso.
- **Frontend**: `AttendancesDataFacade.sincronizarDesdeCrossChex:129-154` usa `.subscribe()` directo con `takeUntilDestroyed`. Si el usuario navega, la suscripción muere pero la request HTTP sigue viva en el server — resultado perdido. Único feedback: signal `syncing()` → spinner en botón + toast al final.

### Qué diseñar (4 chats)

- **Chat 1 ✅ cerrado 2026-04-23** (commit `299db24` en `Educa.API master`). Resumen del cierre:
  - Tabla nueva `CrossChexSyncJob` (decisión 1 — SQL en Azure, no memoria). 8 archivos nuevos BE + 6 modificados + 2 archivos de tests (7 nuevos) → 1302 BE verdes.
  - `POST /api/asistencia-admin/sync` devuelve `202 Accepted { jobId, estado: "QUEUED" }` con Location header al status endpoint. `[RateLimitOverride("batch", 3.0)]` (15/min efectivo para admins).
  - `GET /api/asistencia-admin/sync/{jobId}/status` devuelve `CrossChexSyncStatusDto` expresivo (jobId, estado, pagina/totalPaginas, fase, mensaje, error). Policy `reads`.
  - `409 Conflict` si ya hay un job `QUEUED`/`RUNNING` (decisión 3 — no concurrentes).
  - JobId GUID format `"N"` (32 chars, sin guiones) desacoplado del id interno de Hangfire (reservado en `CSJ_HangfireJobId` para cancelación futura).
  - `CrossChexSyncJobRunner` corre el sync con callback async de progreso `Func<int,int,Task>` que persiste cada página. `CancellationToken` propagado Hangfire → runner → service → CrossChex API.
  - Correo resumen al disparador tanto en `COMPLETED` como `FAILED` (decisiones 7.a.i + 7.b.ii), fire-and-forget por INV-S07, tipo outbox `"CROSSCHEX_SYNC"`.
  - `Task.Delay(30000)` conservado con comentario explicando por qué (decisión 6) — Chat 4 valida si puede bajar.
  - **Deuda identificada para Chat 2**: el contrato `CrossChexSyncStatusDto` ya está definido; el Chat 2 (SignalR) emite el MISMO shape via hub y el FE del Chat 3 elige entre polling o push sin romper contrato.
- **Chat 2 ✅ cerrado 2026-04-23** (commit `513c6cc` en `Educa.API master`). Resumen del cierre:
  - `AsistenciaHub` gana 2 métodos: `SubscribeToSyncJob(jobId)` y `UnsubscribeFromSyncJob(jobId)` con validación regex `^[a-f0-9]{32}$` (rechaza inputs arbitrarios con `HubException` antes de tocar el grupo SignalR). Const `SyncGroupPrefix` + método `SyncGroupName(jobId)` estático comparten el formato canónico del grupo entre hub, runner y controller.
  - Grupo SignalR: `"crosschex-sync-{jobId}"` (decisión 1-B del chat — prefijo largo explícito sobre `"sync-{jobId}"` corto).
  - Runner emite evento `"SyncProgress"` al grupo en 4 transiciones persistidas: tras marcar `RUNNING`, en cada página del callback `onPageProgress`, en `COMPLETED` y en `FAILED`. Helper privado `EmitirProgresoAsync` envuelve cada emisión en try/catch con `LogWarning` — un fallo del hub NUNCA falla el job (INV-S07). Payload: `CrossChexSyncStatusDto` sin modificar.
  - Controller emite `"SyncProgress"` con `Estado = "QUEUED"` justo tras persistir el registro (decisión 3-A del chat), cerrando el gap 0-500ms entre `202 Accepted` y el primer `RUNNING` del runner. Fire-and-forget con `LogWarning` idéntico al runner.
  - Nuevo `CrossChexSyncStatusDtoMapper` estático centraliza la proyección `CrossChexSyncJob → CrossChexSyncStatusDto`. Usado por runner (4 broadcasts), controller `QUEUED` broadcast y `GET /sync/{jobId}/status`. Garantiza shape bit-a-bit idéntico entre GET y hub — un cliente puede alternar polling y push sin reshaping.
  - Auto-emisión del estado actual al suscribir **NO implementada** (decisión 2-B del chat). Un admin que entra tarde al sync (ej: ya va por página 3) espera el próximo evento del runner. Feedback visual extra (timer, barra %, mensaje contextual) queda para Chat 3 FE usando los campos `Pagina/TotalPaginas`, `IniciadoEn` y `Fase` que ya están en el DTO.
  - `Task.Delay(30000)` intocado (Chat 4 lo valida).
  - **+14 tests** (9 hub: subscribe válido/7 inputs inválidos/unsubscribe/SyncGroupName; 3 runner: happy path 5 broadcasts/FAILED emite payload/INV-S07 resiliencia cuando hub `SendAsync` lanza; 2 controller: setup con mocks `IHubContext` + `ILogger`) → **1316 BE verdes** (baseline 1302).
  - **Deuda identificada para Chat 3 FE**: el feedback visual extra que pidió el usuario durante este chat se construye aquí. Todos los campos ya existen en el DTO — no hace falta modificar contrato.
- **Chat 3 ✅ cerrado 2026-04-24** (`educa-web main`). Resumen del cierre:
  - Nuevo `CrossChexSyncStatusService` singleton (`providedIn: 'root'`) en `@core/services/signalr/`. Signal privado `_status` + `hasActiveJob`/`isActive` computed. API: `startTracking(jobId)` / `stopTracking()` / `rehydrate()`. Subject `terminal$` para COMPLETED/FAILED. Reutiliza la `HubConnection` del `AttendanceSignalRService` vía nuevo método `ensureConnected()` — no abre segunda conexión.
  - Persistencia del jobId en `sessionStorage` via nuevo par `StorageService.get/setCrossChexJobId()` + métodos equivalentes en `SessionStorageService` (key `educa_crosschex_sync_job`). Respeta la regla ESLint `no-restricted-globals` (no `sessionStorage` directo fuera del wrapper).
  - `rehydrate()` en refresh F5: lee storage → `GET /sync/{jobId}/status` → si sigue activo re-suscribe al hub, si terminó emite terminal + limpia storage, si inválido limpia silenciosamente.
  - Nuevo `CrossChexSyncBannerComponent` standalone OnPush (`components/crosschex-sync-banner/`). Imports `ProgressBarModule` + `ButtonModule`. 3 estados visibles: QUEUED indeterminate "Encolando…"; RUNNING con `pagina/totalPaginas` → bar % + "Descargando página X/Y…" (sin páginas → indeterminate "Iniciando…"); FAILED banner rojo con `color-mix(in srgb, var(--red-500) 12%, transparent)` + botón "Reintentar" + error del DTO. COMPLETED se oculta (toast global). `aria-live="polite"` + `[pt]` aria-labels en botones.
  - `AttendancesDataFacade.sincronizarDesdeCrossChex` refactorizado: ya no hace `.subscribe()` bloqueante. POST `/sync` devuelve `CrossChexSyncAceptadoDto` (Plan 24 Chat 1). En 202 delega a `syncService.startTracking(jobId)`. En 409 Conflict extrae `data.jobId` del body del error (interceptor no unwrappea `success:false`) y re-suscribe al jobId existente — UX conveniente. En otros errores propaga a `onError`.
  - `AttendancesComponent`: import del banner, botón sync con `[disabled]="syncActive()"` + tooltip "Hay un sync en curso", `ngOnInit` llama `rehydrate()` + suscribe `terminal$` → toast success + `loadData()` en COMPLETED, toast error + banner rojo en FAILED. Nuevo `onSyncRetry()` (llama `stopTracking` + dispatch) y `onSyncDismiss()`. Handlers de onToggle* eliminados y consumidos directo desde template (`store.toggleSelection()`, `crudFacade.enviarCorreos()`) para respetar cap de 300 líneas.
  - Helpers puros (estadoSeverity, origenLabel, origenSeverity, tipoPersonaLabel, formatFechaIso) extraídos a `services/attendances-template-helpers.ts`.
  - **+29 tests FE** (15 service: startTracking idempotencia/swap + SyncProgress RUNNING/COMPLETED/FAILED/jobId ajeno/PascalCase + rehydrate vacío/RUNNING/COMPLETED/jobId inválido + stopTracking / 12 banner: null/COMPLETED/QUEUED/RUNNING sin páginas/RUNNING con % / FAILED botón Reintentar/emit retry/fase/aria-live/.each estados / 2 netos en facade spec por migración al nuevo contrato) → **1583 FE verdes** (baseline 1554). Lint global + build limpios.
  - **Deuda identificada para Chat 4**: polling fallback para caso de caída de SignalR (INV-S07 — el job sigue aunque el hub caiga). Chip global cross-página fuera de alcance (toast success/error cubre la mayoría del caso).
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

## 🟡 Plan 30 — Dashboard Visibilidad Admin (correos + asistencia)

> **Origen**: 2026-04-23, sesión de cierre del Plan 24 Chat 2. El admin hoy depende de 25+ queries SQL manuales en SSMS para verificar el estado diario de correos y asistencia. Declarado "altamente impráctico" — bloquea autonomía del admin y consume tiempo del desarrollador que arma las queries cada día.
> **Plan**: inline en este maestro (sin archivo separado).
> **Estado**: 🟢 **100% 2026-04-24** — los 4 chats BE cerrados + FE consumers cerrados (Chat 3+4 combinados en commit `b7f2f60`, `educa-web main`) + refactor UX post-cierre (commit de este chat 041, sub-tabs "Resumen | Detalle" en el Tab "Gap del día" con badge numérico = total gap). La pantalla `/intranet/admin/email-outbox/diagnostico` queda consolidada: Tab "Gap del día" con sub-tabs anidados (patrón canónico de `email-outbox-dashboard-dia`), Tab "Diagnóstico por correo" lineal. `totalGap` movido al store como fuente única (consumido por el contenedor para el badge; el `CorreosDiaResumenComponent` mantiene su computed interno por cohesión — misma fórmula derivada del mismo input `resumen`). **Anterior estado**: 🟢 **~95% 2026-04-24** — los 4 chats del backend cerrados (Chat 1 BE + Chat 2 FE + Chat 3 BE + Chat 4 BE). Solo queda el FE consumer del Chat 3 + Chat 4 como tarea posterior (combinables en un chat liviano). Chat 4 F4.BE cerrado 2026-04-24 con commit `3c316a2` en Educa.API `master` — endpoint `GET /api/sistema/email-outbox/diagnostico?correo={email}` con DTO compuesto (Resumen + Historia[50] + Blacklist? + PersonasAsociadas[]). Reemplaza set manual M1-M8. Input normalizado trim+lower, DNI enmascarado, UltimoError truncado 200 chars, cap fijo 50 filas, fail-safe INV-S07, lookup polimórfico extraído a `EmailDiagnosticoPersonaLookup`. Validación input: `CORREO_REQUERIDO`/`CORREO_INVALIDO`. **+16 tests** → **1371 BE verdes** (baseline 1355). Chat 3 F3.BE cerrado 2026-04-24 con commit `eb92ec2` en Educa.API `master` — endpoint `GET /api/sistema/asistencia/diagnostico-correos-dia?fecha={yyyy-MM-dd}&sedeId={n}` con DTO compuesto (Resumen + EstudiantesSinCorreo[] + ApoderadosBlacklisteados[] + EntradasSinCorreoEnviado[]). Reasons tipadas vía constante `DiagnosticoRazones` (`SIN_CORREO`/`BLACKLISTED`/`FALLIDO`/`PENDIENTE`/`SIN_RASTRO`). Correlación outbox ↔ entrada por `EO_Destinatario = EST_CorreoApoderado` + ventana temporal del día (el sistema NO persiste `EO_EntidadId` para correos ASISTENCIA). INV-C11 (`GRA_Orden >= 8`) aplicado in-memory post-join con contador separado `EstudiantesFueraDeAlcance`. Precedencia de estado outbox: SENT > PENDING/RETRYING > FAILED (un retry exitoso neutraliza FAILED previo). DNI + correos enmascarados (`DniHelper.Mask` + `EmailHelper.Mask`). INV-S07 fail-safe vía `DiagnosticoCorreosDiaSnapshotFactory.BuildEmpty` (catch global → DTO ceros + LogWarning, nunca 500). Lógica pura extraída a `DiagnosticoCorreosDiaCorrelator` (261 líneas) para respetar cap 300 del service principal (167 líneas). DI registrado en `ServiceExtensions` + authz `[Authorize(Roles = Roles.Administrativos)]` a nivel clase. **+19 tests** (13 service con `TestDbContextFactory` cubriendo las 5 razones + INV-C11 split + filtro sedeId + SENT-over-FAILED + INV-S07 context disposed; 6 authz por reflection) → **1355 BE verdes** (baseline 1336). Chat 1 F1.BE cerrado con commit `c8a0360` en Educa.API (1316 → 1330 tests). Chat 2 F2.FE cerrado 2026-04-23 en `educa-web main` — pantalla `/intranet/admin/email-outbox/dashboard-dia` consumiendo el endpoint de F1 (1535 → 1549 FE verdes, +14 tests). Brief del Chat 2 en `.claude/chats/closed/035-plan-30-chat-2-fe-dashboard-correos-dia-page.md`.

### Diagnóstico

El admin necesita verificar 3 cosas cada día, ninguna tiene pantalla hoy:

1. **Estado general de correos del día**: cuántos salieron, cuántos fallaron, por qué tipo de fallo, distribución por hora, contador defer/fail cPanel. Hoy: 8 queries SQL (Q1-Q8).
2. **Gap asistencia-vs-correos**: "marcaron entrada 62 estudiantes pero solo se enviaron 56 correos — ¿quiénes son los 6?". Hoy: 4 queries cruzadas (verificación INV-C11 + D2/D3/D4/D5).
3. **Búsqueda/diagnóstico de un correo específico** cuando hay NDR o queja del apoderado ("¿qué pasó con `rey.ichigo@hotmail.com`?"). Hoy: 8 queries (M1-M8).

Pantallas admin ya existentes (**no cubren este dolor**):
- `/intranet/admin/auditoria-correos` (Plan 22 Chat 6) — solo formato inválido en BD, no histórico del día.
- Widget defer-fail (Plan 22 Chat B + Plan 29 Chat 2.6) — realtime, no histórico ni drill-down.
- `/intranet/admin/email-outbox` — listado crudo de filas, no agregación.

### Qué diseñar (4 chats)

- **Chat 1 · F1.BE — Dashboard correos del día** ✅ **Cerrado 2026-04-23** (commit `c8a0360` en Educa.API): endpoint `GET /api/sistema/email-outbox/dashboard-dia?fecha={yyyy-MM-dd}` con DTO compuesto (Resumen + PorHora[] + PorTipo[] + BouncesAcumulados[]). Reemplaza Q1/Q3/Q4/Q8 + D1/D4.
- **Chat 2 · F2.BE — Gap asistencia-vs-correos**: endpoint `GET /api/sistema/asistencia/diagnostico-correos-dia?fecha={yyyy-MM-dd}&sedeId={n}` que cruza `AsistenciaPersona` + `Estudiante` + `EmailOutbox` + `EmailBlacklist`. Responde: entradas marcadas, correos enviados, estudiantes sin correo apoderado, apoderados blacklisteados. Reemplaza verificación INV-C11 + D2/D3/D5.
- **Chat 3 · F3.BE — Búsqueda diagnóstico por correo**: endpoint `GET /api/sistema/email-outbox/diagnostico?correo={email}` que retorna historia completa: últimos N intentos en outbox (+ archive), estado blacklist, a qué persona(s) pertenece (Estudiante/Profesor/Director). Reemplaza M1-M8.
- **Chat 2 (reordenado) · F2.FE — Pantalla `dashboard-dia`** ✅ **Cerrado 2026-04-23** (`educa-web main`): pantalla `/intranet/admin/email-outbox/dashboard-dia` consume el endpoint de F1. 4 secciones: Resumen (10 stat cards), PorHora (barras apiladas 24 buckets · Enviados/Fallidos/LlegaronSMTP), PorTipo (tabla agregada), BouncesAcumulados (top 50 + row-warning/critical + copy-to-clipboard). Header con `p-datepicker` (maxDate=hoy, minDate=hoy-90d, `yy-mm-dd`) + botón refresh + label `Actualizado hace X min`. Error codes del BE (`FECHA_FORMATO_INVALIDO` / `FECHA_FUTURA_INVALIDA` / `FECHA_DEMASIADO_ANTIGUA`) mapeados a toast localizados en facade. No auto-polling (decisión 3). Gated por feature flag `emailOutboxDashboardDia` (OFF prod / ON dev) + permiso nuevo `ADMIN_EMAIL_OUTBOX_DASHBOARD_DIA`. Menú "Dashboard del día" en **Sistema > Monitoreo**. **+14 tests** (4 store + 7 facade + 1 resumen + 2 bouncers) → **1549 FE verdes** (baseline 1535). Lint + build OK.
- **Chat 3 · F3.BE — Gap asistencia-vs-correos (antes Chat 2)**: endpoint `GET /api/sistema/asistencia/diagnostico-correos-dia?fecha={yyyy-MM-dd}&sedeId={n}` que cruza `AsistenciaPersona` + `Estudiante` + `EmailOutbox` + `EmailBlacklist`. Responde: entradas marcadas, correos enviados, estudiantes sin correo apoderado, apoderados blacklisteados. Reemplaza verificación INV-C11 + D2/D3/D5.
- **Chat 4 · F4.BE — Búsqueda diagnóstico por correo (antes Chat 3)** ✅ **Cerrado 2026-04-24** (commit `3c316a2` en Educa.API `master`): endpoint `GET /api/sistema/email-outbox/diagnostico?correo={email}` con DTO compuesto (`CorreoConsultado` normalizado + `Resumen` + `Historia[50]` + `Blacklist?` + `PersonasAsociadas[]`). Últimas 50 filas del outbox ordenadas DESC (cap fijo, no paginación), `UltimoError` truncado 200 chars, sin `CuerpoHtml`/`Bcc`. Blacklist devuelve la fila más reciente con `Estado` "ACTIVO"/"DESPEJADO" (nullable). Lookup polimórfico cruzando 4 tablas (`Estudiante.EST_CorreoApoderado`/`Profesor.PRO_Correo`/`Director.DIR_Correo`/`Apoderado.APO_Correo`) con `_Estado = true` + DNI enmascarado vía `DniHelper.Mask`. Input normalizado trim+lower antes de cualquier query. Tabla `EmailOutboxArchive` **no existe** — scope solo sobre outbox vigente. Lookup de personas extraído a `EmailDiagnosticoPersonaLookup` (133 líneas) para mantener `EmailDiagnosticoService` bajo cap 300 (289 líneas). Validación rudimentaria en controller (`CORREO_REQUERIDO`/`CORREO_INVALIDO` por vacío/null/sin @/>200 chars). Authz hereda `[Authorize(Roles.Administrativos)]` del controller. Fail-safe INV-S07 vía `EmailDiagnosticoSnapshotFactory.BuildEmpty`. **+16 tests** (10 service + 5 controller + 1 authz marker) → **1371 BE verdes** (baseline 1355). FE consumer posterior (combinable con el del Chat 3).

### Priorización

- **F1 ✅ cerrado 2026-04-23**, commit `c8a0360` en Educa.API (1316 → 1330 tests).
- **F2 FE ✅ cerrado 2026-04-23** en `educa-web main` (pantalla dashboard-dia).
- **F3 BE ✅ cerrado 2026-04-24**, commit `eb92ec2` en Educa.API (1336 → 1355 tests).
- **F4 BE ✅ cerrado 2026-04-24**, commit `3c316a2` en Educa.API (1355 → 1371 tests). Cierra el frente del backend al 100%.
- **FE consumer pendiente**: pantallas admin que consumen `diagnostico-correos-dia` (Chat 3) y `email-outbox/diagnostico?correo=` (Chat 4) — combinables en un chat liviano. Se prioriza cuando el admin pida la UI.

### Dependencias

- **Ninguna dura**. Los 3 endpoints BE son independientes, consumen tablas que ya existen (`EmailOutbox`, `EmailBlacklist`, `AsistenciaPersona`, `Estudiante`, `Profesor`).
- **Relacionado con Plan 22** (endurecimiento correos): el dashboard muestra los efectos de Plan 22 F5/F6 (throttle per-sender, round-robin multi-sender) y Plan 29 Chat 2 (auto-blacklist INV-MAIL02). Valor inmediato post-deploy de este plan.
- **Relacionado con Plan 27** (filtro INV-C11): el gap asistencia-vs-correos (F2) respeta el filtro `GRA_Orden >= 8` automáticamente — no suma estudiantes excluidos.

### Riesgos / limitaciones conocidas

- **Shape del DTO puede cambiar en F4 FE**: al construir la pantalla real, el usuario puede pedir campos extra. Contrato flexible — agregar al DTO afecta ambos canales (GET + eventual caché FE).
- **Queries pesadas si no hay índices adecuados**: `EmailOutbox.EO_FechaReg` + `EO_Estado` ya están indexadas (Plan 22), pero si se agregan filtros por `EO_Destinatario` (F3) puede faltar índice. Validar con plan de ejecución antes de mergear.
- **Histórico > 90 días**: rechazado en F1. Casos raros de auditoría profunda siguen pasando por SSMS. Si el admin reclama, agregar endpoint separado `/historico-profundo` con paginación + rate limit `heavy`.

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

- [ ] **F3 — D.1 Time-of-day modifier** (1 chat, BE) — **🔶 En espera de datos reales** (decisión 2026-04-23). F2.6 requiere 1-2 semanas de telemetría post-deploy antes de calibrar valores. Ventana estimada: hasta ~2026-05-06.
  - [ ] F3.1 Helper `SchoolHoursResolver` — inyectable, lee `IClock` + zona Lima, expone `IsSchoolHours(DateTimeOffset): bool`
  - [ ] F3.2 Integrar en resolver de F2 como capa adicional (antes del cap 5x)
  - [ ] F3.3 Tests con `TestClock` — lunes 10am L-V → multiplier "dentro" aplicado; domingo 10am → multiplier "fuera" aplicado; lunes 18:30 → multiplier "fuera" aplicado
  - **🔸 Decisión de calibración (2026-04-23, usuario)**:
    - **Franja 7am-5pm L-V** es el rango **normal**, NO el único posible.
    - El colegio NO opera sábados, pero SÍ hay **casos anormales legítimos** fuera de franja (reuniones, admin con mucho trabajo, horas tempranas/tardías).
    - Por lo tanto, F3 debe dar **margen suave** fuera de franja, no corte duro. Propuesta tentativa: `x1.5 dentro / x1.2 fuera` (multiplier nunca baja de `x1.0`).
    - Valor exacto del multiplier dentro/fuera se define con telemetría real de F1/F2 — qué porcentaje de 429 cae fuera de franja y en qué roles. Si fuera de franja solo hay 429 de bots/abuso, el multiplier fuera queda cerca de `x1.0`. Si hay 429 legítimos de admin, el multiplier fuera sube.
  - **Entregable**: ventana de tolerancia extra en horario de uso intensivo administrativo, sin perjudicar trabajo legítimo fuera de franja.

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

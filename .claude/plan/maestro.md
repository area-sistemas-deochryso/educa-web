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
| 20 | Design System — Estándar desde `usuarios` | FE | ✅ **archivado 2026-05-07** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-20--design-system-estándar-desde-usuarios) | — | — |
| 21 | Asistencia de Profesores en CrossChex | BE+FE | `plan/asistencia-profesores.md` | ✅ **100% — archivado 2026-04-22** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-21). Deuda lateral pendiente: `PermisoSaludAuthorizationHelper.cs:63`; cols `ERL_*` en BD prueba; DROP `Asistencia_deprecated_2026_04` ~2026-06-20 | — |
| 22 | Endurecimiento correos de asistencia | BE+FE | ✅ **archivado 2026-04-23** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-22--endurecimiento-de-correos-de-asistencia) | — | — |
| 23 | Extensión `/intranet/admin/asistencias` a Profesores | BE+FE | `plan/asistencia-admin-profesores.md` | ✅ **100% — archivado 2026-04-22** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-23) | — |
| 24 | 🟡 Sync CrossChex en Background Job | BE+FE | (inline en maestro) | ⏳ Chats 1-3 ✅ + Chat 4 (A') ✅ cerrado 2026-04-24 (commit `862d4ca`, +2 tests → 1373 BE verdes): `CrossChexPollingOptions` con `IOptions` + telemetría Stopwatch (ConfiguredMs/ElapsedMs/Drift). Default 30000ms preservado. **Pendiente**: subfase B Chat 4 — medir 48-72h en prod + bajar delay vía config sin redeploy. | ~85% |
| 25 | Paridad Excel para reportes PDF | BE+FE | (archivado en historial) | ✅ **100% — archivado 2026-04-22** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-25). Regla §17 en `business-rules.md` con INV-RE01/02/03 | — |
| **26** | **🟡 Rate limiting flexible** | **BE+FE** | **(inline en maestro)** | **🟡 F1 ✅ cerrada 2026-04-21 + F2 Chat 1 ✅ cerrado 2026-04-22 (máquina del multiplier) + F2 Chat 2 ✅ cerrado 2026-04-22 (overrides aplicados en 10 controllers / 28 endpoints reportes + 3 observabilidad admin, 1119 BE verdes). F2.6 ⏳ observación post-deploy 1-2 semanas antes de F3. F2 Chat 1: `RateLimitOverrideAttribute` + `RoleMultipliers` (Director 3.0 / Asistente Admin / Promotor / Coordinador Académico 2.5 / Profesor 2.0 / resto 1.0) + `RateLimitPartitionResolver` (cache reflection, cap 5x acumulado) + nuevas policies `reports` y `batch` con base 5/min + resolver. F2 Chat 2: 39 instancias de `[EnableRateLimiting("heavy")]` migradas a `reports`/`batch` en 10 controllers + `[RateLimitOverride("reports", 2.0)]` en 28 endpoints de reportes + `[RateLimitOverride(3.0)]` en `/api/sistema/errors` y `/api/sistema/rate-limit-events` (motivado por top endpoint `/api/sistema/errors` con 5/16 rechazos visto en telemetría F1). `heavy` queda registrada sin consumidores (comentario "eliminar en F5"). Telemetría viva en prod desde F1 (RateLimitEvent, INV-S07/ET02). FE intacto: la vista admin `/intranet/admin/rate-limit-events` ya rotula por rol. Tests acumulados: 28 unit + 6 integración (Chat 1) + 22 contract tests por reflection (Chat 2) → Suite BE **1119 verdes**. Plan ~30%. **Decisión de calibración F3** (2026-04-23, usuario): la franja escolar 7am-5pm L-V es el rango normal, NO el único posible — se permiten casos anormales (reuniones, trabajo tarde). Diseño F3 debe dar margen suave fuera de franja (ej: multiplier x1.5 dentro → x1.2 fuera), NO corte duro. Valor exacto definir con telemetría real. **Siguiente**: F2.6 observación 1-2 semanas post-deploy antes de F3 (hoy +13 días hasta ~2026-05-06).** | **30%** |
| **28** | **🟢 Inclusión de Asistentes Administrativos en reportes de profesores** | **BE+FE** | **(inline en maestro — decisión confirmada post-Chat 1: 6 chats no justifican archivo dedicado)** | **🟢 Chat 3b BE ✅ awaiting-prod 2026-05-07 — correos diferenciados + dispatcher AA (INV-AD05 ampliado tercera vez). 14 archivos BE tocados (8 prod + 2 partial mutate/helpers + 2 templates/notif + 2 tests): `PersonaAsistenciaContext.AsistenteAdmin: Director?`, `IAsistenciaAdminRepository.GetAsistenteAdminConSedeAsync` (filtra `DIR_UsuarioReg='Asistente Administrativo'`), `IAsistenciaAdminValidator.ValidarAsistenteAdminActivoAsync`, 3ra rama de `ResolverPersonaAsync` con manejo de `'A'` + actualizado mensaje `TIPO_PERSONA_INVALIDO` → "'E', 'P' o 'A'", switch en `ContextoPersona` con etiqueta "Asistente Administrativo · {Sede}", 3ra rama de `NotificarCorreccionAsync` (helpers) + `NotificarEliminacionAsync` (mutate), `IEmailNotificationService.EnviarNotificacionAsistenciaCorreccionAsistenteAdmin` + template (saludo "Estimado/a {nombre}" + descripción "su asistencia administrativa fue {operacion} manualmente por la direccion del colegio", banner azul reusado), outbox tag `"ASISTENCIA_CORRECCION_ASISTENTE_ADMIN"` + `TipoEntidadOrigen="AsistenciaAsistenteAdmin"`, `IAsistenciaAdminEmailNotifier.NotificarCorreccionAsistenteAdminAsync` + `NotificarEliminacionAsistenteAdminAsync` (silent skip si `DIR_Correo` vacío + try/catch INV-S07). **+6 tests** (4 notifier dispatch AA + 2 outbox contract) → **1681 ✅ / 8 ❌** (los mismos 8 Bulkhead/RuntimeHealth preexistentes documentados en 3a). Smoke local pendiente: crear/editar registro `'A'` desde admin UI → fila en `EmailOutbox` con `EO_TipoEntidadOrigen='AsistenciaAsistenteAdmin'` y destinatario igual a `Director.DIR_Correo`. Chat 3c BE destrabado. Commit pendiente push junto con 3a (`2e9bc77`). ◆ 🟢 Chat 3a BE ✅ awaiting-prod 2026-05-07 (commit `2e9bc77` en Educa.API/master) — reportes PDF/Excel extendidos a `tipoPersona='A'`. 13 archivos toaledos (7 nuevos + 6 modificados): nuevo `ListarAsistentesAdminPorFechaRangoAsync` en `ConsultaAsistenciaRepository` (split queries vs Director + AsistenciaPersona, mirror profesores), wrapper `IReporteFiltradoAsistentesAdminService` (thin delegate), partial `ReporteFiltradoAsistenciaService.AsistentesAdmin.cs` (poblar + procesar día/rango), partials PDF/Excel con sección "ASISTENTES ADMINISTRATIVOS", DTO extendido (`AsistentesAdmin` + 2 contadores), `TiposPersonaValidos=[E,P,A,todos]` en controller, INV-C11 nota Plan 27 excluye 'A' (Chat 1 decisión 6 — AA reusa ventanas Profesor en regular). **+4 tests verdes** (3 endpoint contract paridad PDF/Excel + 1 dispatch). Suite **1675 ✅ / 10 ❌** preexistentes (8 Bulkhead + Plan40F1 + RuntimeHealth — todos por `IBackpressureRetryAfterCalculator` no registrado en DI test, deuda Plan 40 F2/F4 fuera de scope). Smoke local pendiente: `GET /api/ReportesAsistencia/datos?tipoPersona=A&filtro=todos&rango=dia&fecha=...` debe poblar 4 AAs (Vivian dual cae como `'P'` por dispatch first-match; AA puros: Ricardo/Ray/Diana). Chat 3b BE arranca sobre suite estable. ◆ 🟢 Chat 2 BE ✅ cerrado 2026-04-22 — modelo + dispatch + queries. Migración SQL ejecutada (CHECK expandido a `('E','P','A')`). 14 archivos prod tocados: constante `TipoPersona.AsistenteAdmin = "A"`, lookup `GetAsistenteAdminActivoConSedeByDniAsync` filtrando `DIR_UsuarioReg='Asistente Administrativo'` (discriminador del rol es `DIR_UsuarioReg`, no `DIR_Rol` — convención pre-existente del proyecto), dispatch `Profesor → AsistenteAdmin → Estudiante → rechazar` en `AsistenciaService.ResolverPersonaAsync`, rama 'A' en 3 queries de `AsistenciaRepository` + nuevo método `ListarAsistentesAdminDelDiaAsync` en `AsistenciaAdminQueryRepository` + selector admin extendido + helper `ContextoAsistenteAdmin` + DTO estadísticas con campos AA + tupla `(E,P,A)` en `ContarEditados` + log sync service. Colisión real resuelta por dispatch: Vivian Canchari existe dual (AA+Profesor) → cae como `'P'` por first-match-wins (3 AAs puros: Ricardo/Ray/Diana). **+18 tests** (6 lookup, 6 dispatch, 6 `TardanzaRegular`) → **1185 BE verdes**. Commit en Educa.API branch master. **🟢 Chat 1 `/design` ✅ cerrado 2026-04-22 con 8 decisiones: (1) alcance B-amplio acotado al rol "Asistente Administrativo" (4 personas hoy: RICARDO REY, VIVIAN CANCHARI, RAY ORTIZ, DIANA TUESTA — rol = "Asistente Administrativo" explícito, se excluyen Director/Promotor/Coord Académico); filas IN del inventario 11 = {1-3 asistencia admin + 9-10 comunicación (correos + notificaciones)}; filas OUT = {4-5 filtros rol usuarios/tutores, 6-8 horarios/cursos/salones tutoreados, 11 permisos} — criterio: si no es reporte de asistencia o función que el AA no cumple, no entra; (2) `TipoPersona='A'` en `AsistenciaPersona` con `ASP_PersonaCodID` → `Director.DIR_CodID` (extiende dispatch polimórfico Plan 21 con 3er tipo); (3) dispatch webhook `Profesor → Director(rol=AA) → Estudiante → rechazar` — **modifica el orden del Plan 21** (hoy `Profesor → Estudiante`) por regla §7.1 "menor a mayor volumen"; (4) correos diferenciados: helper nuevo `EnviarNotificacionAsistenciaCorreccionAsistenteAdmin` reusa plantilla azul administrativa con saludo propio, destinatario `Director.DIR_Correo`, `TipoEntidadOrigen='AsistenciaAsistenteAdmin'`; (5) self-service "Mi asistencia" generalizado — componente `attendance-profesor-personal` se renombra a `attendance-personal` parametrizado por `TipoPersona` (reusa tabla mensual + día puntual + widget home); (6) horarios = profesor (periodo regular 07:31 tardanza / 09:30 falta, apertura INV-C10 sí aplica, INV-C09 salida temprana no aplica — es `'E'`-only); (7) `INV-AD08` principio general "ningún rol administrativo corrige asistencia de su propio rol" → AA no puede mutar `TipoPersona='A'`; jurisdicción `Roles.SupervisoresAsistenteAdmin = {Director, Promotor, Coordinador Académico}`; (8) alcance persona acotado al rol "Asistente Administrativo" específicamente (Director, Promotor, Coord Académico NO entran al scope — son roles distintos con funciones no operativas-auxiliares). **Plan inline, 6 chats confirmados**: Chat 1 ✅ + Chat 2 BE (modelo + dispatch + queries) + Chat 3 BE (reportes PDF/Excel + correos + bandeja + notificaciones) + Chat 4 FE (admin UI + badge + self-service generalizado + widget home) + Chat 5 cierre docs (INV-AD08/09 en business-rules.md §15.9 + §17 Excel paridad) + Chat 6 gap fix reservado (patrón probado Plan 27). **Chat 2 bloqueado hasta validación del jefe Plan 27 post-deploy** (evita PRs simultáneos sobre `AsistenciaPersona` + `EmailNotificationService`). Invariantes a formalizar en Chat 5: `INV-AD08`, `INV-AD09`, nota cruzada en `INV-AD06`.** | **~30%** |
| **29** | **🔴 Corte de cascada SMTP (`max_defer_fail_percentage`)** | **BE+OPS** | **(inline en maestro)** | **🟢 Chats 1 + 2 + 2.5 + 2.6 + 4 docs ✅ cerrados 2026-04-22/23. Defensas en producción: pre-filtro `EnqueueAsync` + auto-blacklist `BOUNCE_5XX` (3 hits) + endpoint `/defer-fail-status` + widget admin (Plan 22 Chat B) + docs `§18 Correos Salientes` + `INV-MAIL01/02/03/04` en `business-rules.md §15.14`. **Pendiente**: Chat 3 OPS (inspección CrossChex + negociación umbral hosting — lo ejecuta el usuario en cPanel) + eventual micro-chat post-OPS para swap del threshold `5/h` (5 marcadores `<!-- TBD post-OPS -->` en business-rules.md).** | **~90%** |
| 27 | Filtro temporal asistencia diaria por grado (5to Primaria +) | BE+FE | ✅ **archivado 2026-04-22** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-27--filtro-temporal-de-asistencia-diaria-por-grado-5to-primaria-) (pendiente solo validación post-deploy del jefe) | — | — |
| **33** | **🟡 Auditoría de paginación de tablas (count real)** | **BE+FE** | **[plan/pagination-audit.md](./pagination-audit.md)** | **🟡 Plan abierto 2026-04-25 tras fix puntual de `error-logs admin`. Origen: el paginador mostraba "Página 1 de 2" al cargar y revelaba el total real (30 páginas) solo avanzando una a una. Fix de referencia ya aplicado: `Educa.API master 7e9d10b` (endpoint `/count`) + `educa-web main 1a13062` (consumo + fallback). Regla canónica: `.claude/rules/pagination.md`. Inventario inicial: ✅ usuarios/horarios/vistas/permisos-roles (wrapper paginado con `total`), ✅ error-logs (count separado, fixed), ❌ ninguna pendiente confirmada, 🔍 8 features a auditar (`attendances admin`, `attendance-reports cross-role`, `email-outbox-diagnostico`, `email-outbox-dashboard-dia`, `attendance-day-list`, `responsive-table`, `student-attendance-tab`, `attendance-summary-panel`). Cierre del plan: cada 🔍 con status final + cada ❌ con fix asociado + suite verde + browser check. **Siguiente**: chat dedicado de auditoría que clasifique los 8 candidatos y aplique fix donde corresponda.** | **5%** |
| 34 | Saneamiento de errores con `ErrorGroup` | BE+FE | ✅ **archivado 2026-04-27** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-34--saneamiento-de-errores-con-errorgroup) | — | — |
| 32 | Centralización de errores vía Correlation ID | BE+FE | ✅ **archivado 2026-04-25** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-32--centralización-de-errores-vía-correlation-id) | — | — |

| 36 | Rediseño UX/UI páginas internas de Monitoreo | FE+BE | ✅ **archivado 2026-04-28** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-36--rediseño-uxui-páginas-internas-de-monitoreo) | — | — |
| **40** | **🟡 Load Control Layers (concurrency + bulkheads + timeouts + backpressure)** | **BE** | **(inline en maestro — chat 096 cerró `/adr+/design`)** | **🟡 F1-F5 ✅ cerrados local 2026-05-05 (`awaiting-prod/103-107`). F6a sintético ✅ cerrado (chats 108+111+112 cubrieron esc 01-06 con thresholds STRICT). 6 ADRs en `Educa.API/.claude/decisions/0001-0006`. Stack: handcrafted in-process (capa 2-3 con `RateLimiter`/`SemaphoreSlim`) + Polly 8 (`Microsoft.Extensions.Http.Resilience`) sobre HttpClients CrossChex/WhatsApp. N global = 140, 5 bulkheads (`pagos=15`, `reports=8`, `notif=15`, `uploads=10`, `bio=20`). Backpressure 503 con `Retry-After=max(1,ceil(p95×1.5))` desde Plan 102 RuntimeHealth. **Pendiente**: F6b real prod 30d (en HOLD esperando datos). Test fixture deuda menor: 7 tests pre-existentes de F1/F2 fallan por `IBackpressureRetryAfterCalculator` no registrado en sus fixtures.** | **~85%** |
| 35 | Rediseño UX/UI submódulo "Monitoreo" (hub + shells) | FE | ✅ **archivado 2026-04-27** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-35--rediseño-uxui-submódulo-monitoreo-hub--shells) | — | — |

**Semáforo de readiness**:

| Dimensión | Estado | Gate mínimo |
|---|---|---|
| **Feature readiness** | 🟢 Listo | Carril A ✅ + QW4 ✅ — deploy completado |
| **Deploy readiness** | 🟢 Estable | FE (Netlify) + BE (Azure) desplegados 2026-04-16. 2026-04-17 sin incidentes reportados. |
| **Production reliability** | 🔴 Sin red | Falta: tests de contrato, auditoría endpoints, error trace, fallbacks P0 |

## 📋 Cola priorizada (qué arrancar próximo)

> **Qué es esto**: cola explícita de los próximos chats a abordar, ordenados por **criticidad real** (no cronológica). Fuente de verdad para `/next-chat`. Si la cola está vacía o hay empate, `/next-chat` pregunta al usuario.
>
> **Mantenimiento**: al cerrar un chat o al cambiar el panorama, **reordenar acá**. No agregar narrativa de cierre — el detalle vive en el brief y en el plan base.
>
> **Formato**: `N. [Plan · Chat · Repo · Tipo] — scope — razón de prioridad`. Tipo: BE / FE / OPS / docs / design.
>
> **Estado actual**: `running/` y `open/` vacíos. 11 briefs en `awaiting-prod/` esperan deploy + `/verify`. 2 briefs en `waiting/` con HOLD declarado. Lo siguiente requiere crear brief con `/next-chat`.

### 🔴 Crítico — afecta producción hoy

1. **[Plan 29 · Chat 3 · OPS]** — Negociar con hosting cPanel para subir `max_defer_fail_percentage` de 5/h a 25-30/h o ~50 absoluto + decidir política CrossChex SMTP (desactivar / migrar / esperar Plan 24). **Razón**: hoy un solo correo inválido puede bloquear el dominio entero 60 min. Las defensas FE/BE están en producción pero el techo sigue bajo. Sin brief — lo ejecuta el usuario en el admin cPanel. Cierra Plan 29 al 100%.

### 🟡 Alta — desbloquea features pedidas

2. **[Plan 28 · Chat 3 · `Educa.API` · BE]** — Reportes + correos + bandeja + notificaciones AA. **Spliteado 2026-05-07** en 3 sub-chats por tamaño (~25-35 archivos / 600-900 LOC original): **3a** ✅ awaiting-prod (brief 126) reportes PDF/Excel · **3b** ✅ awaiting-prod (brief 127) correos diferenciados + dispatcher AA en `AsistenciaAdminEmailNotifier` · **3c** (open, brief 128) bandeja outbox + notificaciones masivas (alcance probable bajo, depende de pre-work). Cada sub-chat tiene su brief con scope estricto y exclusiones explícitas. **Riesgo conocido**: master tiene 8 fallos preexistentes en `Plan40F2BulkheadIntegrationTests` (DI faltante de `IBackpressureRetryAfterCalculator`); los 3 sub-chats no los tocan, se reportan como ruido al cierre. **Razón del split**: Chat 2 BE cerró 2026-04-22 sobre baseline 1185, pero master saltó a 1679 totales (planes 34/37/38/40/41 mergeados intermedio); brief minimal-from-go subestimaba el alcance.
3. **[Plan 28 · Chat 4 · `educa-web` · FE]** — Admin UI (badge AA en tabla asistencia + edit dialog) + self-service "Mi asistencia" generalizado (renombrar `attendance-profesor-personal` → `attendance-personal` parametrizado por `TipoPersona`) + widget home AA. **Razón**: bloqueado por Chat 3 BE. Cierra alcance funcional del Plan 28.
4. **[Plan 28 · Chat 5 · docs]** — Formalizar `INV-AD08` (ningún rol administrativo corrige asistencia de su propio rol) + `INV-AD09` + nota cruzada en `INV-AD06` en `business-rules.md §15.9` + entrada §17 (Excel paridad). Cierra Plan 28 al 100%.

### 🟢 Media — mejoras de UX y deuda técnica con dueño claro

5. **[Plan 26 · F3 · `Educa.API` · BE]** — Time-of-day modifier para rate limiting. F2.6 ya cumplió ventana de observación post-deploy (~2026-05-06). Diseño aprobado: margen suave fuera de franja escolar (ej: x1.5 dentro / x1.2 fuera), no corte duro. Calibración con telemetría real `RateLimitEvent`.
6. **[Plan 33 · Chat 1 · BE+FE]** — Auditoría de paginación de tablas. Clasificar 8 features candidatas (`attendances admin`, `attendance-reports cross-role`, `email-outbox-diagnostico`, `email-outbox-dashboard-dia`, `attendance-day-list`, `responsive-table`, `student-attendance-tab`, `attendance-summary-panel`) y aplicar fix tipo `error-logs admin` donde corresponda. Plan a 5%.
7. **[WAL Cache Audit · H7 · `educa-web` · FE]** — Normalizar naming `WAL_CACHE_MAP` a camelCase. P1, 1 chat dedicado, riesgo medio-alto (rename cross-archivo).
8. **[WAL Cache Audit · H2-H6+H10 · `educa-web` · FE]** — Cleanup cosmético + duplicación de patrones. P2, 1 chat, bajo riesgo.

### 🔵 Baja — postpuestos / esperan datos

9. **[Plan 24 · Chat 4 (B) · `Educa.API` · BE+OPS]** — Medir 48-72h en prod (`ConfiguredMs / ElapsedMs / Drift` ya emitidos por Chat 4 A') y, si el proveedor lo permite, bajar `CrossChex:Polling:DelayBetweenPagesMs` de 30000 a 10000-15000 vía Azure App Configuration sin redeploy. Cierra Plan 24 al 100%.
10. **[Plan 40 · F6b · BE]** 🔒 **HOLD** — calibración real prod 30d. Brief en `waiting/109`. Espera 30d de telemetría post-deploy de F1-F5.
11. **[Plan 39 · Chat E · BE]** 🔒 **HOLD** — `ExpiredEximLogImportJob` (importador SSH logs Exim). Brief en `waiting/081`. Criterios reactivación documentados (Plan 38 captura <80% / OPS aprueba SSH / 2+ incidentes en trimestre). NO-GO definitivo si en 90d ningún criterio dispara.

### 🟣 Verificaciones post-deploy pendientes (`/verify <NNN>`)

11 briefs en `awaiting-prod/` esperando deploy + smoke. NO requieren chat de ejecución — solo `/verify` cuando el deploy se haga:

- Plan 40 F1-F5 + F3b + F6a esc 06: `103, 104, 105, 106, 107, 108, 110, 111, 112` (9 briefs BE)
- Plan WAL hard/soft delete audit: `118, 119` (2 briefs FE)

### Notas operativas

- **Ningún chat activo** en `running/` ni brief listo en `open/`. El próximo `/start-chat` o `/next-chat` debe crear brief desde esta cola.
- **Plan 29 Chat 3 OPS no genera brief** — es trabajo manual del usuario. Marcar manualmente cuando cierre.
- **Plan 28** desbloqueado tras cierre Plan 27 — ya no hay riesgo de PRs simultáneos sobre `AsistenciaPersona` / `EmailNotificationService`.
- Cualquier hallazgo nuevo (Cowork, browser smoke, telemetría) que requiera chat dedicado entra al final de la sección que corresponda por criticidad.

## 🔧 Hallazgos Cowork pre-deploy 2026-04-29

Hallazgos detectados en navegador asistido (Cowork) antes del deploy formal. No están atados a un plan numerado.

- 🟢 **F-011 BE ✅ cerrado local 2026-04-30** (`Educa.API master`, commit `c4eb865`). Filtro `search` de `GET /api/asistencia-admin/dia` extendido en las 3 ramas (E/P/AA): match contra `*_DNI_Hash` cuando `term` son 8 dígitos + concatenación `Nombres+" "+Apellidos` y `Apellidos+" "+Nombres`. Resuelve el deep-link cross-role → admin (`?dni=...`) que devolvía "No hay registros" aunque la fila existiera. Limitación documentada: DNI parcial criptográficamente imposible (SHA-256 no preserva subcadenas) — el deep-link real pasa DNI completo. **+5 tests** F-011 + ctor migration en Plan27 tests (9/9 verdes en filtro). Smoke local 4/4 OK con DNI `76357038` profesor RAMIREZ. Brief en `awaiting-prod/082` esperando smoke prod del usuario tras deploy. Patrón replicado de `UsuariosRepository.ListarPorRolAsync` (líneas 75-76).
- ⏳ **F-010 FE pendiente** — auto-abrir dialog de edición admin desde el deep-link cross-role. Depende de F-011 desplegado y verificado.
- 🟢 **F-003 cerrado** chat 083 (`awaiting-prod`) — SignalR `/asistenciahub` 404 en navegación Seguimiento.

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

## Plan 29 — Corte de cascada SMTP (`max_defer_fail_percentage`)

> **Origen**: 2026-04-22 — investigación de correos fallidos descubrió techo cPanel `max_defer_fail_percentage = 5/h por dominio`. Cuando se agota, el hosting descarta silenciosamente todo correo del dominio durante 60 min.
>
> **Estado**: 5/6 chats cerrados. Defensas en producción.

### Lo entregado (Chats 1 + 2 + 2.5 + 2.6 + 4 cerrados 2026-04-22/23)

- `EmailBlacklist` + `EmailValidator.Normalize` + pre-filtro en `EmailOutboxService.EnqueueAsync` (rechaza inválidos y blacklisted sin crear fila).
- `EmailBounceBlacklistHandler` en `ProcessSingleEmailAsync.catch`: 3er bounce 5.x.x → INSERT blacklist + `FAILED_BLACKLISTED` atómico. SSL/auth/max-defers NO cuentan.
- Fix TLS estricto (`SslProtocols.Tls12 | Tls13` forzado en SmtpClient, flag `Email:TlsStrictMode` default `true`).
- Endpoint `GET /api/sistema/email-outbox/defer-fail-status` con threshold configurable `Email:DeferFailThresholdPerHour` (default 5).
- Validación universal: cualquier `EmailOutboxService.EnqueueAsync` corre `EmailValidator.Validate(email.To)` sin condicional (Chat 2.5 eliminó el whitelist).
- Docs: `§18 Correos Salientes y Protección del Canal SMTP` en `business-rules.md` + `INV-MAIL01/02/03/04` en `§15.14`. 5 marcadores `<!-- TBD post-OPS -->` para swap del threshold.

### Lo pendiente — Chat 3 OPS

- Pedir al hosting **subir `max_defer_fail_percentage`** a 25-30% (o count absoluto ~50). Negociación con cPanel admin, no código.
- Decidir y ejecutar política CrossChex: desactivar su SMTP / migrar / esperar Plan 24.
- Validación post-deploy 48-72h: sin bloqueo del dominio, log de `EmailBlacklist` insertions, log de `EnqueueAsync` descartes por formato.
- Eventual micro-chat post-OPS para swap del threshold negociado en los 5 `<!-- TBD post-OPS -->`.

### Dependencias

- **Plan 22 Chat B** desbloqueado (widget defer-fail-status consume el endpoint).
- **Plan 28 Chat 3** desbloqueado (sin PRs simultáneos sobre `EmailOutboxService`).
- **Plan 24** habilitador futuro — si Educa consume CrossChex biométrico directamente, podemos cortar su SMTP.

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

- [x] **H1+H8+H9** ✅ (2026-05-04) — Interceptor PascalCase corregido (regla posicional `i===1` controller / `i>1` discriminador), 6 módulos faltantes agregados a `CACHE_VERSIONS` + `MODULE_URL_PATTERNS`, bump de versiones para asistencias/usuarios/salones (Plan 6/21/27/28), 3 patterns corregidos a `/api/sistema/*` reales. Lint+tsc EXIT 0, 31/31 tests interceptors verdes.
- [ ] **H7** — Normalizar naming `WAL_CACHE_MAP` (P1, 1 chat)
- [ ] **H2-H6, H10** — Fixes cosméticos y duplicación de patrones (P2, 1 chat)

---

## Design System — Estándar desde `usuarios`

> ✅ **archivado 2026-05-07** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-20--design-system-estándar-desde-usuarios). F5.3 cerrado al 100% (8/8). Reglas vivas en `rules/design-system.md`.

---

## Deuda estructural diferida (chat dedicado)

- [x] **DS1 — Split estructural de `wal-sync-engine.service.ts`** ✅ cerrado 2026-05-04 (brief `closed/085-wal-sync-engine-split.md`)
  - **Origen**: F3.5.B (2026-04-15). Archivo en 303 líneas efectivas (límite 300). Fix temporal con `eslint-disable max-lines` justificado en el encabezado del archivo.
  - **Cierre**: extraído `WalSyncRecovery` (boot-time recovery service stateless con `run(): WalRecoveryResult`) + agregado `classifyWalError()` puro a `wal-error.utils.ts` (discriminated union `'conflict' | 'permanent' | 'retryable'`). Engine pasó de 303 → **274 líneas efectivas** (margen 26 al cap, sin escape hatch). Hallazgo durante diagnóstico que pisó la propuesta inicial: `wal-error.utils.ts` ya extraía las funciones puras de clasificación; lo que vivía en `handleError` era orquestación de efectos, no clasificación — por eso la extracción final fue Recovery (no Error Handling). +14 specs nuevos (8 classifier + 6 recovery) → **1798/1798 verdes** (baseline 1784).

---

## Notas de ubicación

- Planes en `educa-web/.claude/plan/` son los de **alcance amplio** (incluyen refs cruzadas al backend).
- Planes en `educa-web/.claude/tasks/` son **transversales al proyecto** pero con granularidad de tarea (enforcement, design patterns).
- Planes en `Educa.API/.claude/plan/` son **exclusivos del backend**.
- Este maestro vive en `educa-web/.claude/plan/maestro.md` porque es el punto donde convergen más referencias cross-repo.

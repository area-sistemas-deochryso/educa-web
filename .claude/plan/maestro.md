# Plan Maestro — Orden y Dependencias

> **Fecha**: 2026-04-14 (última revisión: 2026-04-22, **🔴 Plan 29 nuevo — MÁXIMA PRIORIDAD** — descubierto 2026-04-22 en investigación de correos fallidos `261ochapa@gmail.com`: cPanel/Exim bloquea el dominio entero durante 60 min cuando llega a **5 defers+fails/h por dominio** (`max_defer_fail_percentage`). Es un techo separado de los 50/h buzón / 200/h dominio / 300/h cuenta documentados en `project_smtp_limits.md`. CrossChex está mandando desde SMTP compartido con correos inválidos de su lista interna → agota el contador → todos los correos legítimos de Educa se descartan silenciosamente. **Plan 29 inline** con 4 chats: pre-filtro + blacklist + corte SMTP CrossChex + docs INV-MAIL01/02/03. Plan 22 Chat B (widget) se posterga hasta cerrar Plan 29. **Plan 28 Chat 2 BE ✅ cerrado** — modelo polimórfico `'A'` + dispatch 3 pasos + queries admin extendidas + migración SQL ejecutada. +18 tests BE, 1185 verdes. Plan 27 Chat 5c ✅ cerrado — pendiente solo validación del jefe post-deploy)
> **Objetivo**: Ordenar los 11 planes dispersos entre `educa-web/.claude/` y `Educa.API/.claude/` en una secuencia con dependencias explícitas.
> **Principio rector** (actualizado 2026-04-16): "Features primero — el enforcement y la arquitectura son valiosos solo si soportan funcionalidad real. La deuda técnica se paga en paralelo, no como prerrequisito."
>
> 🛠️ **Meta-tooling 2026-04-27** (chat 054, en `awaiting-prod/`): bucket nuevo `chats/awaiting-prod/` + comando `/verify <NNN>` para resolver el bottleneck de chats con verificación post-deploy pendiente. `/end` ahora pregunta gate post-deploy. Backlogs pasaron de 6 a 7. 9 briefs backfilled de `closed/` → `awaiting-prod/`. Hook `backlog-check.sh` cuenta el bucket y dispara aviso si excede 8. Ver [rules/backlog-hygiene.md](../rules/backlog-hygiene.md) y [commands/verify.md](../commands/verify.md).

---

## Inventario de planes FE

> **2026-05-15 (brief 172, ADR-0002 ejecución)**: filas migradas a `Educa.API/.claude/plan/maestro.md` o `educa-coord/plans/maestro.md` quedan con puntero `→ ver maestro <repo>`. Planes BE-only (4, 12, 16, 17, 40, 45) y cross-repo (10, 14, 15, 18, 19, 22, 24, 26, 28, 29, 30, 32, 33, 34, 38, 39, 41, 42, 43, 44) salen del scope de este maestro. Quedan FE-only: P1 F5, P5, P11 (archivado), P13, P20 (archivado), P35-36 (archivado), P46-48 (archivado).

| # | Plan | Repo | Ruta | Estado | % |
|---|------|------|------|--------|---|
| 1 | Enforcement de Reglas | FE | `tasks/enforcement-reglas.md` + [`plan/enforcement-fase-5-wrappers.md`](./enforcement-fase-5-wrappers.md) | F1-F3 ✅ · F4 parcial ✅ (F4.4-F4.5 🔒) · **F5 ✅ awaiting-prod 2026-05-11** (brief 137) — barrel-only enforcement para 3 wrappers críticos (storage/wal/session). 3 reglas nuevas en `LAYER_RULES` + `WalFacadeHelper.hasPendingForResource()` + barrels reducidos (storage exports `StorageService` + `SmartDataStorageService`; wal quita `WalService`/`WalReconciler`/`WalCircuitBreaker`). 14 archivos prod + 6 specs migrados a barrel. Lint 0 err · 67/67 specs touched ✅ · build prod ✅. | ~90% |
| 2 | Arquitectura Backend — Opciones A/B/C | BE | → [`Educa.API/.claude/plan/maestro.md`](../../../Educa.API/.claude/plan/maestro.md) | (BE-only) | — |
| 3 | Domain Layer (Opción A) | BE | → [`Educa.API/.claude/plan/maestro.md`](../../../Educa.API/.claude/plan/maestro.md) | (BE-only) | — |
| 4 | Consolidación Backend | BE | → [`Educa.API/.claude/plan/maestro.md`](../../../Educa.API/.claude/plan/maestro.md) | (BE-only, migrado 2026-05-15) | — |
| 5 | Consolidación Frontend | FE | `plan/consolidacion-frontend.md` (pendiente crear) | ⏳ | 0% |
| 6 | Asignación Profesor-Salón-Curso | BE+FE | → [`educa-coord/plans/xrepo-asignacion-profesor-salon-curso.md`](../../../educa-coord/plans/xrepo-asignacion-profesor-salon-curso.md) | ✅ **100% — archivado 2026-04-22** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-6) | — |
| 7 | Error Trace Backend | BE | → [`Educa.API/.claude/plan/maestro.md`](../../../Educa.API/.claude/plan/maestro.md) | (BE-only) | — |
| 8 | Design Patterns Backend | FE | `tasks/design-patterns-backend.md` (pendiente crear) | Incremental | N/A |
| 9 | Design Patterns Frontend | FE | `tasks/design-patterns-frontend.md` (pendiente crear) | Incremental | N/A |
| 10 | Flujos Alternos (resiliencia) | xrepo | → [`educa-coord/plans/maestro.md`](../../../educa-coord/plans/maestro.md) | (cross-repo, migrado 2026-05-15) | — |
| 11 | Refactor `eslint.config.js` (fix G10) | FE | `plan/eslint-config-refactor.md` | ✅ **100% — archivado 2026-04-22** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-11) | — |
| 12 | Backend Test Gaps | BE | → [`Educa.API/.claude/plan/maestro.md`](../../../Educa.API/.claude/plan/maestro.md) | (BE-only) | — |
| 13 | Frontend Test Gaps | FE | `plan/test-frontend-gaps.md` (pendiente crear) | ⏳ | 0% |
| 14 | Contratos FE-BE | FE+BE | → [`educa-coord/plans/xrepo-14-contratos-fe-be.md`](../../../educa-coord/plans/xrepo-14-contratos-fe-be.md) | ⏳ | 0% |
| 15 | Release Protocol y Operaciones | FE+BE | → [`educa-coord/plans/xrepo-15-release-operations.md`](../../../educa-coord/plans/xrepo-15-release-operations.md) | F1 ✅ · F2 ✅ · F3-F5 ⏳ | ~40% |
| 16 | Auditoría de Seguridad | BE | → [`Educa.API/.claude/plan/maestro.md`](../../../Educa.API/.claude/plan/maestro.md) | (BE-only) | — |
| 17 | Enforcement max-lines BE (CI) | BE | → [`Educa.API/.claude/plan/maestro.md`](../../../Educa.API/.claude/plan/maestro.md) | (BE-only, extraído 2026-05-15) | — |
| 18 | Tests de flujo de negocio E2E | xrepo | → [`educa-coord/plans/maestro.md`](../../../educa-coord/plans/maestro.md) | (cross-repo, extraído 2026-05-15) | — |
| 19 | Comunicación: foro + mensajería + push | xrepo | → [`educa-coord/plans/maestro.md`](../../../educa-coord/plans/maestro.md) | (cross-repo, extraído 2026-05-15) | — |
| 20 | Design System — Estándar desde `usuarios` | FE | ✅ **archivado 2026-05-07** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-20--design-system-estándar-desde-usuarios) | — | — |
| 21 | Asistencia de Profesores en CrossChex | BE+FE | `plan/asistencia-profesores.md` | ✅ **100% — archivado 2026-04-22** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-21). Deuda lateral pendiente: `PermisoSaludAuthorizationHelper.cs:63`; cols `ERL_*` en BD prueba; DROP `Asistencia_deprecated_2026_04` ~2026-06-20 | — |
| 22 | Endurecimiento correos de asistencia | BE+FE | ✅ **archivado 2026-04-23** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-22--endurecimiento-de-correos-de-asistencia) | — | — |
| 23 | Extensión `/intranet/admin/asistencias` a Profesores | BE+FE | `plan/asistencia-admin-profesores.md` | ✅ **100% — archivado 2026-04-22** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-23) | — |
| 24 | Sync CrossChex en Background Job | xrepo | → [`educa-coord/plans/maestro.md`](../../../educa-coord/plans/maestro.md) | (cross-repo, extraído 2026-05-15) | — |
| 25 | Paridad Excel para reportes PDF | BE+FE | (archivado en historial) | ✅ **100% — archivado 2026-04-22** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-25). Regla §17 en `business-rules.md` con INV-RE01/02/03 | — |
| 26 | Rate limiting flexible | xrepo | → [`educa-coord/plans/maestro.md`](../../../educa-coord/plans/maestro.md) | (cross-repo, extraído 2026-05-15) | — |
| 28 | Inclusión Asistentes Administrativos en reportes | xrepo | → [`educa-coord/plans/maestro.md`](../../../educa-coord/plans/maestro.md) | (cross-repo, extraído 2026-05-15) | — |
| 29 | Corte cascada SMTP (`max_defer_fail_percentage`) | xrepo | → [`educa-coord/plans/maestro.md`](../../../educa-coord/plans/maestro.md) | (cross-repo, extraído 2026-05-15, cerrado 2026-05-12) | — |
| 27 | Filtro temporal asistencia diaria por grado (5to Primaria +) | BE+FE | ✅ **archivado 2026-04-22** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-27--filtro-temporal-de-asistencia-diaria-por-grado-5to-primaria-) (pendiente solo validación post-deploy del jefe) | — | — |
| 33 | Auditoría de paginación de tablas (count real) | BE+FE | ✅ **100% — archivado 2026-05-09** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-33--auditoría-de-paginación-de-tablas) (chat 135 retro-validación: las 8 features 🔍 son client-side o presentacionales, ninguna paga BE con paginación) | — | — |
| 34 | Saneamiento de errores con `ErrorGroup` | BE+FE | ✅ **archivado 2026-04-27** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-34--saneamiento-de-errores-con-errorgroup) | — | — |
| 32 | Centralización de errores vía Correlation ID | BE+FE | ✅ **archivado 2026-04-25** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-32--centralización-de-errores-vía-correlation-id) | — | — |

| 36 | Rediseño UX/UI páginas internas de Monitoreo | FE+BE | ✅ **archivado 2026-04-28** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-36--rediseño-uxui-páginas-internas-de-monitoreo) | — | — |
| 40 | Load Control Layers (concurrency + bulkheads + timeouts + backpressure) | BE | → [`Educa.API/.claude/plan/maestro.md`](../../../Educa.API/.claude/plan/maestro.md) | (BE-only, extraído 2026-05-15) | — |
| 35 | Rediseño UX/UI submódulo "Monitoreo" (hub + shells) | FE | ✅ **archivado 2026-04-27** en [history/planes-cerrados.md](../history/planes-cerrados.md#plan-35--rediseño-uxui-submódulo-monitoreo-hub--shells) | — | — |
| **41** | **🟢 Trazabilidad y observabilidad del Hub de Correlación** | **BE+FE** | **→ [`educa-coord/plans/xrepo-41-correlation-hub-observability.md`](../../../educa-coord/plans/xrepo-41-correlation-hub-observability.md)** | **🟢 Plan abierto 2026-05-08. 12 brechas identificadas tras revisión de `/intranet/admin/correlation/:id` (Plan 32 shipped). 14 chats en 6 fases. **Estado real (2026-05-16)**: F1 ✅ awaiting-prod (chat 131, brechas #1+#12 timeline + cap-awareness). F2 BE ✅ awaiting-prod (chat 132). F2 FE Chat 3 pendiente (espera `/verify` Chat 2 BE). **F5 Chat 10 ✅ awaiting-prod 2026-05-16 (brief 180)** — botón "Exportar JSON" en hub header, service nuevo `CorrelationExportService` con `Blob + URL.createObjectURL`, filename `correlation-{id}-{YYYYMMDD}.json`, payload con `correlationId + generatedAt + hubUrl + snapshot` (cierra brecha #10). +4 tests verdes, suite correlation 24/24 ✅, lint clean, build prod ok. Chat 11 (auto-refresh) y Chat 9 (search global) siguen ⏳.** | **15%** |
| **42** | **🟢 Normalización de casing en contratos REST FE↔BE** | **BE+FE** | **→ [`educa-coord/plans/xrepo-42-case-drift.md`](../../../educa-coord/plans/xrepo-42-case-drift.md)** | **🟢 F1 ✅ + F2-FE ✅ cerradas 2026-05-09 (chat 138 closed). F2-FE: audits F2-FE.1/4/5 ejecutados — 0 hallazgos `obj.PascalCase`, `HttpParams` 100% camelCase, headers `X-*` consistentes. F2-FE.3 ✅ implementado: `WalService.normalizeEndpoint()` (lowercase path + preserve query) aplicado en `append()`, +7 tests verdes (suite WAL 119/119). Hallazgo lateral: `health-justification-dialog.component.ts` usa FormData PascalCase (deuda menor, candidato follow-up). F2-BE pendiente (brief par 004 BE running). El "mito documental" denunciado por la auditoría inicial era falso positivo: ASP.NET Core 9 `AddNewtonsoftJson()` registra `CamelCaseNamingStrategy` por convención implícita vía `NewtonsoftJsonMvcOptionsSetup` interno del package (visible en `bin/.../Microsoft.AspNetCore.Mvc.NewtonsoftJson.dll` con strings `CamelCaseNamingStrategy`/`DefaultContractResolver`/`NewtonsoftJsonMvcOptionsSetup`). El comentario `Program.cs:74` ("camelCase para coincidir con HTTP") es **correcto** — los controllers HTTP sí emiten camelCase de facto. Hipótesis (d)/(e)/(b)/(c) descartadas vía grep exhaustivo + 1535+ tests FE verdes en prod. **F2 reducido**: F2-BE.4 (CORS Expose-Headers `X-Correlation-Id, X-Schema-Version`) sigue siendo crítica — Plan 41 puede estar pagando este bug. F2-BE.5 (snapshot tests contrato) sigue siendo recomendable. F2-BE.1 (override explícito `CamelCasePropertyNamesContractResolver`) opcional como defensa en profundidad. F2-FE.2 (interceptor defensivo) descartado. F2-FE.3 (WAL endpoint normalize) sigue válido. F4 INV-CONTRACT01/02/03 intacto. Resultado completo en [`educa-coord/plans/xrepo-42-case-drift.md` §Resultado F1](../../../educa-coord/plans/xrepo-42-case-drift.md). Briefs F2-BE/F2-FE pueden correr en paralelo sin riesgo Rama C.** | **35%** |
| **43** | **🟢 Monitoreo: feedback Cowork producción 2026-05-11** | **BE+FE** | **→ [`educa-coord/plans/xrepo-43-monitoreo-cowork-feedback-2026-05-11.md`](../../../educa-coord/plans/xrepo-43-monitoreo-cowork-feedback-2026-05-11.md)** | **🟢 Plan abierto 2026-05-11. 24 hallazgos clasificados (A1-A13 bugs/huecos + B1-B12 mejoras estructurales) tras revisión Cowork de `/intranet/admin/monitoreo` con datos reales de producción. 13 chats en 6 fases. **Principio rector**: foundations primero (correlation id propagado + fingerprint correcto + contadores reconciliados) → diagnóstico real (SMTP visible) → operatividad (filtros + acciones inline) → visualizaciones → vista unificada. Muchos hallazgos comparten causa raíz: resolver de raíz cierra 3-5 puntos al mismo tiempo. F1 desbloquea F3/F5/F6. F2 paralelo sin dependencias. Coordinar Chat 1.3 (correlation id end-to-end) con Plan 41 F6 que también lo tiene en cola. **Chat 1.1 ✅ ship 2026-05-11** (chat 139, A1+B11 cerrados — los 3 widgets etiquetados con `Source`/`TimeWindowLabel`; los 3 endpoints miden ventanas legítimamente distintas, no fuentes distintas como decía la hipótesis original). Tabla de cierre por punto en el plan dedicado.** | **8%** |
| 44 | Reducción de volumen SMTP — DESCARTADO 2026-05-12 | xrepo | → [`educa-coord/plans/maestro.md`](../../../educa-coord/plans/maestro.md) | (cross-repo memoria, extraído 2026-05-15) | — |
| 45 | Limpieza drifts BE | BE | → [`Educa.API/.claude/plan/maestro.md`](../../../Educa.API/.claude/plan/maestro.md) | (BE-only) | — |
| **46** | **🟢 Limpieza de drift documental en `.claude/` FE** | **FE** | **[plan/drift-doc-cleanup.md](./drift-doc-cleanup.md)** | **✅ cerrado 100% (chat 157, 2026-05-15) — F1 + F2 + F2.b + F3 completos. F2.b re-verificó los 10 items pendientes (8 ✅ PASS + 2 ⚪ N/A FE). F3: `dialogs-sync.md` ya estaba limpia (anti-patrón solo en prosa, sin ejemplo malo). Stats finales: 22/28 ✅ + 2 ⚪ + 2 ❌ activos (Plan 47 maestro links ✅ shipped + Plan 45 BE drift) + 1 ⚠️ parcial (Plan 48 appendTo ✅ shipped) = 86% cerrado. Drift-report archivado a `history/drift-report-2026-04.md`.** | **100%** |
| **47** | **✅ Limpieza de links rotos en `maestro.md`** | **FE** | **[plan/maestro-links-cleanup.md](./maestro-links-cleanup.md)** | **✅ **cerrado 2026-05-15** (brief 158). Audit confirmó que de los "18 links rotos" reportados, solo 1 era markdown link real: `./case-drift.md` → fix a `../../../educa-coord/plans/xrepo-42-case-drift.md` (Plan 42 cross-repo). Los otros 17 eran rutas en backticks (notación informativa, no clickeable). Criterio de cierre cumple: `grep -E ']\([^)]+\.md\)' .claude/plan/maestro.md` retorna 0 broken. Deuda menor lateral: anchors cortos `#plan-6`, `#plan-11`, etc. apuntan a headings con texto extendido — VSCode preview los resuelve por prefijo, GitHub strict no. Candidato a follow-up oportunístico.** | **100%** |
| **48** | **✅ Barrido `appendTo="body"` en `p-select`** | **FE** | **[plan/appendto-barrido.md](./appendto-barrido.md)** | **✅ Cerrado 2026-05-15 — brief 159. Inventario al arrancar: 4 archivos (drift bajó de 7 → 4 desde 2026-05-13). 5 tags `appendTo="body"` agregados en: `attendance-table` (2), `permisos-usuarios`, `usuario-form-dialog`, `login-intranet`. Re-grep confirma 0 instancias restantes. Lint limpio.** | **100%** |

**Semáforo de readiness**:

| Dimensión | Estado | Gate mínimo |
|---|---|---|
| **Feature readiness** | 🟢 Listo | Carril A ✅ + QW4 ✅ — deploy completado |
| **Deploy readiness** | 🟢 Estable | FE (Netlify) + BE (Azure) desplegados 2026-04-16. 2026-04-17 sin incidentes reportados. |
| **Production reliability** | 🔴 Sin red | Falta: tests de contrato, auditoría endpoints, error trace, fallbacks P0 |

## 📋 Cola priorizada (qué arrancar próximo)

> **Saneado 2026-05-16** (chat coord, raíz [ADR-0002](../../../educa-coord/decisions/0002-maestros-y-planes.md)) — esta cola lista **solo trabajo FE-only**. Sub-chats BE viven en [`Educa.API/.claude/plan/maestro.md`](../../../Educa.API/.claude/plan/maestro.md). Sub-chats cross-repo (BE+FE) viven en [`educa-coord/plans/maestro.md`](../../../educa-coord/plans/maestro.md) como single-source de prioridad.
>
> **Formato**: `N. [Plan · Chat · Tipo] — scope — razón de prioridad`. Tipo: FE / FE docs / design.
>
> **Mantenimiento**: al cerrar un chat o al cambiar el panorama, **reordenar acá**. No agregar narrativa de cierre — el detalle vive en el brief y en el plan base. Items BE-only que aparezcan acá → mover al maestro BE; items cross-repo → mover al maestro coord.

### 🟢 Pullable FE-only

- **Brújula W21 — Pulido intranet académica (2026-05-18 → 2026-05-24)** → sub-plan FE [`intranet-fe-polish-W21.md`](intranet-fe-polish-W21.md). **F1 ✅ closed 2026-05-18 (brief 187)** — matriz `F1.Resultados` poblada con 10 pages auditadas. **F2 ✅ 2026-05-18** — 5 briefs materializados en `chats/open/` ordenados chico→grande: `188` ✅ closed 2026-05-18 (no-op: `appendTo="body"` ya presente en commits previos del attendance-summary-panel), `189` ✅ closed 2026-05-18 (tokens colors — 4 archivos en estudiante/cross-role: 19 hex → tokens Aura; `CURSO_COLORS` marcado como excepción legítima por `darkenColor()` bitwise), `190` ✅ closed 2026-05-18 (Opción A: gate visual ya estaba vía `@if(debugInfo())` + `environment.debug.horarioSync`; 8 hex listados + 4 inline HTML → tokens Aura `--red-500`/`--yellow-500`/`--orange-500`/`--white-color`/`--green-500` + 5 SCSS vars `$debug-*` para paleta Catppuccin del panel dev-only con excepción documentada), `191` ✅ closed 2026-05-18 (aria-label vía `pt`/atributo nativo en day selector de `estudiante/schedules` + `incrementButtonAriaLabel`/`decrementButtonAriaLabel` en `p-inputNumber` del simulador de notas; resto del scope sin botones icon-only), `192` ✅ closed 2026-05-18 (skeletons shared — 4 pages + 3 sub-components migrados: `estudiante/schedules` overlay → grid de 6 `app-skeleton-loader`; `estudiante/notas` `p-progressSpinner` → combo header+filters+card; `estudiante/cursos` + `profesor/cursos` → `app-table-skeleton` con `SkeletonColumnDef[]`; sub-components `student-files-dialog`/`student-task-submissions-dialog`/`calificaciones-panel` → stacks de `rect`; 0 `p-progressSpinner` aislados en scope; `minHeight` declarado en todos). **F3 ✅ closed 2026-05-19 (brief 193)** — split del monolito (290 ln) en `.ts` slim (211 ln) + `.html` + `.scss` separados, siguiendo patrón de `estudiante/notas`. 2× `p-progressSpinner` → `app-skeleton-loader` (variant `rect` + `card`). `p-confirmDialog` movido fuera del `@if (contenido())` (dialogs-sync compliance). Custom dialogs (`app-evaluacion-form-dialog`, `app-calificar-dialog`, `app-periodos-config-dialog`) quedaron dentro del `@if` por dependencia con `contenido()` no-null — fix arquitectural fuera de scope. Lint ✅ · tsc ✅. Brújula coord en [`brujula-W21-intranet-polish.md`](../../../educa-coord/plans/brujula-W21-intranet-polish.md). BE corre en paralelo con su propio sub-plan de tests.

### 🔗 Referencias cross-repo (sub-chats FE de planes cross-repo)

> Prioridad global vive en [`educa-coord/plans/maestro.md`](../../../educa-coord/plans/maestro.md). Acá solo se listan para visibilidad — cuando llegue su turno, el brief se materializa en `chats/open/` del repo correspondiente.

- **Plan 43 — Monitoreo Cowork** → [`educa-coord/plans/xrepo-43-monitoreo-cowork-feedback-2026-05-11.md`](../../../educa-coord/plans/xrepo-43-monitoreo-cowork-feedback-2026-05-11.md). Sub-chats con trabajo FE pendiente:
  - Chat 3.2 (Detalle correo completo + buscador inclusivo A4+A5) — espera F1.
  - Chat 4.1 (Filtros + paginación Bandeja A2+B5) — espera F1.
  - Chat 4.2 (Filtros server-side Errores A9+A10+B5) — depende Chat 1.2 fingerprint.
  - Chat 4.3 (Acciones inline reintentar/blacklist/export B6) — depende F3.
  - Chat 5.1 (Sparklines KPI B8) — depende Chat 1.1.
  - Chat 5.2 (Heatmap latencia + bundle telemetría B9+B10) — depende Chat 1.2+1.3.
  - Chat 6.1 (Vista unificada por destinatario B1) — depende F1+F3+F4.
  - Chat 6.2 (Links bidireccionales + Gap accionable B12) — depende 6.1+4.3.
- **Plan 41 — Correlation Hub** → [`educa-coord/plans/xrepo-41-correlation-hub-observability.md`](../../../educa-coord/plans/xrepo-41-correlation-hub-observability.md). Próximo FE-only: Chat 3 (arriba como Pullable). Chats 9 (search global), 11 (auto-refresh) ⏳.
- **Plan 42 — Casing contratos REST** → [`educa-coord/plans/xrepo-42-case-drift.md`](../../../educa-coord/plans/xrepo-42-case-drift.md). F2-FE ✅. Sin trabajo FE pendiente; F2-BE en cola BE.

### 🟣 Verificaciones post-deploy pendientes (`/verify <NNN>`)

Briefs en `awaiting-prod/` esperando deploy + smoke. NO requieren chat de ejecución — solo `/verify` cuando el deploy se haga:

- **FE puros**: Plan 1 F5 (`137`), Plan 28 Chat 4 (`134`), Plan 41 Chat 3a (`186`), Plan 41 Chat 3b (`185`), Plan 41 F5 Chat 10 (`180`), Plan 43 Chat 1.2 FE sparkline (`152`), Plan 43 Chat 2.1 FE (`147`), Plan 43 Chat 3.1b FE drawer SMTP (`169`), WAL hard/soft delete audit (`118, 119`).
- **BE residentes en repo FE** (no migrados retroactivamente, [ADR-0002](../../../educa-coord/decisions/0002-maestros-y-planes.md) §Out-of-scope): Plan 40 F1-F5+F3b+F6a (`106, 108, 110, 111, 112`), Plan 26 F3 (`136`), Plan 43 Chat 2.1 BE (`142`).

### Notas operativas

- **Chat activo en `running/`**: ninguno.
- **Plan 41 Chat 3a FE ✅ awaiting-prod 2026-05-18** (brief `186`) — Botones de navegación cruzada en las 3 sub-secciones del hub de correlación: errors → `/trazabilidad-errores?fingerprint=`, emails → `/email-outbox?destinatario=`, reports → `/reportes-usuario?id=`. Cada sección con handler `Router.navigate` (errors con `[disabled]` cuando `errorGroupCode` nullish). Aria-label vía `pt` passthrough. +8 tests vitest verdes (11/11 spec total en components/). `rate-limit-section` sin botón (no hay destino admin sensato por evento individual). Desviación: rutas destino usan redirects legacy ya que codebase no tiene `/error-groups` ni `/feedback-reports/<id>` como rutas directas. Pendiente smoke browser post-deploy → `/verify 186`.
- **Plan 43 Chat 4.1b FE ✅ awaiting-prod 2026-05-18** (brief `184`) — Paginación server-side variante B (`/count` separado) en `/intranet/admin/email-outbox`. Service extendido (`tipoFallo`, `correlationId`, `page`, `pageSize` + endpoint `/count` fail-safe), store con `_page`/`_pageSize`/`_totalCount` + `totalRecordsEstimate` con fallback progresivo, facade dispatcha `loadData` paralelo en `forkJoin` y `loadPage` solo items (no recarga count), filtro UI `correlationId` + btn-clear §B6, tabla `[lazy]` con `[totalRecords]` real y guard idempotente para el bounce inicial de PrimeNG. Bug fix: `onFilterTipoFalloChange` ahora dispara refetch. +8 tests vitest verdes (14/14 spec total). Lint ✅ · tsc ✅. Pendiente smoke browser post-deploy BE 183 → `/verify 184`.
- **Saneamiento de cola 2026-05-16** — quitados ítems BE-only (Plan 26 F4, Plan 45, Plan 40 F6b, Plan 39 Chat E, Plan 24 Chat 4 B → maestro BE) y sub-chats cross-repo BE+FE de Plan 43 (3.2/4.1/4.2/4.3/5.1/5.2/6.1/6.2 → maestro coord). Las narrativas históricas de cierres (Plan 22, 28, 29, 44, 46) viven ahora en `history/` o en los planes base; esta cola solo trackea trabajo accionable.
- Cualquier hallazgo nuevo (Cowork, browser smoke, telemetría) que requiera chat dedicado entra al final de la sección que corresponda por criticidad. Si el hallazgo es BE-only o cross-repo, entra al maestro correspondiente, **no acá**.

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
- [ ] **Plan 26 — Rate limiting flexible** (50%, F1+F2 ✅ + **F3 ✅ awaiting-prod** 2026-05-09 con `SchoolHoursResolver` + multiplier x1.5/x1.2; F4 burst+sustained pendiente)
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

→ Migrado a [`educa-coord/plans/xrepo-29-smtp-corte-cascada.md`](../../../educa-coord/plans/xrepo-29-smtp-corte-cascada.md) (cross-repo, cerrado 100% 2026-05-12). Body extraído 2026-05-15 (brief 172, ADR-0002).

## Plan 28 — Inclusión de Asistentes Administrativos en reportes de profesores

→ Migrado a [`educa-coord/plans/xrepo-28-asistentes-admin.md`](../../../educa-coord/plans/xrepo-28-asistentes-admin.md) (cross-repo, ~30%). Body extraído 2026-05-15 (brief 172, ADR-0002).

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

## Plan 24 — Sincronización CrossChex en Background Job

→ Migrado a [`educa-coord/plans/xrepo-24-crosschex-sync.md`](../../../educa-coord/plans/xrepo-24-crosschex-sync.md) (cross-repo, ~85%). Body extraído 2026-05-15 (brief 172, ADR-0002).

## Plan 30 — Dashboard Visibilidad Admin (correos + asistencia)

→ Migrado a [`educa-coord/plans/xrepo-30-dashboard-visibilidad.md`](../../../educa-coord/plans/xrepo-30-dashboard-visibilidad.md) (cross-repo, diseñado). Body extraído 2026-05-15 (brief 172, ADR-0002).

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

→ Migrado a [`Educa.API/.claude/plan/enforcement-max-lines.md`](../../../Educa.API/.claude/plan/enforcement-max-lines.md) (BE-only). Body extraído 2026-05-15 (brief 172, ADR-0002).

#### Plan 18 — Tests de flujo de negocio E2E (cross-layer)

→ Migrado a [`educa-coord/plans/xrepo-18-e2e-flujos-negocio.md`](../../../educa-coord/plans/xrepo-18-e2e-flujos-negocio.md) (cross-repo). Body extraído 2026-05-15 (brief 172, ADR-0002).

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

→ Migrado a [`educa-coord/plans/xrepo-19-comunicacion.md`](../../../educa-coord/plans/xrepo-19-comunicacion.md) (cross-repo). Body extraído 2026-05-15 (brief 172, ADR-0002).

#### Planes 8-9 — Design Patterns

- [ ] Incrementales al tocar cada módulo

#### Plan 22 — Endurecimiento correos de asistencia 🟢 (plan file 2026-04-21 · Chat 1 + Chat 2 + Chat 3 F3.BE + Chat 4 F3.FE cerrados 2026-04-21 · pendientes F4.BE + F4.FE)

> **Origen**: Conversación 2026-04-20. Tres patrones de fallo silencioso en correos CrossChex detectados en el buzón `sistemas@laazulitasac.com`: caracteres no-ASCII (ñ/tildes) que rebotan como 550 no such user, bandejas llenas (4.2.2 over quota) y rate limit del SMTP saliente (`laazulitasac.com exceeded 5/5 failures/hour`) que descarta silenciosamente correos legítimos. El retry agresivo actual (5 intentos por bounce) amplifica el problema.
> **Plan**: → [`educa-coord/plans/xrepo-22-asistencia-correos-endurecimiento.md`](../../../educa-coord/plans/xrepo-22-asistencia-correos-endurecimiento.md) — Plan #22 del inventario.
> **Estado**: plan file creado 2026-04-21 con desglose de 6 chats atómicos (4 BE + 2 FE). Secuencia sugerida F1 → F2 → F3.BE → F3.FE → F4.BE → F4.FE. Chat 1 (F1) + Chat 2 (F2) + Chat 3 (F3.BE) + Chat 4 (F3.FE) cerrados 2026-04-21. **Próximo**: Chat 5 (F4.BE) en backend — endpoint `GET /api/sistema/auditoria-correos-asistencia` para auditoría preventiva de correos con formato inválido.
> **Dependencia dura**: Plan 21 cerrado ~92% (Chat 5 deploy pendiente). Diseño/ejecución de F1-F3 no lo bloquea; el deploy conjunto sí requiere Plan 21 en producción. Paralelizable con Plan 23.
> **Precede a Plan 24**: el outbox consolidado + `ErrorLog` + correo resumen diario que entrega este plan son insumo para el job CrossChex en background.

- [x] **Chat 1 — F1** ✅ (BE, 2026-04-21) — Validación ASCII+RFC al encolar. Helper `EmailValidator` (`FailedNoEmail`/`FailedInvalidAddress`, regex RFC 5322 básico + check de ASCII imprimible 0x20-0x7E). Guard en `EmailOutboxService.EnqueueAsync` solo para `tipo ∈ {Asistencia, AsistenciaProfesor}` → registro `FAILED` directo sin intento SMTP + `EO_UltimoError` prefijado `[FAILED_*]` (columna `EO_TipoFallo` se agrega en F2). Flujo pesado fuera de alcance: log `LogWarning` con destinatario + entidadOrigen+id. 22 unit tests + 8 integration tests (EF InMemory + `TestApplicationDbContext` que relaja `EO_RowVersion` requerido por SQL Server `[Timestamp]` pero no auto-generado por InMemory). 831/831 tests suite completa verde. `EmailOutboxService.cs` 286 ln (cap 300). INV-S07 respetado + test de regresión para tipo fuera de alcance.
- [x] **Chat 2 — F2** ✅ (BE + SQL, 2026-04-21) — Clasificación SMTP · helper `SmtpErrorClassifier` (constantes públicas `FailedInvalidAddress`/`FailedMailboxFull`/`FailedRejected`/`FailedUnknown`/`Transient`; regex enhanced `[245]\.\d+\.\d+` con prioridad sobre `StatusCode` plano; red/timeout → `TRANSIENT`) · columna `EO_TipoFallo NVARCHAR(50) NULL` + índice filtrado `IX_EmailOutbox_EntidadOrigen_Estado_FechaReg` creados en prueba + producción (7 filas históricas marcadas `FAILED_UNKNOWN` — error real era `535 Incorrect authentication data`, auth SMTP mal configurada) · default `EO_MaxIntentos` bajado de 5 → 2 · DTO `EmailOutboxListaDto.TipoFallo` propaga al frontend · `EmailOutboxService` F1 ahora puebla `EO_TipoFallo` en la columna (sin prefijo `[FAILED_*]` en `EO_UltimoError`) · `EmailOutboxWorker.ApplyAsistenciaPolicy` (retry 0/1 con `+60s` entre intentos, `FAILED_TRANSIENT` tras 2 fallos consecutivos) solo para `EO_EntidadOrigen ∈ {Asistencia, AsistenciaProfesor}` · `ApplyLegacyPolicy` con backoff `[2s, 10s, 1min, 5min, 30min]` intacto para el resto · `TestDbContextFactory` extraído (aprendizaje F1) con `Create()` + `CreateScopeFactory()` · 13 tests unit `SmtpErrorClassifierTests` (enhanced permanentes/transitorios, 2xx defensivo, StatusCode plano, prioridad enhanced>status, red/timeout, unknown) + 6 tests integration `EmailOutboxWorkerTests` casos a–f (incluye regresión `NotificacionAdmin` con `MaxIntentos=5` y legacy backoff 2s) + tests F1 actualizados para verificar `EO_TipoFallo` en columna · 853 tests suite backend verdes, 0 regresiones · `EmailOutboxService.cs` 288 ln, `EmailOutboxWorker.cs` 240 ln (ambos <300) · INV-S07 respetado.
- [x] **Chat 3 — F3.BE** ✅ (BE, 2026-04-21) — Notificación triple lado backend · `EmailFailureLogger` scoped con DI (`ApplicationDbContext` + `ILogger` + `IHttpContextAccessor?`) escribe directo a `DbContext.ErrorLogs` con `ERL_Severidad=WARNING`, `ERL_ErrorCode=tipoFallo` y JSON completo en `ERL_RequestBody` (keys exactas `tipoFallo/entidadOrigen/entidadId/destinatario/outboxId/dniPersona?`) · DNI enmascarado via `DniHelper.Mask()` (***1234, nunca crudo) · CorrelationId desde header `X-Correlation-Id` si hay `HttpContext`, null en worker · INV-ET02 respetado con try/catch interno → `LogWarning` · hook en `EmailOutboxService.EnqueueAsync` (F1 guard, tras `SaveChangesAsync` con el `EO_CodID` real) y en `EmailOutboxWorker.ProcessSingleEmailAsync` (resuelto del mismo scope por iteración, condición `FAILED && IsPoliticaNueva` una sola vez — firma de `ApplyAsistenciaPolicy` intacta) · `ReporteFallosCorreoAsistenciaJob` Hangfire `0 7 * * *` zona Lima que consulta outbox `FAILED` del día anterior con `AsNoTracking()`, filtra `EO_EntidadOrigen ∈ {Asistencia, AsistenciaProfesor}`, agrupa por `EO_TipoFallo` (top 10 ejemplos/tipo), resuelve directores via `IDirectorRepository.ListarTodosAsync()` (primer activo `To` + resto `Bcc`), silencio positivo si 0 fallos o sin directores, try/catch defensivo para romper vector recursivo · `EO_EntidadOrigen="ReporteFallosCorreoAsistencia"` del propio correo encolado queda fuera del filtro (NO vector recursivo) · plantilla HTML `EmailNotificationService.BuildResumenFallosDiarios` con estilo azul admin (#1976D2) consistente con correcciones existentes, `WebUtility.HtmlEncode` en todos los datos · 6 unit tests `EmailFailureLoggerTests` + 6 integration tests `ReporteFallosCorreoAsistenciaJobTests` (casos a-f incluyendo silencio positivo, agrupación tipificada, filtro contaminación, sin directores, ventana temporal, NO vector recursivo) · **865/865 tests verdes** (antes 853, +12 nuevos) · caps respetados `EmailOutboxService.cs` 296/300, `EmailOutboxWorker.cs` 273/300, `ReporteFallosCorreoAsistenciaJob.cs` 199/300.
- [x] **Chat 4 — F3.FE** ✅ (FE, 2026-04-21, repo `educa-web`) — UI admin `/admin/email-outbox` con visibilidad de `tipoFallo`. Models feature-scoped `tipo-fallo.models.ts` (`TIPOS_FALLO` const, `TipoFallo` type, `TIPOS_PERMANENTES` array, helper `esPermanente` que trata `null`/string desconocido como no-permanente). Pipes puros `TipoFalloLabelPipe` (etiqueta user-friendly: `"Dirección inválida"`, `"Sin correo"`, `"Bandeja llena"`, `"Rechazado por servidor"`, `"Error desconocido"`, `"Transitorio agotado"`, `"En reintento"`, `"Sin clasificar"` para null; string crudo para desconocidos — forward-compat con nuevos tipos backend) y `TipoFalloSeverityPipe` (permanentes → `danger`, transitorios/unknown → `warn`, TRANSIENT/null → `info`). DTO `EmailOutboxLista` extendido con `tipoFallo: string | null`. Columna "Tipo de fallo" agregada a la tabla (`<p-tag>` con severity semántico + tooltip con `ultimoError`), sortable. Filtro dropdown nuevo "Tipo de fallo" en filter bar con `appendTo="body"`, **filtrado 100% client-side** via `filteredItems` computed en store (sin refetch — backend ya entrega el universo). Botón "Reintentar" `disabled` cuando `esPermanente(tipoFallo)` con tooltip explicativo ("No se puede reintentar: fallo permanente. Corregir el registro origen primero.") y `aria-label` dinámico via `pt` (a11y.md). Detalle drawer muestra `tipoFallo` técnico para correlación con backend/logs. Export Excel incluye columna `tipoFallo`. Store + data facade extendidos con `_filterTipoFallo`/`setFilterTipoFallo`/`onFilterTipoFalloChange`. **30 tests Vitest nuevos verdes** (10 label + 10 severity + 10 esPermanente), 1410/1410 suite completa sin regresiones. `npm run lint` limpio, `npm run build` OK. Archivos nuevos: 5 (models + 2 pipes + 2 specs + spec del helper). Archivos modificados: 7 (DTO base + store + data-facade + filters + table + component host + email-outbox.component.html).
- [ ] **Chat 5 — F4.BE** (BE, 1 chat) — Endpoint `GET /api/sistema/auditoria-correos-asistencia` · repository + service + controller + authorization tests · reusa `EmailValidator` de F1 · pre-work obligatorio: mostrar `SELECT` de inspección al usuario y confirmar estructura/universo antes de codificar (regla DB SELECT first)
- [ ] **Chat 6 — F4.FE** (FE, 1 chat, repo `educa-web`) — Pantalla `/intranet/admin/auditoria-correos` · feature flag `auditoriaCorreos` · menú módulo Sistema submenú Monitoreo · accesible solo a Director + Asistente Administrativo
- [ ] **Chat 7 — F5.BE** 🆕 (BE, 1 chat, **absorbe scope mínimo viable del Plan 44 descartado 2026-05-12**) — Guard de cesión automática en `EmailOutboxWorker`. Lee endpoint pre-existente `/defer-fail-status` (Plan 29 Chat 2.6) y, cuando el contador del dominio reporta `usage_pct ≥ EmailSettings.DeferFailCessionThresholdPercentage` (default 80), el worker pausa el procesamiento de filas con `EO_EntidadOrigen ∈ {Asistencia, AsistenciaProfesor}` (correos informativos al apoderado) y sigue procesando críticos administrativos (`AsistenciaCorreccion`, `Justificacion`, `ReporteFallosCorreoAsistencia`, `RESET_PASSWORD`, etc.). Las filas pausadas no se marcan FAILED — quedan en `PENDING` con `EO_UltimoError = "[DEFER_FAIL_CESSION] contador hosting al X%, esperando ventana"` y se reintentan en el próximo tick del worker. Cuando el contador baja debajo del threshold, drenan automáticamente. Tabla concreta de tier (crítico vs informativo) en el brief Plan 22 Chat 7 (`chats/open/146`). Formaliza **INV-MAIL10** en `business-rules.md §15.14`. Sin UI, sin opt-in del apoderado, sin ack del jefe — palanca puramente defensiva del lado backend.

---

## Plan 26 — Rate limiting flexible (rol × endpoint × contexto + telemetría)

→ Migrado a [`educa-coord/plans/xrepo-26-rate-limiting-flexible.md`](../../../educa-coord/plans/xrepo-26-rate-limiting-flexible.md) (cross-repo, 50%). Body extraído 2026-05-15 (brief 172, ADR-0002).

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

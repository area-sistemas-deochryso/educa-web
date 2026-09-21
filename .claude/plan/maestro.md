# Plan Maestro — Orden y Dependencias

> **Inicio**: 2026-04-14 · **Última limpieza**: 2026-06-09
> **Principio rector**: "Features primero — el enforcement y la arquitectura son valiosos solo si soportan funcionalidad real."
> **Scope**: solo trabajo FE-only. BE-only → [`Educa.API/.claude/plan/maestro.md`](../../../Educa.API/.claude/plan/maestro.md). Cross-repo → [`educa-coord/plans/maestro.md`](../../../educa-coord/plans/maestro.md).

<!-- INDEX:START -->
| Key | Plan | Estado | Notas |
|-----|------|--------|-------|
| F1 | Enforcement de Reglas | ~95% | F1-F3 ✅ · F4 parcial (F4.4-F4.5 🔒) · F5 awaiting-prod · F5.3 ✅ · [detalle](../reference/enforcement-reglas.md) |
| F5 | Consolidación Frontend | ⏳ 0% | Tras Plan 4 BE |
| F8 | Design Patterns Backend | Incremental | Al tocar módulos · [detalle](../reference/design-patterns-backend.md) |
| F9 | Design Patterns Frontend | Incremental | Al tocar módulos · [detalle](../reference/design-patterns-frontend.md) |
| xP41 | → Correlation Hub (coord) | F1 ✅ · F2 FE ✅ · F3 BE next | ver P41 |
| xP22 | → Endurecimiento correos (coord) | F3.FE ✅ awaiting-prod (284) | ver P22 |
| xP43 | → Monitoreo Cowork (coord) | F5:5.2 FE ✅ awaiting-prod (285) · F6.1 FE ✅ awaiting-prod (296) · F6.2 FE ✅ awaiting-prod (297) · F6.3 FE ✅ awaiting-prod (303) · F6.3 follow-up ✅ awaiting-prod (304) | ver P43 |
| xP53 | → Duplicate person validation (coord) | F3 FE ✅ awaiting-prod (281) | ver P53 |
| xPanelAyuda | → Panel de ayuda intranet (coord) | F1-F3 BE ✅ · F4 FE ✅ awaiting-prod (479, `chat/479-fe-panel-ayuda-qa-shell`) · F5 FE ✅ awaiting-prod (480, `chat/480-fe-panel-ayuda-ticket`) · F6 FE ✅ awaiting-prod (481, `chat/481-fe-panel-ayuda-salud-sede`) | ver xrepo-panel-ayuda-intranet |
| xP92 | → Admin "ver como" profesor/estudiante — gate + wrapper de módulo (coord P92 F2) | 🔒 bloqueado por F1 (`Educa.API` 498) — brief 499 sin arrancar | ver P92 |
| xModoInformativo | → Modo informativo interactivo (coord xrepo-96) | F1-F4 ✅ y F7 shell+Inicio (527) ✅ — mergeados a `main` local, sin push. F7 acotado a 3 módulos (Apoderado descartado, backlog tibio); Estudiante es el próximo brief · F5-F6 pendientes | ver xrepo-96 |
| xP107 | → Entorno de desarrollo orientado a pruebas (coord P107) | F1 ✅, bug lateral 619 ✅. **F2 ✅ completo end-to-end** (BE 620 + FE [621](../chats/closed/621-fe-p107-f2-crosschex-trigger-outbox-link.md)). Hallazgo derivado investigado a fondo por brief [624](../../../Educa.API/.claude/chats/awaiting-prod/624-be-asistencia-email-no-encolado-silencioso.md) (`Educa.API`): incidente puntual no reproducible, pero encontró y corrigió un bug real de producción (fire-and-forget en `AsistenciaSyncService`, sync automático CrossChex) — fix mergeado, en `awaiting-prod` pendiente `/verify-prod`. **F3 BE 100% completo** (Salones+Cursos [622](../../../Educa.API/.claude/chats/closed/622-be-p107-f3-bulk-create-endpoints.md) + Usuarios [625](../../../Educa.API/.claude/chats/closed/625-be-p107-f3b-bulk-create-usuarios.md)). **F3 FE Salones+Cursos ✅ shipped y verificado en vivo** ([623](../chats/closed/623-fe-p107-f3-bulk-create-ui.md), 2026-09-03) — generación sintética + import de archivo confirmados end-to-end contra `TestConnection` real (5 cursos sintéticos + 2 vía import, marcado `::TEST` aplicado solo por el BE). 2 bugs de UI encontrados y corregidos en vivo. Hallazgo derivado fuera de scope: `/intranet/admin/cursos` no invalida su stats/búsqueda tras altas nuevas — sin brief todavía. **F3 FE Usuarios ✅ shipped y verificado en vivo** ([627](../chats/closed/627-fe-p107-f3c-bulk-create-usuarios.md), 2026-09-04) — mismo patrón de 623 más un selector de Rol dedicado (`RolService.all()`, excluye Estudiante); verificado en vivo (Director ×2 con sede auto-asignada + Apoderado ×2, import con fila de rol inválido detectada en preview), 4 usuarios confirmados en `/intranet/admin/usuarios`. **F3 100% completo** (Salones+Cursos+Usuarios, BE+FE). **F4 completo para Salones+Cursos** (2026-09-04) — BE [628](../../../Educa.API/.claude/chats/closed/628-be-p107-f4-bulk-delete-salones-cursos.md) + FE [629](../chats/closed/629-fe-p107-f4-bulk-delete-salones-cursos.md), ambos shipped. FE: `BulkDeleteActionComponent` reusable (botón + `edu-confirm-dialog` + resultado) instanciado en `SalonesBulkCreateComponent`/`CursosBulkCreateComponent`, verificado en vivo (12 cursos de prueba pasados a `Inactivo` vía soft-delete). Usuarios (segunda vuelta): BE [630](../../../Educa.API/.claude/chats/closed/630-be-p107-f4b-bulk-delete-usuarios.md) ✅ shipped (endpoint `DELETE api/sistema/usuarios/prueba/eliminar`, marcador por rango DNI `99xxxxxx`, hard-delete). FE [631](../chats/closed/631-fe-p107-f4b-bulk-delete-usuarios.md) ✅ shipped y verificado en vivo (worktree `chat/631-fe-p107-f4b-bulk-delete-usuarios`, pendiente `/wt-merge`) — mismo patrón de 629, borrado de 1 Director de prueba confirmado exacto contra `TestConnection`. **F4 y P107 quedan 100% completos** (Salones+Cursos+Usuarios, creación+borrado, BE+FE) | ver P107 |
| BAudit2 | Auditoría buenas prácticas Angular 22/TS 6.0 | F1 ✅ · F2 FE ✅ awaiting-prod (664, BE handoff 667 ya resuelto) · F3 FE ✅ awaiting-prod (665) · F4 ✅ closed (666) · F5 ✅ awaiting-prod (679) · F6 ✅ closed (680) · F7 ✅ awaiting-prod (681, pendiente merge 681-B en Educa.API) · F8 ✅ closed (682) · F9 ✅ closed (683) · F10 ✅ closed (684) · F11 ✅ closed (685) · F12 ✅ awaiting-prod (686) — **12/12 fases completas**, pendiente `/verify` de las fases en awaiting-prod | 🟡 |
| xP79 | → EduUI: PrimeNG replacement library (coord P79 F6) | F1-F5 (librería, `educa-libs`) ✅. F6b-F6g ✅ mergeados a `main` de `educa-libs` (`1c9d3f8`). F6 (swap real acá) ✅ cerrado, `awaiting-prod` — brief 588 (worktree, ~32 commits). **Los 6 pasos del brief cerrados**: 100% del codebase migrado a `edu-ui`, `primeng`/`@primeng/themes` removidos, shim de color tokens hardcodeado (verificado numéricamente claro+oscuro), 123 archivos de CSS muerto removidos, bundle bajó de ~1.06-1.07MB a 906.32kB (budget warning desaparecido). **Paso 6 encontró y cerró un bug crítico**: `edu-dialog`/`edu-drawer` no tenían slots de header/footer — varios formularios admin tenían los botones Guardar/Cancelar invisibles (F6g cerró el gap en `educa-libs`). Suite unit 100% verde (2529/2529), lint/build finales verdes. e2e Playwright: selectores corregidos, no ejecutables sin backend real (deuda documentada). Brief cerrado (2026-08-25) → `awaiting-prod` (588), pendiente smoke test visual en prod tras deploy. Worktree mergeado a `main` (`78ea1cd9`, merge `chat/588-...` → `integration/588-...` → `main`) y limpiado (`/wt-clean` — branches y directorio eliminados). `exclusive` liberado — chat 345 (P70 Angular22) puede retomar F1. P79 F1-F6 completo salvo `/verify 588` post-deploy. **F8 ✅ cerrado** — brief 589 (auditoría de fidelidad visual 597 en `educa-libs` encontró 3 gaps de causa raíz en `educa-web`, corregidos: `EduSortableColumn` sin importar en `usuarios-table`, `.grados-button` migrado a props semánticas `[outlined]`/`severity` en vez de CSS override, `.tag-neutral` restaurado con selector correcto + `!important` — necesario porque `edu-tag.scss` usa `ViewEncapsulation.Emulated`, que le da al `[data-severity]` del componente más especificidad real que la clase global). Copia vendorizada de `edu-ui` resincronizada (6 componentes: edu-tag/table/message/spinner/skeleton/input-icon). Verificado en vivo local vs `educa.com.pe/intranet` real (switcher de sesión "CODE CLAUDE") sobre las 6 páginas de 597 — sin diferencias nuevas. Sin worktree (`isolation: main`) — el worktree P70 (595) sigue `exclusive: true` sobre `src/**` sin mergear a `main`. **P79 completo** (F1-F8) salvo `/verify 588` post-deploy. **F9 ✅ cerrado** (599 `educa-libs` + 600/601 `educa-web` — 6 gaps más: backgrounds opacos, action-icons, `edu-popover` roto (bug crítico, cerrar sesión), `[object Object]` en 33 dropdowns, `edu-paginator`). **602 ✅ cerrado** (2026-08-27) — gate de verificación pre-deploy: 8 páginas + 5 flujos + los 10 hallazgos históricos F8+F9 re-chequeados contra `educa.com.pe/intranet` real (sigue PrimeNG puro). Veredicto: **listo para desplegar 588**, sin diferencias bloqueantes. **605 ✅ cerrado** (2026-08-27) — 3 hallazgos puntuales post-P70: contraste `edu-toggle`, posicionamiento `edu-popover`, y causa raíz real del toast "Error de aplicación" (bug de `classList.add` con token con espacio, no un error de red). → `awaiting-prod`, depende de 588 para validación visual. | ver xrepo-79 |
<!-- INDEX:END -->

---

## [INV] Inventario de planes FE

> Planes BE-only y cross-repo migrados 2026-05-15 (ADR-0002). Archivados en [history/planes-cerrados.md](../history/planes-cerrados.md).

| Key | # | Plan | Estado | Notas |
|-----|---|------|--------|-------|
| F1 | 1 | Enforcement de Reglas | ~95% | F1-F3 ✅ · F4 parcial (F4.4-F4.5 🔒) · F5 awaiting-prod (brief 137). F5.3 ✅ (3/3 batches) · [detalle](../reference/enforcement-reglas.md) |
| F5 | 5 | Consolidación Frontend | ⏳ 0% | Tras Plan 4 BE |
| F8 | 8 | Design Patterns Backend | Incremental | Al tocar módulos · [detalle](../reference/design-patterns-backend.md) |
| F9 | 9 | Design Patterns Frontend | Incremental | Al tocar módulos · [detalle](../reference/design-patterns-frontend.md) |

**Archivados**: P51 (Reporte Mensual ✅ `86bab2e0`), F13 (Test Gaps ✅ brief 247), F46/F47/F48 (barridos ✅ 2026-05-15).

Planes cross-repo con sub-chats FE pendientes: **41** (Correlation Hub F3-F6), **43** (all phases ✅ awaiting-prod), **50** (F2 brief 305 + F3-F4). Archivados en coord (sync 2026-06-09): P42, P45, P52, P54, P28, P38, P56.

---

## 📋 Cola priorizada (qué arrancar próximo)

> **Política de orden**: la cola se ordena por **impacto de desbloqueo** — cuántas tareas downstream libera cada ítem. Consolida Carriles + Hallazgos + WAL audit.

### 🔽 Orden de ejecución (por impacto de desbloqueo)

> **Columna `Desbloquea`**: número de tareas/fases downstream que dependen de que este ítem se complete. Score más alto = ejecutar primero.

#### Tier 0 — Prioridad forzada (audits a pedido explícito del usuario: Angular 22/TS 6.0 2026-09-12 + tests frontend 2026-09-16)

> Reordenado 2026-09-12 para que `/go` priorice estos briefs por sobre el orden normal de desbloqueo. Extendido 2026-09-16 con el audit de tests frontend (BAudit3). Vigente hasta que BAudit2 F4-F12 + BAudit3 F1-F6 cierren o el usuario pida revertir el orden.

| Pos | Key | Plan | Próximo paso concreto | Repo | Gate |
|---|---|---|---|---|---|
| 0.1 | BAudit2 | Audit F4 | ✅ Bugs funcionales puntuales (9/9) — brief [666](../chats/closed/666-audit-f4-bugs-funcionales-puntuales.md). Follow-up pt.9 (link roto en `auditoria-correos-table`): `Educa.API` brief 687 ✅ cerrado (endpoint `recipient/by-entidad`), FE ✅ shipped — brief 688 (worktree `chat/688-fe-reactivar-link-historial-correo-auditoria`), `awaiting-prod` (pendiente smoke test post-merge/deploy). De paso corrigió 2 bugs preexistentes que rompían toda la feature Recipient View (baseUrl FE incorrecto + concurrencia DbContext en BE, este último reconciliado en `Educa.API` commit `34ffe33`). | local | ⏸️ awaiting-prod |
| 0.2 | BAudit2 | Audit F5 | ✅ FE cerrado, awaiting-prod — `edu-ui` accesibilidad + `setDisabledState`, brief [679](../chats/awaiting-prod/679-audit-f5-edu-ui-accesibilidad-setdisabledstate.md) (worktree `chat/679-audit-f5-edu-ui-accesibilidad-setdisabledstate`, pendiente `/wt-merge`) | local | ⏸️ awaiting-prod |
| 0.3 | BAudit2 | Audit F6 | Config zoneless explícita — brief [680](../chats/open/680-audit-f6-zoneless-config-explicita.md) | local | libre |
| 0.4 | BAudit2 | Audit F7 | ✅ FE cerrado, awaiting-prod — sitio público contacto + SEO, brief [681](../chats/awaiting-prod/681-audit-f7-sitio-publico-contacto-seo.md) (worktree `chat/681-audit-f7-sitio-publico-contacto-seo`, pendiente `/wt-merge`), pendiente merge de brief backend 681-B en Educa.API | local | ⏸️ awaiting-prod |
| 0.5 | BAudit2 | Audit F8 | ✅ cerrado — Performance `@defer` + lazy-loading + leaks, brief [682](../chats/closed/682-audit-f8-performance-defer-lazy-loading-leaks.md). Puntos 1/2/3/5 y 6(parcial) resueltos; punto 4 (`monitoreo-hub-badges` 10 llamadas) re-diagnosticado en vivo — no eran duplicadas, requiere endpoint de delta en backend (deuda cross-repo documentada, no bug de FE) | local | ✅ done |
| 0.6 | BAudit2 | Audit F9 | ✅ cerrado — 3 pares consolidados (mensajería, levels, attendance director), brief [683](../chats/closed/683-audit-f9-consolidar-duplicacion-codigo.md) (worktree `chat/683-audit-f9-consolidar-duplicacion-codigo`, pendiente `/wt-merge`), lint+build+tests verde | local | ✅ done |
| 0.7 | BAudit2 | Audit F10 | Capa de datos — layering + `vistas.facade` — brief [684](../chats/open/684-audit-f10-capa-datos-layering-vistas-facade.md) | local | libre |
| 0.8 | BAudit2 | Audit F11 | ✅ cerrado — Inconsistencias transversales menores, brief [685](../chats/closed/685-audit-f11-inconsistencias-transversales-menores.md) (worktree `chat/685-audit-f11-inconsistencias-transversales-menores`, commit `bb771c8a`, pendiente `/wt-merge`) | local | ✅ done |
| 0.9 | BAudit2 | Audit F12 | ✅ FE cerrado, awaiting-prod — riesgos menores seguridad/UX, brief [686](../chats/awaiting-prod/686-audit-f12-riesgos-menores-seguridad-ux.md) (worktree `chat/686-audit-f12-riesgos-menores-seguridad-ux`, pendiente `/wt-merge`) | local | ⏸️ awaiting-prod |
| 0.10 | BAudit3 | Audit Tests F1 | ✅ El hallazgo se invirtió: INV-CONTRACT03 estaba desactualizado (normalización revertida en `8b2ccc85` por romper casing de rol case-sensitive), no el código — doc corregida en `business-rules.md`/`optimistic-ui.md`, `wal.service.ts`/spec intactos — brief [689](../chats/closed/689-audit-tests-f1-inv-contract03-wal-casing.md) | local | ✅ done |
| 0.11 | BAudit3 | Audit Tests F2 | ✅ 7 specs corregidos (assert que no verificaba lo prometido) — brief [690](../chats/closed/690-audit-tests-f2-bugs-asserts-debiles.md) | local | ✅ done |
| 0.12 | BAudit3 | Audit Tests F3 | ✅ cerrado — cobertura de mutaciones críticas de seguridad/aprobación (spec nuevo `permisos-usuarios-data.facade`, `contact` 2→12 tests, `profesor-final-salones` aprobación, `grupos.facade` CRUD, `profesor.facade` calificaciones) — brief [691](../chats/closed/691-audit-tests-f3-cobertura-seguridad-mutaciones-criticas.md) (worktree `chat/691-audit-tests-f3-cobertura-seguridad-mutaciones-criticas`, commit `50be1d81`, pendiente `/wt-merge`) | local | ✅ done |
| 0.13 | BAudit3 | Audit Tests F4 | Cobertura de lógica de negocio educativa (recálculo notas, anti-solapamiento horarios, transición estado inválida, rollback cursos/faq) — brief [692](../chats/open/692-audit-tests-f4-cobertura-logica-negocio.md) | local | libre |
| 0.14 | BAudit3 | Audit Tests F5 | ✅ cerrado — gaps infra WAL/integration cubiertos (verify() estricto, 401 hard asserts, wal-leader fallback/timeout/RELEASE, timer sync-engine, notifications, storage-security, session warn) — brief [693](../chats/closed/693-audit-tests-f5-infra-wal-integration-gaps.md) | local | ✅ done |
| 0.15 | BAudit3 | Audit Tests F6 | ✅ cerrado — housekeeping transversal (asserts de contenido, rollback notificaciones-admin, orden WAL, clearAll real, handler SignalR defer-fail, traceId/errorCode) — brief [694](../chats/closed/694-audit-tests-f6-inconsistencias-transversales.md) | local | ✅ done |

#### Tier 1 — Alto impacto (desbloquean ≥3 ítems)

| Pos | Key | Plan | Próximo paso concreto | Repo | Desbloquea | Gate |
|---|---|---|---|---|---|---|
| 1 | xP41 | Correlation Hub | F3 BE (persist request lifecycle) — prioridad en coord | xrepo | 4 (F3-F6) | libre |

#### Tier 2 — Impacto medio (desbloquean 1-2 ítems o alto valor)

| Pos | Key | Plan | Próximo paso concreto | Repo | Desbloquea | Gate |
|---|---|---|---|---|---|---|
#### Tier 3 — Independientes (sin downstream)

| Pos | Key | Plan | Próximo paso concreto | Gate |
|---|---|---|---|---|
| 4 | P15 | Release ops | F3-F5 (post-deploy + rollback + runbook) — puntero coord | libre |
| 12 | F-SW01 | Bundle stale post-deploy | ✅ A (banner `SwService.updateAvailable$`) + B (`MonitoreoHubBadgesFacade` refetch en `cacheUpdated$`) — [detalle](../tasks/sw-bundle-stale-detection.md) | cerrado |
| 13 | BAudit2 | Audit F1 | ✅ Bugs críticos de fugas/reliability — brief [663](../chats/closed/663-audit-f1-bugs-criticos-fugas-reliability.md) | cerrado |
| 14 | BAudit2 | Audit F2 | ✅ FE cerrado (seguridad password plaintext `users/`) — brief [664](../chats/awaiting-prod/664-audit-f2-seguridad-password-plaintext-users.md), BE handoff pendiente (`Educa.API` brief 667) | ⏸️ awaiting-prod |
| 15 | BAudit2 | Audit F3 | ✅ FE cerrado (race conditions en fetches, ~9 facades) — brief [665](../chats/awaiting-prod/665-audit-f3-race-conditions-fetches-sin-cancelacion.md), verificado en local contra `TestConnection` | ⏸️ awaiting-prod |

#### Tier 4 — Bloqueados / baja prioridad

| Pos | Key | Plan | Próximo paso concreto | Gate |
|---|---|---|---|---|
| 5 | xP43 | Monitoreo Cowork | F6.3 FE ✅ awaiting-prod (303) · student profile page ✅ awaiting-prod (304) | ⏸️ awaiting-prod |
| 6 | F5 | Consolidación FE | Completa tras Plan 4 BE | ⏸️ tras Plan 4 BE |
| 7 | P3 | Matrícula | F3.5 → F4 diseño + implementación UI | 🔒 diseño UI pendiente |
| 8 | P10 | Flujos alternos | F1+ completo (tras Carril B sustancialmente) | 🔒 Carril B |
| 9 | F-010 | Hallazgo Cowork | Auto-abrir dialog edición admin deep-link cross-role | ⏸️ F-011 BE |

#### Tier 5 — Incrementales (al tocar módulos)

| Pos | Key | Plan | Próximo paso concreto | Gate |
|---|---|---|---|---|
| 10 | F8 | Design Patterns BE | Aplicar al tocar módulos BE | incremental |
| 11 | F9 | Design Patterns FE | Aplicar al tocar módulos FE | incremental |

**Siguiente accionable**: Tier 0 BAudit2 (F4-F12) **completo** — las 12 fases del audit Angular 22/TS 6.0 están implementadas. Tier 0 se extendió 2026-09-16 con **BAudit3** (audit de tests frontend, 6 fases, briefs 689-694, todas `libre`) — F1-F6 (689-694) ✅ cerrados — **BAudit3 completo**. Tras cerrar BAudit3, el siguiente es **xP41 F3 BE** (persist request lifecycle), tal como estaba previsto al reordenar Tier 0 el 2026-09-12. Audit F4 (666, pos 0.1) ✅ cerrado (9/9 fixes). Audit F5 (679, pos 0.2) ✅ cerrado, awaiting-prod. Audit F6 (680, pos 0.3) ✅ cerrado y mergeado a `main`. Audit F7 (681, pos 0.4) ✅ completo (SEO + contacto validados end-to-end, incl. regresión encontrada y corregida en `PublicSeoService`) — pendiente únicamente el merge de brief backend 681-B a `main` de Educa.API (chat aparte, one-repo-one-chat). Audit F8 (682, pos 0.5) ✅ cerrado directo a `main` (sin worktree) — 5/6 puntos resueltos, punto 4 re-diagnosticado como deuda cross-repo. Audit F9 (683, pos 0.6) ✅ cerrado — 3 pares consolidados (mensajería, levels, attendance director), lint+build+tests verde, worktree `chat/683-audit-f9-consolidar-duplicacion-codigo` pendiente `/wt-merge`. Audit F10 (684, pos 0.7) ✅ cerrado — layering + `vistas.facade`. Audit F11 (685, pos 0.8) ✅ cerrado — `@env`/`CommonModule`/naming `edu-ui`/dead code, worktree `chat/685-audit-f11-inconsistencias-transversales-menores` pendiente `/wt-merge`. Audit F12 (686, pos 0.9) ✅ FE cerrado, awaiting-prod — rate-limit de login documentado (BE ya protegía), `rowVersion`+409 replicado en `campus-admin` (Piso/Nodo/Bloqueo, patrón de `ayuda-tickets`), aviso+reconexión de expiración de token JaaS en videollamadas (BE ya dimensionaba el `exp` al fin de clase, sin handoff necesario) — lint/build verdes (FE+BE), 2431/2431 tests BE, 95/95 tests FE de las suites tocadas, worktree `chat/686-audit-f12-riesgos-menores-seguridad-ux` pendiente `/wt-merge`. Pendiente QA manual (2 sesiones editando el mismo piso) antes de `/verify 686`. Admin block cerrado (P62-P66 ✅/descartado). P50 F3a ✅ (331 closed).

### 🟣 Verificaciones post-deploy (`/verify <NNN>`)

- ⏳ **462** — soporte táctil `admin/campus` (Pointer Events + pinch-zoom + responsive). Lint/build OK, layout responsive verificado con iframe 375px. Pendiente: QA en vivo de pan/pinch/drag táctil real — bloqueado en la sesión por cuenta de prueba sin `SedeId` (400 en `/api/campus/pisos`).
- ⏳ **665** — 8 fixes de race conditions/cancelación en facades (BAudit2 F3). Verificación visual del punto 3 (`campus-admin`) hecha en local contra `TestConnection`, falta confirmar en `educa.com.pe/intranet` real. Nota 2026-09-17: no se pudo forzar una race en prod — estado incierto.
- ✅ **679** — verificado en prod 2026-09-17 (smoke visual/teclado).
- ⏳ **686** — riesgos menores seguridad/UX (BAudit2 F12, último ítem del audit). Falta QA manual: 2 sesiones de browser editando el mismo piso en `campus-admin` para confirmar el 409/rowVersion.

### Notas operativas

- **`running/`**: vacío · **`open/`**: vacío · **`awaiting-prod/`**: 4 briefs (462, 665, 681, 686) · **`waiting/`**: vacío · **`troubles/`**: vacío
- **Último cierre**: 694 (BAudit3 F6 — housekeeping transversal: `resolvedSlots` con contenido real [vacío por defecto, item con capability, filtrado sin capability] + renders convertidos a asserts DOM [welcome en home, 12 month-cards en calendary, container+calendar en schedule]; batería rollback `notificaciones-admin` [create/update/toggle/delete + cobertura `update()`]; orden real apply→append en `wal-facade-helper`; `clearAll` con sessionStorage real en `storage.service.spec`; handler SignalR `DeferFailStatusUpdated` ejercitado en spec nuevo `email-monitoreo.facade.spec` [el componente solo consume 2/3 eventos, el tercero vive en el facade]; traceId/errorCode con valores exactos en 409 [traceId en context, fuera de `message` como documenta el código]. 90/90 verdes en los 8 specs tocados, lint 0 errores, `tsc --noEmit` limpio, 2026-09-17) → `closed/` directo (cobertura de tests, sin cambio de comportamiento en prod, sin gate post-deploy). **Cierra BAudit3 (6/6 fases).** Cierre previo: 693 (BAudit3 F5 — gaps infra WAL/integration: `httpMock.verify()` en 3 integration specs [reveló `POST /api/sistema/errors` del reporter y `POST /api/Auth/logout` real sin flushear, ambos ahora explícitos]; asserts 401 duros sin `if` + `resetErrorInterceptorState` y reporter mockeado como sink; `wal-leader` [fallback sin BroadcastChannel, takeover por timeout sin RELEASE, propagación RELEASE]; timer periódico `processRetryable` con fake timers; `notifications.service` 8→15 tests [checkNotifications ordenado+computeds, fallback error, dismiss/restore round-trip, SW PUSH_RECEIVED/NOTIFICATION_CLICKED]; `storage-security` clearAll con estado real [mock alineado a `clearNotifications`, hallazgo: `educa_last_notif_check` benigno sobrevive, documentado]; `session-coordinator` warn distintivo con spy + caso negativo. 97/97 verdes en los 8 specs tocados, lint 0 errores, `tsc --noEmit` limpio, 2026-09-17) → `closed/` directo (cobertura de tests, sin cambio de comportamiento en prod, sin gate post-deploy). Cierre previo: 692 (BAudit3 F4 — cobertura de lógica de negocio educativa sin test: `recalcularPromedios()` en `calificacion.utils.spec.ts` [4 tests: notas null ignoradas, rango de semana límite, agregado "General", periodo sin notas]; `validateImportRowRango`+`markIntraBatchConflicts` en `horario-import.config.spec.ts` [8 tests: rango fuera de franja operativa, duración >4h, solape mismo salón/día, filas ya inválidas excluidas]; `onDrop()` en `error-groups-kanban-board.component.spec.ts` [4 tests: transición inválida rechazada]; `onConfirm()` en `change-group-status-dialog.component.spec.ts` [3 tests: sin grupo/sin estado no emite, `estadoOptions` nunca expone destino inválido]; rollback WAL create/update/toggle/delete en `cursos.facade.spec.ts` [4 tests, patrón `ticket-bandeja.facade.spec.ts`]; error path crear/actualizar/eliminar en `faq-admin.facade.spec.ts` [5 tests: antes solo 409 de `actualizar()` estaba cubierto]. 24 tests nuevos, 90/90 verdes en los 6 specs tocados, lint 0 errores, `tsc --noEmit` limpio, worktree `chat/692-audit-tests-f4-cobertura-logica-negocio` pendiente commit+`/wt-merge`, 2026-09-16) → `closed/` directo (cobertura de tests, sin cambio de comportamiento en prod, sin gate post-deploy). Cierre previo: 691 (BAudit3 F3 — cobertura de mutaciones críticas de seguridad/aprobación: spec nuevo `permisos-usuarios-data.facade.spec.ts` [payload `{grants, denies}` exacto, rollback WAL]; `contact.spec.ts` 2→12 tests [validación required/email, submit éxito/error, guard doble-submit]; `profesor-final-salones.facade.spec.ts` `aprobarEstudiante`+`aprobarMasivo` [nombre real corregido, no `aprobacionMasiva` como decía el brief; sin rollback WAL porque usan `consistencyLevel: 'server-confirmed'`]; `grupos.facade.spec.ts` 5 métodos CRUD con rollback; `profesor.facade.spec.ts` `saveNotaSalon` [dispatcher calificaciones]. Lint 0 errores, build FE OK, 2633/2633 tests verdes, worktree `chat/691-audit-tests-f3-cobertura-seguridad-mutaciones-criticas` commit `50be1d81`, pendiente `/wt-merge`, 2026-09-16) → `closed/` directo (cobertura de tests, sin cambio de comportamiento en prod, sin gate post-deploy). Follow-up no bloqueante: `dropEstudiante` en `grupos.facade.ts` también muta vía WAL sin test, fuera del scope original de 691. Cierre previo: 690 (BAudit3 F2 — 7 specs con assert débil corregidos: `attendances-data.facade.spec.ts` [Subject controlado para `syncing()`], `sync-range-dialog.component.spec.ts` [caso 366 días con año bisiesto real + caso 367 inválido], `error-handler.service.spec.ts` [dedup con fake timers], `permisos-roles.facade.spec.ts`+`vistas.facade.spec.ts` [assert de `resourceId`/`payload` completo en WAL], `eventos-calendario.facade.spec.ts`+`notificaciones-admin.facade.spec.ts` [error state tras backoff de `withRetry` vía fake timers], `admin-health-permissions.facade.spec.ts` [assert de `loadError()`], `rate-limit-events.facade.spec.ts` [assert de filtro en `exportarCsv`]; lint 0 errores, build FE OK, 129/129 tests de los 9 specs tocados, worktree `chat/690-audit-tests-f2-bugs-asserts-debiles` commit `f3dbfb71`, pendiente `/wt-merge`, 2026-09-16) → `closed/` directo (fix de tests, sin gate post-deploy). Cierre previo: 689 (BAudit3 F1 — INV-CONTRACT03 estaba desactualizado, no el código: normalización a lowercase revertida deliberadamente en `8b2ccc85` por romper `/api/sistema/usuarios/{rol}/{id}` case-sensitive en backend; `wal.service.ts`/spec intactos, doc corregida en `business-rules.md`+`optimistic-ui.md`, worktree `chat/689-audit-tests-f1-inv-contract03-wal-casing` commit `3659d682`, pendiente `/wt-merge`; lint 0 errores, build FE OK, 2592/2593 tests FE [1 timeout flaky no relacionado, `eslint-config-guards.spec.ts`], 2026-09-16) → `closed/` directo (doc-only, sin gate post-deploy). Follow-up no bloqueante: `educa-coord` tiene 2 refs al mismo invariante desactualizado, candidato a brief ahí.
- **Cierre previo**: 686 (BAudit2 F12 — 3 hallazgos de riesgo menor: 1) rate-limit de login solo documentado como UX (BE ya protege vía `[EnableRateLimiting("login")]`, 60/min por IP); 2) `rowVersion`+409 replicado en `campus-admin` (Piso/Nodo/Bloqueo) siguiendo el patrón de `ayuda-tickets` — BE usa `ConcurrencyExtensions.SetOriginalRowVersion` y devuelve el nuevo rowVersion en cada update (antes devolvía `void`, hubiera causado auto-conflicto en la segunda edición); 3) aviso proactivo + reconexión client-side ante expiración de JWT JaaS en videollamadas — la investigación encontró que el BE ya dimensiona el `exp` al fin de la clase + margen (no 24h fijo como asumía el audit), así que no hizo falta handoff a `Educa.API`. Lint 0 errores, build FE+BE verde, 2431/2431 tests BE, 95/95 tests FE de las suites tocadas, 2026-09-16) → `awaiting-prod` (falta QA manual multi-sesión del punto 2), worktree `chat/686-audit-f12-riesgos-menores-seguridad-ux` pendiente `/wt-merge`. **Cierra BAudit2 (12/12 fases).**
- **Cierre previo**: 683 (BAudit2 F9 — consolidación de código duplicado: 1) `MensajeriaPageComponent` compartido entre `EstudianteMensajeriaComponent`/`ProfesorMensajeriaComponent`; 2) `LevelPageComponent` genérico parametrizado por `LevelPageData` para `inicial`/`primaria`/`secundaria` (wrappers finos preservan clase/selector/spec existentes); 3) `AttendanceDirectorStaffComponent` generalizado con `@Input() loader?: AttendanceDirectorPersonaLoader` opcional — las 4 instancias staff (C/M/D/N) sin cambios, la instancia asistentes-admin (servicio/endpoint de backend distinto) pasa un adaptador construido en `AttendanceDirectorComponent`; eliminado `AttendanceDirectorAsistentesAdminComponent` completo. Tests nuevos en los 3 componentes compartidos (sin cobertura previa). Lint 0 errores, build verde, 2593/2593 tests verdes, 2026-09-16), worktree `chat/683-audit-f9-consolidar-duplicacion-codigo` pendiente `/wt-merge`.
- **Cierre previo**: 682 (BAudit2 F8 — performance, chat directo en `main`, sin worktree). Punto 1: `intranet.routes.ts` — 16 rutas `profesor/*`/`estudiante/*` pasaron de importar el barrel completo (`./pages/profesor`/`./pages/estudiante`, 1 chunk con las 8 páginas) a import directo por componente, mismo patrón que `ayuda`/`admin/*`; verificado con `npm run build` (ya no aparece un chunk combinado). Puntos 2-3: `campus-scene-builder.service.ts` ahora disposea geometry/material en cada rebuild (con cuidado de no disposear `Sprite.geometry`, que es estática y compartida entre todas las instancias de THREE.Sprite); `campus-3d-view.component.ts` dedupe por referencia (`lastBuiltNodes`/`lastBuiltEdges`) evita que el `effect()` del constructor reconstruya la escena que `ngAfterViewInit` ya armó en el primer render. Punto 5: `cache-version-manager.service.ts` paraleliza invalidación de módulos con `Promise.all` en vez de `await` secuencial. Punto 6 (parcial): `@defer (on viewport)` en `home.html` (5 secciones below-the-fold) y en cada card de `admin-rendimiento` (chart Chart.js por curso) — quedaron sin tocar `email-outbox-dashboard-dia` (tab-gated, sin certeza de que `edu-tabpanel` no lazy-renderee ya internamente) y `levels/*` (HTML estático sin sub-componentes, sin ganancia real de bundle-splitting). **Punto 4 re-diagnosticado, no implementado**: se investigó `EmailOutboxService.ObtenerEstadisticasAsync` en `Educa.API` — sin `desde`/`hasta` devuelve el total histórico, no "hoy"; las 10 llamadas paralelas de `monitoreo-hub-badges.facade.ts` **no son duplicadas** como asumía el audit original, así que no se tocó ese archivo. Reducir esas llamadas requiere que backend exponga el delta directamente — deuda cross-repo documentada en el brief, no bug de FE. Lint 0 errores, build verde, 2583/2584 tests verdes (1 timeout flaky no relacionado en `eslint-config-guards.spec.ts`, confirmado pasando en re-run aislado), 2026-09-16.
- **Cierre previo**: 680 (BAudit2 F6 — investigación confirmó sin divergencia real test↔prod: `zone.js` no es dependencia de `package.json`, no está en `polyfills` de `angular.json`, no aparece ni transitivamente en `node_modules` tras `bun install` limpio; la app ya corría zoneless de facto. Agregado `provideZonelessChangeDetection()` explícito a `app.config.ts` [heredado por `app.config.server.ts`]. `counter-section.ts`/`.html`: `displayedCount` de field plano + `cdr.detectChanges()` manual en RAF a `signal()`, alineando con el patrón `markForCheck()` ya usado en `hero-section.ts`/`testimonials-section.ts` — únicos 3 archivos no-spec con ese patrón. Lint 0 errores, build verde, 2574/2574 tests verdes) → `closed/` (cierra directo, sin gate post-deploy — cambio de config+refactor 100% cubierto por lint/build/test, sin comportamiento distinto en prod), worktree `chat/680-audit-f6-zoneless-config-explicita` (commits `ce8ae856` + `e0c3dbcc`, pendiente `/wt-merge`), 2026-09-14.
- **Cierre previo**: 679 (BAudit2 F5 — `setDisabledState` implementado en 9 controles CVA de `edu-ui` vía patrón `cvaDisabled` signal + `computed isFormDisabled`; 5 componentes de accesibilidad teclado/ARIA verificados en vivo local (backend `dotnet run` + FE `ng serve`, sesión "CODE CLAUDE"): `edu-menu` roving focus + flechas + Home/End + Escape OK, `edu-accordion` `aria-controls`/`aria-labelledby` OK, `edu-tabs` roving tabindex + flechas OK, `edu-tooltip` `aria-describedby` dinámico OK. **Hallazgo derivado real**: `edu-select`/`edu-multi-select` nunca seteaban `aria-activedescendant` porque el listbox vive en un overlay portado a `body` (no ancestro DOM del trigger) y el trigger solo abría el panel en el primer `ArrowDown` sin delegar navegación subsiguiente — corregido delegando `onTriggerKeydown` → `onListKeydown` cuando el panel ya está abierto, verificado en vivo tras el fix. Lint 0 errores, build verde, 2573/2573 tests verdes, corrido tres veces) → `awaiting-prod/` (verificación local, falta smoke test en `educa.com.pe/intranet` real por ser librería compartida), worktree `chat/679-audit-f5-edu-ui-accesibilidad-setdisabledstate` (pendiente `/wt-merge`), 2026-09-14.
- **Cierre previo**: 665 (BAudit2 F3 — 8 fixes de race conditions/cancelación aplicados vía `Subject`+`switchMap` en `correlation`, `attendance-panel`, `campus-admin` [el más grave, `loadPisoCompleto`], `ticket-bandeja`, `attendance-reports` [+ guardia de re-entrada en `generarReporte` + debounce en `usuario-report`], `eventos-calendario`, `rate-limit-events`, `correos-dia`. El bloqueo de backend descubierto verificando en vivo el punto 3 (`GET /api/campus/pisos` → 400, causa raíz LINQ en `CampusRepository`) se resolvió vía `Educa.API` brief 668, mergeado a `main`. Verificación visual del punto 3 completada 2026-09-12 contra `TestConnection` (local, `UseTestEnv=true`) con 2 pisos de prueba — switch rápido alternado sin inconsistencia de estado. Lint 0 errores, build verde, 2573/2573 tests verdes) → `awaiting-prod/` (verificación local, no en `educa.com.pe/intranet` real), worktree `chat/665-audit-f3-race-conditions-fetches-sin-cancelacion` (commit `91e7d32b`, integrado vía `integration/665-...`), 2026-09-12.
- **`/verify` 2026-09-08**: 588, 595, 600, 601, 605 verificados en vivo contra `educa.com.pe/intranet` (dark mode, `edu-toggle`, `edu-popover` del menú de perfil, dialogs con footer, paginador `edu-ui`) → `closed/`. P79 (F1-F9) y P70 F3 quedan completamente cerrados.
- **`/verify` 2026-09-08**: 554 (código confirmado en deploy, sin gaps) y 559 (fix `Educa.API` confirmado en deploy, página `/intranet/justificacion-asistencia` carga sin el 500 original; flujo Aprobar/Rechazar sin re-verificar end-to-end por falta de datos reales en prod — riesgo residual documentado, no bloqueante) → `closed/`. **462 queda en `awaiting-prod/`** — su ruta (`admin/campus`) está detrás del feature flag `campusNavigation`, apagado en prod (`environment.ts`), no se puede verificar hasta que se active.
- **Último cierre**: 612 (P104 F3 — filtro de periodo verano/regular bajo "ver como" Profesor). Sin profesor de prueba con salones-tutor en ambos periodos en TestConnection (gap de datos, no bug) — barrido completo de `admin/salones` confirmó ninguno existía; se asignó VIVIAN COLET CANCHARI RIVAS también como tutora de `3RO SECUNDARIA - V` (ya tutora de `3RO SECUNDARIA - A` en Regular), fixture reutilizable. Verificado en vivo (backend local + TestConnection, sesión CODE CLAUDE → "ver como" VIVIAN): el filtro de periodo funciona correctamente — al cambiar el mes a enero (verano) el selector re-seleccionó automáticamente el salón de Verano, igual que en navegación directa. **Bug derivado encontrado y corregido**: el selector de salón mostraba "(Tutor CODE CLAUDE)" (admin real) en vez del nombre de la profesora impersonada — `nombreProfesor` en `attendance-profesor-estudiantes.component.ts` leía `UserProfileService.userName` directo, no ver-como-aware (mismo antipatrón INV-VIEWAS01, ahora también documentado para labels de identidad). Fix con patrón `effectiveRole` (`viewAsContext.activeContext()?.nombreCompleto ?? userProfile.userName()`), verificado en vivo, lint 0 errores, 72/72 tests verdes. **Plan 104 completo (F1-F3, Done-when 3/3)**. → `closed/`, sin worktree (`isolation: main`, worktree P70/595 seguía `exclusive: true` sobre `src/**`), 2026-08-29.
- **Último cierre**: 578 (P104 F1 — `AttendanceComponent` elegía el sub-componente por `userProfile.userRole()` (rol real) en vez del rol impersonado; agregado `effectiveRole` = `viewAsContext.activeContext()?.rol ?? userRole()`, mismo patrón que `IntranetLayoutComponent`, aplicado al `@switch` del template + `showModeSelector`/`onModeChange`/`onReload`. Verificado en vivo local (backend real, sesión "CODE CLAUDE"): "ver como" Estudiante y Profesor ahora renderizan el sub-componente correcto en `/intranet/asistencia`. Lint 0 errores, build verde, 2529 tests verdes. **Hallazgos derivados documentados en `xrepo-104` para retomar después**: F2 — `Educa.API` `ConsultaAsistencia/profesor/me/mes` devuelve 404 bajo "ver como" Profesor (mismo patrón INV-VIEWAS01 que P97, sin brief); F3 — filtro de periodo verano/regular sin verificar end-to-end, bloqueado por falta de profesor de prueba con salones en ambos periodos) → `awaiting-prod`, worktree `chat/578-fix-ver-como-asistencia-periodo`, 2026-08-28.
- **Cierre previo**: 605 (P79 post-F9 — 3 hallazgos puntuales encontrados en verificación en vivo tras merge P70: `edu-toggle` sin contraste en reposo — fix `box-shadow` en el thumb; `edu-popover` del menú de perfil se solapaba con la nav — fix posiciones ancladas a la derecha en `POPUP_POSITIONS`; toast "Error de aplicación" recurrente — causa raíz real encontrada vía telemetría `/api/sistema/errors`: `panelClass` armado con `.join(' ')` producía un token con espacio que `classList.add()` rechaza, no era un error de red como asumía 602. Build verde, lint 0 errores, 2529/2529 tests) → `awaiting-prod`, 2026-08-27. Depende de 588 para validación visual contra prod real, igual que 600/601.
- **Cierre previo**: 601 (P79 F9 — re-sync vendorizado `edu-ui` tras gap 599/600: `tokens.css`, `edu-table.scss`, `edu-paginator.scss`; build verde, 2529/2529 tests, lint 0 errores; verificado en vivo local con computed styles exactos a la fuente `educa-libs` `dd2a5df`) → `awaiting-prod`, 2026-08-27. **Hallazgo relevante**: prod real (`educa.com.pe`) aún no corre `edu-ui` en absoluto (0 elementos `edu-*`, paginador sigue siendo PrimeNG) — la validación post-deploy de 599/600/601 depende de que 588 (swap F6 completo) se despliegue primero.
- **Cierre previo**: 589 (P79 F8 — fix de consumo `edu-ui` encontrados en auditoría de fidelidad visual 597: sort de `usuarios-table`, botón outline de `cursos`, `.tag-neutral` restaurado con `!important` por especificidad de `ViewEncapsulation.Emulated`; re-sync de 6 componentes vendorizados; verificado en vivo local vs prod) → `closed/`, sin worktree (`isolation: main`), 2026-08-26. P79 completo (F1-F9), `/verify 588` post-deploy ✅ 2026-09-08.
- **Cierre previo**: 588 (P79 F6 swap — migración completa de PrimeNG a `edu-ui`, 277 archivos, bug crítico de slots header/footer en dialog/drawer encontrado y resuelto vía F6g, 2529/2529 tests, bundle 906.32kB) → `awaiting-prod`, worktree `chat/588-p79-f6-swap-eduui-primeng-migration` mergeado y limpiado, 2026-08-25.
- **Verificación post-deploy 2026-08-20** (`/verify`, disparado desde `/triage`): 461/464/465 pasaron QA en vivo contra TestConnection (backend `dotnet run` local + browser con switcher de login) → `closed/`. 461 con salvedad: el remanente grupo 4 (`videoconferencia-sala`/`campus-3d-view` con sesión real activa) solo se pudo confirmar por código, no en vivo — no reproducible con datos de prueba, igual que en el cierre original.
- **Último saneamiento**: 2026-08-20 — reconciliación manual (sin comando `/sync-maestro` implementado): briefs 332/458/480/481 referenciados como pendientes ya estaban cerrados y purgados en `e0a2b9c6`; se eliminó un duplicado stray sin trackear de 392 en `open/`.

---

## 🔧 Hallazgos Cowork pendientes

- ⏳ **F-010 FE** — auto-abrir dialog de edición admin desde deep-link cross-role. Depende de F-011 BE desplegado.

Hallazgos cerrados y Cowork 2026-05-19: ver [history/planes-cerrados.md](../history/planes-cerrados.md) y [`claude-cowork/reporte-cowork-2026-05-19.md`](../claude-cowork/reporte-cowork-2026-05-19.md).

---

## Bloqueos activos

| Si cierro… | Desbloqueo… |
|------------|-------------|
| Plan 2/B (state machines BE) | Plan 1 F4.4 (INV-T* tests) |
| Plan 3 F3.5 (diseño UI matrícula) | Plan 3 F4 (implementación matrícula) |
| Plan 3 F4 (matrícula) | Plan 1 F4.5 (INV-M*) |
| Carril B sustancialmente | Plan 10 F1+ (flujos alternos completo) |

---

## Carriles

> Ítems activos consolidados en §Cola priorizada. Carriles preservados como contexto histórico.

### Carril A — Features ✅ CERRADO (2026-04-16)

Plan 6 completado. 1321 tests. Detalle en §Inventario (archivados inline).

### Carril D — Confiabilidad sistémica

→ En cola: F13 (pos 7), P15 F3-F5 (pos 8).
Cerrados: Plan 15 F1 ✅ · F2 ✅. Plan 16 F1 ✅ (BE-only). Plan 12 F1 ✅ (BE-only). Plan 10 P0 ✅ (P0.1-P0.4, brief 560).
BE-only (no en cola FE): Plan 16 F2-F5, Plan 12 F2-F5, Plan 7 F1-F2. Cross-repo: Plan 14 F1-F6.

### Carril B — Deuda técnica

→ En cola: F1 F5.3 (pos 1), F5 (pos 10).
BE-only (no en cola FE): Plan 2/B (state machines), Plan 2/C (split >300 ln), Plan 4 (consolidación BE).

### Carril C — Diferido

→ En cola: Plan 3 F3.5→F4 (pos 11), Plan 10 F1+ (pos 12), F8/F9 (pos 14-15).

---

## Auditoría WAL + Cache (standalone) — ✅ CERRADA

Completada 2026-05-26. H1+H8+H9 ✅, H7 ✅ (brief 124), H2-H6 archivado.

---

## Deuda SQL en BD de prueba (no bloqueante)

- [ ] Agregar columnas `ERL_RequestBody/Headers/ResponseBody` a `ErrorLog` en BD prueba
- [ ] DROP `Asistencia_deprecated_2026_04` ~2026-06-20

## Pendiente futuro (seguridad, sin presión)

- [ ] Rotar credential Firebase en Firebase Console (expuesta en git history BE)
- [ ] `git rm --cached` del JSON de Firebase + actualizar Azure env var

---

## Notas de ubicación

- `educa-web/.claude/plan/` — planes FE de alcance amplio
- `educa-web/.claude/tasks/` — tareas transversales
- `Educa.API/.claude/plan/` — planes BE exclusivos
- `educa-coord/plans/` — planes cross-repo

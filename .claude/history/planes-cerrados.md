# Planes Cerrados — Archivo Histórico (educa-web)

> Detalle de planes/fases 100% completos, movidos acá desde [`plan/maestro.md`](../plan/maestro.md) para mantenerlo enfocado en trabajo activo. El detalle línea-por-línea de commits/tests vive en git log y `chats/closed/`; acá se preserva el resumen de qué se hizo, qué bugs derivados aparecieron, y el estado de verificación post-deploy.
>
> **Nota de origen**: `maestro.md` referenciaba este archivo desde 2026-05-15 (para P51, F13, F46-48) pero nunca se creó — ese detalle específico se perdió, solo queda constancia de que esos planes fueron archivados. Este archivo arranca de cero en la limpieza de 2026-09-22.

---

## 2026-09-22 — Limpieza de maestro

### BAudit2 — Auditoría buenas prácticas Angular 22/TS 6.0 (12/12 fases ✅)

- **F1** (663) — bugs críticos de fugas/reliability.
- **F2** (664, handoff `Educa.API` 667 también cerrado) — seguridad password plaintext: origen confirmado en BE (`UsuarioDetalleDto.Contrasena` descifra deliberadamente, coordinado sin fix en FE). Además: fix de validación `.toUpperCase()` que bloqueaba crear/editar usuarios, password autogenerada mejorada (`crypto.getRandomValues`, ya no 100% derivable de datos públicos), export xlsx gateado por capability (`USUARIOS_EXPORT_CREDENCIALES_MANAGE`), botón "Migrar Contraseñas" gateado por capability (`USUARIOS_MIGRAR_CONTRASENAS_MANAGE`).
- **F3** (665) — 8 fixes de race conditions/cancelación vía `Subject`+`switchMap` en `correlation`, `attendance-panel`, `campus-admin` (el más grave, `loadPisoCompleto`, bloqueado por un bug BE 400 en `GET /api/campus/pisos` resuelto vía `Educa.API` 668), `ticket-bandeja`, `attendance-reports`, `eventos-calendario`, `rate-limit-events`, `correos-dia`. Verificado en vivo local (2 pisos de prueba, switch rápido sin inconsistencia).
- **F4** (666) — 9/9 bugs funcionales puntuales. Follow-up (link roto en `auditoria-correos-table`) cerrado vía `Educa.API` 687 + FE 688; de paso corrigió 2 bugs preexistentes (baseUrl FE incorrecto + concurrencia DbContext en BE).
- **F5** (679) — `setDisabledState` en 9 controles CVA de `edu-ui`; verificado en vivo local (menu roving focus, accordion ARIA, tabs roving tabindex, tooltip `aria-describedby`). Hallazgo derivado: `edu-select`/`edu-multi-select` nunca seteaban `aria-activedescendant` (listbox portado a `body`, sin ancestro DOM del trigger) — corregido delegando `onTriggerKeydown` → `onListKeydown`.
- **F6** (680) — investigación confirmó zoneless de facto (`zone.js` no está en deps ni en `node_modules`); `provideZonelessChangeDetection()` agregado explícito a `app.config.ts`; 2 componentes migrados al patrón `markForCheck()` ya usado en el resto.
- **F7** (681) — sitio público contacto + SEO validados end-to-end; regresión encontrada y corregida en `PublicSeoService`. Cerrado 2026-09-22 **sin** verificación post-deploy (decisión explícita del usuario) — el bloqueo real (681-B backend) sí está confirmado resuelto (`Educa.API` merge `828f2946`). Riesgo residual: form de contacto y meta tags SEO nunca probados contra `educa.com.pe` real.
- **F8** (682, directo a `main`, sin worktree) — performance: `@defer (on viewport)` en `home` (5 secciones) + cards de `admin-rendimiento`; imports directos por componente en 16 rutas `profesor/*`/`estudiante/*` (antes barrel completo); dispose de geometry/material THREE.js en `campus-scene-builder`; dedupe de rebuild de escena 3D por referencia; invalidación de módulos en paralelo (`Promise.all`). Punto 4 (`monitoreo-hub-badges`, 10 llamadas) re-diagnosticado: no son duplicadas, requiere endpoint de delta en BE — deuda cross-repo documentada, no bug FE.
- **F9** (683) — consolidación de duplicación: `MensajeriaPageComponent` compartido (estudiante/profesor), `LevelPageComponent` genérico parametrizado (inicial/primaria/secundaria), `AttendanceDirectorStaffComponent` generalizado con `loader` opcional (elimina `AttendanceDirectorAsistentesAdminComponent`).
- **F10** (684) — capa de datos: layering + `vistas.facade`.
- **F11** (685) — inconsistencias transversales menores (`@env`, `CommonModule`, naming `edu-ui`, dead code).
- **F12** (686, commit `0685135d`, directo a `main`) — riesgos menores: rate-limit de login ya protegido por BE (`[EnableRateLimiting("login")]`, solo faltaba documentar), `rowVersion`+409 replicado en `campus-admin` (Piso/Nodo/Bloqueo, patrón `ayuda-tickets` — BE antes devolvía `void` en vez del nuevo rowVersion, hubiera auto-conflictuado), aviso JaaS de expiración de token ya dimensionado correctamente por BE (fin de clase + margen, no 24h fijo). Verificado en vivo 2026-09-21 (2 sesiones de browser, 409 reproducido 2 veces seguidas sin last-write-wins). **Cierra BAudit2 (12/12).**

### BAudit3 — Audit de tests frontend (6/6 fases ✅)

- **F1** (689) — INV-CONTRACT03 estaba desactualizado, no el código: la normalización a lowercase de `WalEntry.endpoint` fue revertida deliberadamente en `8b2ccc85` por romper `/api/sistema/usuarios/{rol}/{id}` (case-sensitive en BE); doc corregida en `business-rules.md`/`optimistic-ui.md`.
- **F2** (690) — 7 specs con assert débil corregidos (fake timers en dedup, año bisiesto real, assert de payload/resourceId completo en WAL, error state tras backoff).
- **F3** (691) — cobertura de mutaciones críticas de seguridad/aprobación: `permisos-usuarios-data.facade`, `contact` (2→12 tests), `profesor-final-salones` aprobación (nombre real `aprobarEstudiante`/`aprobarMasivo`, no `aprobacionMasiva` como decía el brief), `grupos.facade` CRUD, `profesor.facade` calificaciones.
- **F4** (692) — cobertura de lógica de negocio educativa: recálculo de promedios, anti-solapamiento de horarios en import, transición de estado inválida en kanban de errores, rollback WAL en cursos/faq.
- **F5** (693) — gaps de infra WAL/integration: `httpMock.verify()` reveló llamadas no explícitas (reporter de errores, logout real); asserts 401 duros; `wal-leader` (fallback sin BroadcastChannel, takeover por timeout, propagación RELEASE); timer periódico con fake timers; `notifications.service` 8→15 tests; `storage-security` clearAll con estado real.
- **F6** (694) — housekeeping transversal: asserts de contenido DOM real, batería rollback `notificaciones-admin`, orden real apply→append en WAL, `clearAll` con sessionStorage real, handler SignalR `DeferFailStatusUpdated`, traceId/errorCode con valores exactos en 409. **Cierra BAudit3 (6/6).**

### xP79 — EduUI: reemplazo de PrimeNG (F1-F9 ✅, deploy verificado 2026-09-08)

F6 (588, worktree, ~32 commits) migró 277 archivos de PrimeNG a `edu-ui`; bug crítico de slots header/footer en dialog/drawer encontrado y resuelto (F6g); 123 archivos de CSS muerto removidos; bundle bajó de ~1.06-1.07MB a 906.32kB. F8 (589) + F9 (599-601, 605) cerraron gaps de fidelidad visual encontrados auditando contra `educa-libs`/prod real: sort de tabla, botón outline, `.tag-neutral` (especificidad `ViewEncapsulation.Emulated`), backgrounds opacos, `edu-popover` roto, `[object Object]` en 33 dropdowns, paginador, contraste `edu-toggle`, posicionamiento `edu-popover` del menú de perfil, toast "Error de aplicación" (causa raíz real: `classList.add()` con token con espacio). 602 = gate pre-deploy (8 páginas + 5 flujos + 10 hallazgos históricos re-chequeados). **Verificado en prod real 2026-09-08** (588, 595, 600, 601, 605) → `closed/`.

### xP107 — Entorno de desarrollo orientado a pruebas (F1-F4 100% ✅ FE)

Generación sintética + bulk create/delete para Salones, Cursos y Usuarios — verificado en vivo contra `TestConnection` real (creación y borrado, marcado `::TEST`/rango DNI `99xxxxxx`). Bug derivado real encontrado y corregido: fire-and-forget en `AsistenciaSyncService` (sync automático CrossChex) — fix en `Educa.API` 620/624, `/verify-prod` de 624 queda pendiente del lado BE (no bloquea este repo). Hallazgo fuera de scope, sin brief: `/intranet/admin/cursos` no invalida stats/búsqueda tras altas nuevas.

### xP92 — Admin "ver como" wrapper (✅ shipped, confirmado en `educa-coord` 2026-07-24)

El bloqueo que tenía este repo (`Educa.API` 498 / brief 499 "sin arrancar") estaba desactualizado: esos números de brief fueron reasignados después a trabajo no relacionado (P90 causa raíz / load-control F6c). `educa-coord/plans/maestro.md` confirma P92 en su lista de "completados y desplegados", shipped en `origin/main` de ambos repos.

### xP22 / xP43 / xP53 — cross-repo shipped (confirmado en `educa-coord` 2026-07-24)

Endurecimiento de correos (P22), Monitoreo Cowork (P43), Duplicate person validation (P53) — marcados "✅ shipped y confirmados en `origin/main` de ambos repos" en la limpieza de `educa-coord/plans/maestro-log.md` (2026-07-24). Los briefs FE puntuales que este maestro referenciaba (281, 284, 285, 296, 297, 303, 304) ya no existen como archivos — purgados en una limpieza anterior de `chats/`.

### xPanelAyuda — Panel de ayuda y salud institucional (✅ shipped)

F1-F3 BE + F4-F6 FE completos (briefs 479-481, ya purgados de `chats/`). No aparece en la cola activa de `educa-coord` — tratado como cerrado.

### F-SW01 — Bundle stale post-deploy (✅ cerrado)

Banner `SwService.updateAvailable$` + refetch de `MonitoreoHubBadgesFacade` en `cacheUpdated$`. Detalle: [tasks/sw-bundle-stale-detection.md](../tasks/sw-bundle-stale-detection.md).

### Auditoría WAL + Cache (standalone) — ✅ cerrada 2026-05-26

H1+H8+H9 ✅, H7 ✅ (brief 124), H2-H6 archivado.

---

## Verificaciones post-deploy históricas

- **686** — verificado en local 2026-09-21 (2 sesiones de browser editando el mismo piso en `campus-admin`, 409/rowVersion confirmado 2 veces, sin last-write-wins). Cierra BAudit2 F12.
- **679** — verificado en prod 2026-09-17 (smoke visual/teclado).
- **588, 595, 600, 601, 605** — verificados en vivo 2026-09-08 contra `educa.com.pe/intranet` real (dark mode, `edu-toggle`, `edu-popover` del menú de perfil, dialogs con footer, paginador `edu-ui`).
- **554, 559** — verificados 2026-09-08. 559: fix `Educa.API` confirmado en deploy (`/intranet/justificacion-asistencia` carga sin el 500 original); flujo Aprobar/Rechazar sin re-verificar end-to-end por falta de datos reales en prod (riesgo residual documentado, no bloqueante).
- **461, 464, 465** — verificados en vivo 2026-08-20 contra `TestConnection`. 461 con salvedad: el remanente grupo 4 (videoconferencia-sala/campus-3d-view con sesión real) solo confirmado por código, no reproducible con datos de prueba.
- ⚠️ **462** — cerrado 2026-09-22 **sin** verificación post-deploy (decisión explícita del usuario). Soporte táctil `admin/campus` detrás de feature flag `campusNavigation` apagado en prod — no verificable a la fecha. Riesgo residual: interacción táctil nunca confirmada en dispositivo real.
- ⚠️ **665** — cerrado 2026-09-22 **sin** verificación post-deploy (decisión explícita del usuario). No se pudo forzar la race en prod (nota 2026-09-17); fix validado por código/tests, no por QA en vivo.
- ⚠️ **681** — cerrado 2026-09-22 **sin** verificación post-deploy (decisión explícita del usuario). Su bloqueo real (681-B backend) sí está confirmado resuelto. Riesgo residual: form de contacto y SEO nunca probados contra `educa.com.pe` real.

## Notas de reconciliación previas

- **2026-08-20** — briefs 332/458/480/481 referenciados como pendientes ya estaban cerrados y purgados (`e0a2b9c6`); duplicado stray de 392 eliminado de `open/`.
- **Pre-2026-09-22** — P51, F13 (Test Gaps, brief 247), F46-F48 (barridos, 2026-05-15) fueron archivados en su momento pero el detalle línea-por-línea no se preservó — solo queda constancia de que esos planes cerraron. La referencia rota a este archivo (existía en `maestro.md` desde 2026-05-15 sin que el archivo existiera) se corrigió en esta limpieza.

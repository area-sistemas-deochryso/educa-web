# educa-web

Aplicacion Angular 21 para gestion educativa con portal publico e intranet privada.

**Stack**: Angular 21, TypeScript 5.9, NgRx Signals, PrimeNG 21, Vitest | ASP.NET Core 9, EF Core 9, SQL Server (Azure) | PWA (SWR único — siempre cache inmediato + revalidación en background) + Capacitor (Android/iOS nativo)

---

## Cómo se carga este contexto

Este `CLAUDE.md` tiene **dos bloques** distintos:

1. **Siempre activo (`@import`)** — reglas que aplican a >70% de los chats del proyecto. Convenciones de código, flujo operativo, comunicación. Se cargan en cada chat sin excepción.
2. **Índice bajo demanda** — punteros a docs/reglas con trigger específico. **No se cargan automáticamente**. Cuando detectás que el trigger aplica al chat actual, leés el archivo con `Read`. El hook de cada línea dice cuándo abrirlo.

Si dudás entre ambos bloques: dudar significa que es on-demand. Una regla siempre-activa que se ignora 9 de 10 veces es ruido.

---

## SIEMPRE ACTIVO

### Comandos

@.claude/commands/dev.md

### Reglas de código universales

@.claude/rules/reading-optimization.md
@.claude/rules/code-language.md
@.claude/rules/code-style.md
@.claude/rules/comments.md
@.claude/rules/git.md

### Metodología operativa

@.claude/rules/chat-modes.md
@.claude/rules/chat-shortcuts.md
@.claude/rules/backlog-hygiene.md

### Comunicación con el usuario

@.claude/rules/communication.md

---

## ÍNDICE BAJO DEMANDA

Cada línea: `- ruta/archivo.md — <trigger>`. Leé el archivo cuando el trigger aplique al chat actual.

### Contexto del negocio

- [.claude/context/domain.md](context/domain.md) — discutís roles, módulos del colegio, reglas del dominio educativo o necesitás glosario
- [.claude/context/api-endpoints.md](context/api-endpoints.md) — llamás un endpoint, agregás uno nuevo o necesitás ver el catálogo de rutas BE
- [.claude/context/data-conventions.md](context/data-conventions.md) — tocás `@data/` (adapters, models) o necesitás convenciones de naming de campos BD
- [.claude/context/integrations.md](context/integrations.md) — tocás CrossChex / JaaS / Firebase / SignalR / Azure Blob

### Estructura del proyecto

- [.claude/project-structure/architecture.md](project-structure/architecture.md) — agregás módulo/feature nuevo, decidís dónde vive un archivo, o pensás layering
- [.claude/project-structure/config-files.md](project-structure/config-files.md) — editás `angular.json` / `tsconfig*.json` / `netlify.toml` / `_redirects`
- [.claude/project-structure/urls-and-repos.md](project-structure/urls-and-repos.md) — necesitás URL de prod/dev/Azure o ubicación física de repos

### Arquitectura de código

- [.claude/rules/architecture.md](rules/architecture.md) — diseñás servicio/componente nuevo (taxonomía de 6 servicios + 6 componentes, dónde vive cada uno)
- [.claude/rules/state-management.md](rules/state-management.md) — tocás store/facade/signals/RxJS o decidís Signal vs Observable
- [.claude/rules/templates.md](rules/templates.md) — editás template Angular y necesitás reglas de OnPush/control flow/track
- [.claude/rules/regions.md](rules/regions.md) — refactorizás archivo >100 líneas y querés secciones colapsables consistentes
- [.claude/rules/debug.md](rules/debug.md) — debuggeás con `DebugService` / tags / RxJS taps (no logger normal)
- [.claude/rules/feature-flags.md](rules/feature-flags.md) — agregás flag nueva o togglás funcionalidad por entorno
- [.claude/rules/eslint.md](rules/eslint.md) — ESLint te tira error de capa/import/duplicación o configurás rule nueva
- [.claude/rules/testing.md](rules/testing.md) — escribís test nuevo o configurás Vitest

### Dominio y tipos — Invariantes `INV-*` (vivienen en `educa-coord/invariants/`)

> Los invariantes de dominio viven en la carpeta hermana `educa-coord/invariants/` (single source of truth cross-repo). Cada archivo cubre un dominio ≤300 ln. Los IDs `INV-*` son estables — citados desde código, commits y briefs.

- [../educa-coord/invariants/README.md](../../educa-coord/invariants/README.md) — índice cruzado de todos los `INV-*` y mapa de dominios. Leelo si necesitás navegar por ID o entender qué archivo aplica a un cambio
- [../educa-coord/invariants/asistencia.md](../../educa-coord/invariants/asistencia.md) — **Trigger por path**: si tocás `features/intranet/pages/{cross-role,profesor,estudiante,admin}/{attendance*,asistencia*}/**` o `core/services/asistencia/**`, leelo. Cubre asistencia diaria CrossChex (polimórfico E/P/A), por curso, edición admin formal (INV-C01..C11, AD01..AD09, AC01..AC03, S08)
- [../educa-coord/invariants/calificaciones.md](../../educa-coord/invariants/calificaciones.md) — **Trigger por path**: tocás `features/intranet/pages/{profesor,estudiante,admin}/{grades*,calificacion*}/**`. Cubre escalas, pesos, ventana de edición, state machine (INV-U06, C04, T04)
- [../educa-coord/invariants/aprobacion.md](../../educa-coord/invariants/aprobacion.md) — **Trigger por path**: tocás `features/intranet/pages/admin/{aprobacion*,kardex*}/**`. Cubre aprobación/desaprobación, progresión, vacacional, state machine estudiante (INV-T01..T06, V01..V03, C05)
- [../educa-coord/invariants/horarios.md](../../educa-coord/invariants/horarios.md) — **Trigger por path**: tocás `features/intranet/pages/{profesor,estudiante,admin}/{horario*,schedule*,salones*}/**`. Cubre validación de tiempos, conflictos, asignación profesor-curso (INV-U03..U05, C06..C08, AS01..AS05)
- [../educa-coord/invariants/matricula.md](../../educa-coord/invariants/matricula.md) — **Trigger por path**: tocás `features/intranet/pages/admin/{matricula*}/**`. Cubre state machine matrícula, pago manual (INV-M01..M04)
- [../educa-coord/invariants/estructura-academica.md](../../educa-coord/invariants/estructura-academica.md) — necesitás contexto del Salón como núcleo, niveles/grados, modelo tutor pleno vs por curso (INV-D06, D07)
- [../educa-coord/invariants/periodos.md](../../educa-coord/invariants/periodos.md) — tocás cierre/apertura de periodos académicos
- [../educa-coord/invariants/permisos.md](../../educa-coord/invariants/permisos.md) — tocás guards, login, jurisdicción sobre asistencia (INV-S01..S04)
- [../educa-coord/invariants/concurrencia.md](../../educa-coord/invariants/concurrencia.md) — tocás RowVersion, idempotencia, transacciones, Command Pattern batch (INV-S05..S06)
- [../educa-coord/invariants/correos.md](../../educa-coord/invariants/correos.md) — tocás envío de correos, defensas SMTP, blacklist, monitoreo defer/fail (INV-S07, MAIL01..MAIL10)
- [../educa-coord/invariants/feedback.md](../../educa-coord/invariants/feedback.md) — tocás reportes de usuario (Ctrl+Alt+F, FeedbackReportDialog) (INV-RU01..RU08)
- [../educa-coord/invariants/error-tracing.md](../../educa-coord/invariants/error-tracing.md) — tocás `ErrorLog` / `ErrorGroup` / correlación cross-carril (INV-ET01..ET07, CORR01)
- [../educa-coord/invariants/reportes.md](../../educa-coord/invariants/reportes.md) — agregás endpoint de reporte PDF/Excel (INV-RE01..RE03)
- [../educa-coord/invariants/dni-y-auditoria.md](../../educa-coord/invariants/dni-y-auditoria.md) — invariantes transversales (DNI, auditoría, soft-delete, INV-D09) — leelo si tocás cualquier modelo o query nueva
- [.claude/rules/domain-modeling.md](rules/domain-modeling.md) — definís interface/DTO/tipo de dominio y necesitás decidir capa (data/shared/feature/component)
- [.claude/rules/semantic-types.md](rules/semantic-types.md) — reemplazás `string`/`number` genérico por tipo del dominio (const + type)
- [.claude/rules/permissions.md](rules/permissions.md) — tocás guards / `permisosService` / roles / vistas
- [.claude/rules/backend.md](rules/backend.md) — necesitás contexto del BE Educa.API desde un chat FE (raro — el BE tiene su propio `.claude/` en `../Educa.API/.claude/`)

### UI / PrimeNG / estilos

- [.claude/rules/design-system.md](rules/design-system.md) — **BIG (946 ln)** estilás página intranet: overrides globales (A1-A5), pautas estructurales por componente (B1-B11), tokens de color. **Trigger por path**: si editás cualquier `.scss` o `.html` bajo `features/intranet/**` o `shared/components/**`, leelo. Cualquier hex literal (`#...`) que pongas debería pasar primero por la sección 7 (tokens)
- [.claude/rules/primeng.md](rules/primeng.md) — usás componente PrimeNG nuevo (cómo importar, `appendTo="body"`, `pt` para a11y)
- [.claude/rules/a11y.md](rules/a11y.md) — agregás botón/icono con PrimeNG (aria-label vía `pt`, contraste WCAG, azul oscuro). **Trigger por path/sintaxis**: si tu diff de `.html` contiene `pButton`, `p-button`, `<button`, `<img`, `<input`, `<h1..h6`, o cualquier elemento interactivo sin texto visible, leelo antes de cerrar el cambio
- [.claude/rules/dialogs-sync.md](rules/dialogs-sync.md) — agregás `p-dialog` / `p-drawer` / `p-confirmDialog` (sync de visible, NUNCA dentro de `@if`)
- [.claude/rules/skeletons.md](rules/skeletons.md) — agregás skeleton a tabla/stats/cards (3 niveles shared)
- [.claude/rules/lazy-rendering.md](rules/lazy-rendering.md) — necesitás renderizado progresivo multi-fase con `<app-lazy-content>`
- [.claude/rules/pagination.md](rules/pagination.md) — agregás tabla paginada (decisión client vs server, `/count`, anti-pattern doble unwrap)
- [.claude/rules/menu-modules.md](rules/menu-modules.md) — agregás item al menú de intranet (los 5 módulos + test de pertenencia)

### Datos y mutaciones

- [.claude/rules/crud-patterns.md](rules/crud-patterns.md) — creás CRUD admin (Store + Facade, multi-facade, BaseCrudStore, anti-patrones)
- [.claude/rules/optimistic-ui.md](rules/optimistic-ui.md) — hacés mutación FE → backend con WAL (`wal.execute`, apply/rollback, niveles de consistencia)
- [.claude/rules/rate-limiting.md](rules/rate-limiting.md) — ves 429/503, tocás interceptors, o agregás facade con muchas requests

### Infra del cliente

- [.claude/rules/storage.md](rules/storage.md) — tocás `StorageService` / `IndexedDB` / SessionStorage / Preferences
- [.claude/rules/service-worker.md](rules/service-worker.md) — tocás SW / cache SWR / invalidación / `DB_VERSION` o ves bundle stale en dev
- [.claude/rules/capacitor.md](rules/capacitor.md) — tocás build nativo Android/iOS, plugins Capacitor, safe-areas

### Otros

- [.claude/agents/code-reviewer.md](agents/code-reviewer.md) — invocás el agent `code-reviewer` (se carga solo cuando lo llama el subagent system; no necesitás leerlo manualmente)
- [.claude/debug/README.md](debug/README.md) — vas a usar la carpeta `debug/` para troubleshooting persistente
- [.claude/history/README.md](history/README.md) — necesitás registrar/leer history de subsistemas (modo `dev-log`)

---

## Organización del .claude/

| Carpeta                              | Rol                                                                                                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [claude-cowork/](claude-cowork/)     | Namespace de Cowork (QA asistido en navegador). Setup, reportes y hallazgos. No es Claude Code — vive separado para no mezclarse con commands/hooks/settings.                |

Convención de namespacing: el resto de `.claude/` (raíz + carpetas de la tabla, salvo `claude-cowork/`) es infra de Claude Code y queda en su ruta convencional porque commands, hooks, settings y CLAUDE.md se autodescubren desde rutas fijas. Cualquier herramienta IA adicional entra como subcarpeta hermana de `claude-cowork/`.

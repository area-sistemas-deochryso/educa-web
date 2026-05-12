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
- [.claude/context/data-conventions.md](context/data-conventions.md) — tocás `@data/` (adapters, models, repositories) o necesitás convenciones de naming de campos BD
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

### Dominio y tipos

- [.claude/rules/business-rules.md](rules/business-rules.md) — **BIG (1213 ln)** tocás dominio: asistencia, calificaciones, horarios, aprobación, vacacional, matrícula, periodos, permisos. Listado completo de invariantes `INV-*`. **Trigger por path**: si tocás cualquier archivo bajo `features/intranet/pages/{cross-role,profesor,estudiante,admin}/{attendance*,asistencia*,grades*,calificacion*,horario*,schedule*,aprobacion*,matricula*,salones*,kardex*}/**` o `core/services/{asistencia,facades}/**`, leelo aunque el chat parezca solo UI — esos componentes calculan/muestran datos sujetos a invariantes
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

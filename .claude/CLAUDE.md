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

- [../educa-coord/glossary/domain.md](../../educa-coord/glossary/domain.md) — glosario cross-repo: jerarquía de usuarios, entidades core, flujo CrossChex canónico, ES↔EN del dominio. Cubre lo que antes vivía en `context/domain.md` local
- [.claude/context/data-conventions.md](context/data-conventions.md) — tocás `@data/` (adapters, models) o necesitás convenciones de naming
- [.claude/context/integrations.md](context/integrations.md) — tocás CrossChex / JaaS / Firebase / SignalR / Azure Blob

### Contratos y dominio cross-repo (educa-coord)

- [../educa-coord/contracts/api-catalog.md](../../educa-coord/contracts/api-catalog.md) — llamás un endpoint, agregás uno nuevo o necesitás ver el catálogo BE (rutas + SignalR hubs)
- [../educa-coord/contracts/api-protocol.md](../../educa-coord/contracts/api-protocol.md) — necesitás shape del wire HTTP (`ApiResponse<T>`, excepciones tipadas → status, headers `X-Correlation-Id`/`X-Idempotency-Key`)
- [../educa-coord/contracts/rate-limiting.md](../../educa-coord/contracts/rate-limiting.md) — ves 429/503, tocás interceptors, manejás `Retry-After` (complementa `rules/rate-limiting.md` para detalles FE: withRetry, MAX_CONCURRENT)
- [../educa-coord/contracts/auth.md](../../educa-coord/contracts/auth.md) — tocás cookies de auth, refresh flow, query-string fallback para SignalR
- [../educa-coord/glossary/db-fields.md](../../educa-coord/glossary/db-fields.md) — tocás `@data/models`, mapeás campos BD con prefijos `EST_/PRO_/ASI_`, o consultás convenciones DNI/RowVersion/auditoría
- [../educa-coord/CHARTER.md](../../educa-coord/CHARTER.md) — vas a aceptar un plan grande, escribir un ADR, o resolver un trade-off entre principios (latencia vs consistencia, simplicidad vs flexibilidad). Responde los 10 puntos del marco para educa concretamente: función objetivo (matriz por rol), restricciones, trade-offs aceptados, invariante existencial INV-EX01, boundaries, volatilidad, horizonte post-2027, capacidad operacional. Si tu decisión contradice §N, **se actualiza el CHARTER primero**. Ratificado en `decisions/0003-charter-ratificacion.md`
- [../educa-coord/fitness/README.md](../../educa-coord/fitness/README.md) — sospechás drift arquitectónico, vas a agregar un chequeo medible nuevo, o querés saber qué FIT-* observa un cambio. Catálogo de 27 funciones (`FIT-01..FIT-61`) ancladas al CHARTER, clasificadas por estado (`enforced` / `monitored` / `manual` / `aspirational`)
- [../educa-coord/principles/README.md](../../educa-coord/principles/README.md) — vas a tomar una decisión arquitectónica no trivial (tradeoffs, boundaries, abstracción, dependencias). El README rutea a los 17 elementos del marco; cada uno tiene su `claude.md` con regla operativa ≤40 ln
- [../educa-coord/invariants/README.md](../../educa-coord/invariants/README.md) — vas a tocar dominio educativo (asistencia, calificaciones, aprobación, horarios, matrícula, periodos, permisos, concurrencia, correos, feedback, error-tracing, reportes, estructura académica, DNI/auditoría). El README rutea al `INV-*` específico por dominio

### Estructura y arquitectura

- [.claude/project-structure/](project-structure/) — agregás módulo/feature nuevo (layering), editás `angular.json` / `tsconfig*.json` / `netlify.toml` / `_redirects`, o necesitás URL de prod/dev/Azure
- [.claude/rules/architecture.md](rules/architecture.md) — diseñás servicio/componente nuevo (taxonomía de 6 servicios + 6 componentes, multi-facade, dónde vive cada uno)
- [.claude/rules/state-management.md](rules/state-management.md) — tocás store/facade/signals/RxJS o decidís Signal vs Observable
- [.claude/rules/templates.md](rules/templates.md) — editás template Angular y necesitás reglas de OnPush/control flow/track
- [.claude/rules/testing.md](rules/testing.md) — escribís test nuevo o configurás Vitest

> Reglas niche del FE: `rules/eslint.md` (cuando tira error de capa/import), `rules/regions.md` (refactor >100 ln colapsables), `rules/debug.md` (DebugService/tags), `rules/feature-flags.md` (toggle por entorno) — leelos directo cuando aparezca el trigger del nombre.

### Dominio y tipos

- [.claude/rules/domain-modeling.md](rules/domain-modeling.md) — definís interface/DTO/tipo de dominio y necesitás decidir capa (data/shared/feature/component), convenciones de naming, patrón `const + type`. Para reemplazo de primitivas genéricas (`string`/`number` → tipo del dominio) ver `rules/semantic-types.md`
- [.claude/rules/permissions.md](rules/permissions.md) — tocás guards / `permisosService` / roles / vistas / jurisdicción admin

### UI / PrimeNG / estilos

- [.claude/rules/design-system.md](rules/design-system.md) — **BIG (946 ln)** estilás página intranet: overrides globales (A1-A5), pautas estructurales por componente (B1-B11), tokens de color. **Trigger por path**: si editás cualquier `.scss` o `.html` bajo `features/intranet/**` o `shared/components/**`, leelo. Cualquier hex literal (`#...`) que pongas debería pasar primero por la sección 7 (tokens)
- [.claude/rules/primeng.md](rules/primeng.md) — usás componente PrimeNG nuevo (cómo importar, `appendTo="body"`, `pt` para a11y). Para sync de `p-dialog`/`p-drawer`/`p-confirmDialog` (NUNCA dentro de `@if`) ver `rules/dialogs-sync.md`
- [.claude/rules/a11y.md](rules/a11y.md) — agregás botón/icono con PrimeNG (aria-label vía `pt`, contraste WCAG, azul oscuro). **Trigger por path/sintaxis**: si tu diff de `.html` contiene `pButton`, `p-button`, `<button`, `<img`, `<input`, `<h1..h6`, o cualquier elemento interactivo sin texto visible, leelo antes de cerrar el cambio
- [.claude/rules/pagination.md](rules/pagination.md) — agregás tabla paginada (decisión client vs server, `/count`, anti-pattern doble unwrap)

> Reglas niche de UI: `rules/skeletons.md` (3 niveles shared), `rules/lazy-rendering.md` (progressive multi-fase con `<app-lazy-content>`), `rules/menu-modules.md` (los 5 módulos del menú intranet), `rules/dialogs-sync.md` (sync overlay). Leelos directo cuando aparezca el trigger.

### Datos y mutaciones

- [.claude/rules/crud-patterns.md](rules/crud-patterns.md) — creás CRUD admin (Store + Facade, multi-facade, BaseCrudStore, anti-patrones)
- [.claude/rules/optimistic-ui.md](rules/optimistic-ui.md) — hacés mutación FE → backend con WAL (`wal.execute`, apply/rollback, niveles de consistencia, cross-tab refetch)

### Infra del cliente

- [.claude/rules/storage.md](rules/storage.md) — tocás `StorageService` / `IndexedDB` / SessionStorage / Preferences
- [.claude/rules/service-worker.md](rules/service-worker.md) — tocás SW / cache SWR / invalidación / `DB_VERSION` o ves bundle stale en dev

> Niche: `rules/capacitor.md` (build nativo Android/iOS, plugins Capacitor, safe-areas). Carpetas `.claude/{debug,history}/README.md` — usalas cuando estés en troubleshooting persistente o en modo `/dev-log`.

---

## Organización del .claude/

| Carpeta                              | Rol                                                                                                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [claude-cowork/](claude-cowork/)     | Namespace de Cowork (QA asistido en navegador). Setup, reportes y hallazgos. No es Claude Code — vive separado para no mezclarse con commands/hooks/settings.                |

Convención de namespacing: el resto de `.claude/` (raíz + carpetas de la tabla, salvo `claude-cowork/`) es infra de Claude Code y queda en su ruta convencional porque commands, hooks, settings y CLAUDE.md se autodescubren desde rutas fijas. Cualquier herramienta IA adicional entra como subcarpeta hermana de `claude-cowork/`.

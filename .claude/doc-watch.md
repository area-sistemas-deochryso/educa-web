# Doc Watch Registry — educa-web

> Mapea los docs operativos de `.claude/` a las áreas de código que describen.
> `/end` cruza `git diff --name-only` contra esta tabla para marcar docs potencialmente desactualizados.
>
> Ver también el registro cross-repo: [`../../educa-coord/doc-watch.md`](../../educa-coord/doc-watch.md) (docs de `educa-coord` que describen código de `educa-web`, columna `Repo`).

## Watchable (con globs)

| Doc | Watches | Scope |
|---|---|---|
| context/data-conventions.md | `src/app/data/**` | Convenciones de naming/adapters de `@data/` |
| context/domain.md | `src/app/features/intranet/**`, `src/app/core/services/wal/**`, `src/app/core/guards/permissions/**` | Módulos por rol, flujo CRUD optimista, flujo de permisos granulares (FE) |
| context/integrations.md | `src/app/core/services/signalr/**`, `src/app/core/services/wal/**`, `capacitor.config.ts` | CrossChex, Firebase, SignalR, Azure Blob, Jitsi |
| documentacion-subsistemas/auth-sesion-permisos.md | `src/app/core/services/auth/**`, `src/app/core/guards/auth/**`, `src/app/core/interceptors/auth/**` | Autenticación, sesión, permisos |
| documentacion-subsistemas/cache-swr.md | `src/app/core/services/sw/**`, `src/app/core/services/cache/**`, `src/app/core/interceptors/sw-cache-invalidation/**` | Cache Stale-While-Revalidate |
| documentacion-subsistemas/service-worker-scope.md | `src/app/core/services/sw/**`, `src/app/core/interceptors/sw-cache-invalidation/**` | Scope y ciclo de vida del Service Worker |
| documentacion-subsistemas/trazabilidad-errores.md | `src/app/core/services/error/**` | Trazabilidad de errores, activity tracker, outbox |
| documentacion-subsistemas/wal-resilience-degradation.md | `src/app/core/services/wal/**` | Degradación y resiliencia del WAL |
| documentacion-subsistemas/wal-write-ahead-log.md | `src/app/core/services/wal/**` | Write-Ahead Log — diseño general |
| project-structure/config-files.md | `angular.json`, `tsconfig*.json`, `netlify.toml`, `_redirects` | Config de build/routing/deploy |
| reference/a11y.md | `src/app/**/*.html` | Accesibilidad en templates (aria-label, contraste, elementos interactivos) |
| reference/capacitor.md | `capacitor.config.ts`, `src/app/core/services/capacitor/**`, `android/**`, `ios/**` | Build nativo Android/iOS |
| reference/crud-patterns.md | `src/app/features/intranet/pages/admin/**/*.store.ts`, `src/app/core/services/facades/**` | CRUD admin — Store + Facade, BaseCrudStore |
| reference/debug.md | `src/app/shared/components/devtools/**` | DebugService / tags de debug |
| reference/design-system.md | `src/app/features/intranet/**/*.scss`, `src/app/features/intranet/**/*.html`, `src/app/shared/components/**` | Overrides globales, pautas estructurales, tokens de color |
| reference/dialogs-sync.md | `src/app/**/*dialog*`, `src/app/**/*drawer*` | Sincronización de overlays (`edu-dialog`/`edu-drawer`/`edu-confirm-dialog`) |
| reference/domain-modeling.md | `src/app/data/models/**`, `src/app/shared/models/**`, `src/app/shared/interfaces/**` | Interfaces/DTOs de dominio, convenciones `const + type` |
| reference/eduui.md | `src/app/shared/edu-ui/**` | Componentes `edu-ui` (imports, `appendTo`, slots) |
| reference/enforcement-reglas.md | `eslint.config.*` | Linting de arquitectura, imports prohibidos entre capas |
| reference/eslint.md | `eslint.config.*` | Errores de capa/import del linter |
| reference/feature-flags.md | `src/app/core/services/feature-flags/**`, `src/app/config/**` | Toggle de features por entorno |
| reference/lazy-rendering.md | `src/app/shared/components/**` | Renderizado progresivo (`<app-lazy-content>`) — *ver nota de deuda* |
| reference/menu-modules.md | `src/app/shared/components/layout/**` | Los 5 módulos del menú intranet |
| reference/optimistic-ui.md | `src/app/core/services/wal/**` | Mutación FE→backend vía WAL (apply/rollback, niveles de consistencia) |
| reference/pagination.md | `src/app/shared/edu-ui/lib/paginator/**`, `src/app/shared/utils/client-paging.utils.ts` | Tablas paginadas (client vs server) |
| reference/permissions.md | `src/app/core/guards/permissions/**`, `src/app/core/services/permissions/**` | Guards, `permisosService`, roles, jurisdicción admin |
| reference/pwa-ios.md | `capacitor.config.ts`, `src/app/core/services/capacitor/**` | Safe-areas y particularidades PWA/iOS |
| reference/rate-limiting.md | `src/app/core/interceptors/rate-limit/**`, `src/app/core/services/rate-limit-countdown/**` | Interceptors, `Retry-After`, `MAX_CONCURRENT` |
| reference/semantic-types.md | `src/app/shared/types/**` | Reemplazo de primitivas genéricas por tipos de dominio |
| reference/service-worker.md | `src/app/core/services/sw/**`, `src/app/core/interceptors/sw-cache-invalidation/**` | Cache SWR, invalidación, versión de DB |
| reference/skeletons.md | `src/app/shared/components/skeleton-loader/**` | 3 niveles de skeleton shared |
| reference/state-management.md | `src/app/**/*.store.ts`, `src/app/**/*.facade.ts` | Stores, facades, signals, frontera RxJS↔Signals |
| reference/storage.md | `src/app/core/services/storage/**` | `StorageService`, IndexedDB, SessionStorage, Preferences |
| reference/testing.md | `src/**/*.spec.ts`, `vitest.config.*` | Configuración y convenciones de Vitest |
| rules/business-rules.md | `src/app/core/services/wal/**`, `src/app/core/interceptors/view-as/**`, `src/app/core/guards/view-as/**` | Contratos REST FE↔BE, casing WAL, identidad "ver como" |
| rules/optimistic-ui.md | `src/app/core/services/wal/**` | Casing lowercase de `WalEntry.endpoint` |

## Broad docs (sin globs — convenciones/patrones generales, ver `doc-freshness.md`)

- `CLAUDE.md` (índice del proyecto)
- `claude-cowork/README.md` (pointer a `educa-coord`)
- `config/drift-map.md` (mapa doc↔código, meta-herramienta de `/drift-check`)
- `debug/README.md`
- `agents/README.md`, `agents/code-reviewer.md`
- `commands/*.md` (36 archivos — definiciones de skills/comandos internos)
- `skills/README.md`, `skills/commit/SKILL.md`, `skills/pr-ready/SKILL.md`, `skills/validate-code/SKILL.md`, `skills/optimize-crud.md`
- `rules/backend.md` (describe código de `Educa.API`, fuera del alcance de este registro local — ver registro cross-repo de `educa-coord` si necesita watch)
- `rules/backlog-hygiene.md`, `rules/browsing.md`, `rules/chat-modes.md`, `rules/code-language.md`, `rules/code-style.md`, `rules/git.md`, `rules/one-repo-one-chat.md`, `rules/worktrees.md`
- `reference/architecture.md` (taxonomía general de servicios/componentes, aplica a todo el árbol)
- `reference/comments.md`, `reference/regions.md`, `reference/templates.md` (convenciones de estilo, aplican en cualquier archivo)
- `reference/design-patterns-backend.md`, `reference/design-patterns-frontend.md` (planes prospectivos de patrones, no código vigente — el backend además está fuera de este repo)
- `examples/lazy-rendering-usuarios-example.md` (ejemplo ilustrativo, redundante con el glob de `reference/lazy-rendering.md`)
- `project-structure/architecture.md`, `project-structure/urls-and-repos.md`

## Stable (excluidos del registro por completo)

- `chats/**` (running/open/closed/awaiting-prod — trackers de trabajo, no docs de código vigente)
- `plan/**`, `plans/**` (cola maestro, planes activos/archivados — trackers, mismo criterio que `chats/**`)
- `tasks/**` (TODOs crudos sin plan)
- `diagnostic/load-control-f6a-report.md` (reporte fechado, no cambia con el código)

## Deuda documentada

- Los globs son primera pasada por lectura del contenido del doc, no validados exhaustivamente contra cada archivo real del repo (mismo criterio que F4/652). Se refinan orgánicamente cuando F5 (`/end` integration, pendiente) dispare el chequeo de "dead glob".
- `reference/lazy-rendering.md` documenta `<app-lazy-content>` como selector; no se encontró ningún componente con ese selector en `src/` al momento del bootstrap (2026-09-11) — posible glob muerto o patrón aún no implementado. Queda para que F5/F6 lo confirme en vez de asumir en este chat mecánico.
- `rules/backend.md` vive en este repo pero describe código de `Educa.API` (timeouts, `CancellationToken`) — no tiene glob local útil; si se quiere watch, corresponde al registro cross-repo de `educa-coord`, no a este.

# educa-web

Aplicacion Angular 21 para gestion educativa con portal publico e intranet privada.

**Stack**: Angular 21, TypeScript 5.9, NgRx Signals, PrimeNG 21, Vitest | ASP.NET Core 9, EF Core 9, SQL Server (Azure) | PWA (SWR único — siempre cache inmediato + revalidación en background) + Capacitor (Android/iOS nativo)

---

## Cómo se carga este contexto

> **`rules/`** es directorio mágico — todo `.md` ahí se auto-carga en cada chat.
> **`reference/`** no es mágico — se lee on-demand con `Read` cuando el trigger aplica.

**Always-on** (en `rules/`): `code-style`, `code-language`, `comments`, `git`, `chat-modes`, `backlog-hygiene`, `one-repo-one-chat`, `state-management`.

---

## ÍNDICE ON-DEMAND (`reference/`)

Cada línea: `- ruta/archivo.md — <trigger>`. Leé el archivo cuando el trigger aplique.

### Reglas always-on (en `rules/`, se auto-cargan)

`code-style`, `code-language`, `comments`, `git`, `chat-modes`, `backlog-hygiene`, `one-repo-one-chat`, `state-management` — no necesitan trigger, siempre disponibles.

### Contexto del negocio

- [../educa-coord/glossary/domain.md](../../educa-coord/glossary/domain.md) — glosario cross-repo: jerarquía de usuarios, entidades core, flujo CrossChex canónico, ES↔EN del dominio. Cubre lo que antes vivía en `context/domain.md` local
- [.claude/context/data-conventions.md](context/data-conventions.md) — tocás `@data/` (adapters, models) o necesitás convenciones de naming
- [.claude/context/integrations.md](context/integrations.md) — tocás CrossChex / JaaS / Firebase / SignalR / Azure Blob

### Contratos y dominio cross-repo (educa-coord)

- [../educa-coord/contracts/api-catalog.md](../../educa-coord/contracts/api-catalog.md) — llamás un endpoint, agregás uno nuevo o necesitás ver el catálogo BE (rutas + SignalR hubs)
- [../educa-coord/contracts/api-protocol.md](../../educa-coord/contracts/api-protocol.md) — necesitás shape del wire HTTP (`ApiResponse<T>`, excepciones tipadas → status, headers `X-Correlation-Id`/`X-Idempotency-Key`)
- [../educa-coord/contracts/rate-limiting.md](../../educa-coord/contracts/rate-limiting.md) — ves 429/503, tocás interceptors, manejás `Retry-After` (complementa `reference/rate-limiting.md` para detalles FE: withRetry, MAX_CONCURRENT)
- [../educa-coord/contracts/auth.md](../../educa-coord/contracts/auth.md) — tocás cookies de auth, refresh flow, query-string fallback para SignalR
- [../educa-coord/glossary/db-fields.md](../../educa-coord/glossary/db-fields.md) — tocás `@data/models`, mapeás campos BD con prefijos `EST_/PRO_/ASI_`, o consultás convenciones DNI/RowVersion/auditoría
- [../educa-coord/CHARTER.md](../../educa-coord/CHARTER.md) — vas a aceptar un plan grande, escribir un ADR, o resolver un trade-off entre principios (latencia vs consistencia, simplicidad vs flexibilidad). Responde los 10 puntos del marco para educa concretamente: función objetivo (matriz por rol), restricciones, trade-offs aceptados, invariante existencial INV-EX01, boundaries, volatilidad, horizonte post-2027, capacidad operacional. Si tu decisión contradice §N, **se actualiza el CHARTER primero**. Ratificado en `decisions/0003-charter-ratificacion.md`
- [../educa-coord/fitness/README.md](../../educa-coord/fitness/README.md) — sospechás drift arquitectónico, vas a agregar un chequeo medible nuevo, o querés saber qué FIT-* observa un cambio. Catálogo de 27 funciones (`FIT-01..FIT-61`) ancladas al CHARTER, clasificadas por estado (`enforced` / `monitored` / `manual` / `aspirational`)
- [../educa-coord/principles/README.md](../../educa-coord/principles/README.md) — vas a tomar una decisión arquitectónica no trivial (tradeoffs, boundaries, abstracción, dependencias). El README rutea a los 17 elementos del marco; cada uno tiene su `claude.md` con regla operativa ≤40 ln
- [../educa-coord/invariants/README.md](../../educa-coord/invariants/README.md) — vas a tocar dominio educativo (asistencia, calificaciones, aprobación, horarios, matrícula, periodos, permisos, concurrencia, correos, feedback, error-tracing, reportes, estructura académica, DNI/auditoría). El README rutea al `INV-*` específico por dominio

### Estructura y arquitectura

- [.claude/project-structure/](project-structure/) — agregás módulo/feature nuevo (layering), editás `angular.json` / `tsconfig*.json` / `netlify.toml` / `_redirects`, o necesitás URL de prod/dev/Azure
- [.claude/reference/architecture.md](reference/architecture.md) — diseñás servicio/componente nuevo (taxonomía de 6 servicios + 6 componentes, multi-facade, dónde vive cada uno)
- [.claude/reference/templates.md](reference/templates.md) — editás template Angular y necesitás reglas de OnPush/control flow/track
- [.claude/reference/testing.md](reference/testing.md) — escribís test nuevo o configurás Vitest

> Reglas niche del FE: `reference/eslint.md` (cuando tira error de capa/import), `reference/regions.md` (refactor >100 ln colapsables), `reference/debug.md` (DebugService/tags), `reference/feature-flags.md` (toggle por entorno) — leelos directo cuando aparezca el trigger del nombre.

### Dominio y tipos

- [.claude/reference/domain-modeling.md](reference/domain-modeling.md) — definís interface/DTO/tipo de dominio y necesitás decidir capa (data/shared/feature/component), convenciones de naming, patrón `const + type`. Para reemplazo de primitivas genéricas (`string`/`number` → tipo del dominio) ver `reference/semantic-types.md`
- [.claude/reference/permissions.md](reference/permissions.md) — tocás guards / `permisosService` / roles / vistas / jurisdicción admin

### UI / PrimeNG / estilos

- [.claude/reference/design-system.md](reference/design-system.md) — **BIG (946 ln)** estilás página intranet: overrides globales (A1-A5), pautas estructurales por componente (B1-B11), tokens de color. **Trigger por path**: si editás cualquier `.scss` o `.html` bajo `features/intranet/**` o `shared/components/**`, leelo. Cualquier hex literal (`#...`) que pongas debería pasar primero por la sección 7 (tokens)
- [.claude/reference/primeng.md](reference/primeng.md) — usás componente PrimeNG nuevo (cómo importar, `appendTo="body"`, `pt` para a11y). Para sync de `p-dialog`/`p-drawer`/`p-confirmDialog` (NUNCA dentro de `@if`) ver `reference/dialogs-sync.md`
- [.claude/reference/a11y.md](reference/a11y.md) — agregás botón/icono con PrimeNG (aria-label vía `pt`, contraste WCAG, azul oscuro). **Trigger por path/sintaxis**: si tu diff de `.html` contiene `pButton`, `p-button`, `<button`, `<img`, `<input`, `<h1..h6`, o cualquier elemento interactivo sin texto visible, leelo antes de cerrar el cambio
- [.claude/reference/pagination.md](reference/pagination.md) — agregás tabla paginada (decisión client vs server, `/count`, anti-pattern doble unwrap)

> Reglas niche de UI: `reference/skeletons.md` (3 niveles shared), `reference/lazy-rendering.md` (progressive multi-fase con `<app-lazy-content>`), `reference/menu-modules.md` (los 5 módulos del menú intranet), `reference/dialogs-sync.md` (sync overlay). Leelos directo cuando aparezca el trigger.

### Datos y mutaciones

- [.claude/reference/crud-patterns.md](reference/crud-patterns.md) — creás CRUD admin (Store + Facade, multi-facade, BaseCrudStore, anti-patrones)
- [.claude/reference/optimistic-ui.md](reference/optimistic-ui.md) — hacés mutación FE → backend con WAL (`wal.execute`, apply/rollback, niveles de consistencia, cross-tab refetch)

### Infra del cliente

- [.claude/reference/storage.md](reference/storage.md) — tocás `StorageService` / `IndexedDB` / SessionStorage / Preferences
- [.claude/reference/service-worker.md](reference/service-worker.md) — tocás SW / cache SWR / invalidación / `DB_VERSION` o ves bundle stale en dev

> Niche: `reference/capacitor.md` (build nativo Android/iOS, plugins Capacitor, safe-areas). Carpetas `.claude/{debug,history}/README.md` — usalas cuando estés en troubleshooting persistente o en modo `/dev-log`.

---

## Organización del .claude/

| Carpeta                              | Rol                                                                                                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [claude-cowork/](claude-cowork/)     | **Pointer** al namespace canónico de Cowork. El contenido vive en `educa-coord/.claude/claude-cowork/` (Cowork valida cross-repo front + back, vive en el repo de coordinación). Acá queda solo el README que indica adónde ir.                |

Convención de namespacing: el resto de `.claude/` (raíz + carpetas de la tabla) es infra de Claude Code y queda en su ruta convencional porque commands, hooks, settings y CLAUDE.md se autodescubren desde rutas fijas. Herramientas IA adicionales cross-repo entran como subcarpeta hermana en `educa-coord/.claude/`.

> **Repo destino**: `educa-web`, worktree dedicado `p70-angular22-migration` (branch `chat/p70-angular22-migration`) — no toca `Educa.API`.
> **Plan**: 70 (coord, `xrepo-70-angular22-migration.md`) · **Fase**: F3 · **Creado**: 2026-08-25 · **Estado**: ⏳ abierto.
> **Depende de**: F1 (345, investigate) ✅ completo — ver [`345-report.md`](../running/345-report.md). F2 (design) resuelto inline en este brief, ver sección de decisiones.
> **exclusive**: `true` (heredado del worktree — `package.json`, `angular.json`, `src/**`)

---

# 595 — P70 F3: Angular 22 framework upgrade

## Contexto

F1 (345) investigó compatibilidad y quedó con 3 puntos abiertos para F2. Este brief los resuelve con evidencia fresca (2026-08-25, verificado en este mismo chat contra el `package.json` real del worktree y el registro de npm) y define el alcance ejecutable de F3 — el upgrade mecánico del framework. F4 (adopción de Signal Forms/Resource API) queda fuera, es diseño propio posterior.

## Decisiones de diseño (F2, resueltas acá)

1. **Gate de `@ngrx/signals` — RESUELTO**: el reporte de F1 solo veía `22.0.0-beta.0`/`beta.1`. Verificado ahora contra el registro de npm: **`22.0.0` estable está publicado** (`dist-tags.latest`). Ya no bloquea F3.
2. **`paramsInheritanceStrategy` (default pasa a `'always'`)**: confirmado que hoy no hay override explícito (`grep` sin resultados para `paramsInheritanceStrategy`/`withRouterConfig` en `src/app`). Revisión dirigida del árbol de rutas anidadas (`intranet.routes.ts`, `monitoreo.routes.ts`) no encontró un caso obvio de padre e hijo compartiendo nombre de param — pero el grep no fue exhaustivo sobre todo el árbol de routing. **Decisión**: no fijar un override preventivo (el árbol es grande, auditarlo entero a mano no se justifica sin evidencia de un problema real). Correr `ng update`, build y tests; si aparece un bug de params real, mitigar puntual con `withRouterConfig({ paramsInheritanceStrategy: 'emptyOnly' })` en esa ruta, no globalmente.
3. **SSR transfer cache + requests con credenciales — riesgo real confirmado**: `credentials.interceptor.ts` y `provideClientHydration(withEventReplay())` (`app.config.ts:86`) ambos presentes y activos. Es el punto de mayor riesgo silencioso de todo el upgrade — requiere prueba manual dirigida post-upgrade (login → navegación con hidratación activa → Network tab verificando que no se re-disparan ni duplican requests con `XSRF-TOKEN`/cookies), no solo build verde.
4. **Entorno**: no se encontró pipeline de CI (`.yml`/`.yaml`) ni campo `"engines"` en `package.json` — el bump de Node 20→22 y TypeScript 5.9→6.0 aplica a la máquina de desarrollo (y al servidor donde se hace build/deploy, fuera del alcance de este brief si es infra separada de este repo).
5. **`angular-eslint`**: alinear de `^19.6.0` (ya desalineado del resto del stack hoy, preexistente) directo a `22.1.0` en el mismo lote — evita pasar por v20/v21 innecesariamente.
6. **Fuera de esta fase**: Signal Forms / `httpResource`/`rxResource` (F4, diseño propio post-upgrade), zoneless (v22 no lo fuerza), cualquier adopción de API nueva que no sea parte del upgrade mecánico.

## Alcance

- Node 20 → 22 y TypeScript `~5.9.2` → `~6.0` en el entorno de desarrollo del worktree.
- `ng update @angular/core@22 @angular/cli@22` — arrastra `@angular/cdk`, `@angular/ssr`, `@angular/platform-*`, etc. vía el schematic automático.
- Revisar el diff que genera el schematic antes de aceptarlo a ciegas (ej. `ChangeDetectionStrategy.Eager` agregado donde el comportamiento viejo se dependía) — si toca un volumen de archivos inesperado, frenar y reportar antes de continuar.
- `@ngrx/signals`/`@ngrx/operators` → `22.0.0` estable.
- `angular-eslint`/`@angular-eslint/builder` → `22.1.0`.
- Auditoría manual dirigida: login + navegación con SSR/hidratación activa, verificar comportamiento de requests con credenciales (punto 3 arriba).
- Auditoría manual dirigida: navegar rutas anidadas con params reales (correlation `:id`, monitoreo `:correo`/`:id`, y cualquier otra que aparezca al tocar el árbol completo), confirmar que no hay params inesperados llegando a componentes hijos.
- Build de producción verde, suite de tests (unit + e2e Playwright) verde.

## Fuera de alcance

- Adopción de Signal Forms / Resource API / Angular Aria (F4, brief propio).
- Zoneless change detection (no forzado, decisión futura).
- Cualquier cambio de UI/UX o feature nueva.
- PrimeNG/edu-ui — ya resuelto, P79 cerrado (F1-F6 completo, `primeng` fuera de `package.json` desde 2026-08-25).
- Bump de infra de CI/CD si vive fuera de este repo (no se encontró config en este repo).

## Deliverable

- Angular 22 corriendo en el worktree: build + tests verdes, Node 22 + TS 6.0 en el entorno.
- `@ngrx/signals`, `angular-eslint` alineados a sus versiones 22.x estables.
- Resultado documentado de las dos auditorías dirigidas (SSR/credenciales, route params) — con o sin breakage encontrado.

## Criterio de cierre

- [ ] Node 22 + TypeScript 6.0 en el worktree
- [ ] `ng update` corrido — `@angular/core`/`cli`/`cdk`/`ssr`/`platform-*` en 22.x
- [ ] `@ngrx/signals` + `@ngrx/operators` en `22.0.0`
- [ ] `angular-eslint`/`@angular-eslint/builder` en `22.1.0`
- [ ] Build de producción verde
- [ ] Suite de tests (unit + e2e Playwright) verde
- [ ] Auditoría SSR + credenciales hecha manualmente, resultado documentado
- [ ] Auditoría de route params hecha, sin breakage sin mitigar

## Tiempo estimado

Effort medio — mayormente mecánico vía `ng update` con migraciones automáticas; el trabajo real no automatizable son las dos auditorías dirigidas (SSR/credenciales, route params).

## Housekeeping

Brief 345 (F1) tiene los 3 criterios de cierre marcados `[x]` pero sigue en `chats/running/` de este worktree — mover a `closed/` como parte del `/end` de este brief (o antes, si se prefiere cerrarlo de forma independiente).

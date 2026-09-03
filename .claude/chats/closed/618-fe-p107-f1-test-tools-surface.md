# 618 — P107 F1 FE: superficie "herramientas de prueba"

> **Repos afectados**: `educa-web`
> **Plan**: `educa-coord/plans/xrepo-107-entorno-dev-datos-prueba.md` (Fase F1)
> **Creado**: 2026-09-03 · **Estado**: 🟢 libre — sin bloqueos.
> **MODO SUGERIDO**: `/design` (definir dónde cuelga la ruta/menú) → `/execute`
> **exclusive**: `false`
> **modules**: `dev-tooling`
> **touches**:
>   - `educa-web`: nueva sección/ruta visible solo en desarrollo, reusa el patrón ya existente `environment.debug` + `isDevMode() && !environment.production` (precedentes: `feature-flags.facade.ts:44-46`, `request-trace.facade.ts:65-67`, `profesor-horarios.component.ts:90-91` — panel de debug de horario sync)

## OBJETIVO

Construir el andamiaje de la sección "herramientas de prueba" — visible solo en desarrollo, punto de entrada donde F2 (trigger de simulación CrossChex+correo) y F3/F4 (bulk create/delete, briefs futuros) van a insertar sus pantallas. Este brief no implementa ninguna acción real, solo el shell/navegación/gate de visibilidad.

## ALCANCE

- Nuevo flag en el namespace `environment.debug` (o el que se decida en `/design`) que gatea la sección completa.
- Punto de entrada navegable (ruta/menú) visible solo cuando el flag está activo y `isDevMode() && !environment.production` — mismo patrón que el panel de debug de horario sync (`profesor-horarios.component.ts:90-91`).
- Estructura vacía/placeholder donde F2/F3/F4 van a insertar sus componentes.

## FUERA DE ALCANCE

- Cualquier trigger real de simulación — eso es F2 (brief futuro).
- Cualquier UI de bulk-create/delete — eso es F3/F4 (briefs futuros).
- Cambios al FE fuera del namespace de test tools.

## VALIDACIÓN FINAL

- Build + tests unit en verde.
- Confirmado que la sección no aparece en un build con `environment.production = true`.

## CRITERIOS DE CIERRE

- [x] Sección/ruta creada y gateada correctamente (invisible fuera de dev).
- [x] Confirmado invisible en build de producción.
- [x] `educa-coord/plans/xrepo-107-entorno-dev-datos-prueba.md` actualizado (F1 FE marcado).
- [x] `educa-web/.claude/plan/maestro.md` actualizado (fila `xP107`).
- [x] Brief movido `open/` → `closed/`.

## RESULTADO (2026-09-03)

Diseño ajustado en vivo respecto al texto original del brief — el precedente citado
(`profesor-horarios.component.ts:90-91`) usa solo `environment.debug.horarioSync`, sin
`isDevMode()`: ese runtime check está roto en Angular 22 + esbuild (`ngDevMode` no se
setea, ver `reference/debug.md`), así que gatear con `isDevMode()` hubiera dejado la
sección invisible incluso en dev. Gate final: solo `environment.debug.testTools`
(swap build-time vía `fileReplacements`).

El sistema de menú por capability (`intranet-menu.config.ts`) requiere un `CapabilityCode`
cerrado generado del backend — no encaja para un flag puramente dev-only sin rol/permiso
real. Se optó por una entrada standalone en el header de intranet (`TestToolsNavLinkComponent`,
extraído a componente propio porque `intranet-layout.component.ts` ya estaba al límite de
300 líneas — con el agregado cruzó por 1 línea, resuelto con el escape hatch documentado
del proyecto, `eslint-disable max-lines` justificado).

Archivos: `environment.{ts,development.ts,capacitor.ts}` (+1 flag c/u), `intranet.routes.ts`
(+ruta condicional), `pages/cross-role/test-tools/` (shell nuevo), `intranet-layout/components/test-tools-nav-link/`
(componente nuevo) + 2 líneas en `intranet-layout.component.{ts,html}`.

Validación: lint ✅ · build prod ✅ · 2533 tests unit + 10 del layout ✅ · confirmado que
`herramientas-prueba` no aparece en `main-*.js` de producción (mismo comportamiento que
`campusNavigation`, también `false` en prod — el chunk lazy queda huérfano en `dist/`, no
referenciado, no es una regresión).

## COMMIT MESSAGE sugerido

```
feat(dev): add test tools surface skeleton (P107 F1 FE)
```

## CIERRE

Al cerrar, avisar que F1 BE (brief `Educa.API/.claude/chats/open/617-be-p107-f1-test-mode-flag.md`) puede ir en paralelo si no cerró ya — no depende de este brief. F2 y F3 quedan desbloqueadas para diseñarse recién cuando F1 BE **y** F1 FE estén cerrados.

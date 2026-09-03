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

- [ ] Sección/ruta creada y gateada correctamente (invisible fuera de dev).
- [ ] Confirmado invisible en build de producción.
- [ ] `educa-coord/plans/xrepo-107-entorno-dev-datos-prueba.md` actualizado (F1 FE marcado).
- [ ] `educa-web/.claude/plan/maestro.md` actualizado (fila `xP107`).
- [ ] Brief movido `open/` → `closed/`.

## COMMIT MESSAGE sugerido

```
feat(dev): add test tools surface skeleton (P107 F1 FE)
```

## CIERRE

Al cerrar, avisar que F1 BE (brief `Educa.API/.claude/chats/open/617-be-p107-f1-test-mode-flag.md`) puede ir en paralelo si no cerró ya — no depende de este brief. F2 y F3 quedan desbloqueadas para diseñarse recién cuando F1 BE **y** F1 FE estén cerrados.

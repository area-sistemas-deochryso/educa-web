# 428 — P84 F6: unificación de navbar / indicador de sección académica activa

> **Repos afectados**: `educa-web`.
> **Plan**: [`educa-coord/plans/xrepo-84-orientacion-flujo-academico.md`](../../../../educa-coord/plans/xrepo-84-orientacion-flujo-academico.md) — Fase F6 (`depends_on: []`, parallel sibling de F1/F2/F4). Fase de menor riesgo del plan, candidata a "victoria rápida".
> **Creado**: 2026-07-10 · **Estado**: cerrado en este worktree (`428-p84-f6-unificacion-navbar`).
> **MODO SUGERIDO**: `/execute`.
> **exclusive**: `false` — parallel sibling de 425/426/427, sin overlap de archivos esperado.
> **modules**: `academic`, `schedules`, `users`.
> **touches**:
>   - `educa-web`: `features/intranet/shared/config/intranet-menu.config.ts` (fuente única del menú admin — confirmado en ejecución), `features/intranet/shared/components/layout/intranet-layout/*`.

## Scope

### educa-web

- Corregir la inconsistencia documentada en QA (brief 424, punto 3): en `/admin/cursos` y `/admin/horarios` el navbar muestra "Académico / Administración / Mi Aula"; en `/admin/usuarios` muestra "Sistema / Permisos / Gestión / Herramientas" — sin ningún indicador de "dónde estoy dentro del flujo de configuración académica".
- Unificar la estructura de menú entre estas 3 pantallas, o como mínimo agregar un indicador visible de sección académica activa. La config vive en un único archivo (`intranet-menu.config.ts`), no duplicada por pantalla — el fix es de config, no de refactor estructural.

## Pre-work

- Leer `features/intranet/shared/config/intranet-menu.config.ts` actual para confirmar por qué diverge `/admin/usuarios` del resto.
- Leer `plans/xrepo-84-orientacion-flujo-academico.md` — decisión "Navbar inconsistente".

## Out of scope

- Rediseño visual del navbar más allá de esta inconsistencia puntual.
- Cambios a permisos/capabilities que determinan qué ítems de menú ve cada rol (solo la estructura/agrupación, no el gate de acceso).

## Decisión de ejecución

Investigación confirmó que `/admin/usuarios` está deliberadamente bajo el módulo `sistema` (no `academico`) en `module-registry.ts` — es una clasificación de dominio correcta ("Usuarios" es configuración de plataforma, no contenido académico), no un bug de agrupación. Reclasificar el módulo hubiera violado el "out of scope" (curioseo estructural) y el modelado de dominio ya documentado.

En cambio, se implementó el mínimo indicador pedido por el brief: un **breadcrumb de sección activa** (`Módulo › Grupo › Página`, ej. `Sistema › Gestión › Usuarios` o `Académico › Administración › Cursos`) derivado de la única fuente de config (`MENU_ITEMS`), visible en las 3 pantallas del flujo y en cualquier otra pantalla de la intranet. No se tocó agrupación, permisos ni capabilities.

Cambios:
- `intranet-menu.config.ts`: nuevo helper `findMenuItemDefByUrl(url)` — matchea el item de menú activo por ruta más específica.
- `intranet-layout.component.ts`: signal `breadcrumb` computado desde el módulo activo + `findMenuItemDefByUrl`.
- `intranet-layout.component.html/.scss`: render del breadcrumb en header desktop y mobile.

## Criterio de cierre

- [x] FE: lint + build OK (`bun run lint`: sin errores; `bun run build`: build de producción completo sin errores).
- [ ] Verificación visual (Playwright si disponible) de que `/admin/cursos`, `/admin/horarios`, `/admin/usuarios` muestran menú consistente o indicador de sección activa. — **No ejecutado**: sin herramienta de browser disponible en este agente. Pendiente de verificación visual manual antes de dar por cerrado el brief a nivel producto.

## Tiempo estimado

~20-30 min.

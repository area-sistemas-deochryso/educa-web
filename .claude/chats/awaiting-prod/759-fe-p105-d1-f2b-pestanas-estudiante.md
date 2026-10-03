# 759 — FE: P105 D1 F2b — Pestañas Calificaciones e Información del hub (estudiante)

> **Repo destino**: `educa-web` · **Plan**: 105 · **Fase**: F2b · **Creado**: 2026-10-03
> **Origen**: brief 758 (F2 profesor, branch `chat/758-…`, commit "P105 D1 F2"; integrar con `/wt-merge` antes de arrancar)
> **MODO SUGERIDO**: `/design` corto → `/execute` → `/validate`
> **exclusive**: `false` · **isolation**: `worktree`
> **touches**: `intranet.routes.ts` (hijas estudiante), `shared/components/curso-hub-tabs` (sumar `'estudiante'` a `roles`), `pages/estudiante/cursos/curso-hub/**`, `EstudianteCursosFacade` (solo añadir).

## OBJETIVO
Pestañas **Mis Calificaciones** (`app-notas-curso-card`, carga perezosa, refresco) e **Información** (contadores + resúmenes de archivos/tareas) para el estudiante, como rutas hijas con URL propia, con el mismo patrón de carga que 758.

## DECISIONES VALIDADAS
- El **shell** es dueño de carga y reset (patrón 758): mover `loadContenidoForHub`/`resetForHub` de `estudiante-curso-hub-contenido.component.ts` al `EstudianteCursoHubComponent`; las pestañas solo leen.
- Modales intactos hasta F6; scss del modal referenciado por `styleUrl`.
- `estudiante/` no importa de `profesor/` (lint de capas): tipos vía `CursoHubContextService`.

## LO QUE DEJÓ 758
- `CURSO_HUB_TABS` con campo `roles` + `cursoHubTabsFor(rol)`; `CursoHubContextService.tabTarget(rol, tab)`; `buildCursoHubTabLink`.
- Profesor: `profesor-curso-hub.component.ts` (efecto de carga + `inject(DestroyRef).onDestroy` — no declarar `destroyRef` propio, choca con la base), `CursoHubCalificacionesLoader` (ensure/refresh/reset), facades `…ForHub`.
- Specs de referencia: `profesor-curso-hub.component.spec.ts` (dueño de carga), `profesor-curso-hub-informacion.component.spec.ts`.

## CRITERIOS
1. Rutas hijas `calificaciones` e `informacion` del estudiante; deep link funciona tras recarga; cambiar de pestaña/franja no deja estado ajeno.
2. Botones "Ir a calificaciones" navegan a la pestaña conservando `horarioId`.
3. Salir del hub limpia stores; abrir el hub no abre modales.
4. `lint`, `build`, `test` en verde. Verificar en vivo con "ver como" si no hay estudiante de prueba en par multi-franja.

## PENDIENTES HEREDADOS
- Verificación en vivo de 757 y 758 (en `awaiting-prod/`).
- Push a `main` = deploy a prod: no sin autorización.

---

> **Validación prod**: ⏳ pendiente desde 2026-10-03

## CIERRE (2026-10-03)
- Shell estudiante dueño de carga/reset; facade/store limpian y cancelan notas (`notasSub`, `clearMisNotas`).
- Pestañas `calificaciones` e `informacion` con rutas hijas; `roles` de tabs suma `estudiante`.
- Botón "Ir a calificaciones" en Información conserva `horarioId`.
- Validación local: lint ✅ (0 errores) · build ✅ · test ✅ (386/386 en estudiante + shared).
- **Pendiente**: verificación en vivo con "ver como" (par multi-franja): deep link a `…/calificaciones`, cambio de franja sin notas ajenas; revisar estilo de `.stat-box.calificaciones` (sin variante en el scss del modal).

## ⚠️ Docs flagged for review (skipped)
<!-- doc-watch-skipped -->
| Doc | Disparador |
|---|---|
| reference/state-management.md | `estudiante-cursos.store.ts`, `estudiante-cursos.facade.ts` |

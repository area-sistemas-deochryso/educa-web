---
exclusive: false
isolation: worktree
touches: [src/app/features/intranet/pages/admin/schedules/]
hot-paths: []
---

> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: — · **Chat**: — · **Fase**: — · **Creado**: 2026-07-10 · **Estado**: ⏳ pendiente.

---

# Eliminar `horarios-filters.component.ts` — código muerto

## OBJETIVO

`src/app/features/intranet/pages/admin/schedules/components/horarios-filters/horarios-filters.component.ts` no lo importa ni usa ningún otro archivo del módulo. El filtro de estado (Activos/Inactivos) y el nuevo filtro de completitud (Sin profesor/Sin estudiantes, agregado 2026-07-10) están implementados **inline** directamente en `horarios.component.html` con `p-select`, no vía este componente. Confirmar que es código 100% muerto y eliminarlo.

## MODO SUGERIDO

Arrancar con `/investigate` (confirmar que nada lo referencia, incluyendo tests/specs) → `/execute` (borrar) → `/validate` → cierre. Blast radius bajo — si la investigación confirma que está muerto, es un chat corto.

## PRE-WORK OBLIGATORIO

Ninguno más allá de la búsqueda de referencias.

## ALCANCE

- Buscar TODAS las referencias a `SchedulesFiltersComponent` / `app-schedules-filters` / el path `horarios-filters` en todo `src/` (no solo `schedules/`), por si algo fuera del módulo lo importa.
- Si confirma que está muerto: borrar la carpeta `components/horarios-filters/` completa (`.ts`, `.html`, `.scss`, y spec si existe).
- Revisar el barrel `services/index.ts` o cualquier `index.ts` de `components/` que pueda re-exportarlo.

## TESTS MÍNIMOS

- `bun run build` sigue compilando después de borrar (confirma que nada lo importaba en runtime, no solo que no aparecía en el grep).
- `bun run lint` sin nuevos errores de imports rotos.

## REGLAS OBLIGATORIAS

- No borrar sin confirmar cero referencias primero — este brief asume que está muerto en base a una búsqueda del 2026-07-10, pero hay que re-verificar en el chat que lo ejecute (el código puede haber cambiado).

## IMPLEMENTATION DETAIL (ADR-0006)

- **Cómo se detectó**: durante la sesión del 2026-07-10 se armó el filtro de completitud "Sin profesor / Sin estudiantes" agregando un segundo `p-select` inline en `horarios.component.html`, junto al `p-select` de estado que ya existía inline. Al investigar el patrón de filtros existente se encontró que había un componente dedicado (`horarios-filters.component.ts`) con esa misma lógica (`estadoOptions` en líneas ~48-51 de ese archivo), pero **nada lo importa** — ni `horarios.component.ts` ni ningún otro archivo del módulo.
- **Búsqueda que lo confirmó** (al momento de este brief): `grep -r "SchedulesFiltersComponent\|app-schedules-filters" src/app/features/intranet/pages/admin/schedules/` solo devuelve el propio archivo del componente.

## APRENDIZAJES TRANSFERIBLES (del chat actual)

- El módulo `schedules/` tiene al menos otro caso de posible duplicación/dead-code no confirmado: `horarios.store.ts` líneas ~102-104 tiene un `horariosSinProfesor` computado directo en el store, separado del que se calcula en `horarios-data.facade.ts` vía `calculateEstadisticas()` (el que realmente usa el template). Si este chat tiene tiempo de sobra después de resolver `horarios-filters.component.ts`, vale la pena mirarlo también — pero es un hallazgo aparte, no asumir que es lo mismo sin investigar.

## FUERA DE ALCANCE

- No tocar el filtro inline que sí está en uso (el de `horarios.component.html`).
- No es este brief el que investiga el `horariosSinProfesor` duplicado en `horarios.store.ts` — solo se menciona como nota, no como tarea.

## VALIDACIÓN FINAL

- `bun run lint` — 0 errores.
- `bun run build` — sin errores (confirma que no quedó ningún import roto).
- `bun run test` — sin nuevas fallas.

## CRITERIOS DE CIERRE

- [ ] Validación final pasa.
- [ ] Brief movido `running/` → `closed/`.
- [ ] Commit final único que incluye el borrado + move del brief en el mismo commit.

## COMMIT MESSAGE sugerido

```
chore(schedules): remove dead "horarios-filters" component

Unused since the estado/completitud filters were implemented inline
in horarios.component.html. Confirmed zero references before removal.
```

## CIERRE

Nada especial — chat corto y autocontenido.

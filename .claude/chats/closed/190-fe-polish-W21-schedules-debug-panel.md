# Brief 190 — Polish W21 · Gate/remove debug panel en `profesor/schedules`

> **Branch**: `main`.
> **Plan**: [`plan/intranet-fe-polish-W21.md`](../../plan/intranet-fe-polish-W21.md) · F4 (brief derivado del audit F1).
> **Task base**: [`tasks/polish-W21-schedules-debug-panel.md`](../../tasks/polish-W21-schedules-debug-panel.md).
> **Creado**: 2026-05-18 · **Chat**: 1 · **Estado**: ⏳ pendiente arrancar.

---

## OBJETIVO

Resolver el panel debug de sync server time/countdown/drift en `profesor/schedules` que vive en `main` con hex literales hardcoded. Decisión A (gate por env flag + tokens) vs B (eliminar y migrar lógica a service sin UI).

## MODO SUGERIDO

Arrancar con `/ask`. Flujo: `/ask` → `/execute` → `/validate` → cierre. Razón: hay decisión A/B sobre si el panel sigue siendo útil — confirmar con el usuario antes de tocar.

## PRE-WORK OBLIGATORIO

- `rules/feature-flags.md` (patrón de gate por entorno) — si se elige Opción A.
- `rules/design-system.md` §8 (tokens) — si se elige Opción A.

## ALCANCE

| Archivo | Líneas | Cambio |
|---|---|---|
| `pages/profesor/schedules/profesor-horarios.component.html` | 19-50 | Gate visual con `@if (isDev())` o eliminar markup |
| `pages/profesor/schedules/profesor-horarios.component.scss` | 46-73 | Reemplazar hex (`#422006`, `#431407`, `#1e1e2e`, `#cdd6f4`, `#45475a`, `#f9e2af`, `#89b4fa`, `#ef4444`) por tokens, o eliminar reglas si va Opción B |
| `pages/profesor/schedules/profesor-horarios.component.ts` | TBD | Agregar `isDev` signal si Opción A; o mover lógica de sync/drift a service en `@core/services/clock/` si Opción B |

## DECISIÓN A/B (preguntar al usuario)

- **Opción A** — Mantener el panel, gatearlo por `!environment.production` (o `environment.debug?.horarioSync`), reemplazar hex por tokens del design-system.
- **Opción B** — Eliminar el panel. La lógica de drift detection se mantiene como service que loguea a consola en dev; sin UI visible.

## VALIDACIÓN FINAL

- 0 hex literales en `profesor-horarios.component.scss` (o panel removido).
- `npm run lint` limpio.
- `npm run build` limpio (verificar que el panel solo renderiza en dev si va A).
- Smoke manual en dev y en preview prod build (panel visible en dev, invisible en prod).

## REGLAS OBLIGATORIAS

- `rules/feature-flags.md` — uso correcto del flag.
- `rules/design-system.md` §8 — tokens (si Opción A).

## CRITERIOS DE CIERRE

- [ ] Decisión A/B confirmada por el usuario.
- [ ] Panel oculto en prod (Opción A) o removido (Opción B).
- [ ] 0 hex literales residuales en el archivo.
- [ ] Lint + build limpios.
- [ ] Brief movido `running/` → `closed/`.
- [ ] Commit final único con código + move + update maestro.

## COMMIT MESSAGE sugerido

- Opción A: `refactor(intranet/schedules): gate debug panel by env flag + tokens (polish W21)`
- Opción B: `refactor(intranet/schedules): remove debug panel, keep drift detection as service (polish W21)`

## CIERRE

Confirmar decisión A/B antes del commit y feedback final.

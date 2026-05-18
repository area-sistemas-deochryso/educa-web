<!-- created: 2026-05-18 -->

# polish-W21-tokens-colors

> **Origen**: F1 audit del plan [`intranet-fe-polish-W21.md`](../plan/intranet-fe-polish-W21.md), 2026-05-18.
> **Severidad**: 🔴 (drift sistémico vs `rules/design-system.md` §7-8).

## Scope

Reemplazar hex literales por tokens del design-system (CSS variables `--blue-800`, `--red-600`, `--green-500`, etc.) en archivos `.scss`/`.ts` bajo `features/intranet/pages/`.

## Hallazgos concretos

| Archivo | Líneas | Hex encontrados |
|---|---|---|
| `pages/estudiante/classrooms/components/student-attendance-tab.component.scss` | 52, 58, 70, 79-82 | `#059669`, `#d97706`, `#2563eb`, `#34d399`, etc. |
| `pages/estudiante/schedules/estudiante-horarios.component.ts` | 39-40 | `#3B82F6`, `#10B981`, `#F59E0B` (paleta inline de bloques de horario) |
| `pages/estudiante/schedules/estudiante-horarios.component.scss` | 217-228 | `#eab308`, `#f97316`, `#ef4444`, `#ffffff`, `#422006`, `#431407` |
| `pages/cross-role/home-component/home.component.scss` | 45 | `#d97706` (debería ser `var(--yellow-500)` o equivalente warning) |
| `pages/profesor/schedules/profesor-horarios.component.scss` | 46-73 | hex del debug panel (cubierto por task `polish-W21-schedules-debug-panel.md`) |
| `pages/profesor/cursos/components/curso-content-readonly-dialog.component.scss` | TBD | posible hex literal residual (verificar al ejecutar) |

## Criterio de cierre

- 0 hex literales en los archivos listados salvo excepciones documentadas (Canvas API, Sass color functions).
- Reemplazos consistentes con la tabla de mapeo canónico de `rules/design-system.md` §8.
- Grep final `grep -rn "#[0-9a-fA-F]\{3,6\}" src/app/features/intranet/pages/{profesor,estudiante,cross-role}` retorna 0 hits (excluyendo comentarios y excepciones marcadas con `// motivo`).

## Out-of-scope

- `pages/admin/*` (ya migrado en Plan 20 F4).
- Excepciones legítimas existentes (campus minimap Canvas, mensajería avatar palettes).

## Pre-work

Leer `rules/design-system.md` §7-8 para el mapeo canónico antes de empezar.

## Estimación

Chico (~1-2h). Reemplazo mecánico con grep + verificación visual de cada componente.

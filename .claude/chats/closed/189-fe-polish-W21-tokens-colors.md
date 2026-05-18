# Brief 189 — Polish W21 · Tokens de color (reemplazar hex literales)

> **Branch**: `main`.
> **Plan**: [`plan/intranet-fe-polish-W21.md`](../../plan/intranet-fe-polish-W21.md) · F4 (brief derivado del audit F1).
> **Task base**: [`tasks/polish-W21-tokens-colors.md`](../../tasks/polish-W21-tokens-colors.md).
> **Creado**: 2026-05-18 · **Chat**: 1 · **Estado**: ⏳ pendiente arrancar.

---

## OBJETIVO

Reemplazar hex literales por tokens (`var(--blue-800)`, `var(--red-600)`, `var(--green-500)`, …) en pages del rol estudiante + cross-role/home + profesor/schedules, alineado con `rules/design-system.md` §7-8. Cierra drift 🔴 detectado en F1.

## MODO SUGERIDO

Arrancar con `/execute`. Flujo: `/execute` → `/validate` → cierre. Razón: reemplazo mecánico con mapa canónico ya documentado; sin decisiones de diseño.

## PRE-WORK OBLIGATORIO

- `rules/design-system.md` §7 (overrides globales) y §8 (mapa canónico de tokens).

## ALCANCE

| Archivo | Líneas aprox | Hex a reemplazar |
|---|---|---|
| `pages/estudiante/classrooms/components/student-attendance-tab.component.scss` | 52, 58, 70, 79-82 | `#059669`, `#d97706`, `#2563eb`, `#34d399`, etc. |
| `pages/estudiante/schedules/estudiante-horarios.component.ts` | 39-40 | `#3B82F6`, `#10B981`, `#F59E0B` (paleta inline de bloques) |
| `pages/estudiante/schedules/estudiante-horarios.component.scss` | 217-228 | `#eab308`, `#f97316`, `#ef4444`, `#ffffff`, `#422006`, `#431407` |
| `pages/cross-role/home-component/home.component.scss` | 45 | `#d97706` |
| `pages/profesor/cursos/components/curso-content-readonly-dialog.component.scss` | TBD | Verificar al ejecutar |

> **Out-of-scope**: el debug panel de `profesor/schedules` (hex 46-73) — está cubierto por el brief 190.
> **Out-of-scope**: excepciones legítimas (Canvas API, Sass color functions, avatar palettes).

## VALIDACIÓN FINAL

- `grep -rEn "#[0-9a-fA-F]{3,6}" src/app/features/intranet/pages/{profesor,estudiante,cross-role}` retorna 0 hits (excluyendo excepciones marcadas con `// motivo`).
- `npm run lint` limpio.
- `npm run build` limpio (chequeo visual rápido de las pages afectadas — tokens del tema renderizan bien en light mode).

## REGLAS OBLIGATORIAS

- `rules/design-system.md` §8 — mapa canónico de tokens.
- `rules/a11y.md` §"Azul sobre fondo claro" — usar `#1e40af` / `var(--blue-800)`, nunca celeste/primary del tema.

## CRITERIOS DE CIERRE

- [ ] 0 hex literales en los archivos listados (salvo excepciones documentadas).
- [ ] Lint + build limpios.
- [ ] Brief movido `running/` → `closed/`.
- [ ] Commit final único con código + move + update maestro.

## COMMIT MESSAGE sugerido

`refactor(intranet): replace hex literals with design-system tokens (polish W21)`

## CIERRE

Confirmar al usuario el render visual de los componentes tocados (light mode) antes de commit final.

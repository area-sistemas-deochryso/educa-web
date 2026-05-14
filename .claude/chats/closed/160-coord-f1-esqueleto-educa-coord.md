# 160 — Coord F1: crear esqueleto de `educa-coord/`

> **Repo destino**: nuevo repo `educa-coord/` (sibling de `educa-web/` y `Educa.API/`)
> **Plan**: [migracion-arquitectura-claude.md §F1](../../plan/migracion-arquitectura-claude.md)
> **Creado**: 2026-05-14 · **Estado**: ✅ trabajo completo, pendiente remote+push manual.

## Ejecutado (2026-05-14)

- `C:/Users/Asus Ryzen 9/EducaWeb/educa-coord/` creado.
- 8 carpetas top-level: `principles/`, `invariants/`, `contracts/`, `glossary/`, `fitness/`, `decisions/`, `plans/`, `chats/{open,running,waiting,awaiting-prod,closed}/`.
- 17 subcarpetas en `principles/` (vacías, con `.gitkeep`).
- `README.md`, `COORD.md`, `principles/README.md` escritos.
- `git init -b main` + 2 commits (`e9328ba` skeleton, `4da78ce` gitkeeps).
- Decisiones §4 documentadas en `COORD.md` §4: repo aparte, prefijo `xrepo-NNN`, awaiting-prod en coord, business-rules borrado inmediato en F2.

## Pendiente (manual del usuario)

- Crear remote en GitHub (`gh repo create francoandreDev/educa-coord --private` o equivalente) y `git push -u origin main`. No lo hago automático para no asumir cuenta/visibilidad sin confirmación.
> **MODO SUGERIDO**: `/execute`

## Scope

Crear la carpeta hermana sin tocar FE ni BE todavía.

1. `mkdir C:/Users/Asus Ryzen 9/EducaWeb/educa-coord/` y sus subcarpetas:
   - `principles/{01-function-objective..17-heuristics}/` (17 subcarpetas vacías).
   - `invariants/`, `contracts/`, `glossary/`, `fitness/`, `decisions/`, `plans/`, `chats/{open,running,waiting,closed}/`.
2. Escribir `educa-coord/README.md` con el mapa de §2.1 del plan.
3. Escribir `educa-coord/COORD.md` con el protocolo de §2.2 + §2.4 (cero `@import` cross-repo, delegación vía brief, una fuente de verdad por concepto).
4. Escribir `educa-coord/principles/README.md` con la tabla de 17 elementos (§2.1.2 del plan) — solo índice, sin contenido.
5. `git init` + commit inicial + crear remote nuevo (decisión confirmada: repo independiente).
6. Decidir y documentar en `COORD.md` las respuestas a §4 del plan (numeración planes, awaiting-prod cross-repo, deprecation de business-rules).

## Out of scope

- Mover archivos desde `educa-web/` o `Educa.API/`.
- Poblar `claude.md` / `human.md` de los principios → F1b.
- Tocar los `.claude/CLAUDE.md` de cada repo → F4/F5.

## Criterio de cierre

- `ls educa-coord/` muestra las 8 carpetas top-level + README + COORD.
- `ls educa-coord/principles/` muestra 17 subcarpetas + README.
- `git -C educa-coord/ log --oneline` muestra ≥1 commit.
- `educa-coord/COORD.md` responde las 4 decisiones de §4.

## Tiempo estimado

~30 min.

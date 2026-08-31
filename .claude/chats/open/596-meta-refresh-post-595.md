> **Repo destino**: `educa-web`, se aplica sobre `main` — **no** sobre el worktree `p70-angular22-migration`.
> **Origen**: meta-refresh generado al cerrar 595 (P70 F3, Angular 22 upgrade).
> **Depende de**: merge de la branch `chat/p70-angular22-migration` a `main` (vía `/wt-merge` cuando F3-F6 estén listos, o antes si se decide mergear F3 solo).

# 596 — Meta-refresh post-595: stack version strings

## Contexto

El upgrade a Angular 22 (F3, commit `1441ab98`) vive hoy solo en el worktree dedicado — `main` sigue en Angular 21 hasta que se mergee. Por eso este item **no se ejecuta ahora**: recién tiene sentido cuando la branch del worktree llegue a `main` (mergeada, no solo commiteada).

## Items

- [ ] `.claude/CLAUDE.md` — línea 1 del stack dice "Angular 21 para gestion educativa" y más abajo "Stack: Angular 21, TypeScript 5.9, ...". Actualizar a "Angular 22" / "TypeScript 6.0" recién cuando el merge a `main` esté hecho.
- [ ] Grep rápido de "Angular 21" en `.claude/` tras el merge — 9 archivos lo mencionan hoy (`tasks/design-patterns-frontend.md`, `reference/debug.md`, `plans/attendance-redesign/01-...md`, `agents/code-reviewer.md`, `agents/README.md`, más los 3 chats de 345/588 que son historia y no necesitan tocarse). Revisar cuáles son menciones vivas (afectan comportamiento actual) vs. históricas (quedan como están).

## Fuera de alcance

- No tocar nada del worktree — este brief es 100% sobre `main` post-merge.

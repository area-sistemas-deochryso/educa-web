> **Repo destino**: `educa-web`, se aplica sobre `main` — **no** sobre el worktree `p70-angular22-migration`.
> **Origen**: meta-refresh generado al cerrar 595 (P70 F3, Angular 22 upgrade).
> **Depende de**: merge de la branch `chat/p70-angular22-migration` a `main` (vía `/wt-merge` cuando F3-F6 estén listos, o antes si se decide mergear F3 solo).

# 596 — Meta-refresh post-595: stack version strings

## Contexto

El upgrade a Angular 22 (F3, commit `1441ab98`) vive hoy solo en el worktree dedicado — `main` sigue en Angular 21 hasta que se mergee. Por eso este item **no se ejecuta ahora**: recién tiene sentido cuando la branch del worktree llegue a `main` (mergeada, no solo commiteada).

## Items

- [x] `.claude/CLAUDE.md` — ya estaba en "Angular 22" / "TypeScript 6.0" al arrancar este chat (el merge de `chat/p70-angular22-migration` a `main` trajo el update).
- [x] Grep de "Angular 21" en `.claude/` tras el merge — actualizados los 5 docs vivos: `agents/code-reviewer.md`, `agents/README.md`, `reference/debug.md` (quirk de esbuild sigue aplicando en 22, no era específico de 21), `reference/design-patterns-frontend.md`, `plans/attendance-redesign/01-attendance-ux-redesign.md`. Quedan sin tocar (histórico, correcto): `chats/closed/345-*` (×2) y `chats/closed/588-*`.

## Fuera de alcance

- No tocar nada del worktree — este brief es 100% sobre `main` post-merge.

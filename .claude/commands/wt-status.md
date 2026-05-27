---
description: Worktree Status — estado rápido del worktree actual (branch, brief, heartbeat, commits ahead).
---

# /wt-status

> Vista rápida del worktree en el que estás parado. Más ligero que `/dashboard` — solo lee el manifest local.

## Detección

1. Resolver `$MAIN_REPO` vía `git rev-parse --git-common-dir`.
2. Leer `$MAIN_REPO/.claude/.locks/worktrees.json`.
3. Buscar la entry cuya `branch` matchea `git branch --show-current`.

Si no hay match → "No estás en un worktree registrado."
Si no hay manifest → "No hay manifest — no hay worktrees activos."
Si la entry matchea pero el `path` no existe en disco → reportar como huérfana:

```text
⚠️ Worktree huérfano: entry en manifest apunta a path inexistente.
Usá `/wt-clean` para deregistrar.
```

## Output

```text
## Worktree Status

| Campo | Valor |
|---|---|
| Branch | `chat/045-signals-migration` |
| Brief | `045-signals.md` |
| Started | 2026-05-20 |
| Heartbeat | 2026-05-27 14:32 |
| Commits ahead | 3 ahead of main |
| Touched | `src/app/signals/`, `src/app/shared/` |
```

### Alertas

- Heartbeat > 7d: `⚠️ stale — actualizar con /go o cerrar con /end`
- Heartbeat > 14d: `🔴 very stale — consider /wt-clean`
- Branch sin commits ahead: `ℹ️ sin cambios respecto a trunk`

## Argumentos

- `/wt-status` — worktree actual.
- `/wt-status --all` — equivalente a `/dashboard --branches` (todas las entries del manifest local).

## Referencias

- [`wt-new.md`](wt-new.md) — crear worktree.
- [`wt-merge.md`](wt-merge.md) — mergear worktree.
- [`wt-clean.md`](wt-clean.md) — limpiar worktree.
- [`dashboard.md`](dashboard.md) — vista completa (cross-repo en coord).

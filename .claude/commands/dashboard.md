---
description: Modo Dashboard — cruce automático de /queue + /progress + worktrees para análisis cross-signal del proyecto.
---

# /dashboard (override de educa-web)

> Política universal: ver `~/.claude/commands/dashboard.md`.

## Específico de educa-web

### Secciones del dashboard

El dashboard cruza señales de `/queue`, `/progress` y el manifest de worktrees para dar una vista unificada.

#### 1. Active worktrees

Si `.claude/.locks/worktrees.json` existe y tiene entries:

```
### 🌳 Active worktrees (N)

| Chat | Branch | Brief | Plan | Phase | Age |
|---|---|---|---|---|---|
| NNN | `chat/<NNN>-<slug>` | `<briefRef>` | P<XX> | F<N> | Xd |
```

Si no hay worktrees activos, omitir la sección.

#### 2. Branch status

Para cada branch activa (main + worktrees):

```
### 🔀 Branch status

| Branch | Commits ahead | Last commit | Status |
|---|---|---|---|
| `main` | — | YYYY-MM-DD | active |
| `chat/<NNN>-<slug>` | +N | YYYY-MM-DD | worktree |
```

Calcular con `git rev-list --count main..<branch>` y `git log -1 --format=%ai <branch>`.

#### 3. Queue snapshot (de /queue)

Top 3 pullable items (excluir lockeados por worktrees).

#### 4. Progress snapshot (de /progress)

Sparkline de últimas 4 semanas + top 3 churn subsystems.

### Auto-disparo

- No se auto-dispara. Correr manualmente cuando se quiera la vista cross-signal.

### Argumentos

- `/dashboard` — vista completa.
- `/dashboard --branches` — solo secciones 1 y 2 (worktrees + branches).

## Referencias locales

- [queue.md](queue.md) — cola priorizada.
- [progress.md](progress.md) — tendencia de actividad.
- [../plan/maestro.md](../plan/maestro.md) — cola del maestro.

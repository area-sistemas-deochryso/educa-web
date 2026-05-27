---
description: Modo Progress — reporte read-only de tendencia de commits, briefs/sem, churn, zonas muertas y top de cola del maestro.
---

# /progress (override de educa-web)

> Política universal: ver `~/.claude/commands/progress.md`.

## Específico de educa-web

### Sección extra: Cola del maestro

| Sección | Qué muestra | Cómo se calcula |
| --- | --- | --- |
| **Cola del maestro** | Top 5 items de "📋 Próximos chats" del [../plan/maestro.md](../plan/maestro.md) | Parse del archivo |

### Sin tabla de flujos

A diferencia de app-fgame, educa-web **no usa la convención `plans/<flow>/<step>.md`** — los planes son flat en [../plan/](../plan/). Por eso el reporte **no tiene** la sección "Flujos". Si en el futuro se quiere implementar, requiere convención nueva equivalente a [`flow-format.md`](https://github.com/...) (no existe acá hoy).

### Auto-disparo

- `/go` lo corre automáticamente al inicio.
- `/end` lo corre automáticamente al final del cierre.

### Argumentos extra

- `/progress --weeks 4` — ventana custom de 4 semanas (el script acepta `--weeks N`). Default 12.

### Multi-branch aggregation

Si hay worktrees activos (manifest en `.claude/.locks/worktrees.json`):

- **Sección extra: Active branches** — listar branches activas con commits ahead de main.
- Para cada branch `chat/<NNN>-<slug>`, reportar: `git rev-list --count main..<branch>` commits ahead.
- El sparkline de volumen general agrega commits de **todas** las branches activas, no solo main.

### Limitaciones específicas

- **Solo mide el repo `educa-web` (FE)**. El BE (`Educa.API/`) tiene su propia historia git, fuera del alcance de este reporte.
- **Sin tabla de flujos**: ver arriba.

## Referencias locales

- [../scripts/progress.sh](../scripts/progress.sh) — implementación.
- [triage.md](triage.md) — visión del estado de chats/tasks (complementaria).
- [../hooks/backlog-check.sh](../hooks/backlog-check.sh) — snapshot puntual de buckets en SessionStart.

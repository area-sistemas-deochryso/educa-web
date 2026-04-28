# backlog-hygiene (override de educa-web)

> Política universal: ver `~/.claude/rules/backlog-hygiene.md`.

## Buckets de este proyecto

```
.claude/tasks/                       → TODOs sin plan todavía (ideas crudas)
.claude/plan/maestro.md (cola)       → cola priorizada del proyecto
.claude/chats/open/                  → briefs materializados, listos para /start-chat
.claude/chats/running/               → chat activo (WIP real)
.claude/chats/waiting/               → bloqueado por externo (decisión, dependencia)
.claude/chats/troubles/              → bloqueado técnicamente (problema sin resolver)
.claude/chats/awaiting-prod/         → cerrado localmente, esperando validación post-deploy
.claude/chats/closed/                → cerrado y verificado (no tiene límite, es historia)
```

## Límites

| Backlog | Límite | Tipo | Edad crítica |
|---|---:|---|---|
| `chats/running/` | **1** | **duro** | — |
| `chats/open/` | 5 | blando | >30d |
| `chats/waiting/` | 3 | blando | >14d |
| `chats/troubles/` | 2 | blando | >7d |
| `chats/awaiting-prod/` | 8 | blando | >14d |
| `tasks/` | 8 | blando | >60d |
| `plan/maestro.md` cola (top-3) | 12 | blando | — |

## Excepción válida del límite duro de `running/`

Dos chats activos en repos distintos (FE + BE) trabajando en piezas independientes del mismo plan. En ese caso, ambos pueden estar en `running/` siempre que se confirme explícitamente que no chocan. Ver `~/.claude/rules/one-repo-one-chat.md`.

## Bucket extra: `chats/awaiting-prod/`

Briefs cerrados localmente (commit hecho, validación local pasó) que esperan **confirmación post-deploy del usuario**: smoke test browser, query SQL en prod, validación del jefe, telemetría observada, etc. Salen del bucket vía [`/verify <NNN>`](../commands/verify.md) — `✅` mueve a `closed/`, `❌ rollback` mueve a `running/` con motivo registrado.

**Razón del límite (8) y edad crítica (14d)**: validar un deploy debería tomar minutos a días, no semanas. Si un brief lleva >14d sin verificarse:

- El deploy nunca ocurrió (mover a `waiting/` — bloqueo externo real).
- El deploy ocurrió pero se olvidó verificar (forzar `/verify <NNN>` confirmando ✅ o detectar el bug).

Más de 8 simultáneamente es señal de que se está deployando rápido sin verificar.

## Comandos que enforzan

| Comando | Qué valida |
|---|---|
| [`/next-chat`](../commands/next-chat.md) | `open/` ≤ 5, items viejos en `waiting/troubles/` |
| [`/start-chat`](../commands/start-chat.md) | `running/` = 0 (gate duro) |
| [`/end`](../commands/end.md) | cola maestro ≤ 12 al cerrar; pregunta gate post-deploy |
| [`/verify`](../commands/verify.md) | brief existe en `awaiting-prod/` |
| [`/triage`](../commands/triage.md) | todo lo de arriba |
| Hook `backlog-check.sh` | Snapshot al abrir sesión + warning si fuera de política |

## Razón de los números

educa-web maneja **más planes en paralelo** que un repo single-plan típico (multi-plan, multi-repo FE+BE), por eso `open/` y la cola son más altos que en otros proyectos.

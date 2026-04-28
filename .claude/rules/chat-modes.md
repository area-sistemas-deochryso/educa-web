# chat-modes (override de educa-web)

> Política universal: ver `~/.claude/rules/chat-modes.md`.

## Específico de educa-web

### Comandos extra del proyecto

| Comando | Para qué |
|---|---|
| `/retomar` | Variante segura de `/go`: solo continúa lo que está en `running/`. No hace pull de cola. Útil para reabrir un chat sin riesgo de arrancar trabajo nuevo. |
| `/commit-front` | Commit del frontend (`educa-web/`). Invocado desde `/end` cuando el cambio toca solo FE. |
| `/commit-back` | Commit del backend (`Educa.API/`). Invocado desde `/end` cuando el cambio toca solo BE. |
| `/commit-local` | Commit local sin push (cuando no querés disparar deploy). |

### Multi-repo

`one-repo-one-chat` aplica: si una tarea cruza FE y BE, abrir chats separados o explicitar el scope cross-repo en el brief.

### Buckets adicionales

`chats/awaiting-prod/` para briefs que esperan validación post-deploy. No cuenta para los WIP limits estándar (ver [backlog-hygiene.md](backlog-hygiene.md)).

## Referencias locales

- [chat-shortcuts.md](chat-shortcuts.md) — atajos de palabras (`vamos`, `dale`, `fin`) → comandos.
- [backlog-hygiene.md](backlog-hygiene.md) — límites por bucket.
- [../commands/](../commands/) — implementación de cada modo.

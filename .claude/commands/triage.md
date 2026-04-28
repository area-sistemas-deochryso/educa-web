# triage (override de educa-web)

> Política universal: ver `~/.claude/commands/triage.md`.

## Buckets de este proyecto (7)

| Bucket | Límite | Tipo | Edad crítica |
| --- | ---: | --- | --- |
| `chats/running/` | 1 | duro | — |
| `chats/open/` | 5 | blando | >30d |
| `chats/waiting/` | 3 | blando | >14d |
| `chats/troubles/` | 2 | blando | >7d |
| `chats/awaiting-prod/` | 8 | blando | >14d |
| `tasks/` | 8 | blando | >60d |
| `plan/maestro.md` cola | 12 | blando | — |

Definidos en [rules/backlog-hygiene.md](../rules/backlog-hygiene.md).

## Output esperado

```markdown
## 🧹 Triage — YYYY-MM-DD

### chats/running/ (N / 1 duro) — ESTADO
(lista vacía si no hay, o item actual con días desde Creado)

### chats/open/ (N / 5 blando) — ESTADO
- `038-plan-31-chat-2-be-bounce-parser-imap-job.md` — 5d — OK
- `052-plan-30b-fe-entradas-con-correo-tab.md` — 0d — OK
- (si hay >5, marcar EXCEDIDO y listar acción)

### chats/waiting/ (N / 3 blando, crítico >14d)
...

### chats/troubles/ (N / 2 blando, crítico >7d)
...

### chats/awaiting-prod/ (N / 8 blando, crítico >14d)
- `045-plan-32-chat-4-fe-correlation-hub-pill-wiring.md` — 2d en bucket — OK
- (si >14d, marcar VIEJO con acción: forzar `/verify` o investigar por qué no hubo deploy)

### tasks/ (N / 8 blando, crítico >60d)
...

### plan/maestro.md cola (N / 12 blando)
...

## Resumen
- **M items necesitan acción**, **K buckets excedidos**.
- Recomendación global: <1 frase>.
```

## Comandos del lifecycle

- [`/start-chat`](start-chat.md) — promueve `open/` → `running/`.
- [`/end`](end.md) — cierra `running/` → `closed/` o `awaiting-prod/` según el gate post-deploy.
- [`/verify`](verify.md) — cierra el ciclo de un chat en `awaiting-prod/`.
- [`/block-chat`](block-chat.md) — pausa `running/` → `waiting/` o `troubles/`.
- [`/next-chat`](next-chat.md) — produce briefs en `open/`.

## Comando complementario

- `bash .claude/hooks/backlog-check.sh` (sin args) — output más compacto que el `/triage` completo. Útil para chequeo rápido sin generar un reporte largo.

## Referencias

- [rules/backlog-hygiene.md](../rules/backlog-hygiene.md) — límites, edades, acciones.
- [hooks/backlog-check.sh](../hooks/backlog-check.sh) — telemetría compacta.
- [plan/maestro.md](../plan/maestro.md) — cola priorizada.

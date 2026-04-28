---
description: Modo Pickup — arrancar un brief de chats/open/ moviéndolo a running/ y aplicando el modo sugerido.
---

# /start-chat (override de educa-web)

> Política universal: ver `~/.claude/commands/start-chat.md`.

## Específico de educa-web

### Maestro

- Path: [../plan/maestro.md](../plan/maestro.md) (singular `plan/`).
- Sección "en progreso": **🟡 En progreso** (o equivalente del maestro vigente). Si el item está en la cola "📋 Próximos chats", marcarlo como en progreso o moverlo a la sección WIP.

### Comando de cierre

`/end` mueve `running/` → `closed/` (o `awaiting-prod/` según gate post-deploy) con commit. Ver [end.md](end.md).

### Buckets adicionales no elegibles

`chats/awaiting-prod/` **no es elegible** para `/start-chat`. Briefs ahí ya cerraron localmente y esperan validación post-deploy. Si el deploy falló y hay que retomar trabajo, usar [`/verify <NNN> rollback "razón"`](verify.md) que mueve el brief a `running/` con flag de rollback.

### Validación de repo destino (cross-repo)

Si el brief dice `Repo destino: Educa.API` pero estás en `educa-web` (o viceversa), **abortar** — el chat tiene que abrirse en el repo correcto. Cross-repo edits desde el repo equivocado rompen el sistema.

### Pre-work típico del dominio

- Scripts SQL pendientes (FE depende de columnas/tablas del BE).
- `npm install` si cambió `package.json`.
- Confirmaciones de OPS (jefe, deploy, datos prod).

### "Ya está activo"

Mensaje sugerido: *"Este brief ya está activo en `chats/running/`. Continuá con el modo sugerido en su sección `## MODO SUGERIDO` o usá `/retomar`."*

## Referencias locales

- [../rules/backlog-hygiene.md](../rules/backlog-hygiene.md) — gate `running/` ≤ 1.
- [next-chat.md](next-chat.md) — generador de briefs.
- [block-chat.md](block-chat.md) — pausar el activo.
- [end.md](end.md) — cierre (mueve running → closed o awaiting-prod con commit).
- [verify.md](verify.md) — cierra el ciclo de un chat en `awaiting-prod/` post-deploy.
- [triage.md](triage.md) — si abortás por backlogs saturados.
- [../plan/maestro.md](../plan/maestro.md) — cola + En progreso.

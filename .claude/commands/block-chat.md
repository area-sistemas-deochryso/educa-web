# block-chat (override de educa-web)

> Política universal: ver `~/.claude/commands/block-chat.md`.

## Causas típicas en este proyecto

| Causa | Destino |
| --- | --- |
| Espera **decisión del jefe** sobre alcance, priorización o validación post-deploy. | `chats/waiting/` |
| **OPS pendiente** (provisioning, secret rotation, permisos en Azure). | `chats/waiting/` |
| **Deploy pendiente de otro repo** o servicio externo. | `chats/waiting/` |
| **Bug en backend Educa.API** o **build infra rota** que tapa el frontend. | `chats/troubles/` |
| Bug derivado descubierto en otro chat. | `chats/troubles/` |

## Maestro — comportamiento

[plan/maestro.md](../plan/maestro.md) es más laxo que un kanban completo:

- Si el item estaba marcado en progreso, devolverlo a la cola con nota de bloqueo, **o** moverlo a una sección "🟠 En espera" si el maestro la usa en ese momento.
- Si el bloqueo deriva otro trabajo (ej. "hay que hacer X antes"), agregar ese X al final de la cola.

## Para ambigüedad menor

Si la causa es **ambigüedad de alcance** resoluble en 1-2 mensajes con el usuario → **preguntar directo**, no `/block-chat`.

## Referencias

- [commands/start-chat.md](start-chat.md) — arranque (inverso: `running/` ← `open/`).
- [commands/end.md](end.md) — cierre (usa `running/` como fuente normal).
- [plan/maestro.md](../plan/maestro.md) — secciones de cola y En espera.

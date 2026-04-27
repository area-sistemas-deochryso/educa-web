# Atajos del Flujo (palabras → comando)

> **"Tipear `/go` o tipear `go` debería ser lo mismo. La fricción más chica posible para arrancar."**

## Regla

Cuando el **primer mensaje del chat** sea muy corto (≤3 palabras) y coincida con alguna palabra-clave de la tabla, interpretarlo como invocación implícita del comando equivalente. **No pedir confirmación** — actuar como si el usuario hubiera tipeado el slash command.

## Tabla de atajos

| Texto del usuario (primer mensaje, ≤3 palabras) | Comando equivalente |
|---|---|
| `go`, `go!`, `vamos`, `arranca`, `arranquemos`, `empieza`, `empezamos`, `dale`, `vamos!`, `start` | `/go` |
| `retomar`, `retoma`, `continúa`, `continua`, `sigue`, `seguimos`, `continuemos` | `/retomar` |
| `fin`, `cierra`, `cerremos`, `terminamos`, `terminar`, `ship`, `cerrar` | `/end` |
| `triage`, `barrido`, `estado`, `qué hay` | `/triage` |
| `progress`, `avance`, `cómo va`, `como va`, `reporte` | `/progress` |
| `next`, `siguiente`, `próximo`, `proximo` | `/next-chat` |
| `block`, `bloquea`, `bloquear`, `pausa` | `/block-chat` |

## Cuándo NO aplicar el atajo

- El primer mensaje tiene **>3 palabras** o **da instrucción explícita** (ej: "go arregla el bug del login" → no es atajo, es pedido directo).
- El usuario incluye **contexto adicional** (ej: "vamos con el plan 31 chat 2") — interpretarlo como instrucción normal aunque arranque con palabra-clave.
- El primer mensaje incluye **referencias a archivos** (ej: "@plan/maestro.md") — el usuario quiere que leas algo, no que arranques flujo.
- El chat **ya tiene contexto previo** (no es el primer mensaje) — los atajos solo aplican al arranque, no a mid-chat.

## Por qué esta regla existe

`/go` ya es de un solo comando, pero el slash sigue siendo fricción mental ("¿se llama `/go` o `/run` o `/start`?"). Reconocer palabras naturales reduce la barrera a "abro chat, escribo `vamos`, listo".

Las palabras de la tabla son las que un usuario natural usaría sin pensar. Si tipea otra palabra que no está en la tabla, **no inferir** — preguntar o ejecutar literal.

## Ejemplos

| Usuario tipea | Comportamiento |
|---|---|
| `go` | → `/go` (auto-detecta brief en running/open/cola y arranca) |
| `vamos!` | → `/go` |
| `retomar` | → `/retomar` (continúa solo lo activo en running/) |
| `fin` | → `/end` (auto-detecta caso de cierre) |
| `progress` | → `/progress` (renderiza reporte) |
| `vamos con el plan 31 chat 2` | NO atajo — instrucción explícita; el usuario sabe qué quiere |
| `@plan/maestro.md qué viene` | NO atajo — pide leer archivo y responder |
| `arregla el bug del login` | NO atajo — instrucción de trabajo, no comando de flujo |
| `dale, arrancá` (3 palabras OK pero ambiguo + acento) | → `/go` (`dale` es atajo válido, "arrancá" refuerza) |

## Combinación con otras reglas

- [chat-modes.md](chat-modes.md) — sigue siendo válido: si la intención no encaja en `/go`/`/retomar`/`/end`, los modos internos (`/investigate`, `/design`, `/execute`, `/validate`) se invocan explícitos.
- Reglas globales del usuario (`~/.claude/CLAUDE.md`) — siguen aplicando (chat-weight-monitor, validate-before-close, closing-summary, etc.) sobre cualquier flujo que arranque con atajo o slash.

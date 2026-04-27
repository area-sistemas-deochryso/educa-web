# Modo: Pickup (arrancar brief)

**Objetivo**: cuando el usuario señala un brief existente (`@chats/open/NNN-...md` o número), arrancarlo formalmente: leerlo, moverlo a `chats/running/`, listar pre-work y aplicar el modo sugerido dentro del brief.

**Por qué existe**: el folder `chats/running/` es la fuente de verdad de "qué está activo ahora". Sin este comando, los briefs quedan en `open/` aunque ya estén en uso y el estado de los backlogs miente.

> **Tip**: si solo querés arrancar lo siguiente sin pensar, usá [`/go`](go.md) — absorbe `/start-chat` automáticamente.

## Precondiciones

### 1. Hay un brief identificable

El usuario pasa path o `NNN`. Si solo pasó `/start-chat` sin argumento:

- Si hay **un solo** brief en `chats/open/`, tomarlo.
- Si hay varios, listar y pedir decisión (no elegir por mi cuenta).
- Si `open/` está vacío, abortar: sugerir `/next-chat` si hay trabajo hecho para encolar, o revisar [maestro](../plan/maestro.md) si no.

> **`chats/awaiting-prod/` no es elegible**. Briefs ahí ya cerraron localmente y esperan validación post-deploy — no se "arrancan" con `/start-chat`. Si el deploy falló y hay que retomar trabajo, usar [`/verify <NNN> rollback "razón"`](verify.md) que mueve el brief a `running/` con flag de rollback.

### 2. El brief no está ya en `running/`

Si ya está ahí, reportar: "Este brief ya está activo en `chats/running/`. Continuá con el modo sugerido en su sección `## MODO SUGERIDO` o usá `/retomar`."

### 3. `running/` está vacío (gate duro de [backlog-hygiene.md](../rules/backlog-hygiene.md))

**Límite duro**: `running/` ≤ 1. Si ya hay un brief ahí, **frenar** y responder:

> Ya hay un chat activo en `chats/running/<NNN>-...md`. Opciones:
>
> - Cerrarlo con `/end` (si terminó).
> - Bloquearlo con `/block-chat waiting` (decisión externa) o `/block-chat troubles` (técnico).
> - Confirmar explícitamente que este chat es paralelo (raro — solo cuando hay doble ownership FE+BE de pieza independiente del mismo plan).
>
> No arrancamos un segundo `running/` sin decisión.

## Qué hago

1. **Leer** el brief completo en `chats/open/NNN-...md`.
2. **Validar repo destino**: si el brief dice `Repo destino: Educa.API` pero estás en `educa-web` (o viceversa), abortar con el mensaje correspondiente — el chat tiene que abrirse en el repo correcto.
3. **Mover** con `git mv` o equivalente: `chats/open/NNN-...md` → `chats/running/NNN-...md`. **No** commitear — el commit lo hace `/end` al cerrar.
4. **Actualizar** [maestro](../plan/maestro.md): si el item está en la cola "📋 Próximos chats", marcarlo como en progreso o moverlo a la sección que el maestro use para "🟡 En progreso". Conservar el item original si solo es marcador, o eliminarlo de la cola si el maestro tiene sección dedicada para WIP.
5. **Chequear pre-work** del brief: dependencias externas, scripts SQL pendientes, `npm install`, etc. Si alguna falta, parar y reportar — no empezar hasta estar desbloqueado.
6. **Leer** los archivos de `## PRE-WORK OBLIGATORIO` del brief.
7. **Aplicar** el modo sugerido en `## MODO SUGERIDO` (ej. `/execute` o `/investigate`). Continuar desde ahí.

## Qué NO hago

- Mover a `running/` sin haber leído el brief completo primero.
- Ignorar el pre-work obligatorio — si el brief dice "depende del SQL X que no se ejecutó aún", abortar.
- Commitear el move. El brief entra en `running/` **sin commit**; solo `/end` commitea su salida final.
- Empezar a editar código sin antes aplicar el modo sugerido. El modo es un guardrail, no adorno.
- Saltarse la validación de repo destino. Cross-repo edits desde el repo equivocado rompen el sistema.

## Formato de salida

```text
## Brief activado
- Path: chats/running/NNN-<scope>.md
- Plan: <plan o —>
- Modo sugerido: /<modo>
- Repo destino: educa-web | Educa.API ✅ (estás en el correcto)

## Pre-work
- [✅ | ❌ | ⏭️] <item del brief>

## Maestro.md
- Item movido de cola a "🟡 En progreso" (o equivalente del maestro)

## Siguiente paso
Aplicar `/<modo>` según el brief.
```

## Referencias

- [rules/backlog-hygiene.md](../rules/backlog-hygiene.md) — gate duro sobre `running/`.
- [commands/next-chat.md](next-chat.md) — quien genera los briefs que consumo.
- [commands/block-chat.md](block-chat.md) — si aparece bloqueo durante el trabajo.
- [commands/end.md](end.md) — cierre (mueve `running/` → `closed/` o `awaiting-prod/` con commit, según gate post-deploy).
- [commands/verify.md](verify.md) — cierra el ciclo de un chat en `awaiting-prod/` cuando la validación post-deploy pasó (o falló).
- [commands/triage.md](triage.md) — si abortás por backlogs saturados.
- [plan/maestro.md](../plan/maestro.md) — cola + sección En progreso.

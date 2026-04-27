# Modo: Bloquear chat

**Objetivo**: cuando el chat activo **no puede continuar** por una razón no resoluble en este turno, marcarlo explícitamente: mover brief de `running/` a `waiting/` o `troubles/` con anotación de causa.

**Por qué existe**: sin esto, un chat trabado queda en `running/` (o peor, el usuario cierra la ventana y el estado se pierde). El estado real del proyecto se vuelve mentira.

## Clasificación — elegir carpeta destino

| Causa | Destino |
| --- | --- |
| Espera **decisión del usuario** (alcance, priorización, validación post-deploy del jefe). | `chats/waiting/` |
| Espera **dependencia externa** (otro chat tiene que cerrar primero, OPS pendiente, deploy de otro repo). | `chats/waiting/` |
| **Obstáculo técnico** no resuelto (bug en dependencia, build infra rota, herramienta del repo falla). | `chats/troubles/` |
| **Bug descubierto** que tapa el trabajo original y requiere otro chat primero. | `chats/troubles/` |

Regla: `waiting/` = **esperamos a alguien**; `troubles/` = **algo está roto**. Si dudás, `waiting/`.

## Precondiciones

### 1. Hay un brief en `running/` asociado a este chat

Buscar en `chats/running/`. Si no hay, abortar: "No hay brief activo en `running/`. ¿Querés arrancarlo primero con `/start-chat`, o es otro flujo?"

### 2. La causa es genuinamente bloqueante

No usar `/block-chat` para "voy a almorzar y vuelvo" — eso es pausa trivial, dejar el brief en `running/`. Solo bloquear si no se puede continuar hoy sin input externo.

Si la causa es **ambigüedad de alcance** resoluble en 1-2 mensajes con el usuario → preguntarle directo, no `/block-chat`.

## Qué hago

1. **Clasificar** causa → `waiting/` o `troubles/` (tabla arriba).
2. **Anotar** al final del brief una sección nueva:

   ```markdown
   ---

   ## 🟠 BLOQUEADO (YYYY-MM-DD)

   **Tipo**: decisión externa | dependencia externa | obstáculo técnico | bug derivado
   **Causa**: <1-3 líneas concretas>
   **Qué desbloquea**: <acción concreta + quién/qué la produce>
   **Estado parcial**: <qué se alcanzó a hacer antes del bloqueo, con refs `path:line`>
   ```

3. **Mover** `chats/running/NNN-...md` → `chats/<destino>/NNN-...md`. Sin commit.
4. **Actualizar** [maestro](../plan/maestro.md):
   - Si el item estaba marcado en progreso, devolverlo a la cola con nota de bloqueo, o moverlo a una sección "🟠 En espera" si el maestro la usa.
   - Si el bloqueo deriva otro trabajo (ej. "hay que hacer X antes"), agregar ese X al final de la cola.

## Qué NO hago

- **Commitear** el move. El estado de bloqueo es transición, no entrega.
- Borrar o modificar contenido anterior del brief. Solo **agregar** la sección "🟠 BLOQUEADO" al final.
- Usar `/block-chat` cuando la ambigüedad es menor y resoluble en el chat — preguntar directo.
- Abrir un brief nuevo para "el trabajo derivado que desbloquea este" sin confirmar con el usuario. Si es obvio, proponerlo con `/next-chat` después de bloquear.

## Desbloquear más tarde

Cuando la causa se resuelve:

- Mover `waiting/` o `troubles/` → `running/` manualmente (o con `/start-chat <NNN>` si aplica).
- Actualizar maestro: remover de En espera, marcar en progreso.
- Continuar desde donde el brief anotó "Estado parcial".

El NNN **no cambia** — misma identidad a lo largo de todo el ciclo.

## Argumentos opcionales

- `/block-chat` (sin arg) — Claude clasifica y sugiere destino según el contexto del chat.
- `/block-chat waiting` — forzar destino `waiting/` (decisión/dependencia externa).
- `/block-chat troubles` — forzar destino `troubles/` (obstáculo técnico).

## Formato de salida

```text
## Bloqueo aplicado
- Brief: chats/waiting/NNN-<scope>.md  (o troubles/)
- Tipo: <decisión | dependencia | técnico | bug derivado>
- Causa: <una línea>

## Maestro.md
- Item devuelto a cola con nota de bloqueo (o "🟠 En espera" si aplica)
- [opcional] Derivado agregado a cola: "N. **[Tipo]** <título>"

## Siguiente paso
Qué desbloquea esto y quién lo produce.
```

## Referencias

- [commands/start-chat.md](start-chat.md) — arranque (inverso: `running/` ← `open/`).
- [commands/end.md](end.md) — cierre (usa `running/` como fuente normal).
- [plan/maestro.md](../plan/maestro.md) — secciones de cola y En espera.

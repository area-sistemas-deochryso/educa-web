# Modo: Triage (barrido de backlogs)

**Objetivo**: reportar el estado de los 6 backlogs del proyecto ([rules/backlog-hygiene.md](../rules/backlog-hygiene.md)), marcar items que cruzaron límite o edad crítica, y proponer acción concreta por cada uno. **No ejecuta nada** — decide el usuario.

Útil cuando:

- Un gate en `/next-chat` o `/start-chat` avisó que algo está al límite.
- Pasaron semanas desde el último barrido y querés ver qué quedó colgado.
- Antes de planificar próximos chats, para limpiar ruido.

## Qué hago

Un pase por los 6 buckets, en orden. Para cada uno:

1. **Contar** items actuales.
2. **Comparar** contra el límite de [backlog-hygiene.md](../rules/backlog-hygiene.md).
3. **Medir edad** del más viejo (por `> **Creado**: YYYY-MM-DD` del brief, `<!-- created: YYYY-MM-DD -->` en tasks, o fallback al `mtime` del archivo).
4. **Clasificar** cada item: `OK`, `AL LÍMITE`, `EXCEDIDO`, `VIEJO` (cruzó edad crítica).
5. **Proponer acción** por item marcado (del menú de [backlog-hygiene.md](../rules/backlog-hygiene.md#acciones-cuando-se-excede-un-límite)).

No mover archivos ni commitear. No decidir. Solo reportar.

## Qué NO hago

- **No ejecuto las acciones** propuestas — eso corresponde a las skills específicas (`/start-chat`, `/end`, edición manual).
- **No re-priorizo la cola del maestro** — propongo bajar items, no reordenar por mi cuenta.
- **No abro issues externos** ni toco otros repos.
- **No regenero briefs**. Si algo está viejo y sigue válido, el usuario actualiza; si no, cierra.

## Output estándar

Un bloque por backlog. Formato compacto, scanable, con acción propuesta por item marcado:

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

### tasks/ (N / 8 blando, crítico >60d)
...

### plan/maestro.md cola (N / 12 blando)
...

## Resumen

- **M items necesitan acción** (listados arriba con →).
- **K buckets excedidos** (listados con ⚠️).
- Recomendación global: <1 frase>.
```

Si todo está OK, el output es corto y termina con:

```markdown
## Resumen
Todos los backlogs dentro de límites y sin items viejos. Nada que triage-ear.
```

## Flujo típico de uso

1. Usuario invoca `/triage`.
2. Reporte en pantalla.
3. Usuario decide acciones (una por una o batch):
   - "Cerrá el brief `038-...` como abandonado" → edición manual + commit.
   - "Mové este item del maestro a tasks/" → edición manual.
   - "`/start-chat 038`" → arranca otro chat.
4. Nada queda pendiente en este chat.

## Señales para arrancar

| Señal | Disparador |
| --- | --- |
| Gate en `/next-chat` o `/start-chat` avisó límite | Automático — el comando sugiere `/triage` primero |
| >2 semanas desde el último barrido | El usuario se acuerda |
| Sensación de "tengo muchas cosas a medias" | Subjetivo, pero válido |
| Arrancar un sprint / bloque de trabajo | Empezar limpio |

## Cómo computar la edad

Orden de preferencia:

1. **`> **Creado**: YYYY-MM-DD`** en el blockquote del brief (chat briefs).
2. **`<!-- created: YYYY-MM-DD -->`** en la primera línea (tasks/ items).
3. **`git log --diff-filter=A -n 1 --format=%aI -- <file>`** — fecha del primer commit del archivo. Fallback universal.
4. **`mtime`** del archivo — último recurso, poco confiable porque edits lo resetean.

Los items en la cola de `plan/maestro.md` no tienen fecha por item; si el usuario quiere aging ahí, hay que agregarlo como convención (no se hace en MVP).

## Comando complementario

- `bash .claude/hooks/backlog-check.sh` (sin args) — output más compacto que el `/triage` completo. Útil para chequeo rápido sin generar un reporte largo.

## Criterios de cierre

Triage es idempotente y no muta estado:

- [ ] Reporte impreso con todos los buckets.
- [ ] Items marcados con acción propuesta (no ejecutada).
- [ ] Nada commiteado. Nada movido.
- [ ] Usuario sabe qué falta decidir.

## Referencias

- [rules/backlog-hygiene.md](../rules/backlog-hygiene.md) — límites, edades, acciones.
- [hooks/backlog-check.sh](../hooks/backlog-check.sh) — telemetría compacta.
- [commands/next-chat.md](next-chat.md) — produce briefs en `open/`.
- [commands/start-chat.md](start-chat.md) — consume briefs de `open/`.
- [commands/end.md](end.md) — cierra y mueve a `closed/`.
- [plan/maestro.md](../plan/maestro.md) — cola priorizada.

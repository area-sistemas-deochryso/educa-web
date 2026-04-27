# Higiene de Backlogs (WIP limits + aging)

> **"El trabajo se acumula en muchos lugares. Sin política, todos crecen sin control."**

El proyecto tiene **7 lugares** donde el trabajo puede acumularse. Esta regla define **límites por bucket** y **umbrales de edad** que disparan revisión.

## Los 7 backlogs

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

- **Duro**: el comando que intenta agregar **falla**. No se puede saltar sin resolver primero.
- **Blando**: el comando avisa, propone `/triage`, y pide confirmación para continuar. Se puede aceptar crecer temporalmente.
- **Edad crítica**: item más viejo que ese umbral dispara reconsideración en el próximo `/triage` o en el siguiente comando que lo mire.

> Los números salen de experiencia con educa-web (proyecto multi-plan, multi-repo). Ajustables si un bucket se prueba distinto — editar acá. educa-web maneja **más planes en paralelo** que un repo single-plan típico, por eso `open/` y la cola son más altos que en otros proyectos.

## Propósito de cada backlog

### `tasks/`

TODOs que no tienen plan concreto todavía. **Son ideas, no trabajo listo**. El paso natural es promocionar a un plan en `.claude/plan/` cuando se vuelven concretos.

**Razón del límite (8)**: más que eso significa que las ideas se generan más rápido que se procesan — síntoma de que hace falta priorizar, no de que hace falta más capacidad.

### `plan/maestro.md` cola

**La** cola priorizada del proyecto. Vive en la sección "📋 Próximos chats (cola)" o equivalente del [maestro](../plan/maestro.md).

**Razón del límite (12)**: más que eso es lista de deseos, no cola. Items 13+ deberían bajar al final o moverse a `tasks/`.

### `chats/open/`

Briefs generados por `/next-chat` listos para arrancar con `/start-chat`. Son **trabajo pre-preparado, no ideas** — cada uno salió de trabajo real previo.

**Razón del límite (5)**: más que eso significa que `/next-chat` genera más rápido que `/start-chat` consume. Pre-stagear trabajo que no vas a arrancar pronto es costoso — el contexto envejece.

### `chats/running/`

El chat activo. **Solo uno a la vez.** Cambiar de contexto entre chats activos paga un costo que rara vez vale la pena.

**Razón del límite duro (1)**: si necesitás pausar el actual para hacer otro, el actual pasa a `waiting/` o `troubles/` vía `/block-chat`, no compite con el nuevo por ser el "running".

> **Excepción válida**: dos chats activos en repos distintos (FE + BE) trabajando en piezas independientes del mismo plan. En ese caso, ambos pueden estar en `running/` siempre que se confirme explícitamente que no chocan. Ver `rules/one-repo-one-chat.md` (regla global).

### `chats/waiting/`

Bloqueado por algo **externo**: decisión del usuario pendiente, validación post-deploy del jefe, dependencia que aún no existe, resolución de terceros.

**Razón del límite (3) y edad (14d)**: bloqueos externos reales se destraban en días o semanas. Si lleva más, probablemente cambió el contexto y hay que re-evaluar (reabrir, cerrar sin mergear, escalar a decisión).

### `chats/troubles/`

Bloqueado por algo **técnico**: bug que no se reproduce, herramienta que falla, diseño que no cierra.

**Razón del límite (2) y edad (7d)**: los troubles técnicos no mejoran solos. 7 días sin movimiento = ya no sabés cómo destrabarlo; hay que escalar a `/investigate` con cabeza fresca o abandonar.

### `chats/awaiting-prod/`

Briefs cerrados localmente (commit hecho, validación local pasó) que esperan **confirmación post-deploy del usuario**: smoke test browser, query SQL en prod, validación del jefe, telemetría observada, etc. Salen del bucket vía [`/verify <NNN>`](../commands/verify.md) — `✅` mueve a `closed/`, `❌ rollback` mueve a `running/` con motivo registrado.

**Razón del límite (8) y edad crítica (14d)**: validar un deploy debería tomar minutos a días, no semanas. Si un brief lleva >14d sin verificarse, hay dos lecturas posibles:

- El deploy nunca ocurrió (mover a `waiting/` — bloqueo externo real, no validación pendiente).
- El deploy ocurrió pero se olvidó verificar (forzar `/verify <NNN>` confirmando ✅ o detectar el bug si lo hubo).

Más de 8 items simultáneamente es señal de que se está deployando rápido sin verificar — el bottleneck deja de ser "qué construir" y se vuelve "qué confirmar que funciona en prod".

### `chats/closed/`

Sin límite duro. Es historia. El único cuidado base es que todo archivo en `closed/` tenga un commit que lo movió ahí — invariante ya documentado en [next-chat.md](../commands/next-chat.md). A diferencia de `awaiting-prod/`, los briefs en `closed/` ya pasaron por verificación de producción (o nunca la requirieron porque eran cambios sin impacto runtime — docs, refactors internos sin behavior change, etc.).

## Convención: fecha de creación

Cada brief de chat debe tener `> **Creado**: YYYY-MM-DD` en el header. El comando `/next-chat` la completa al generar el brief. El backfill de briefs antiguos se hace cuando se toca alguno (no es retro-bulk).

```markdown
> **Repo destino**: `educa-web` (frontend, branch `main`).
> **Plan**: 30b · **Chat**: FE · **Fase**: F1.FE · **Creado**: 2026-04-27 · **Estado**: ⏳ pendiente arrancar.
```

Para items en `tasks/`, misma idea: primera línea del archivo lleva `<!-- created: YYYY-MM-DD -->` como comentario HTML (invisible al render). Si falta, el hook cae al `mtime` del archivo o a `git log --diff-filter=A -n 1 --format=%aI -- <file>`.

## Quién chequea qué

| Comando | Qué valida | Efecto |
|---|---|---|
| [`/next-chat`](../commands/next-chat.md) | `open/` ≤ 5, items viejos en `waiting/troubles/` | Frena si excede, propone `/triage` |
| [`/start-chat`](../commands/start-chat.md) | `running/` = 0 | **Frena duro** si hay chat activo |
| [`/end`](../commands/end.md) | cola de maestro ≤ 12 al cerrar; pregunta gate post-deploy | Rutea brief a `closed/` o `awaiting-prod/` según gate |
| [`/verify`](../commands/verify.md) | brief existe en `awaiting-prod/` | Mueve a `closed/` (✅) o a `running/` (❌ rollback) |
| [`/triage`](../commands/triage.md) | todo lo de arriba, explícitamente | Reporta + propone acciones |
| Hook `backlog-check.sh` | Imprime snapshot al abrir sesión + warning si hay buckets fuera de política | Telemetría no bloqueante |

## Acciones cuando se excede un límite

Cada bucket tiene un menú corto. El chat que excede elige una antes de seguir:

**`chats/open/` al límite (≥5)**:

- Arrancar uno con `/start-chat <NNN>` (preferido — es la razón de ser del bucket).
- Mover uno a `tasks/` si ya no es prioritario (con nota de por qué).
- Cerrar uno como "no va" (move a `closed/` con commit que explique).

**`chats/waiting/` item viejo (>14d)**:

- Destrabar y devolver a `running/` si el bloqueo se resolvió.
- Re-escribir el brief si el contexto cambió (siguen los datos viejos, pero actualizar "estado").
- Cerrar como "abandonado" si ya no aplica.
- Escalar a decisión si lo que faltaba era input que nadie dio.

**`chats/troubles/` item viejo (>7d)**:

- `/investigate` fresco para re-atacar el problema técnico.
- Cerrar como "no reproduce" o "fuera de scope".
- Abrir issue externo si es bug de herramienta de terceros.

**`chats/awaiting-prod/` al límite (≥8) o item viejo (>14d)**:

- `/verify <NNN>` confirmando ✅ si ya se validó (típico cuando se olvidó cerrar el ciclo).
- `/verify <NNN> rollback "razón"` si la verificación detectó un bug (mueve a `running/` con motivo).
- Mover a `waiting/` si el deploy nunca ocurrió y depende de input externo (cuenta como bloqueo, no como validación pendiente).
- Investigar por qué tantos chats deployan sin verificar — puede indicar falta de proceso de validación post-deploy o gating insuficiente del CI/CD.

**`tasks/` al límite (≥8)**:

- Promocionar 1-2 a un plan en `.claude/plan/` (darles plan concreto).
- Descartar las que ya no aplican.
- Priorizar: si más de 8 son legítimos, reordenar el maestro.

**`plan/maestro.md` cola al límite (≥12)**:

- Items 13+ bajan a `tasks/` (vuelven a ser ideas sin fecha).
- Remover los que ya se hicieron pero no se borraron.
- Consolidar duplicados.

## Relación con otras reglas

- [chat-modes.md](chat-modes.md) — define los 4 modos (`/investigate`, `/design`, `/execute`, `/validate`). Esta regla define **dónde vive** el trabajo entre modos.
- [git.md](git.md) — convenciones de commit. El invariante "brief no entra a `closed/` sin commit" es transversal.
- Reglas globales del usuario (`~/.claude/rules/`) — `one-repo-one-chat.md`, `validate-before-close.md`, `closing-summary.md` son complementarias y siguen aplicando.

## Cuándo **no** aplicar

- **Fase de proyecto muy intensa** (ej: crunch, deploy crítico) — los límites blandos pueden aceptarse temporalmente; los duros no. Si estás permanentemente excediendo los blandos, los números están mal: ajustarlos acá, no ignorarlos.
- **Trabajo experimental/throwaway** — el overhead no paga.

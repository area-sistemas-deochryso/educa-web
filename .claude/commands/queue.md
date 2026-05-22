---
description: Modo Queue — vista priorizada read-only de planes pendientes del repo actual (cross-project).
---

# Modo: Queue

**Objetivo**: emitir una cola priorizada de **qué arrancar ahora y qué viene después**, parseando lo que el repo tenga disponible. Read-only.

Complementa a [`/progress`](progress.md) (tendencia por flujo) y [`/triage`](triage.md) (health por bucket). `/queue` responde **qué sigue, en qué orden**.

## Qué hago

1. **Detectar estructura** del repo en este orden:
   - `.claude/plans/maestro.md` — fuente principal (prosa con orden real).
   - `.claude/chats/{waiting,running,open}/*.md` — briefs activos.
   - `.claude/plans/**/*.md` — plan files con fases.
   - `.claude/tasks/pending/*.md` — ideas sin plan.
   - Fallback: `ROADMAP.md`, `TODO.md` en raíz.
   - Último recurso: `gh issue list --state open` si el repo tiene remote GitHub.
2. **Clasificar** cada item en un `kind`:
   - `waiting` — code-complete esperando validación del dueño.
   - `pullable` — listo para arrancar (sin dependencia bloqueante).
   - `future` — referenciado pero bloqueado (decisión, dependencia, espera otro item).
   - `deferred` — fuera de carril, demoted, pausado.
3. **Anotar** por item cuando esté disponible:
   - `aging` — días desde `**Creado**: YYYY-MM-DD` del brief, o `git log --diff-filter=A -1 --format=%aI` del plan.
   - `estimate` — primera línea tipo `## Esfuerzo` o `Esfuerzo: ...` en primeras 50 líneas del plan.
   - `flow`, `planRef`, `briefRef`, `tags` (`[DEV]`, `[BUG]`, `[REFACTOR]`, etc.).
4. **Detectar drift** sin romper output:
   - Plan referenciado desde maestro pero archivo inexistente.
   - Brief en `waiting/` sin item correspondiente en maestro.
   - Flow marcado 🎉 completo en `progress.sh` pero aún listado en cola.

## Qué NO hago

- No muto archivos, briefs, maestro ni cola.
- No reordeno automáticamente — drift se reporta, no se aplica.
- No reemplazo a `/progress` ni `/triage` — son complementarios.

## Formato de salida

```
## 🚦 Queue — <repo> · <YYYY-MM-DD>

### 🟡 Waiting (N)
- [chat NNN] <title> — <aging>d — flow: <flow>
  · brief: `chats/waiting/NNN-...md` · plan: `plans/<flow>/NN-...md`

### 🟢 Pullable (N) — arrancable ya
1. **[TAG]** <title> — <estimate>
   · plan: `plans/<flow>/NN-...md` · flow: <flow>
2. ...

### ⏸️ Future (N) — bloqueado por otro item
- <title> — bloqueado por <ref>

### 🗄️ Deferred (N) — fuera de carril
- <title> — <razón>

### ⚠️ Drift (si hay)
- <descripción 1 línea>
```

Sección vacía → omitirla (no listar "Ninguno"). Si el repo no tiene ninguna estructura detectable, output corto con sugerencia (`ROADMAP.md` o `.claude/plans/maestro.md`).

## Argumentos

- `/queue` — todas las secciones, top 5 pullables.
- `/queue --top N` — primeros N pullables (default 5).
- `/queue --kind <waiting|pullable|future|running>` — filtra a un kind.
- `/queue info <KEY>` — detalle de un plan por key (ej: `/queue info F1`, `/queue info xP45`). Muestra INDEX, INV, posición en cola, y briefs relacionados.

## Cuándo correrlo

- Al arrancar el día — ver qué arrancar primero.
- Antes de `/next-chat` — confirmar el top de la cola.
- Después de cerrar varios chats — chequear que el orden sigue teniendo sentido.
- Saltando entre repos — reconstruir el contexto rápido.

## Override por proyecto

`<repo>/.claude/commands/queue.md` puede:

- Listar paths exactos del repo (carriles, sub-colas, secciones extras del maestro).
- Definir mapping de secciones del maestro → `kind` (ej. en app-fgame: Carril A → `waiting`; Carril B numerado → `pullable`; sub-cola Cowork → `pullable` con `group: cowork`).
- Documentar bugs conocidos del parseo de la prosa local.
- Apuntar a un adapter script si el proyecto lo materializa (`scripts/queue-adapter.sh`).

## Referencias

- Plan completo con adapter pattern + scripts + cache: `app-fgame/.claude/plans/tooling/02-queue-command.md` — materializable cuando justifique el costo. V1 acá es spec-only.
- Comandos hermanos: [`/progress`](progress.md), [`/triage`](triage.md), [`/next-chat`](next-chat.md).

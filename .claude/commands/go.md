# Modo: Go (trabajo autónomo)

**Objetivo**: el único comando que necesitás para empezar un chat. Detecta qué hay que hacer, lo hace, y solo para cuando termina, se traba o necesita una decisión tuya. Al final sugiere `/end` para cerrar.

**Principio**: vos tipeás `/go` una vez. Claude orquesta los modos internos según el `MODO SUGERIDO` del brief (típicamente `/execute → /validate`; también `/investigate`, `/design`, `/refactor` cuando aplican). Sin skill-hopping manual de tu parte.

## Recomendación de modelo y esfuerzo (antes de arrancar)

> **Antes de cualquier acción del flujo**, recomendar al usuario el modelo y nivel de esfuerzo que mejor encajan con el trabajo del brief, y esperar `y` / `n` / `seguir` antes de continuar.

Los cambios reales los hace el usuario **por UI** (panel de **Modes** + slider de **Effort** en la barra inferior de Claude Code). El asistente no swappea modelo ni esfuerzo desde dentro del flujo — solo recomienda y espera confirmación.

**Estrategia por defecto**: quedarse en **opus** y variar solo el esfuerzo. Bajar a `sonnet`/`haiku` únicamente cuando la tarea es 100% trivial sin razonamiento.

**Niveles de esfuerzo**: `low` · `medium` · `high` · `xhigh` (default Opus 4.7) · `max`. Modelos sin xhigh (Opus 4.6, Sonnet 4.6): `low` · `medium` · `high` · `max`.

### Heurística por tipo de trabajo

| Tipo de trabajo | Modelo | Esfuerzo |
| --- | --- | --- |
| Investigación profunda, audit cross-system, código no entendido | opus | `high` |
| Diseño (tradeoffs, ADR, decidir entre opciones) | opus | `high` |
| Debug complejo (bug que no se reproduce) | opus | `high` |
| Refactor ambiguo, cross-file con dependencias inciertas | opus | `medium` |
| Ejecución mecánica con plan claro (batch, migración con patrón validado) | opus | `low` |
| Refactor mecánico de una sola dimensión | opus | `low` |
| Validación pura (lint/build/test dispatch) | opus | `low` |
| Mover archivos / commit / brief minimal | opus | `low` |
| Tarea trivial sin ningún razonamiento (renombrar 2 vars) | sonnet | `low` |

**Señales que pisan la heurística**:

- "patrón ya validado", "batch N de M", "mecánico" → bajar a `low`.
- "exploratorio", "no claro", "audit", "decidir" → subir a `high`.
- "solo lint", "solo doc", "solo commit" → `low`.

### Formato del reporte (antes del banner de arranque)

```text
## Modelo recomendado: opus · Esfuerzo: <low|medium|high>
Razón: <una línea — tipo del trabajo + señal dominante del brief>.
Acción: ajustá modo/esfuerzo por UI si querés cambiarlo, después respondé `y` (acepto), `n` (uso otro) o `seguir` (uso el actual sin tocar nada).
```

**Esperar respuesta una sola vez** antes de continuar al banner de arranque y al flujo de [Detección de estado](#detección-de-estado-en-orden). Si el usuario responde `y` o `seguir`, arrancar. Si responde `n`, no avanzar — esperar a que ajuste por UI y vuelva a tipear `/go`.

**Excepción**: si el flujo escala mid-chat a algo más complejo de lo recomendado (ej. el `/investigate` revela un problema que requiere diseño), reportar el cambio de magnitud y sugerir subir el esfuerzo — **no auto-cambiar**, solo recomendar.

## Detección de estado (en orden)

> **Principio**: solo preguntar cuando hay **empate genuino**. Si hay forma de inferir el siguiente paso (cola del maestro, fecha de creación, brief WIP), tomarlo sin preguntar.
>
> **El bucket `chats/awaiting-prod/` NO entra en esta detección**. `/go` no consume briefs que están esperando validación post-deploy — ese cierre lo resuelve [`/verify <NNN>`](verify.md), no `/go`. Si querés trabajar en algo de `awaiting-prod/`, usá `/verify` con caso rollback o esperá el deploy.

1. **`chats/running/` tiene brief** → continuar desde donde quedó. Leer contexto, retomar el modo pendiente. **No preguntar nada** — siempre retomar el activo.

2. **`chats/running/` vacío + `chats/open/` tiene 1 brief** → tomarlo, `git mv` a `running/`, actualizar maestro, arrancar. **No preguntar.**

3. **`chats/running/` vacío + `chats/open/` tiene >1** → aplicar **orden implícito de prioridad** y tomar el primero de la lista ordenada. Solo preguntar si después del orden todavía hay empate genuino.

   **Orden implícito** (mayor a menor prioridad):

   1. Brief con `Estado: 🟡 WIP` o equivalente — alguien lo arrancó y no terminó.
   2. Brief cuyo `Plan` aparece más arriba en la cola del maestro (sección "📋 Próximos chats").
   3. Brief con fecha `Creado:` más antigua — más urgente, llevaba más tiempo esperando.
   4. Brief con `NNN` más bajo — orden secuencial natural.

   Si después de aplicar los 4 criterios todavía hay 2+ briefs **exactamente empatados** (mismo plan en cola, misma fecha, NNN consecutivos) → ahí sí, listar y preguntar (1 sola vez).

4. **Todos vacíos (running + open)** → pull del primer item **no-OPS** de la cola del [maestro](../plan/maestro.md). Generar brief minimal inline en `running/` (plantilla de [next-chat.md](next-chat.md) con título + plan + modo sugerido + link a plan file, sin "aprendizajes transferibles" porque es arranque). El brief debe llevar el comentario HTML `<!-- minimal-from-go -->` debajo del header como flag, para que [`/end`](end.md) lo enriquezca con aprendizajes capturados antes de mover a `closed/`. Actualizar maestro. Arrancar. **No preguntar** salvo que la cola tenga 2 items con prioridad declarada idéntica.

Si no hay nada en ningún lado (cola vacía y open vacío), abortar con: "Cola vacía y sin briefs pendientes. Agregá al maestro o hacé lo que tengas pensado manualmente."

### Cuándo SÍ preguntar (las únicas excepciones)

| Situación | Por qué no se puede inferir |
|---|---|
| 2+ briefs en `open/` exactamente empatados tras aplicar los 4 criterios de orden | Sin señal de prioridad, el usuario es la única fuente |
| Cola del maestro tiene 2 items con marcadores explícitos de "decidir antes de arrancar" | El maestro mismo dice que requiere decisión |
| El brief en `running/` lleva >7d sin updates Y el usuario tipea `/go` (parece querer empezar otro) | Confirmar antes de mover el viejo a `open/` para no perder contexto |
| Brief activo es para `Educa.API` pero estás en `educa-web` (o viceversa) | Cambio de repo, no de chat — pedir confirmación de cambio de directorio |

Fuera de estas 4 situaciones, **no preguntar — actuar**.

## Flujo autónomo

Una vez identificado el brief:

1. **Mostrar contexto del proyecto**: correr `bash .claude/scripts/progress.sh` (ver [progress.md](progress.md)) y rendear su output **antes** del bloque "## Go". Da visibilidad de tendencia, hot subsystems y zonas muertas al arrancar — ayuda a no perder de vista lo que se está enfriando mientras trabajás otra cosa.
2. **Leer** brief + plan file + pre-work obligatorio.
3. **Aplicar el modo sugerido del brief** (`MODO SUGERIDO` o inferencia por tipo de trabajo).
4. **Avanzar fase por fase sin confirmación**, hasta llegar a uno de los 3 checkpoints de pausa.
5. **Cuando llegue la fase de validación** (`/validate` o equivalente), **dispatch lint/build/test en paralelo via `Agent`** — ver [validate.md § Cómo correrlo](validate.md). No correr secuencial en foreground.
6. Al terminar la última fase productiva (típicamente `/validate` pasa), **sugerir `/end`** — no ejecutar commit autónomo. `/end` requiere aprobación explícita porque commitea.

## Multi-repo (educa-web + Educa.API)

Cada brief lleva en su header:

```markdown
> **Repo destino**: `educa-web` (frontend, branch `main`) | `Educa.API` (backend, branch `master`).
```

`/go` debe respetar el repo destino. Si el brief es BE pero estás en el repo FE (o viceversa), el comando reporta:

> "Brief es para `Educa.API`, pero estás en `educa-web`. Cambiá de repo (abrí Claude Code en `c:\Users\Asus Ryzen 9\EducaWeb\Educa.API\`) y volvé a tipear `/go`."

No hacer cross-repo edits desde el repo equivocado.

## Checkpoints de pausa (cuándo paro)

| Checkpoint | Qué hago |
|---|---|
| **Completado** | Reportar: qué se hizo, métricas, paso siguiente. Sugerir `/end`. |
| **Bloqueador técnico** | Guardar estado (brief a `chats/troubles/` vía [`/block-chat`](block-chat.md) si es grave, o solo reportar si es chico). No seguir. |
| **Decisión necesaria** | Hacer 1 pregunta concreta con opciones. Esperar respuesta antes de continuar. |
| **Bloqueo externo** | Si aparece dependencia de decisión del usuario / input externo / validación post-deploy → [`/block-chat`](block-chat.md) a `waiting/`. |

**No inventes decisiones**. Si el brief es ambiguo o el código muestra opciones sin criterio claro, frenar y preguntar.

## Qué NO hago

- **No commitear**. El commit lo invoca `/end` (que delega en `commit-front`/`commit-back`/`commit-local` skills existentes).
- **No mover brief a `closed/`**. Mismo motivo.
- **No saltar fases del flujo sugerido** salvo que el investigate determine que son innecesarias (ej. si el audit muestra que el código ya está bien, skip `/refactor`).
- **No pre-stagear briefs** de trabajo derivado. Eso lo hace `/end` si aplica, o `/next-chat` manual.
- **No pedir confirmación entre fases** si no hay ambigüedad. Confianza = velocidad.

## Argumentos opcionales

- `/go` (sin arg) — detección automática según reglas arriba.
- `/go <NNN>` — forzar brief específico. Si no coincide con `running/` actual, preguntar antes de switchear.
- `/go <tema>` — si no hay brief ni match en cola, arrancar `/investigate` libre sobre ese tema (sin brief formal). Uso informal.

## Formato de salida

El output se compone de **3 bloques visuales** clavados:

### 1. Banner de arranque (al iniciar)

```markdown
## 🚀 GO · educa-web · YYYY-MM-DD

| Campo | Valor |
| --- | --- |
| 🟢 Activo | Plan NN · Chat X · "Título corto del brief" |
| 📁 Repo | `educa-web` (branch `main`) — ✅ correcto |
| 📋 Modo inicial | `/<modo>` |
| 🎯 Objetivo | <1 línea del brief> |
| 📂 Source | `running` \| `open` \| `cola` |
| 🔗 Brief | [chats/running/NNN-...md](...) |
| 🔗 Plan | [.claude/plan/...](../plan/...) |
```

### 2. Reporte de progreso del proyecto (siempre antes de arrancar trabajo)

Correr `bash .claude/scripts/progress.sh` y rendear su output **completo**. Incluye:

- 🗂️ Tabla de planes activos con barra de progreso `[████████░░] 80%` + sparkline + estado
- 📈 Sparklines de commits y briefs/sem (12w)
- 🔥 Top 8 subsistemas con churn
- 💀 Zonas muertas en código
- 📋 Top 5 cola del maestro

### 3. Flujo en vivo + estado final

A medida que avanzan las fases del modo, ir actualizando una tabla:

```markdown
## 🔄 Flujo en curso

| Fase | Resultado |
| --- | --- |
| 🔍 `/investigate` | <hallazgo principal en una línea> |
| 📐 `/design` | <decisión tomada \| skipped: razón> |
| ⚡ `/execute` | <N archivos tocados, lint OK> |
| ✅ `/validate` | lint ✅ · build ✅ · test ✅ (NNNN verdes) |
```

Y al final, banner de cierre del paso `/go`:

```markdown
## 🏁 Estado final

| | Detalle |
| --- | --- |
| ✅ Listo para `/end` | Validación pasó, criterios del brief cumplidos |
| ⏸️ Bloqueado | <causa> → sugerir `/block-chat` |
| ❓ Decisión | <pregunta concreta con opciones A/B> |

**Siguiente paso**: `/end` (cierre + commit) | `/block-chat` (pausa) | <responder pregunta>
```

> **Importante**: el output **no** debe ser solo texto plano de párrafo. Los 3 bloques son tablas o listas estructuradas para que sean escaneables de un vistazo. Mantener el formato consistente entre chats permite seguir el progreso sesión a sesión.

## Referencias

- [rules/backlog-hygiene.md](../rules/backlog-hygiene.md) — gate duro sobre `running/ ≤ 1`.
- [commands/start-chat.md](start-chat.md) — comando interno que `/go` absorbe para el move open→running.
- [commands/next-chat.md](next-chat.md) — plantilla de brief cuando `/go` genera uno desde la cola.
- [commands/block-chat.md](block-chat.md) — para pausar el chat por bloqueo externo/técnico.
- [commands/end.md](end.md) — cierre del chat (contraparte de `/go`).
- [commands/retomar.md](retomar.md) — variante "solo continuar `running/`", sin pull de cola.

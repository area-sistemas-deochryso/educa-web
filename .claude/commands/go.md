---
description: Modo Go — arrancar/continuar trabajo autónomo. Detecta estado (running/open/cola), arranca el brief correspondiente, y drivea modos internos sin intervención hasta terminar, bloquearse o necesitar decisión.
---

# /go (override de educa-web)

> Política universal: ver `~/.claude/commands/go.md`.

## Específico de educa-web

### Aplicar modelo / esfuerzo

Por **UI**: panel de **Modes** + slider de **Effort** en la barra inferior de Claude Code. El asistente no swappea modelo ni esfuerzo desde la skill.

Niveles de esfuerzo: `low` · `medium` · `high` · `xhigh` (default Opus 4.7) · `max`.

### Reportar recomendación

```text
## Modelo recomendado: opus · Esfuerzo: <low|medium|high>
Razón: <una línea — tipo del trabajo + señal dominante del brief>.
Acción: ajustá modo/esfuerzo por UI si querés cambiarlo, después respondé `y` (acepto), `n` (uso otro) o `seguir` (uso el actual sin tocar nada).
```

Esperar respuesta una sola vez. `y`/`seguir` → arrancar. `n` → no avanzar; esperar a que el usuario ajuste por UI y vuelva a tipear `/go`.

### Bucket excluido de la detección

`chats/awaiting-prod/` **no entra** en la detección. Briefs ahí esperan validación post-deploy — ese cierre lo resuelve [`/verify <NNN>`](verify.md). Para retomar trabajo de uno de ahí, usar `/verify` con caso rollback o esperar el deploy.

### Orden implícito de prioridad (caso 3)

Cuando hay >1 brief en `chats/open/`, aplicar este orden y tomar el primero. Solo preguntar si tras aplicar los 4 criterios sigue habiendo empate genuino:

1. Brief con `Estado: 🟡 WIP` o equivalente — alguien lo arrancó y no terminó.
2. Brief cuyo `Plan` aparece más arriba en la cola del maestro ("📋 Próximos chats").
3. Brief con fecha `Creado:` más antigua.
4. Brief con `NNN` más bajo.

Si después hay 2+ briefs **exactamente empatados** (mismo plan en cola, misma fecha, NNN consecutivos) → listar y preguntar (1 sola vez).

### Cuándo SÍ preguntar (excepciones al "no preguntar")

| Situación | Por qué |
| --- | --- |
| 2+ briefs en `open/` empatados tras aplicar los 4 criterios | Sin señal de prioridad |
| Cola del maestro con 2 items marcados "decidir antes de arrancar" | El maestro mismo lo dice |
| Brief en `running/` lleva >7d sin updates Y el usuario tipea `/go` | Confirmar antes de mover el viejo a `open/` |
| Brief activo es para `Educa.API` pero estás en `educa-web` (o viceversa) | Cambio de repo, no de chat |

Fuera de estas 4, **actuar sin preguntar**.

### Multi-repo (educa-web + Educa.API)

Cada brief lleva en su header:

```markdown
> **Repo destino**: `educa-web` (frontend, branch `main`) | `Educa.API` (backend, branch `master`).
```

`/go` debe respetar el repo destino. Si el brief es BE pero estás en FE (o viceversa), reportar:

> Brief es para `Educa.API`, pero estás en `educa-web`. Cambiá de repo (abrí Claude Code en `c:\Users\Asus Ryzen 9\EducaWeb\Educa.API\`) y volvé a tipear `/go`.

No hacer cross-repo edits desde el repo equivocado.

### Variantes del comando

- [`/retomar`](retomar.md) — variante segura: solo continúa lo que está en `running/`. No hace pull de cola. Útil para reabrir un chat sin riesgo de arrancar trabajo nuevo.

### Formato de salida (3 bloques visuales clavados)

#### 1. Banner de arranque

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

#### 2. Reporte de progreso (siempre antes de arrancar trabajo)

Correr `bash .claude/scripts/progress.sh` y rendear su output completo (sparklines de commits y briefs/sem, top 8 churn, zonas muertas, top 5 cola del maestro).

#### 3. Flujo en vivo + estado final

Tabla actualizable a medida que avanzan las fases:

```markdown
## 🔄 Flujo en curso

| Fase | Resultado |
| --- | --- |
| 🔍 `/investigate` | <hallazgo principal en una línea> |
| 📐 `/design` | <decisión tomada \| skipped: razón> |
| ⚡ `/execute` | <N archivos tocados, lint OK> |
| ✅ `/validate` | lint ✅ · build ✅ · test ✅ (NNNN verdes) |
```

Banner final:

```markdown
## 🏁 Estado final

| Estado | Detalle |
| --- | --- |
| ✅ Listo para `/end` | Validación pasó, criterios del brief cumplidos |
| ⏸️ Bloqueado | <causa> → sugerir `/block-chat` |
| ❓ Decisión | <pregunta concreta con opciones A/B> |

**Siguiente paso**: `/end` (cierre + commit) | `/block-chat` (pausa) | <responder pregunta>
```

> **Importante**: el output **no** debe ser solo texto plano. Los 3 bloques son tablas/listas estructuradas para escanear de un vistazo. La consistencia entre chats permite seguir el progreso sesión a sesión.

## Referencias locales

- [../rules/backlog-hygiene.md](../rules/backlog-hygiene.md) — gate `running/` ≤ 1.
- [start-chat.md](start-chat.md), [next-chat.md](next-chat.md), [block-chat.md](block-chat.md), [end.md](end.md), [validate.md](validate.md), [progress.md](progress.md), [retomar.md](retomar.md).

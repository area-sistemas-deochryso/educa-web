---
description: Modo Dev-Log — reporte técnico interno del trabajo del día, con jerga real y fases reales (cross-project).
---

# Modo: Dev-Log

**Objetivo**: reporte técnico interno de qué pasó hoy en el repo (o rango), pensado para **seguimiento propio**. Jerga libre. Nombres reales: paths, identifiers, plan IDs, fases, invariantes, ADRs, services. Mide avance por **fases del plan**, no por escala de despliegue.

Distinto del `/daily-report` de educa-web (audiencia externa: jefe, lenguaje de negocio, escala 25/50/75/100 basada en deploy). `/dev-log` es para vos — precisión sobre legibilidad.

## Qué hago

1. **Resolver rango**:
   - Default: hoy con hora actual.
   - Palabras clave: `hoy`, `ayer`, `semana`, `mes`.
   - Fecha o rango: `2026-05-12`, `2026-05-01..2026-05-12`.

2. **Recolectar evidencia** (en paralelo cuando se pueda):
   - `git log --since=<inicio> --until=<fin> --pretty=format:"%h %ad %s" --date=iso-strict` del repo actual.
   - `git status --short` para WIP sin commit.
   - `git diff --stat HEAD@{<inicio>}..HEAD` para volumen.
   - Glob de `.claude/chats/{running,closed,waiting,awaiting-prod,troubles}/*.md` filtrado por `mtime` en rango.
   - Leer briefs detectados — no la carpeta entera.
   - Si el brief referencia plan → leer plan file para mapear fases.
   - Si el rango toca `decisions/` → listar ADRs nuevos / cambios de estado.

3. **Agrupar por plan/feature**, no por commit. Un commit sin brief queda como su propia entrada en "Commits sueltos".

4. **Medir avance real** — en este orden de preferencia:
   - **Coordenada de fase**: `F2/F4 ✅` o `F3 in-progress (3/5 steps)` cuando el plan declara fases discretas.
   - **% derivado**: `fases-cerradas / fases-totales × 100` redondeado a 5%. Solo si las fases son contables (headings `### Fase N`, `### F-NN`, `### Step N`).
   - **Cualitativo**: `design ✅, execute pendiente` cuando no hay fases enumeradas. **No inventar %**.

5. **Detectar pendiente real**:
   - Commits locales sin push (`git log @{upstream}..HEAD`).
   - Briefs en `running/` con WIP sin cierre.
   - Plan files con fases marcadas ⏳/🟠 sin tocar en el rango.
   - ADRs propuestos sin sancionar.
   - Tasks en `tasks/pending/` que el día rozó tangencialmente.

6. **Drift opcional** (si aparece evidente):
   - Plan dice fase ✅ pero su archivo no se tocó en el rango y la última edición del plan es vieja.
   - Brief en `closed/` sin commit que matchee su `slug` en `git log`.

## Qué NO hago

- No traducir a lenguaje de negocio — esto es interno.
- No ocultar nombres internos.
- No inflar % cuando no hay base — preferir "no medible" sobre "70% estimado".
- No commitear ni mover briefs ni mutar archivos.
- No mezclar trabajo de días distintos salvo rango explícito.

## Formato de salida

```markdown
## 🛠️ Dev-Log — <repo> · <YYYY-MM-DD>[..YYYY-MM-DD]

### Bloque: <flow|feature|plan-id>
- **Plan**: `plans/<flow>/<NN>-<slug>.md`
- **Brief(s)**: `chats/closed/<NNN>-...md`, `chats/waiting/<NNN>-...md`
- **Avance**: F2/F4 ✅ · F3 in-progress (3/5 steps) · 62%
- **Commits**: <count> — `abc1234` <subject> · `def5678` <subject>
- **Files**: `src/path/file.ts:20-50`, `wasm/.../lib.rs`
- **Decisiones**: ADR-0026 sancionado · INV-XX nuevo
- **Pendiente**: F4 (smoke manual) · rewire TS de sub-chat B

### Bloque: <otro flow>
...

### Commits sueltos (sin brief)
- `hash` <subject> — <path/file>

### WIP sin commit
- `path/file.ts` — <breve qué cambió> (<+/-N líneas>)

### Pendiente real al cierre
- ⏳ <item concreto con next-action>
- ⏳ ...

### Drift (si hay)
- <observación 1 línea>
```

Sección vacía → omitirla.

## Argumentos

- `/dev-log` — hoy, repo actual.
- `/dev-log <fecha-o-rango>` — rango explícito.
- `/dev-log --repo <path>[,<path>]` — uno o múltiples repos.
- `/dev-log --plan <plan-ref>` — filtrar a un plan.
- `/dev-log --strict` — omitir % salvo base verificable; sin estimaciones cualitativas.
- `/dev-log --no-pendiente` — sólo lo hecho, sin sección de pendientes.
- `/dev-log --no-save` — no persistir a disco (sólo imprimir en chat).
- `/dev-log --save <path>` — override del path default.

## Reglas de medición

- **Fase = step cerrado del plan** cuando declara `## Fases` / headings `### Fase N` / `### F-NN`. Contar marcadores ✅ vs ⏳/🟠/🚫.
- **Sin fases enumeradas**: usar steps (`### Step N`) si los hay. Sin steps: cualitativo.
- **Commit sin brief**: aparece en "Commits sueltos" — no se le asigna fase.
- **Tiempo empleado**: NO se infiere (no es ese tipo de reporte). Si el usuario lo pide, mostrar rango entre primer y último commit del bloque como pista.

## Persistencia (por default ON)

Tras imprimir el reporte en chat, escribirlo también a disco para que el día a día quede trackeable.

- **Path default**: `<repo-root>/track-dev-log/YYYY-MM-DD.md` (rango único o primer día del rango).
- **Crear la carpeta si no existe** — `mkdir -p track-dev-log/`.
- **Auto-gitignore al crear la carpeta**: si la carpeta NO existía antes de esta invocación, escribir también `track-dev-log/.gitignore` con el contenido `*` en la primera línea y `!.gitignore` en la segunda. Eso excluye todos los archivos del folder pero deja el `.gitignore` mismo trackeable. **Default = los dev-logs no entran al repo remoto**. Para opt-in: borrar `track-dev-log/.gitignore` (o vaciarlo) y los próximos archivos quedan trackeables.
- **No recrear el `.gitignore` si ya no está** — si el usuario lo borró deliberadamente, `/dev-log` respeta esa decisión y no lo vuelve a escribir. Sólo se crea cuando la carpeta entera nace.
- **Overwrite, no append**: re-ejecutar `/dev-log` el mismo día reemplaza el archivo con el snapshot fresco (cada invocación es la foto más reciente, no historial intra-día).
- **Rango multi-día**: nombre `YYYY-MM-DD_YYYY-MM-DD.md` con guión bajo.
- **Opt-out total**: `--no-save` evita la escritura. `--save <path>` override del destino.

Al escribir el archivo, **antes** de overwrite del mismo día, avisar en chat con una línea (`> Sobreescribo track-dev-log/2026-05-12.md (snapshot anterior: 14:32)`). No preguntar — sólo informar.

## Cuándo correrlo

- Al cerrar el día — auditar qué se hizo y qué queda real (persiste a `track-dev-log/`).
- Después de un bloque pesado — saber qué fase quedó abierta.
- Antes de `/end` — confirmar que nada queda en aire.
- Para auto-seguimiento día a día por proyecto — los archivos en `track-dev-log/` quedan como timeline.
- **No es input** para `/daily-report` del jefe (educa-web).

## Override por proyecto

`<repo>/.claude/commands/dev-log.md` puede:

- Listar flows / planes típicos a chequear primero.
- Documentar convención de fase del proyecto (`F1/F2` vs `Step N` vs custom).
- Agregar secciones específicas (ej: en educa-web, "Despliegues" si aplica; en app-fgame, "Carril A movimientos").
- Apuntar a scripts locales que ya midan progreso por fase (`progress.sh`).
- Cambiar el path default de persistencia (ej: `.claude/track-dev-log/` en proyectos con convención `.claude/`).

## Referencias

- Distinto a `educa-web/.claude/commands/daily-report.md` (audiencia: jefe; lenguaje: negocio; escala: 25/50/75/100 deploy-evidence).
- Comandos hermanos: [`/progress`](progress.md), [`/queue`](queue.md), [`/triage`](triage.md), [`/end`](end.md).

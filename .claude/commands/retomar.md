# Modo: Retomar (continuar lo que está activo)

**Objetivo**: variante segura de [`/go`](go.md) acotada a continuar lo que está en `chats/running/`. **No hace pull de cola del maestro** — si `running/` está vacío, simplemente reporta y sugiere `/go` o `/start-chat`.

> **Por qué `/retomar` y no `/resume`**: Claude Code tiene un built-in `/resume` que captura el autocomplete y muestra historial de chats. Si nombrara este comando `/resume`, el autocomplete del CLI lo perdería frente al built-in. `/retomar` evita la colisión y mantiene el comando disponible al primer tab.

## Cuándo usarlo

| Caso | Comando recomendado |
|---|---|
| Reabriste un chat y querés continuar exactamente donde lo dejaste | **`/retomar`** |
| Acabás de cerrar un chat con `/end` y querés arrancar lo siguiente | `/go` |
| Querés que arranque trabajo nuevo si no hay nada activo | `/go` |
| Querés que **NO arranque trabajo nuevo** sin tu visto bueno | **`/retomar`** |

## Detección de estado

1. **`chats/running/` tiene brief** → continuar desde donde quedó (idéntico al paso 1 de `/go`):
   - Leer el brief completo + plan file + cualquier "Estado parcial" anotado por `/block-chat`.
   - Aplicar el modo sugerido del brief (`MODO SUGERIDO`).
   - Avanzar fase por fase sin confirmación, hasta uno de los 3 checkpoints de pausa (Completado / Bloqueador / Decisión).
2. **`chats/running/` vacío** → **abortar con reporte**:
   - Listar contenido de `chats/open/` (si hay).
   - Mostrar el primer item de la cola del maestro (si hay).
   - Sugerir explícitamente:
     - `/start-chat <NNN>` si querés arrancar uno específico de `open/`.
     - `/go` si querés que arranque automáticamente.

## Diferencia clave con `/go`

| `/go` | `/retomar` |
|---|---|
| Si `running/` vacío + `open/` con 1 brief → mueve y arranca | Si `running/` vacío → solo reporta, no toca `open/` |
| Si `running/` vacío + `open/` vacío → pull de cola del maestro y genera brief minimal | Si `running/` vacío → no toca cola, sugiere `/go` |
| Acción "agresiva" (arranca trabajo nuevo) | Acción "conservadora" (solo continúa lo activo) |

## Flujo autónomo (cuando `running/` tiene brief)

Idéntico al de `/go` paso 1 en adelante:

1. **Mostrar contexto del proyecto**: correr `bash .claude/scripts/progress.sh` y rendear su output **antes** del bloque "## Retomar".
2. **Leer** brief + plan file + pre-work obligatorio.
3. **Aplicar el modo sugerido del brief**.
4. **Avanzar fase por fase sin confirmación**, hasta llegar a uno de los 3 checkpoints de pausa.
5. **Cuando llegue la fase de validación**, dispatch lint/build/test en paralelo via `Agent`.
6. Al terminar, sugerir `/end`.

## Multi-repo

Mismo principio que `/go`: validar que el repo destino del brief coincide con el repo donde estás. Si no, abortar con instrucción de cambiar de repo.

## Qué NO hago

- **No hacer pull de cola** ni de `open/`. Solo continuar lo que ya está activo.
- **No commitear** — eso es trabajo de `/end`.
- **No cambiar el modo del brief** — uso el que dice `MODO SUGERIDO`.
- **No empezar trabajo nuevo** sin que el usuario lo pida explícitamente con `/go` o `/start-chat`.

## Argumentos opcionales

- `/retomar` (sin arg) — comportamiento default arriba.
- `/retomar <NNN>` — si el brief con ese NNN está en `running/`, retomarlo. Si no, error.

## Formato de salida

### Caso 1: hay brief activo (mismo patrón visual que `/go`)

#### 1. Banner de retoma

```markdown
## ↻ RETOMAR · educa-web · YYYY-MM-DD

| Campo | Valor |
| --- | --- |
| 🟢 Activo | Plan NN · Chat X · "Título corto" |
| 📁 Repo | `educa-web` (branch `main`) — ✅ correcto |
| 📋 Modo | `/<modo sugerido del brief>` |
| 🎯 Objetivo | <1 línea del brief> |
| ⏱️ Estado parcial | <"Lo que dejaste a medias", del brief si está anotado> |
| 🔗 Brief | [chats/running/NNN-...md](...) |
```

#### 2. Reporte de progreso del proyecto

Idéntico a `/go`: correr `bash .claude/scripts/progress.sh` completo (tabla de planes, sparklines, churn, zonas muertas, cola).

#### 3. Flujo en vivo + estado final

Misma tabla y banner que `/go`:

```markdown
## 🔄 Flujo en curso (continuando desde fase X)

| Fase | Resultado |
| --- | --- |
| ⚡ `/execute` (continúa) | <archivos tocados desde donde quedó> |
| ✅ `/validate` | lint ✅ · build ✅ · test ✅ |

## 🏁 Estado final

| | Detalle |
| --- | --- |
| ✅ Listo para `/end` | ... |
| ⏸️ Bloqueado | ... |
| ❓ Decisión | ... |
```

### Caso 2: no hay brief activo (no arranca cosas nuevas solo)

```markdown
## ↻ RETOMAR · educa-web · YYYY-MM-DD

⚪ `chats/running/` está vacío. **No hay nada activo que continuar.**

### Briefs disponibles en `chats/open/`

| NNN | Plan | Repo | Creado | Título |
| ---: | --- | --- | --- | --- |
| 038 | Plan 31 · Chat 2 | Educa.API | 2026-04-22 | Parser IMAP + Hangfire job |
| 052 | Plan 30b · FE | educa-web | 2026-04-27 | Sub-tab "Entradas con correo" |

### Próximo en cola del maestro

| # | Plan · Chat · Repo | Razón |
| ---: | --- | --- |
| 1 | Plan 31 · Chat 2 · Educa.API | Bloqueado hasta validación post-deploy del header... |
| 2 | Plan 24 · Chat 4 (B) · Educa.API | Subfase A' cerrada — falta medir 48-72h en prod... |

## 👉 Sugerencia

| Querés... | Tipear |
| --- | --- |
| Arrancar el brief 052 (más nuevo) | `/start-chat 052` |
| Arrancar el brief 038 (BE) | abrir Claude en `Educa.API/` y `/start-chat 038` |
| Detección automática (open o pull de cola) | `go` o `/go` |
| Ver triage completo de backlogs | `triage` o `/triage` |
```

> **Importante**: a diferencia de `/go`, `/retomar` **nunca** mueve briefs de `open/` ni hace pull de cola. Solo continúa lo activo o reporta. Es el comando "seguro" para reabrir un chat sin riesgo de arrancar trabajo nuevo accidental.

## Referencias

- [commands/go.md](go.md) — variante "agresiva" que sí hace pull de cola.
- [commands/start-chat.md](start-chat.md) — para arrancar un brief específico de `open/`.
- [commands/end.md](end.md) — cierre del chat.
- [rules/backlog-hygiene.md](../rules/backlog-hygiene.md).

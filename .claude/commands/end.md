# Modo: End (cierre de chat)

**Objetivo**: el único comando que necesitás para cerrar. Decide qué tipo de cierre aplica según el estado actual, sin que tengas que elegir entre commit, block, abort, etc.

**Principio**: `/end` es la contraparte de [`/go`](go.md). Lo invocás una vez, y Claude resuelve commit + movimiento de brief + update del maestro apropiado al caso.

## Detección de estado

1. **Brief en `running/` + trabajo completado** (validación pasa, criterios de cierre del brief cumplidos) → **caso /ship**.
2. **Brief en `running/` + trabajo a medias** (hay progreso pero falta validación o pasos) → **caso pausa**.
3. **Brief en `running/` + sin progreso real** → **caso rollback**.
4. **Sin brief en `running/` + cambios uncommitted** (típicamente infra/config/docs) → **caso commit aparte**.
5. **Sin brief ni cambios** → **caso sin-op**.

## Casos

### 1. /ship completo

Flujo de cierre con commit:

- **Correr validación técnica como `Agent`s en paralelo** (ver [validate.md](validate.md)). Una sola call con múltiples Agent tool uses:
  - Lint (`npm run lint` para FE, `dotnet build` para BE).
  - Build (`npm run build` para FE).
  - Test si hay specs unit relacionados al cambio (`npm test`, `dotnet test`).
- Si todo pasa:
  - Actualizar [plan/maestro.md](../plan/maestro.md): remover el item de la cola "📋 Próximos chats", actualizar el % del plan en el inventario si aplica, sumar derivados al final de la cola si los hay.
  - **Enriquecer brief minimal-from-go**: si el brief lleva el comentario HTML `<!-- minimal-from-go -->` (plantado por `/go` cuando lo generó desde la cola), antes del `git mv` cosechar del chat los aprendizajes transferibles, decisiones tomadas y métricas, y agregarlos al brief para que su versión en `closed/` no quede más pobre que un brief generado por `/next-chat`. Remover el comentario flag al hacerlo.
  - `git mv` brief `running/NNN-...md` → `closed/NNN-...md`.
  - **Delegar el commit en la skill correspondiente**:
    - Cambios solo FE → invocar `/commit-front` (skill existente).
    - Cambios solo BE → invocar `/commit-back` (skill existente).
    - Cambios en ambos → invocar `/commit-local` (skill existente).
  - El commit incluye **código + brief move + maestro update** en el mismo commit (invariante: brief no entra a `closed/` sin commit que lo mueva).
- Si validación falla, **no commitear**: reportar, degradar al caso 2 (pausa).

### 2. Pausa (trabajo a medias)

- **Commit de infra pendiente**: si hay cambios en `.claude/` (docs, reglas, config) que no son parte del brief, commitearlos aparte con scope apropiado (`docs`, `chore`) para no mezclarlos con el trabajo del brief.
- **Dejar el brief en `running/`** tal cual. El próximo `/go` o `/retomar` lo retoma.
- **Reportar**: qué quedó hecho, qué falta, dónde retomar.

### 3. Rollback (sin progreso real)

Si el brief se movió a `running/` pero no se hizo nada productivo (ej. se cambió de idea):

- **Opción A**: dejarlo en `running/` si vas a volver pronto.
- **Opción B**: `git mv` brief de `running/` a `open/` (liberar `running/` sin perder el brief). Actualizar maestro si lo había marcado en progreso.
- **Opción C**: abortar con brief a `closed/` y nota en el brief explicando el motivo.

Preguntar al usuario cuál, no decidir solo.

### 4. Commit aparte (sin brief activo)

- Identificar cambios: `git status` + `git diff`.
- Si son infra (`.claude/`, docs, hooks, settings): invocar `/commit-front` (cambios FE-side) o `/commit-local` (cross-repo) con scope `docs` o `chore`.
- Si son código de producto sin brief asociado: **warning** — esto es trabajo fuera del sistema de briefs. Preguntar si crear brief retroactivo o commitear tal cual.

### 5. Sin-op

Nada que hacer. Reportar `git log --oneline -3` + estado de backlogs y salir.

## Validación antes de cerrar (regla global)

Esto extiende la regla global del usuario `~/.claude/rules/validate-before-close.md`:

- Si se editaron archivos TS/HTML/SCSS del frontend → `npm run lint` (o al menos verificar que no hay errores de sintaxis obvios).
- Si se editaron archivos `.cs` del backend → `dotnet build`.
- Si la validación falla → reportar y degradar a caso 2 (pausa). NO commitear.

## Briefs en `.claude/chats/` y entradas en `.claude/history/`

Si hay briefs untracked de sesiones previas en `.claude/chats/closed/` o `.claude/chats/{open,waiting,troubles}/`, o entradas nuevas en `.claude/history/`, **preguntar explícitamente** si incluirlos en el commit de cierre:

> Hay briefs untracked de sesiones previas (X archivos en `.claude/chats/`). ¿Los incluyo en este commit de cierre o los dejo fuera?

Esta es la regla `~/.claude/rules/validate-before-close.md` aplicada al sistema de briefs.

## Qué NO hago

- **No fuerzo commit** si validación falla — eso crearía un commit roto.
- **No salto el invariante**: brief a `closed/` **siempre** con commit que lo mueve ahí.
- **No mezclo** cambios de infra con trabajo del brief en el mismo commit — separados.
- **No genero brief de próximo chat automáticamente**. Eso es [`/next-chat`](next-chat.md) explícito si hay trabajo derivado que no entre en la cola del maestro.
- **No pusheo a remoto**. Siempre manual via skills `push-front` / `push-back`.
- **No invento commit messages crudos** — siempre delego en `/commit-front`, `/commit-back` o `/commit-local`.

## Argumentos opcionales

- `/end` (sin arg) — detección automática.
- `/end force-ship` — forzar caso 1 aunque Claude detecte caso 2. Útil si querés cerrar con "está listo aunque yo dude".
- `/end pause` — forzar caso 2 aunque el trabajo parezca completo. Deja todo para el próximo `/go`.
- `/end abort` — forzar caso 3 con move a `closed/` y nota de abortado.

## Formato de salida

El output se compone de **4 bloques visuales** clavados:

### 1. Banner de cierre

```markdown
## ✅ END · educa-web · YYYY-MM-DD

| Campo | Valor |
| --- | --- |
| 📌 Caso | `/ship` \| pausa \| rollback \| commit-aparte \| sin-op |
| 🔗 Brief | running/NNN-...md → **closed/** (o "sigue en running/") |
| 💾 Commit | `<hash>` via `/commit-front` \| `/commit-back` \| `/commit-local` (o "ninguno: <motivo>") |
| 📋 Maestro | cola actualizada · % de plan NN: 80% → 100% (o "sin cambios") |
```

### 2. Validación (tabla con resultado por chequeo)

```markdown
### 🔍 Validación

| Chequeo | Resultado |
| --- | --- |
| Lint (`npm run lint` \| `dotnet build`) | ✅ 0 errores · 0 warnings nuevos |
| Build (`npm run build`) | ✅ |
| Test (`npm test` \| `dotnet test`) | ✅ NNNN verdes (baseline NNNN, +N tests nuevos) |
| Drift docs/código | ✅ \| ⚠️ <archivo> \| ⏭️ N/A |
```

### 3. Resumen de la sesión (delta de qué cambió)

```markdown
### 📂 Archivos tocados

| Path | Tipo | Líneas | Detalle |
| --- | --- | ---: | --- |
| `src/app/.../foo.component.ts` | M | +45/-12 | <qué cambió en una línea> |
| `src/app/.../foo.component.html` | M | +20/-3 | ... |
| `.claude/chats/closed/052-...md` | R | — | brief movido (running → closed) |
| `.claude/plan/maestro.md` | M | +2/-1 | item removido de cola |

**Stats**: N archivos modificados · +X / -Y líneas · N tests nuevos (suite NNNN → MMMM)
```

### 4. Reporte de progreso post-cierre + siguiente sesión

Correr `bash .claude/scripts/progress.sh` y rendear su output **completo** (tabla de planes con barras actualizadas, sparklines, churn, zonas muertas, cola del maestro).

Después del progress, banner de cierre:

```markdown
## 👉 Siguiente sesión

| Acción | Comando |
| --- | --- |
| Retomar lo que está activo en `running/` | tipear `retomar` o `/retomar` |
| Arrancar el siguiente trabajo (open/cola) | tipear `go` o `/go` |
| Ver estado de los 6 backlogs con acciones sugeridas | tipear `triage` o `/triage` |

**Recomendación basada en el cierre**: <1 línea con sugerencia concreta — ej: "El siguiente en cola es Plan 31 Chat 2 BE — abrir chat en `Educa.API` y tipear `go`".
```

> **Importante**: el output **no** debe ser solo texto plano de párrafo. Los 4 bloques son tablas estructuradas para que sean escaneables de un vistazo. La consistencia entre cierres permite ver de un vistazo cómo evolucionó el proyecto (tests, % de planes, archivos tocados) sesión a sesión.

## Referencias

- [commands/go.md](go.md) — contraparte: arranca el chat siguiente.
- [commands/commit-front.md](../skills/commit-front/SKILL.md) (si aplica) o `/commit-front`, `/commit-back`, `/commit-local` — skills de commit existentes.
- [commands/next-chat.md](next-chat.md) — si hay trabajo derivado que encolar, invocar explícito.
- [commands/progress.md](progress.md) — reporte visual que se rendea post-cierre.
- [rules/backlog-hygiene.md](../rules/backlog-hygiene.md) — higiene reportada al cerrar.
- Regla global: `~/.claude/rules/validate-before-close.md`, `~/.claude/rules/closing-summary.md`.

# Modo: End (cierre de chat)

**Objetivo**: el único comando que necesitás para cerrar. Decide qué tipo de cierre aplica según el estado actual, sin que tengas que elegir entre commit, block, abort, etc.

**Principio**: `/end` es la contraparte de [`/go`](go.md). Lo invocás una vez, y Claude resuelve commit + movimiento de brief + update del maestro apropiado al caso.

## Recomendación de modelo y esfuerzo (antes de arrancar)

> **Antes de cualquier acción del flujo**, recomendar al usuario el modelo y nivel de esfuerzo. Esperar `y` / `n` / `seguir` antes de continuar.

Los cambios reales los hace el usuario **por UI** (panel de **Modes** + slider de **Effort** en la barra inferior de Claude Code). El asistente no swappea modelo ni esfuerzo — solo recomienda y espera confirmación.

`/end` es **mecánico por diseño**: detección de estado + dispatch de validación a Agents paralelos + edits de texto en brief/maestro + commits delegados a skills. **Recomendación por defecto**: opus + `low`. No hay razonamiento que justifique `xhigh`/`max` en un cierre típico.

### Cuándo subir el esfuerzo

| Situación | Esfuerzo |
| --- | --- |
| Validación pasa, todo limpio, /ship directo | `low` |
| Enriquecer brief minimal-from-go con aprendizajes capturados del chat | `low` (sigue mecánico) |
| Caso 2 (pausa): commit de infra + reporte de qué quedó | `low` |
| Caso 3 (rollback): elegir entre opciones A/B/C con el usuario | `medium` (hay decisión real) |
| Caso 4 (commit aparte): sin brief, identificar scope correcto | `low` |
| Validación falla y el cierre escala a debugging del fail | reportar y sugerir subir a `medium`, **no auto-cambiar** |

### Formato del reporte (antes del banner de cierre)

```text
## Modelo recomendado: opus · Esfuerzo: low
Razón: /end es mecánico (validate dispatch + text edits + commits).
Acción: ajustá modo/esfuerzo por UI si querés cambiarlo, después respondé `y` (acepto), `n` (uso otro) o `seguir` (uso el actual sin tocar nada).
```

**Esperar respuesta una sola vez** antes de continuar al banner de cierre y al flujo de [Detección de estado](#detección-de-estado). Si el usuario responde `y` o `seguir`, arrancar. Si responde `n`, no avanzar — esperar a que ajuste por UI y vuelva a tipear `/end`.

**Excepción**: si la validación falla y el cierre se vuelve un debugging real, reportar el cambio de magnitud y sugerir subir el esfuerzo — el cierre se degrada a caso 2 (pausa) y la decisión de subir esfuerzo es del usuario.

## Detección de estado

1. **Brief en `running/` + trabajo completado** (validación pasa, criterios de cierre del brief cumplidos) → **caso /ship**.
2. **Brief en `running/` + trabajo a medias** (hay progreso pero falta validación o pasos) → **caso pausa**.
3. **Brief en `running/` + sin progreso real** → **caso rollback**.
4. **Sin brief en `running/` + cambios uncommitted** (típicamente infra/config/docs) → **caso commit aparte**.
5. **Sin brief ni cambios** → **caso sin-op**.

> Nota: el bucket `awaiting-prod/` (chats cerrados localmente esperando validación post-deploy) NO entra en esta detección. `/end` solo lo **alimenta** (en caso 1 cuando aplica el gate). Para mover un brief de `awaiting-prod/` → `closed/` o `awaiting-prod/` → `running/`, usar [`/verify`](verify.md).

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
  - **Gate post-deploy** (paso nuevo): preguntar al usuario:
    > ¿Este chat requiere **validación post-deploy** antes de considerarse 100% terminado? (smoke test browser, query SQL en prod, validación del jefe, telemetría observada, etc.) — `s/n`
    - **Si responde `s`** → el destino del `git mv` es `chats/awaiting-prod/NNN-...md` (NO `closed/`). Agregar línea `> **Validación prod**: ⏳ pendiente desde YYYY-MM-DD` debajo del header del brief antes de mover. La verificación se completa después con [`/verify <NNN>`](verify.md). Heurística para auto-sugerir `s` por default: si el brief o la conversación contienen frases como "post-deploy", "smoke test", "validar en prod", "subir a azure", "esperar telemetría", "el jefe valida", o el commit está sin pushear, sugerir `s` y pedir confirmación.
    - **Si responde `n`** → flujo actual, destino `closed/`.
  - `git mv` brief `running/NNN-...md` → `closed/NNN-...md` **o** `awaiting-prod/NNN-...md` según el gate.
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
| 🔗 Brief | running/NNN-...md → **closed/** \| **awaiting-prod/** (gate post-deploy) \| (sigue en running/) |
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
| Ver estado de los 7 backlogs con acciones sugeridas | tipear `triage` o `/triage` |
| Verificar un chat en `awaiting-prod/` post-deploy | tipear `/verify <NNN>` |

**Recomendación basada en el cierre**: <1 línea con sugerencia concreta — ej: "El siguiente en cola es Plan 31 Chat 2 BE — abrir chat en `Educa.API` y tipear `go`".
```

> **Importante**: el output **no** debe ser solo texto plano de párrafo. Los 4 bloques son tablas estructuradas para que sean escaneables de un vistazo. La consistencia entre cierres permite ver de un vistazo cómo evolucionó el proyecto (tests, % de planes, archivos tocados) sesión a sesión.

## Referencias

- [commands/go.md](go.md) — contraparte: arranca el chat siguiente.
- [commands/verify.md](verify.md) — cierra el ciclo de un chat en `awaiting-prod/` cuando la verificación post-deploy pasó (o falló).
- [commands/commit-front.md](../skills/commit-front/SKILL.md) (si aplica) o `/commit-front`, `/commit-back`, `/commit-local` — skills de commit existentes.
- [commands/next-chat.md](next-chat.md) — si hay trabajo derivado que encolar, invocar explícito.
- [commands/progress.md](progress.md) — reporte visual que se rendea post-cierre.
- [rules/backlog-hygiene.md](../rules/backlog-hygiene.md) — higiene reportada al cerrar.
- Regla global: `~/.claude/rules/validate-before-close.md`, `~/.claude/rules/closing-summary.md`.

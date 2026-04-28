---
description: Modo End — cerrar el chat. Detecta estado (brief en running/ con trabajo terminado, a medias, o sin brief) y decide entre commit completo, commit parcial, o salida limpia.
---

# /end (override de educa-web)

> Política universal: ver `~/.claude/commands/end.md`.

## Específico de educa-web

### Aplicar modelo / esfuerzo

Por **UI**: panel de **Modes** + slider de **Effort** en la barra inferior de Claude Code.

### Reportar recomendación

```text
## Modelo recomendado: opus · Esfuerzo: low
Razón: /end es mecánico (validate dispatch + text edits + commits).
Acción: ajustá modo/esfuerzo por UI si querés cambiarlo, después respondé `y` (acepto), `n` (uso otro) o `seguir` (uso el actual sin tocar nada).
```

Esperar respuesta una sola vez antes del banner de cierre. `y`/`seguir` → arrancar. `n` → esperar a que ajuste por UI y vuelva a tipear `/end`.

### Validación en caso ship — comandos exactos

Una sola call con múltiples Agent tool uses:

**Frontend (`educa-web/`)**:

```text
Agent(description: "Lint check FE", prompt: "Corré `npm run lint` en cwd. Reportá pasó/falló + warnings count. <100 palabras.")
Agent(description: "Build check FE", prompt: "Corré `npm run build`. Reportá éxito/falla + último error. <100 palabras.")
Agent(description: "Test suite FE", prompt: "Corré `npm test`. Reportá `N pass / M fail`. <100 palabras.")
```

**Backend (`Educa.API/`)**:

```text
Agent(description: "Build BE", prompt: "Corré `dotnet build`. Reportá éxito/falla + errores. <100 palabras.")
Agent(description: "Test BE", prompt: "Corré `dotnet test --no-build`. Reportá `N pass / M fail`. <100 palabras.")
```

### Gate post-deploy (paso nuevo, exclusivo de educa-web)

En caso ship, antes del `git mv` final, preguntar al usuario:

> ¿Este chat requiere **validación post-deploy** antes de considerarse 100% terminado? (smoke test browser, query SQL en prod, validación del jefe, telemetría observada, etc.) — `s/n`

- **Si responde `s`** → destino del `git mv` es `chats/awaiting-prod/NNN-...md` (NO `closed/`). Agregar línea `> **Validación prod**: ⏳ pendiente desde YYYY-MM-DD` debajo del header del brief antes de mover. La verificación se completa después con [`/verify <NNN>`](verify.md).
- **Si responde `n`** → destino `closed/`.

**Heurística para auto-sugerir `s`**: si el brief o la conversación contienen frases como "post-deploy", "smoke test", "validar en prod", "subir a azure", "esperar telemetría", "el jefe valida", o el commit está sin pushear, sugerir `s` y pedir confirmación.

### Commit delegado a skills

El commit lo invocan skills externas según el repo:

- Cambios solo FE → `/commit-front`.
- Cambios solo BE → `/commit-back`.
- Cambios en ambos → `/commit-local`.

El commit incluye **código + brief move + maestro update** en el mismo commit (invariante).

Reglas de commit message: ver `~/.claude/rules/commit-style.md` y la skill local [../skills/commit/SKILL.md](../skills/commit/SKILL.md).

### Briefs untracked / `.claude/history/`

Si hay briefs untracked de sesiones previas en `chats/closed/` o `chats/{open,waiting,troubles}/`, o entradas nuevas en `.claude/history/`, **preguntar explícitamente** si incluirlos:

> Hay briefs untracked de sesiones previas (X archivos en `.claude/chats/`). ¿Los incluyo en este commit de cierre o los dejo fuera?

Esta es la regla `~/.claude/rules/validate-before-close.md` aplicada al sistema de briefs.

### Reporte post-cierre

Después del cierre, **siempre** correr `bash .claude/scripts/progress.sh` y rendear su output completo (tabla de planes con barras actualizadas, sparklines, churn, zonas muertas, cola del maestro).

### Formato de salida (4 bloques visuales clavados)

#### 1. Banner de cierre

```markdown
## ✅ END · educa-web · YYYY-MM-DD

| Campo | Valor |
| --- | --- |
| 📌 Caso | `/ship` \| pausa \| rollback \| commit-aparte \| sin-op |
| 🔗 Brief | running/NNN-...md → **closed/** \| **awaiting-prod/** (gate post-deploy) \| (sigue en running/) |
| 💾 Commit | `<hash>` via `/commit-front` \| `/commit-back` \| `/commit-local` (o "ninguno: <motivo>") |
| 📋 Maestro | cola actualizada · % de plan NN: 80% → 100% (o "sin cambios") |
```

#### 2. Validación

```markdown
### 🔍 Validación

| Chequeo | Resultado |
| --- | --- |
| Lint (`npm run lint` \| `dotnet build`) | ✅ 0 errores · 0 warnings nuevos |
| Build (`npm run build`) | ✅ |
| Test (`npm test` \| `dotnet test`) | ✅ NNNN verdes (baseline NNNN, +N tests nuevos) |
| Drift docs/código | ✅ \| ⚠️ <archivo> \| ⏭️ N/A |
```

#### 3. Resumen de la sesión

```markdown
### 📂 Archivos tocados

| Path | Tipo | Líneas | Detalle |
| --- | --- | ---: | --- |
| `src/app/.../foo.component.ts` | M | +45/-12 | <qué cambió en una línea> |
| `.claude/chats/closed/052-...md` | R | — | brief movido (running → closed) |
| `.claude/plan/maestro.md` | M | +2/-1 | item removido de cola |

**Stats**: N archivos modificados · +X / -Y líneas · N tests nuevos (suite NNNN → MMMM)
```

#### 4. Reporte de progreso post-cierre + siguiente sesión

Correr `bash .claude/scripts/progress.sh` y rendear su output completo. Después:

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

## Referencias locales

- [go.md](go.md) — contraparte.
- [verify.md](verify.md) — cierra el ciclo de un chat en `awaiting-prod/` post-deploy.
- [next-chat.md](next-chat.md) — si hay trabajo derivado.
- [progress.md](progress.md) — reporte visual post-cierre.
- [../rules/backlog-hygiene.md](../rules/backlog-hygiene.md).
- Skills de commit: [`/commit-front`, `/commit-back`, `/commit-local`](../skills/) (existentes).

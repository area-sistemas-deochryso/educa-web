---
description: Modo End — cerrar el chat. Detecta estado (brief en running/ con trabajo terminado, a medias, o sin brief) y decide entre commit completo, commit parcial, o salida limpia.
---

# /end (override educa-web)

> Override de `~/.claude/commands/end.md` global. Solo deltas por paso.

## Paso 2 — Modelo/esfuerzo

Ajustar por **UI**: panel de **Modes** + slider de **Effort** en la barra inferior de Claude Code.

```text
## Modelo recomendado: opus · Esfuerzo: low
Razón: /end es mecánico (validate dispatch + text edits + commits).
Acción: ajustá modo/esfuerzo por UI si querés cambiarlo, después respondé `y`, `n` o `seguir`.
```

## Paso 4 — Validación (comandos)

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

## Paso 5 — Gate post-deploy (keywords extra)

Keywords adicionales para auto-suggest `s`: "subir a azure", "el jefe valida".

Verificación posterior: [`/verify <NNN>`](verify.md).

## Paso 6 — Commit (skills)

| Cambios en | Skill |
|---|---|
| Solo FE | `/commit-front` |
| Solo BE | `/commit-back` |
| Ambos | `/commit-local` |

Commit message: `~/.claude/rules/commit-style.md` + [`../skills/commit/SKILL.md`](../skills/commit/SKILL.md).

## Paso 9 — Cross-repo (repos hermanos)

| Adyacencia | Repo |
|---|---|
| `../educa-coord/` | coord |
| `../Educa.API/` | backend |

## Paso 10 — Progreso (script)

```bash
bash .claude/scripts/progress.sh
```

## Paso 11 — Siguiente sesión (opciones extra)

| Acción | Comando |
|---|---|
| Verificar chat en `awaiting-prod/` post-deploy | `/verify <NNN>` |

## Worktree-awareness

Si estamos en un worktree (detectar con `git rev-parse --git-common-dir` ≠ `.git`):

- **El commit va a la branch del worktree** (`chat/<NNN>-<slug>`), no a main.
- **Brief se mueve a `closed/`** dentro del worktree (el commit queda en la branch).
- **No mergear a main** desde `/end` — eso es `/wt-merge` (paso separado).
- **Actualizar `lastHeartbeat`** en el manifest del main repo.
- **Post-ship hint obligatorio**:

```
> 💡 `/wt-merge <NNN>-<slug>` — worktree cerrado, integrá a trunk.
```

En **caso pausa**: dejar todo intacto, el worktree y la entry en manifest persisten. Además, actualizar `lastHeartbeat` en el manifest para reflejar la última actividad real.

## Referencias locales

- [go.md](go.md) — contraparte.
- [verify.md](verify.md) — cierra ciclo de `awaiting-prod/`.
- [next-chat.md](next-chat.md) — trabajo derivado.
- [progress.md](progress.md) — reporte visual.
- [../rules/backlog-hygiene.md](../rules/backlog-hygiene.md) — límites y edades.
- Skills: [`/commit-front`](commit-front.md), [`/commit-back`](commit-back.md), [`/commit-local`](commit-local.md).

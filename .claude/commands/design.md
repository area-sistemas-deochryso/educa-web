---
description: Modo Diseñar — proponer enfoque/arquitectura y dejarlo escrito antes de ejecutar.
---

# /design (override de educa-web)

> Política universal: ver `~/.claude/commands/design.md`.

## Específico de educa-web

### Plan files

Ubicación: [../plan/](../plan/) (singular). Cada plan numerado (`plan-NN.md` o equivalente). Sub-maestro de cada plan opcional. El maestro vive en [../plan/maestro.md](../plan/maestro.md) — contiene foco actual + cola "📋 Próximos chats".

### Invariantes nominados (INV-*)

Cuando el diseño toca código del BE, **enumerar los INV-*** que aplican y dejar explícito cómo el plan los respeta. Algunos típicos:

- Convenciones de naming: `*Controller.cs`, `*Service.cs`, `*Repository.cs`.
- Lectura: usar `AsNoTracking()` en queries que no mutan.
- Background work: fire-and-forget para tareas async no críticas.
- Cap 300 ln por archivo.

Si un INV-* nuevo emerge del diseño, agregarlo a las rules del BE (en `Educa.API/.claude/rules/` si existe) en el mismo plan, no en otro chat.

### Cross-repo

Si el diseño abarca FE+BE, listar **los dos repos** en el alcance:

- FE: archivos en `educa-web/src/...` con líneas estimadas.
- BE: archivos en `Educa.API/...` con líneas estimadas.

Indicar **orden de implementación** (típicamente BE primero, FE después).

### Reglas duras

- [../rules/code-style.md](../rules/code-style.md), [../rules/code-language.md](../rules/code-language.md), [../rules/comments.md](../rules/comments.md) — convenciones del proyecto.

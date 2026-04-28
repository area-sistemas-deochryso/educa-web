---
description: Modo Validar — verificar que el cambio funciona o auditar código existente.
---

# /validate (override de educa-web)

> Política universal: ver `~/.claude/commands/validate.md`.

## Específico de educa-web

### Comandos exactos para los agentes paralelos

**Frontend (`educa-web/`)**:

```text
Agent(description: "Lint check FE", prompt: "Corré `npm run lint` en cwd. Reportá pasó/falló + warnings count. <100 palabras.")
Agent(description: "Build check FE", prompt: "Corré `npm run build`. Reportá éxito/falla + último error si falló. <100 palabras.")
Agent(description: "Test suite FE", prompt: "Corré `npm test`. Reportá `N pass / M fail` + nombres de los que fallaron. <100 palabras.")
```

**Backend (`Educa.API/`)**:

```text
Agent(description: "Build BE", prompt: "Corré `dotnet build` en cwd. Reportá éxito/falla + errores. <100 palabras.")
Agent(description: "Test BE", prompt: "Corré `dotnet test --no-build`. Reportá `N pass / M fail`. <100 palabras.")
```

### Code review por severidad

Para auditar código existente (no validar cambios), usar [`/audit`](../../../.claude/commands/audit.md) — modo separado con reporte por severidad (Bug / Regla violada / Inconsistencia / Observación). El proyecto puede agregar override local `commands/audit.md` si necesita reglas específicas (INV-*, paths típicos).

### Cross-repo

Si el cambio toca ambos repos, correr **los agentes de ambos** en paralelo (5-6 agentes en una sola llamada). Reportar separado por repo.

### Validación de docs (`.claude/`)

Si se editaron archivos en `.claude/`, correr el hook local de checks (si está configurado en `[../hooks/](../hooks/)`).

---
description: Modo Investigar — explorar y juntar hechos del código sin modificar nada.
---

# /investigate (override de educa-web)

> Política universal: ver `~/.claude/commands/investigate.md`.

## Específico de educa-web

### Documentación local relevante

- Estructura del FE: [../docs/](../docs/) (si existe).
- Plan maestro y planes activos: [../plan/maestro.md](../plan/maestro.md).
- Skills internas (incluye `commit`, etc.): [../skills/](../skills/).

### Cross-repo (FE ↔ BE)

Investigaciones que cruzan los dos repos (`educa-web` frontend + `Educa.API` backend):

- Si la query incluye un endpoint, leer **el controller del BE** además del servicio del FE — `educa-web/src/...` solo cuenta cómo se consume.
- Convenciones BE: sufijos `*Controller.cs` / `*Service.cs` / `*Repository.cs`. Reglas INV-* viven en `Educa.API/.claude/rules/` (si están).
- Reportar cuál de los 2 repos contiene el código para que el chat siguiente abra el correcto.

### Invariantes nominados

`INV-*` en el BE — antes de inferir comportamiento, buscar la regla del invariante. La violación silenciosa es el caso típico que `/investigate` debe encontrar.

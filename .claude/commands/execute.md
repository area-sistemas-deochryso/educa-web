---
description: Modo Ejecutar — implementar el plan acordado sin scope creep.
---

# /execute (override de educa-web)

> Política universal: ver `~/.claude/commands/execute.md`.

## Específico de educa-web

### Comandos del stack

**Frontend (`educa-web/`)**:

```bash
npm install                       # Si cambió package.json
npm run lint                      # ESLint, debe pasar
npm run build                     # Build producción
npx tsc --noEmit                  # Typecheck rápido durante implementación
npm test                          # Tests (si aplica)
```

**Backend (`Educa.API/`)** — solo si el chat es BE o cross-repo:

```bash
dotnet build                      # Build .NET
dotnet test --no-build            # Tests
```

### Reglas duras del proyecto

No romper sin discutir primero:

- Convenciones de naming: `*Controller.cs`, `*Service.cs`, `*Repository.cs` (BE).
- Standalone components + OnPush por default (FE).
- `inject()` sobre constructor injection (FE).
- Signals + control flow `@if/@for` (FE).
- 300 ln cap por archivo.

Ver [../rules/code-style.md](../rules/code-style.md), [../rules/code-language.md](../rules/code-language.md), [../rules/comments.md](../rules/comments.md).

### Invariantes nominados (INV-*)

Si el plan menciona INV-* del BE, **respetarlos exactamente** — son la razón por la que el plan es viable. Si alguno no se puede cumplir, frenar y escalar con `/ask` antes de improvisar.

### Cross-repo

Si el chat toca FE+BE, **commits separados**:

- BE → en `Educa.API/`: usar `/commit-back` (o seguir las reglas de la skill `commit` del BE si existe).
- FE → en `educa-web/`: usar `/commit-front`.
- Hay un `/commit-local` para commits que solo tocan archivos de `.claude/`.

Reglas de commit message (idioma inglés, español solo en `"..."` para términos de dominio, sin `Co-Authored-By:`): ver `~/.claude/rules/commit-style.md` y la skill local `[../skills/commit/SKILL.md](../skills/commit/SKILL.md)`.

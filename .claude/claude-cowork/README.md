# claude-cowork/ — pointer

> **Cowork vive en `educa-coord`**, no aquí. Este README solo existe para que cualquiera que aterrice acá sepa adónde ir.

## Ubicación canónica

```
c:\Users\Asus Ryzen 9\EducaWeb\educa-coord\.claude\claude-cowork\
```

Ahí están:

- `SETUP-COWORK.md` — setup del entorno (login, browser MCP, limitaciones técnicas front + back).
- `wal-integration-smoke.md` — checklist canónico del subsistema WAL.
- `verify-awaiting-prod-<fecha>.md` — checklist del round vivo de post-deploy.
- `reporte-claude-cowork.md` — diario append-only de sesiones QA.
- `history/` — checklists y handoffs de rounds cerrados.

## Por qué

Cowork valida `awaiting-prod/` cross-repo (front + back). El repo de coordinación (`educa-coord`) es el lugar natural: ya concentra `plans/`, `decisions/`, `fitness/` y todo lo que vive entre los dos productos. Antes Cowork vivía aquí espejado en cada proyecto, pero solo `educa-web` tenía contenido — duplicación sin valor.

## Cómo seguís

- **Sesión de Cowork**: abrí el chat en cualquier repo y leé primero `educa-coord/.claude/claude-cowork/SETUP-COWORK.md`.
- **Hallazgos de este repo (front)**: se siguen anotando en el `SETUP-COWORK.md` (§7 abiertos, §8 verificados) en coord. No volver a crear archivos sueltos acá.

## Ver también

- [`educa-coord/.claude/claude-cowork/README.md`](../../../educa-coord/.claude/claude-cowork/README.md)

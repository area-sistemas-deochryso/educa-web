# claude-cowork/

Namespace de **Cowork** dentro de `.claude/`. Cowork es QA asistido en navegador
(extensión "Claude in Chrome"), distinto de Claude Code (CLI/IDE). Vive separado
para no mezclarse con `commands/`, `hooks/`, `settings.json` y demás infra que
Claude Code autodescubre desde rutas fijas.

## Archivos vigentes

| Archivo | Rol | Cuándo leerlo |
| --- | --- | --- |
| [SETUP-COWORK.md](SETUP-COWORK.md) | Setup del proyecto + hallazgos abiertos/verificados | **Siempre primero**. Login, browser MCP a usar, limitaciones técnicas (PrimeNG `p-select`, `withFetch`, IndexedDB). |
| [wal-integration-smoke.md](wal-integration-smoke.md) | Checklist canónico del subsistema WAL (8 casos). Política de merge: corre el smoke ante cualquier PR que toque `core/services/wal/`. | Si el contexto es **WAL específicamente** (PR que toca el engine, regression a investigar). Independiente del flujo de awaiting-prod. |
| [verify-awaiting-prod-2026-05-18.md](verify-awaiting-prod-2026-05-18.md) | Checklist activo de validación post-deploy 2026-05-18 (8 briefs verificables por Cowork solo, sesión Director). | Round actual de awaiting-prod. Cuando se cierre, mover a `history/`. |
| [reporte-claude-cowork.md](reporte-claude-cowork.md) | Diario append-only de sesiones QA. Cada cierre anexa un bloque (no sobreescribe). | Al cerrar una sesión Cowork — anexar bloque con resumen + hallazgos. Para auditar sesiones previas. |
| [README.md](README.md) | Este archivo (índice + flujo de lectura). | Punto de entrada al namespace. |
| [history/](history/) | Checklists y handoffs de rounds ya cerrados. Referencia de formato para reusar. | Solo al armar el próximo checklist post-deploy o auditar cómo se validó un brief específico. |

## Flujo de lectura para Cowork

> Cuando el usuario pida una validación browser, leé en este orden:

1. **`SETUP-COWORK.md`** — qué browser MCP, qué credenciales, qué limitaciones evitar.
2. Si el round actual de `awaiting-prod/` ya tiene checklist armado, leé ese (vivirá como hermano de este README cuando se arme). Si no, mirar `history/` como template y armar uno nuevo basado en los briefs vivos de `.claude/chats/awaiting-prod/`.
3. Por cada caso que arranques, leé el brief original en `.claude/chats/awaiting-prod/<NNN>` para los pasos exactos.
4. Reportá usando el formato del final de `SETUP-COWORK.md`.

## Convenciones

- **Hallazgos**: se anexan al `SETUP-COWORK.md` por sesión, en la sección
  correspondiente (§7 abiertos, §8 verificados). No crear archivos sueltos
  por hallazgo — todo va al SETUP.
- **Reportes de sesión**: se anexan a `reporte-claude-cowork.md` (append-only,
  no sobreescribir).
- **Checklists post-deploy**: cuando un round de `awaiting-prod/` se valida,
  el archivo guía vive temporalmente como hermano de este README. Al cerrar
  el round, mover a `history/<archivo>-YYYY-MM-DD.md`.
- **Paths a infra del proyecto**: relativos a `../rules/`, `../docs/`,
  `../systems/`. El `.claude/` raíz es la infra de Claude Code y queda en
  su ruta convencional.

## Playbook genérico

Ver `C:\devtest\qa-cowork-playbook.md` (cross-project, fuera del repo) para
el flujo de Cowork — protocolo de hallazgos, severidades, formato.

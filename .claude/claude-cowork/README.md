# claude-cowork/

Namespace de **Cowork** dentro de `.claude/`. Cowork es QA asistido en navegador
(extensión "Claude in Chrome"), distinto de Claude Code (CLI/IDE). Vive separado
para no mezclarse con `commands/`, `hooks/`, `settings.json` y demás infra que
Claude Code autodescubre desde rutas fijas.

## Archivos

| Archivo | Rol | Cuándo leerlo |
|---|---|---|
| [SETUP-COWORK.md](SETUP-COWORK.md) | Setup del proyecto + hallazgos abiertos/verificados | **Siempre primero**. Login, browser MCP a usar, limitaciones técnicas (PrimeNG `p-select`, `withFetch`, IndexedDB). |
| [test-now-awaiting-prod.md](test-now-awaiting-prod.md) | **Punto de entrada para validación inmediata**: curaduría de los casos de `awaiting-prod/` que se pueden testear ahora sin esperar (deploy ya en prod). | **Lee este apenas el usuario pide validar awaiting-prod**. Indica el orden, agrupa por bloques (WAL, Email FE, Otros), marca cada caso 🟢 NOW / 🟡 NOW-partial / 🔴 WAIT. |
| [post-deploy-awaiting-prod.md](post-deploy-awaiting-prod.md) | Pasos completos por caso (WAL-1, EM-10, etc.). Incluye casos `🔴 WAIT` para corridas posteriores. | **Después de leer `test-now-awaiting-prod.md`**: cuando arranques un caso, abrí este archivo y buscá el ID para ver Precondición / Pasos / Confirmación. |
| [wal-integration-smoke.md](wal-integration-smoke.md) | Checklist canónico del subsistema WAL (8 casos). Política de merge: corre el smoke ante cualquier PR que toque `core/services/wal/`. | Si el contexto es **WAL específicamente** (PR que toca el engine, regression a investigar). Independiente del flujo de awaiting-prod. |
| [reporte-claude-cowork.md](reporte-claude-cowork.md) | Reporte de la primera sesión Cowork (referencia histórica). | Solo si necesitás contexto de cómo se reportó un hallazgo previo. |
| [README.md](README.md) | Este archivo (índice + flujo de lectura). | Punto de entrada al namespace. |

## Flujo de lectura para Cowork

> Cuando el usuario pida una validación browser, leé en este orden:

1. **`SETUP-COWORK.md`** — qué browser MCP, qué credenciales, qué limitaciones evitar.
2. **`test-now-awaiting-prod.md`** — qué casos validar ahora, en qué orden, qué marcar como 🔴 WAIT para humano.
3. Por cada caso 🟢 / 🟡 que arranques, **`post-deploy-awaiting-prod.md`** sección correspondiente para los pasos exactos.
4. Reportá usando el formato del final de `test-now-awaiting-prod.md`.

## Convenciones

- **Hallazgos**: se anexan al `SETUP-COWORK.md` por sesión, en la sección
  correspondiente (§7 abiertos, §8 verificados). No crear archivos sueltos
  por hallazgo — todo va al SETUP.
- **Paths a infra del proyecto**: relativos a `../rules/`, `../docs/`,
  `../systems/`. El `.claude/` raíz es la infra de Claude Code y queda en
  su ruta convencional.
- **Reportes crudos** de sesiones de Cowork (si los hubiera) entran como
  archivos hermanos de `SETUP-COWORK.md` dentro de este namespace, no en
  la raíz del repo.

## Playbook genérico

Ver `C:\devtest\qa-cowork-playbook.md` (cross-project, fuera del repo) para
el flujo de Cowork — protocolo de hallazgos, severidades, formato.

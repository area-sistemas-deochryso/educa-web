# claude-cowork/history/

Archivos de sesiones Cowork pasadas. Cada uno corresponde a un round de deploy
ya cerrado — los briefs que listan ya están en `.claude/chats/closed/`.

Se conservan como referencia histórica del flujo (formato de checklist, orden
de validación, agrupación por bloques) para reusar el patrón en el próximo
round de awaiting-prod, sin tener que reinventarlo desde cero.

## Archivos

| Archivo | Round | Briefs cubiertos |
| --- | --- | --- |
| `test-now-awaiting-prod-2026-05-06.md` | 2026-05-06 | 066-100 (WAL M1-M4 + Email/Outbox FE + Cowork F-011) — entry point con sellos 🟢/🟡/🔴 WAIT |
| `post-deploy-awaiting-prod-2026-05-06.md` | 2026-05-06 | 18 briefs con pasos completos (Precondición / Pasos / Confirmación) |
| `post-deploy-2026-05-06.md` | 2026-05-06 | Versión paralela con setup global + 2-3h browser estimado |
| `handoff-local-2026-05-09.md` | 2026-05-09 | LOCAL pre-deploy de briefs awaiting-prod (sábado) |
| `handoff-prod-saturday-2026-05-09.md` | 2026-05-09 | PROD sábado — checklist read-only + bloque mutativo |
| `handoff-from-prod-saturday-2026-05-09.md` | 2026-05-09 | Reporte ejecución parcial del handoff prod (read-only) |
| `f6a-k6-calibration.md` | Plan 40 F6a | Calibración sintética k6 (briefs 108/111/112 cerrados) |

## Cuándo leer estos archivos

- **Reusar formato** al armar el siguiente checklist post-deploy.
- **Auditar** cómo se validó un brief específico ya cerrado (cross-ref con `chats/closed/<NNN>`).
- **NO** ejecutar los pasos — los briefs referenciados ya están cerrados.

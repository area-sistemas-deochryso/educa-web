# claude-cowork/

Namespace de **Cowork** dentro de `.claude/`. Cowork es QA asistido en navegador
(extensión "Claude in Chrome"), distinto de Claude Code (CLI/IDE). Vive separado
para no mezclarse con `commands/`, `hooks/`, `settings.json` y demás infra que
Claude Code autodescubre desde rutas fijas.

## Archivos

| Archivo | Rol |
|---|---|
| [SETUP-COWORK.md](SETUP-COWORK.md) | Setup del proyecto + hallazgos abiertos/verificados de la sesión Cowork |
| [README.md](README.md) | Este archivo |

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

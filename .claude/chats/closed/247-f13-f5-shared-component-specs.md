# Brief 247 — F13 F5: Specs Componentes Shared de Alto Uso

- **Plan**: F13 (test-frontend-gaps.md) — Fase 5
- **Objetivo**: Specs para componentes shared de alto uso verificando variantes de render y comportamiento.
- **Modo**: `/execute`
- **Estado**: ✅ completado 2026-05-26

## Resultado

4 spec files, 36 tests:

| Componente | Tests | Cobertura |
|---|---|---|
| `skeleton-loader` | 8 | Variantes (text/circle/rect/card), sizing, shimmer |
| `table-skeleton` | 10 | Rows, columns, header toggle, cell types (text/subtitle/avatar/badge/actions) |
| `stats-skeleton` | 8 | Card count, icon position, description toggle, grid width |
| `intranet-layout` | 10 | Creation, module selection, navigation, keyboard shortcuts, logout |

- `lazy-content` no existe en el codebase — omitido.
- `intranet-layout` usa `overrideComponent` para stub 9 child components con dependencias complejas.

## Aprendizajes

- `FeedbackReportDialogComponent` tiene un `effect` que accede a `facade.vm()` — mockear solo `toggle` no basta, hay que stubear el componente entero.
- El fallo preexistente en `notifications.service.spec.ts` (sessionStorage en test env) no está relacionado.

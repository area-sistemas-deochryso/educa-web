<!-- created: 2026-05-18 -->

# polish-W21-schedules-debug-panel

> **Origen**: F1 audit del plan [`intranet-fe-polish-W21.md`](../plan/intranet-fe-polish-W21.md), 2026-05-18.
> **Severidad**: 🟡 (panel debug temporal con hex literales que terminó en `main` sin gate de entorno).

## Scope

Ocultar el panel de debug en `profesor/schedules` cuando no estamos en modo development. Hoy se renderiza siempre con hex hardcoded.

## Hallazgos concretos

| Archivo | Líneas | Contenido |
|---|---|---|
| `pages/profesor/schedules/profesor-horarios.component.html` | 19-50 | Markup del panel debug (sync server time, countdown, drift) |
| `pages/profesor/schedules/profesor-horarios.component.scss` | 46-73 | Estilos con hex: `#422006`, `#431407`, `#1e1e2e`, `#cdd6f4`, `#45475a`, `#f9e2af`, `#89b4fa`, `#ef4444` |

## Criterio de cierre

Opción A (mantener el panel):

- Gate visual por `environment.debug?.horarioSync` (o `!environment.production`).
- Tokens reemplazan los hex literales (alineado con `polish-W21-tokens-colors.md`).

Opción B (eliminar):

- Si el panel no se usa más, removerlo completo. Migrar la lógica de sync/drift detection a un servicio que loguee a consola en dev, sin UI visible.

Decisión la toma el ejecutor del brief F2 — confirmar con el usuario si el panel sigue siendo útil para troubleshooting de drift de reloj.

## Pre-work

- `rules/feature-flags.md` para el patrón de gate por entorno.
- `rules/design-system.md` §8 si se elige Opción A.

## Estimación

Chico (~1h). Ediciones puntuales + decisión A/B con el usuario.

# 122 · FE · Design System F5.3.3 — migrar `email-outbox` admin al estándar

> **Repo destino**: `educa-web` (main)
> **Estado**: ✅ cerrado 2026-05-07 (commit pendiente al ship)
> **Creado**: 2026-05-07 · **Modo aplicado**: `/execute` → `/validate`
> **Origen**: `tasks/design-system-from-usuarios.md` F5.3.3 (#3 del backlog F5.2). Continuación de briefs 120 (F5.3.1) y 121 (F5.3.2). Pulleado por `/go` minimal-from-go.

## Hallazgos (auditoría rápida)

| Pauta | Estado | Acción |
|---|---|---|
| **B2** Page header | ✅ ya usa `<app-page-header>` (en `email-outbox-header`) | nada |
| **B3** Stat cards | ✅ alineadas (icon 48×48, valor 1.75rem/700, surface-200) | nada |
| **B6** Filter bar | ✅ grid + border + transparent | nada (no exige flex strict) |
| **D** Tokens | ❌ 8 hex literales | migrar |

### Hex literales detectados

- `email-outbox.component.scss:45` — `color: #ef4444` → `var(--red-500)`
- `email-outbox.component.scss:81` — `background: #fff` (preview iframe) → `var(--white-color)` (canvas de email — exception documentada inline)
- `email-outbox-chart.component.scss:45,94` — `#22c55e` → `var(--green-500)` (operacional: sent)
- `email-outbox-chart.component.scss:49,98` — `#ef4444` → `var(--red-500)` (operacional: failed)
- `email-outbox-chart.component.scss:53,102` — `#f59e0b` → `var(--yellow-500)` (operacional: pending)

## No-scope

- Subcomponentes que no son `email-outbox-*` (blacklist-*, quarantine-*, domain-pauses-*, defer-event-*) — viven en sus propias tabs y son trabajo de otros chats.
- Refactor lógico (store/facade/service).

## Criterio de cierre

- Sin hex literales en los archivos tocados.
- Lint + build verdes.
- Marcar F5.3.3 ✅ en `tasks/design-system-from-usuarios.md` y maestro (también backfill F5.3.1/F5.3.2 que estaban sin tildar).

## Aprendizaje transferible esperado

Confirmar que F5.3.3 fue **menor** que las anteriores (1 commit ya hecho B2/B3/B6 en commits previos del feature), reduciendo el alcance del chat a tokens-only. Sirve para reportar al usuario que la cola de F5.3.x va a achicarse: las páginas restantes pueden tener menos divergencias de las que la auditoría F5.1 anticipó.

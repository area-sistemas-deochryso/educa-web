# 279 — P52 F5 FE: Attendance email gap tile in dashboard día

> **Created**: 2026-06-01 · **Plan**: [P52](../../../../educa-coord/plans/xrepo-52-email-outbox-manual-retry-diagnostics.md) · **Phase**: F5 (FE — Chat 5.2)
> **Repo**: educa-web · **Type**: FE feature
> **Suggested mode**: `/execute`
> **Depends on**: brief 278 (P52 F5 BE — gap detection endpoint)

## Scope

- New tile in `email-outbox-dashboard-dia/` showing attendances without confirmed email
- Source: `GET /asistencias-sin-correo?fecha=YYYY-MM-DD`
- Columns: Alumno, Grado, Tipo (Entrada/Salida), Hora registro, Estado correo (FAILED tag / "No generado" tag)
- Click on row: deep-link to bandeja filtered by destinatario
- Full coverage state: "Cobertura completa" positive message

## Acceptance criteria

- [x] Tile shows attendance gaps for selected day
- [x] FAILED vs "No generado" visually distinct (different tag colors)
- [x] Row click navigates to bandeja filtered by recipient
- [x] "Cobertura completa" shown when no gaps

> **Validación prod**: ✅ verificado 2026-07-04 vía `/verify-prod` (worktree 402-verify-pattern) — ver sección "Verificación post-deploy" abajo.

## Verificación post-deploy (2026-07-04, `/verify-prod`)

Verificado con cuenta dedicada `CODE CLAUDE` (Administrador), primero en test luego en prod. Este item es de solo lectura (`GET /asistencias-sin-correo`) — no requiere creación de registro `TEST-`, no aplica hard rule 2/3 (no hay mutación que aislar).

**Resultado por entorno:**

| Criterio | Test | Prod |
|---|---|---|
| Tile renderiza sin error en tab "Detalle de fallos" | ✅ | ✅ |
| `GET /api/sistema/email-outbox/asistencias-sin-correo` → 200 | ✅ | ✅ |
| "Cobertura completa" cuando no hay gaps | ✅ (sin datos del día) | ✅ (3 enviados hoy, sin gaps) |
| Distinción visual FAILED / "No generado" | ⏳ no ejercitable — sin gaps reales hoy en ningún entorno | ⏳ ídem |
| Click en fila → deep-link a bandeja | ⏳ no ejercitable — no hay filas que clickear | ⏳ ídem |

Los 2 criterios no ejercitables dependen de que exista al menos una asistencia real sin correo confirmado el día de la verificación — no es algo que se pueda simular con un registro `TEST-` (el gap surge de asistencias reales sin envío, no de una entidad creada ad hoc), y forzarlo violaría hard rule 4 (no mutar datos preexistentes). Queda como limitación de datos, no defecto de código — igual que la nota del DMV en el cierre de 398.

**Auditoría de mutaciones (gate obligatorio)**: las 14 requests a `/api/` durante la sesión fueron 100% `GET` (`notificaciones/activas`, `roles`, `Auth/perfil`, `email-outbox/dashboard-dia`, `email-outbox/listar`, `dashboard-dia/fallos-por-sender`, `asistencias-sin-correo`, `defer-fail-status`, `monitoreo/sender-stats`, `monitoreo/top-destinatarios`, `monitoreo/serie-temporal`, `monitoreo/dominios-receptores`, `monitoreo/candidatos-blacklist`). Cero mutaciones — no aplica auditoría de entidad tocada.

## Nota de seguimiento

Si en un futuro barrido de `awaiting-prod` aparece un día con gaps reales, vale la pena una verificación visual puntual de la distinción FAILED/"No generado" y el click-to-navigate — no bloqueante para el cierre de este item.

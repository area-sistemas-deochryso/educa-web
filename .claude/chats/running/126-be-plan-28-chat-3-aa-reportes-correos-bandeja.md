# 126 · Plan 28 Chat 3 BE — Reportes + correos + bandeja + notificaciones para Asistentes Administrativos

> **Creado**: 2026-05-07 · **Estado**: ⏳ pendiente arrancar · **Repo**: `Educa.API` (master)
<!-- minimal-from-go -->

## Modo sugerido

`/execute → /validate`. El diseño ya cerró en Chat 1 (8 decisiones documentadas en maestro fila 28).

## Contexto

Chat 2 BE cerró 2026-04-22 (commit en `Educa.API master`): modelo polimórfico `TipoPersona='A'` (Asistente Administrativo) + dispatch `Profesor → AsistenteAdmin → Estudiante → rechazar` + queries admin extendidas + migración SQL ejecutada (CHECK `('E','P','A')`). +18 tests, 1185 BE verdes.

Bloqueador "validación jefe Plan 27 post-deploy" levantado tras cierre de Plan 27. Sin riesgo de PRs simultáneos sobre `AsistenciaPersona` / `EmailNotificationService`.

## Alcance

Implementar para `TipoPersona='A'`:

1. **Reportes PDF/Excel** — extender los reportes de profesores (`ReporteFiltradoAsistenciaService` y mirror Excel) para incluir AAs. Aplicar regla §17 paridad PDF/Excel (INV-RE01/02/03).
2. **Correos diferenciados** — implementar helper `EnviarNotificacionAsistenciaCorreccionAsistenteAdmin` en `EmailNotificationService`: plantilla azul administrativa + saludo propio, destinatario `Director.DIR_Correo` (rol AA), `TipoEntidadOrigen='AsistenciaAsistenteAdmin'` para bandeja diferenciada (alineado con INV-AD05 ampliado).
3. **Bandeja admin** — exponer rama AA en bandeja de correos (`/intranet/admin/email-outbox`) — solo backend, FE va en Chat 4.
4. **Notificaciones** — incluir AAs en flujo de notificaciones masivas si aplica (revisar `NotificacionesService` por scope).

## Decisiones de Chat 1 a respetar

- Alcance acotado a rol "Asistente Administrativo" — Director/Promotor/Coord Académico NO entran (decisión 1+8).
- Horarios = profesor (07:31 tardanza / 09:30 falta regular, INV-C10 sí, INV-C09 no) — decisión 6.
- INV-AD08 (futuro Chat 5): ningún rol administrativo corrige asistencia de su propio rol.

## Pre-work obligatorio

1. `git -C ../Educa.API log --oneline -10` para ver estado tras Chat 2.
2. `git -C ../Educa.API log --oneline -- Services/Reportes/ Services/Email*.cs` para ver qué se tocó en Chat 2 vs qué queda.
3. Revisar `Educa.API/.claude/` por convenciones BE locales (si existe `chats/`).
4. Suite verde antes de arrancar: `dotnet test` desde `../Educa.API/Educa.API.Tests` debe dar 1185 verdes.

## Validación esperada

- Suite BE verde (≥1203 tras +18 tests estimados de Chat 3).
- Paridad PDF/Excel verificada por test contract (`*ExcelEndpointTests`).
- Smoke local: enviar correo de corrección sobre AA → verificar `EmailOutbox` con `TipoEntidadOrigen='AsistenciaAsistenteAdmin'`.

## Salida esperada

Chat 4 FE desbloqueado (admin UI badge AA + self-service generalizado + widget home AA).

## Referencias

- Plan 28 fila en `plan/maestro.md` (educa-web) — 8 decisiones de Chat 1.
- Chat 2 cerrado: `chats/closed/023-plan-28-chat-2-be-modelo-dispatch-queries.md`.
- Chat 1 design: `chats/closed/022-plan-28-chat-1-design-asistente-admin-reportes.md`.
- Patrón Plan 21 Chat 4 para correos polimórficos (E/P/A).
- Regla `business-rules.md §17` para paridad Excel.

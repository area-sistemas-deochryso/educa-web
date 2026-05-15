# Plan 43 · Chat 3.1a — `/execute` BE: SMTP response visible

> **Repo destino**: `Educa.API` (master) — chat exclusivamente BE.
> **Plan**: 43 · **Chat**: 3.1a · **Fase**: F3 (Diagnóstico real) · **Creado**: 2026-05-15 · **Estado**: ⏳ pendiente arrancar.
> **Modo sugerido**: `/execute` (diseño ya cerrado) → `/validate`.
> **Predecesor**: brief 154 (closed) — `/investigate` + `/design` documentados ahí.

## Contexto

Continúa el work del brief 154. La fase de diseño está cerrada con la decisión documentada (ver `closed/154-be-fe-plan-43-chat-3-1-smtp-response-visible.md` líneas 85-130). Este chat ejecuta la parte BE; el FE va en brief 169 paralelo (puede arrancar tras este o en paralelo si el contrato DTO se fija primero).

## Decisiones heredadas (no re-discutir)

- Persistir columnas nuevas separadas; no reutilizar `EBL_UltimoError` (sobrecargado por `QuarantinePromotionEvaluator`).
- Schema:
  - `EmailBlacklist.EBL_OriginalSmtpResponse NVARCHAR(500) NULL`
  - `EmailQuarantine.EQU_OriginalSmtpResponse NVARCHAR(500) NULL`
  - `EmailQuarantine.EQU_RecentHits NVARCHAR(2000) NULL` (JSON `[{smtpCode, smtpMessage, occurredAt}, ...]` cap últimos 3, append-only).
- LEFT JOIN fallback a `EmailOutbox` por `EO_Destinatario` + `ABS(DATEDIFF(MINUTE, EO_FechaReg, EBL/EQU_FechaUltimoFallo)) <= 120`, tomar la outbox más cercana.
- `originalSmtpResponseSource` = `stored` | `reconstructed` | `unavailable`.

## Pre-work

1. Mostrar al usuario el script SQL final antes de ejecutar (regla `backend.md` §Migraciones).
2. Confirmar que el ALTER no rompe nada en Azure SQL (tablas vivas; columnas NULL → safe).

## Scope

### SQL migration

```sql
ALTER TABLE EmailBlacklist ADD EBL_OriginalSmtpResponse NVARCHAR(500) NULL;
ALTER TABLE EmailQuarantine ADD
    EQU_OriginalSmtpResponse NVARCHAR(500) NULL,
    EQU_RecentHits NVARCHAR(2000) NULL;
```

### Puntos de captura

- `EmailBounceBlacklistHandler.PrepareBlacklistInsertOrReactivateAsync` → `EBL_OriginalSmtpResponse = errorTruncado`.
- `MailboxFullBlacklistHandler.PrepareBlacklistInsertOrReactivateAsync` → idem.
- `QuarantinePromotionEvaluator.EvaluateQuarantine` → exponer `OriginalSmtpResponse` del hit que dispara promote.
- `DeferEventService` (caller de promotion) → propagar al insert de blacklist.
- `EmailQuarantineService` (insert + update de quarantine desde defer events) → poblar `EQU_OriginalSmtpResponse` en insert + append a `EQU_RecentHits` (cap 3, FIFO).

### DTOs

- `EmailBlacklistListadoDto`: agregar `OriginalSmtpResponse`, `OriginalSmtpResponseSource`.
- `EmailQuarantineDetalleDto`: agregar `OriginalSmtpResponse`, `OriginalSmtpResponseSource`, `RecentHits: List<QuarantineHitDto>`.
- Nuevo `QuarantineHitDto { SmtpCode, SmtpMessage, OccurredAt }`.

### Tests (mínimos)

- Persistencia desde `EmailBounceBlacklistHandler` (1).
- Persistencia desde `MailboxFullBlacklistHandler` (1).
- Persistencia desde `QuarantinePromotionEvaluator` → blacklist (1).
- LEFT JOIN fallback: blacklist legacy sin columna nueva + outbox cercana → `reconstructed` (1).
- LEFT JOIN fallback: sin outbox → `unavailable` (1).
- `EQU_RecentHits` cap 3 + FIFO append (1).

## Invariantes en juego

- `INV-MAIL01` — fire-and-forget si la columna no se puede escribir.
- `INV-D08` — DTOs siguen `ApiResponse<T>`.
- Cap 300 líneas por archivo (revisar `QuarantinePromotionEvaluator` post-cambio).

## Criterios de cierre

- [ ] Script SQL mostrado al usuario + ejecutado.
- [ ] 4 puntos de captura persisten correctamente.
- [ ] DTOs ampliados (3 archivos).
- [ ] 6+ tests verdes + suite sin regresiones.
- [ ] Source priority `stored/reconstructed/unavailable` funciona en query del detalle.

## Aprendizajes transferibles

> A poblar al cerrar.

## Referencias

- `chats/closed/154-be-fe-plan-43-chat-3-1-smtp-response-visible.md` — investigate + design.
- Plan 43 maestro item 8 — split en 3.1a (este) + 3.1b (FE).
- `Educa.API/.claude/rules/backend.md` §Migraciones — gate de mostrar SQL antes de ejecutar.

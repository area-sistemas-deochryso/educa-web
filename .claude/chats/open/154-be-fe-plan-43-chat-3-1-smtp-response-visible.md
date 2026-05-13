# Plan 43 · Chat 3.1 — SMTP response visible donde se decide (BE+FE)

> **Repo destino**: `Educa.API` (master) + `educa-web` (main) — cross-repo (BE pesado + FE drawer).
> **Plan**: 43 · **Chat**: 3.1 · **Fase**: F3 (Diagnóstico real) · **Creado**: 2026-05-13 · **Estado**: ⏳ pendiente arrancar.
> **Modo sugerido**: `/investigate` (qué campos existen ya en BD) → `/design` (decidir LEFT JOIN reconstrucción vs persistir desde 0) → `/execute` (BE primero, luego FE) → `/validate`.

## Contexto

Cierra **A6 + B4** del Plan 43. Habilitado por Chat 1.3 ✅ awaiting-prod (correlation id ahora uniforme GUID-36 en `EmailOutbox` — útil si en el detail necesitamos cruzar al hub).

Hoy las UIs de Detalle blacklist y Detalle cuarentena muestran texto interno como "Promoted from quarantine after 2 mailbox full hits", pero ocultan el SMTP response real (`452 4.2.2 The recipient's inbox is out of storage space`). El admin tiene que abrir la pestaña Eventos defer y cruzar por email + fecha para reconstruir el motivo real. Es el feedback más mencionado por Cowork en producción 2026-05-11.

## Objetivo

Después de este chat, ningún caso de blacklist o cuarentena debe requerir abrir la pestaña Eventos defer para ver el SMTP code real.

## Pre-work obligatorio

1. **Auditoría de columnas existentes** (mostrar SELECT al usuario):

   ```sql
   -- ¿Qué columnas SMTP-related tiene EmailOutbox hoy?
   SELECT c.name, ty.name AS tipo, c.max_length, c.is_nullable
     FROM sys.columns c
     JOIN sys.tables t ON t.object_id = c.object_id
     JOIN sys.types ty ON ty.user_type_id = c.user_type_id
    WHERE t.name = 'EmailOutbox'
      AND (c.name LIKE '%Smtp%' OR c.name LIKE '%LastError%' OR c.name LIKE '%Mailbox%'
           OR c.name LIKE '%Last%' OR c.name LIKE '%Bounce%')
    ORDER BY c.column_id;

   -- ¿Y en EmailBlacklist + EmailQuarantine?
   SELECT t.name AS tabla, c.name AS columna, ty.name AS tipo, c.max_length
     FROM sys.tables t
     JOIN sys.columns c ON c.object_id = t.object_id
     JOIN sys.types ty ON ty.user_type_id = c.user_type_id
    WHERE t.name IN ('EmailBlacklist', 'EmailQuarantine')
    ORDER BY t.name, c.column_id;
   ```

2. **Decisión de diseño**: dado el shape real, definir si persistimos `EBL_OriginalSmtpResponse`/`EQU_OriginalSmtpResponse` como columna nueva o si **siempre** reconstruimos via LEFT JOIN a `EmailOutbox` por `(destinatario, fecha ±2h)`. Tradeoff:
   - Persistir: snapshot inmutable, simple en lectura, pero "magic value" si `EmailOutbox` retira la fila por purga futura.
   - LEFT JOIN: 0 deuda de migración, pero detalle desaparece si la outbox fue purgada/archivada.
   - **Probable**: persistir + LEFT JOIN como fallback para legacy.

## Scope

### BE (`Educa.API` master)

1. Script SQL: agregar columnas nuevas (mostrar al usuario antes de ejecutar):
   ```sql
   ALTER TABLE EmailBlacklist ADD EBL_OriginalSmtpResponse NVARCHAR(500) NULL;
   ALTER TABLE EmailQuarantine ADD
       EQU_OriginalSmtpResponse NVARCHAR(500) NULL,
       EQU_RecentHits NVARCHAR(2000) NULL;  -- JSON array de los últimos 3 hits SMTP
   ```
2. Capturar `EO_LastSmtpMessage` (o equivalente — depende del audit) del hit que dispara el blacklisteo, escribirlo en `EBL_OriginalSmtpResponse` desde `MailboxFullBlacklistHandler` y `BounceBlacklistHandler`.
3. Idem para `EmailQuarantine` + serializar últimos 3 hits a `EQU_RecentHits` (JSON: `[{smtpCode, smtpMessage, occurredAt}, ...]`).
4. Para registros legacy sin el campo: LEFT JOIN a `EmailOutbox` por `(destinatario, fecha ±2h)` en la query del detalle. Mostrar best-effort con badge `(reconstruido)`.
5. Extender DTOs de detalle de blacklist y cuarentena: agregar `originalSmtpResponse`, `originalSmtpResponseSource` (`stored` | `reconstructed` | `unavailable`).
6. Tests: persistencia desde handlers, JOIN fallback con caso legacy, sin fila en outbox → `unavailable`.

### FE (`educa-web` main)

7. UI Detalle blacklist: nueva sección "SMTP response" en lugar del texto interno. El texto previo pasa a "Causa interna" como dato secundario, no destacado.
8. UI Detalle cuarentena: nueva sección "Histórico de hits" con tabla de últimos 3 hits (timestamp + SMTP code + message).
9. Badge `(reconstruido)` cuando el source es `reconstructed`.

## Invariantes en juego

- `INV-MAIL01` — la persistencia desde handlers debe respetar fire-and-forget si la columna no se puede escribir (INV-S07 implícito).
- `INV-D08` — DTOs siguen siendo `ApiResponse<T>`.
- Cap 300 líneas por archivo BE.

## Criterios de cierre

- [ ] SQL migration ejecutada en BD + columnas agregadas.
- [ ] Handlers persisten el SMTP response al blacklistar/cuarentenar.
- [ ] Detalle blacklist UI muestra el SMTP real sin ir a otra pestaña.
- [ ] Detalle cuarentena UI muestra histórico de 3 hits.
- [ ] Tests BE verdes + suite sin regresiones.
- [ ] Tests FE verdes + lint.
- [ ] Smoke browser: abrir 1 blacklist real y 1 quarantine real, validar que el SMTP code aparece.

## Aprendizajes transferibles

> A poblar al cerrar.

## Referencias

- [`plan/monitoreo-cowork-feedback-2026-05-11.md`](../../plan/monitoreo-cowork-feedback-2026-05-11.md) — Plan 43, Chat 3.1.
- [`chats/awaiting-prod/153-be-fe-plan-43-chat-1-3-correlation-id-e2e.md`](../awaiting-prod/153-be-fe-plan-43-chat-1-3-correlation-id-e2e.md) — Chat 1.3 (precondición soft).
- Hallazgos Cowork producción 2026-05-11 — A6 y B4 priorizados como Severidad Alta (UX).

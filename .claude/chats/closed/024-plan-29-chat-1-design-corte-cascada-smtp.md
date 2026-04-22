> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo. El `/design` no toca código pero las decisiones tipifican cambios en BE (`EmailOutboxService`, `EmailService`, tabla `EmailBlacklist`), por eso conviene el contexto BE.
> **Plan**: 29 · **Chat**: 1 · **Fase**: `/design` · **Estado**: ⏳ pendiente arrancar.

---

# Plan 29 Chat 1 — Design: corte de cascada SMTP (`max_defer_fail_percentage`)

## PLAN FILE

`../../educa-web/.claude/plan/maestro.md` → sección **"🔴 Plan 29 — Corte de cascada SMTP (`max_defer_fail_percentage`)"**.

Contexto colateral (leer solo si hace falta confirmar cifras exactas o histórico):

- `../../educa-web/.claude/plan/maestro.md` → sección **"🚨 Restricción crítica — Límites SMTP del hosting (cPanel)"** → subsección **"Contador 1 — `max_defer_fail_percentage`"**.
- Memoria: `C:\Users\Asus Ryzen 9\.claude\projects\c--Users-Asus-Ryzen-9-EducaWeb-educa-web\memory\project_smtp_defer_fail_block.md` (hallazgo completo con datos crudos del 2026-04-22).

## OBJETIVO

Cerrar las **8 decisiones** que desbloquean el Chat 2 BE para impedir que un correo inválido bloquee el dominio entero durante 60 min vía `max_defer_fail_percentage` de cPanel. El `/design` produce: esquema de `EmailBlacklist`, política de validación pre-outbox, política de coordinación con CrossChex, plan para arreglar el SSL handshake, y la formulación final de `INV-MAIL01/02/03`.

## PRE-WORK OBLIGATORIO

Traer al Chat 1 **antes** de empezar el diseño (ítems del "Checklist pre-Chat 1 `/design`" del plan):

1. **Validación externa pendiente (usuario debe traer)**:
   - OK del jefe sobre el corte del SMTP de CrossChex (decisión 5 — ver abajo). Si no hay OK, se diseña con la opción (c) "esperar Plan 24".
   - Confirmación con el hosting: `max_defer_fail_percentage` actual — ¿es **count absoluto = 5** o **porcentaje = 5% del envío**? Pedir también el rango permitido (para negociar subirlo). Si el hosting no responde antes del chat, el diseño asume **count absoluto 5** (lo más conservador).
   - Cabeceras de uno de los rebotes recientes en `sistemas6@laazulitasac.com` (especialmente `261ochapa@gmail.com` si aún está en la bandeja). Campos clave: `X-Mailer`, `Message-ID`, `Received: from`, `User-Agent`. Confirman 100% si el origen es CrossChex o algún script PHP/forwarder cPanel.

2. **Queries BD confirmatorias** (ejecutar ANTES del chat, traer resultados):

   ```sql
   -- A. Inventario de rebotes permanentes en Outbox histórico
   SELECT
       EO_Destinatario,
       COUNT(*) AS Rebotes,
       MAX(EO_FechaReg) AS UltimoIntento,
       STRING_AGG(CAST(EO_UltimoError AS NVARCHAR(MAX)), ' | ') AS Errores
   FROM EmailOutbox
   WHERE EO_Estado = 'FAILED'
     AND (EO_UltimoError LIKE '%550%' OR EO_UltimoError LIKE '%does not exist%'
          OR EO_UltimoError LIKE '%NoSuchUser%' OR EO_UltimoError LIKE '%SslHandshake%')
   GROUP BY EO_Destinatario
   HAVING COUNT(*) >= 3
   ORDER BY Rebotes DESC;
   -- Uso: lista inicial de candidatos a EmailBlacklist (backfill del Chat 2).

   -- B. Inventario de correos con formato sospechoso en Estudiante
   SELECT EST_CodID, EST_CorreoApoderado,
          LEN(EST_CorreoApoderado) AS L,
          DATALENGTH(EST_CorreoApoderado) AS B
   FROM Estudiante
   WHERE EST_Estado = 1
     AND EST_CorreoApoderado IS NOT NULL
     AND (EST_CorreoApoderado NOT LIKE '%_@_%._%'
          OR EST_CorreoApoderado LIKE '% %'
          OR LEN(EST_CorreoApoderado) <> DATALENGTH(EST_CorreoApoderado) / 2
          OR LEN(EST_CorreoApoderado) < 7);
   -- Uso: dimensionar cuántos correos rechaza el pre-filtro si se aplica hoy.

   -- C. Distribución de tipos de error en Outbox últimos 7 días
   SELECT
       CASE
           WHEN EO_UltimoError LIKE '%SslHandshake%'  THEN 'SSL_HANDSHAKE'
           WHEN EO_UltimoError LIKE '%550%'           THEN 'BOUNCE_550'
           WHEN EO_UltimoError LIKE '%timeout%'       THEN 'TIMEOUT'
           WHEN EO_UltimoError LIKE '%535%'           THEN 'AUTH_FAIL'
           ELSE 'OTRO'
       END AS TipoFallo,
       COUNT(*) AS Cantidad
   FROM EmailOutbox
   WHERE EO_Estado IN ('FAILED', 'PROCESSING')
     AND EO_FechaReg >= DATEADD(DAY, -7, GETDATE())
   GROUP BY
       CASE
           WHEN EO_UltimoError LIKE '%SslHandshake%'  THEN 'SSL_HANDSHAKE'
           WHEN EO_UltimoError LIKE '%550%'           THEN 'BOUNCE_550'
           WHEN EO_UltimoError LIKE '%timeout%'       THEN 'TIMEOUT'
           WHEN EO_UltimoError LIKE '%535%'           THEN 'AUTH_FAIL'
           ELSE 'OTRO'
       END;
   -- Uso: prioridad relativa de qué fix da más oxígeno al defer/fail contador.
   ```

3. **Inspección manual**: en el panel de CrossChex, ver si hay configuración SMTP saliente activa apuntando a `laazulitasac.com`. Si existe, tomar screenshot o copiar host/puerto/usuario (NO la contraseña).

## ALCANCE DEL CHAT (solo decisiones, no código)

El Chat 1 produce un documento de decisiones — idealmente al cierre queda anotado en el propio plan bajo un bloque `### Decisiones cerradas Chat 1` análogo al del Plan 27/28. Las **8 decisiones a cerrar**:

### Decisión 1 — Regex y normalización pre-outbox

Input a decidir:

- Regex base. Candidato: `^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$`
- Normalizaciones automáticas: `Trim()`, `ToLowerInvariant()`, eliminar caracteres invisibles (`​`, ` `).
- ¿Valida también `MX record` del dominio? Propuesta: **NO** en Chat 2 (latencia + complejidad). Se puede agregar en F2 si las estadísticas lo justifican.
- ¿Aplica al insertar en Estudiante/Profesor (origen) o solo al encolar (consumo)? Propuesta: **ambos**, pero el Chat 2 implementa solo el del encolado. El de entidades (form de usuario admin) va como item aparte en Chat 4.

### Decisión 2 — Esquema `EmailBlacklist`

Propuesta inicial a refinar:

```sql
CREATE TABLE EmailBlacklist (
    EBL_CodID INT IDENTITY(1,1) PRIMARY KEY,
    EBL_Correo NVARCHAR(100) NOT NULL,
    EBL_MotivoBloqueo NVARCHAR(50) NOT NULL,  -- 'BOUNCE_5XX' | 'MANUAL' | 'BULK_IMPORT'
    EBL_IntentosFallidos INT NOT NULL DEFAULT 0,
    EBL_UltimoError NVARCHAR(500),
    EBL_FechaPrimerFallo DATETIME2,
    EBL_FechaUltimoFallo DATETIME2,
    EBL_Estado BIT NOT NULL DEFAULT 1,  -- 1 = bloqueado activo, 0 = despejado
    EBL_UsuarioReg NVARCHAR(50) NOT NULL,
    EBL_FechaReg DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    EBL_UsuarioMod NVARCHAR(50),
    EBL_FechaMod DATETIME2,
    EBL_RowVersion ROWVERSION
);
CREATE UNIQUE INDEX UX_EmailBlacklist_Correo_Activa
    ON EmailBlacklist(EBL_Correo) WHERE EBL_Estado = 1;
```

A decidir:

- ¿Guardar el correo normalizado (lowercase+trim) o el original? Propuesta: normalizado — el lookup se hace contra el normalizado.
- ¿Valor máximo de `EBL_Correo`? Hoy `EST_CorreoApoderado = nvarchar(100)`, coherente.
- ¿Auditoría completa con 4 campos o basta FechaReg + UsuarioReg? Propuesta: **4 campos** (INV-D02).

### Decisión 3 — Umbral de auto-blacklist

- ¿Cuántos rebotes permanentes (5.x.x) para insertar en blacklist? Propuesta: **3**.
- ¿Ventana temporal? Propuesta: **sin ventana** — si un correo acumula 3 bounces permanentes a lo largo del tiempo, está muerto independiente de cuándo ocurrieron.
- ¿SSL handshake cuenta para blacklist? Propuesta: **NO** — es bug nuestro, no del destinatario. Se trata aparte (Decisión 6).
- ¿Timeouts (4xx) cuentan? Propuesta: **NO** — pueden ser transitorios. Solo permanentes 5.x.x.

### Decisión 4 — Reversión de blacklist

- Endpoint admin `DELETE /api/sistema/email-blacklist/{correo}` con `[Authorize(Roles = "Director,Asistente Administrativo")]`. ¿Se agrega al Chat 2 o al Chat 4?
- ¿Vista admin en `/intranet/admin/email-blacklist` o queda solo query manual? Propuesta: **vista admin FE en Chat separado** (no entra al alcance del Plan 29) — por ahora endpoint + reversión manual.
- ¿Qué pasa con los correos del estudiante si se despeja la blacklist? Propuesta: nada automático — el siguiente encolado funcionará normal.

### Decisión 5 — Política con CrossChex (la crítica)

Tres opciones:

- **(a) Desactivar el SMTP saliente de CrossChex** — preferido. Requiere validar con el jefe que no se pierde funcionalidad operativa. Educa ya envía notificaciones de asistencia. Decisión inmediata si el jefe aprueba.
- **(b) Migrar CrossChex a subdominio/cuenta cPanel separada** — solución estructural pero requiere coordinación con hosting + reconfiguración del dispositivo biométrico. Tarde.
- **(c) Esperar Plan 24 (sync background)** — si Educa consume CrossChex directamente, el SMTP de CrossChex es irrelevante. Llega en semanas, no en días.

A decidir en Chat 1: cuál se ejecuta Y cuándo (Chat 3 OPS del Plan 29).

### Decisión 6 — Fix SSL handshake

Diagnóstico preliminar: el error `SslHandshakeException` en el Outbox apunta a config TLS en `EmailService.cs` (MailKit).

Candidatos de fix:

1. Forzar `SecureSocketOptions.StartTls` explícito (si servidor requiere STARTTLS en puerto 587).
2. Forzar `SslProtocols = SslProtocols.Tls12` o `Tls13`.
3. Agregar `ServerCertificateValidationCallback` si el SMTP usa cert autofirmado (último recurso; en producción hay que usar CA válida).

A decidir: qué combinación probar en Chat 2, con qué plan de rollback si rompe envíos legítimos.

### Decisión 7 — Invariantes `INV-MAIL01/02/03`

Redacción final que ira en `business-rules.md` §17 (o nueva §18 — decidir). Propuesta inicial en `project_smtp_defer_fail_block.md` memoria. A cerrar: wording exacto, ID numérico definitivo, sección donde viven.

### Decisión 8 — Saneamiento del Outbox existente

`EmailOutbox` ya tiene registros encolados con destinatarios inválidos que van a consumir defer/fail al arrancar el worker. A decidir:

- ¿Script SQL pre-deploy que marque `EO_Estado = 'FAILED_INVALID_FORMAT'` los de formato inválido (resultado query B)?
- ¿Y los que tienen 3+ bounces históricos (resultado query A) — marcarlos como `FAILED_BLACKLISTED` o insertar en `EmailBlacklist` con `MotivoBloqueo = 'BULK_IMPORT'` y dejar el Outbox tal cual?
- ¿Purgar Outbox de más de 30 días con estado `FAILED` en el mismo script?

## TESTS MÍNIMOS (para que Chat 2 sepa qué escribir)

Este chat NO escribe tests, solo los especifica para el Chat 2.

### Validador de formato

- `"apoderado@gmail.com"` → válido.
- `"apoderado@gmail.com "` (trailing space) → normaliza y es válido.
- `"APODERADO@GMAIL.COM"` → normaliza a lowercase y es válido.
- `"apoderado@gmail.com​"` (zero-width space) → rechaza o normaliza (decisión 1).
- `"apoderado"` → inválido (sin @).
- `"apoderado@gmail"` → inválido (sin TLD).
- `"apo derado@gmail.com"` → inválido (espacio interno).
- `""` o `null` → rechaza silencioso con `LogWarning`.

### Blacklist enqueue-skip

- Correo en `EmailBlacklist` con `EBL_Estado = 1` → `EnqueueAsync` retorna sin insertar.
- Correo en `EmailBlacklist` con `EBL_Estado = 0` (despejado) → `EnqueueAsync` inserta normal.
- Lookup es case-insensitive (normalización).

### Worker auto-blacklist

- Correo X falla 2 veces con `550` → NO entra a blacklist aún.
- Correo X falla la 3ra vez con `550` → `INSERT INTO EmailBlacklist` con `MotivoBloqueo = 'BOUNCE_5XX'`.
- Correo X falla con `SslHandshakeException` → NO entra a blacklist (decisión 3).

## REGLAS OBLIGATORIAS

Las que aplican al Chat 2 (el diseño las asume, no las relaja):

- **Regla dura 300 líneas** por archivo BE (`backend.md`). `EmailOutboxService` ya está cerca del límite — el validador va como helper separado (`Services/Notifications/EmailValidator.cs`), no inline.
- **AsNoTracking()** en queries read-only de `EmailBlacklistRepository`.
- **Fire-and-forget** en la notificación admin cuando un correo entra a blacklist (INV-S07). Un error al notificar no debe bloquear el insert en blacklist.
- **Structured logging** (INV-ET01): `_logger.LogWarning("Email rechazado formato inválido: {Email}", DniHelper.MaskEmail(correo))` — sin interpolación.
- **Mask del correo en logs**: usar helper análogo a `DniHelper.Mask` para no loguear correos completos. Si no existe, proponer crear `EmailHelper.Mask("apoderado@gmail.com")` → `"a***o@gmail.com"` en Chat 2.
- **Excepciones tipadas**: el endpoint de despeje blacklist lanza `NotFoundException` si el correo no existe, no 404 manual.
- **Migración SQL antes de código** (regla proyecto): el script `CREATE TABLE EmailBlacklist` se muestra al usuario y se ejecuta manualmente antes de que `Chat 2` mergee.
- **Operación transaccional** en worker: si `UPDATE EmailOutbox SET EO_Estado='FAILED_BLACKLISTED'` y el `INSERT INTO EmailBlacklist` están juntos, ambos en una `TransactionScope`.
- **Idempotencia del backfill**: el script SQL de saneamiento (Decisión 8) debe poder ejecutarse múltiples veces sin duplicar filas en `EmailBlacklist` (usar `MERGE` o `NOT EXISTS`).

## APRENDIZAJES TRANSFERIBLES (del chat que generó este)

- **El correo destinatario siempre sale de BD** en Educa.API (no de CrossChex). Lo confirmé en el Explore del chat anterior: `AsistenciaNotificationDispatcher.cs:36`, `AsistenciaAdminEmailNotifier.cs:31`, `AsistenciaAdminRepository.cs:94` leen `Estudiante.EST_CorreoApoderado`; `PRO_Correo` de `Profesor.cs:37`. El bulk histórico consume `AsistenciaEmailDataRow.CorreoApoderado` que sale del mismo join (Plan 27 Chat 5c cerró el gap `GraOrden`).
- **La tabla `Apoderado` está vacía en producción** (confirmado por el usuario 2026-04-22). El campo `APO_Correo` existe pero no se consulta desde ningún service. NO es fuente alternativa de correos.
- **EmailOutbox real** (schema confirmado por las queries del usuario): columnas usadas son `EO_CodID`, `EO_Destinatario`, `EO_Asunto`, `EO_Intentos`, `EO_UltimoError`, `EO_FechaReg`, `EO_Estado`, `EO_Tipo`. Estados vistos: `'SENT'`, `'FAILED'`, `'PROCESSING'`. Hay `EO_Remitente` (añadido en Plan 22 Chat A) con backfill a `sistemas@laazulitasac.com`.
- **Tipos de error reales observados en Outbox (hoy)**:
  1. `SslHandshakeException: An error occurred while attempting to establish an SSL or TLS connection` — dominante reciente (2026-04-22 14:43).
  2. `535: Incorrect authentication data` — histórico (abril 2026, remitente `area.sistemas.min@gmail.com` con auth equivocada, ya resuelto).
  3. No se vio ningún `550` en el Outbox actual → el caso `261ochapa@gmail.com` NO pasó por Educa. Confirmación empírica de que viene de CrossChex u otro sistema compartido.
- **El umbral `max_defer_fail_percentage` es un contador separado** de los 50/h buzón y 200/h dominio. Plan 22 F5/F6 (throttle per-sender) protege la cuota de envíos aceptados pero NO protege el contador de fallos. Son dos techos independientes.
- **Dispatch polimórfico Plan 21** (`TipoPersona = 'E' | 'P'` + `'A'` del Plan 28) no tiene influencia en Plan 29 — el correo siempre sale del mismo flujo `EmailOutboxService.EnqueueAsync`, sea cual sea el tipo de persona.
- **Widget Plan 22 Chat B** queda bloqueado hasta cerrar Plan 29 Chat 2 — el widget debería mostrar tanto el throttle 50/h como el defer/fail 5/h para ser útil. Esto ya quedó reflejado en el maestro.

## FUERA DE ALCANCE

- **No tocar código** (el `/design` no crea/edita archivos de código).
- **No tocar `business-rules.md`** aún — los invariantes `INV-MAIL*` se redactan aquí pero van al documento en Chat 4.
- **No diseñar el widget FE** de métricas defer/fail (corresponde a Plan 22 Chat B después).
- **No tocar CrossChex config directamente** — la coordinación OPS es Chat 3.
- **No tocar `EmailOutboxWorker` fuera del hook de blacklist** — el throttle saliente (Plan 22 F5/F6) ya está en producción.
- **No consolidar tabla `Apoderado`** aunque esté vacía — decisión ortogonal.
- **No migrar a SMTP externo** (SendGrid/Mailgun/SES) — decisión fuera del alcance del Plan 29, se evalúa si Plan 29 no es suficiente en las 48-72h post-deploy.

## CRITERIOS DE CIERRE

Chat 1 cerrado cuando:

- [ ] Las 8 decisiones tienen respuesta documentada (no "pendiente", sí decisión explícita aunque sea "opción X por ahora, revisar en N semanas").
- [ ] Resultados de las 3 queries del PRE-WORK pegados en el chat con conclusiones.
- [ ] Headers del rebote real inspeccionados → confirmado origen CrossChex (o descarte con otra hipótesis).
- [ ] Decisión del jefe sobre corte SMTP CrossChex tomada (aprobada / rechazada / esperar Plan 24).
- [ ] Sección `### Decisiones cerradas Chat 1` anexada al Plan 29 en `../../educa-web/.claude/plan/maestro.md` con las 8 decisiones.
- [ ] Actualizado el `### Checklist pre-Chat 1 /design` en el maestro marcando los 3 items pendientes.
- [ ] Wording final de `INV-MAIL01/02/03` acordado (para que Chat 4 solo copie-y-pegue).
- [ ] Chat 2 BE tiene alcance claro: archivos a tocar, líneas estimadas, orden de ejecución, script SQL a mostrar al usuario.
- [ ] Actualizado el `Foco` del maestro reflejando avance Chat 1 → Chat 2.
- [ ] Este archivo movido a `educa-web/.claude/chats/closed/` con el commit que cierra el chat.

## COMMIT MESSAGE sugerido

Un solo commit al cerrar el `/design` (solo toca `maestro.md` + mueve el archivo a `closed/`):

```
docs(maestro): Plan 29 Chat 1 — close /design with 8 decisions for SMTP defer/fail cascade
```

Body (opcional, si se quiere detalle):

```
Close Plan 29 Chat 1 /design with 8 decisions that unblock Chat 2 BE:

- Email format regex + normalization policy (pre-enqueue validation).
- "EmailBlacklist" schema + indexing policy.
- Auto-blacklist threshold: 3 permanent 5.x.x bounces, no time window.
- Blacklist reversal: endpoint only in Chat 2, admin UI deferred.
- CrossChex SMTP policy: <decided option a/b/c> — see maestro.md.
- SSL handshake fix strategy for "MailKit" TLS config.
- Final wording of "INV-MAIL01/02/03" for business-rules.md section 17.
- Outbox sanitation plan: pre-deploy SQL script marks existing invalid
  records as "FAILED_INVALID_FORMAT" to avoid consuming defer/fail counter
  at worker startup.

Chat 2 BE scope ready: "EmailValidator" helper, "EmailBlacklist" table +
repo + service, "EmailOutboxService.EnqueueAsync" hook, worker auto-insert
on 3 bounces, "EmailService" TLS fix. Plan 22 Chat B remains blocked until
Chat 2 ships so the monitoring widget includes defer/fail metrics.
```

Reglas de la skill `commit` respetadas:

- Idioma inglés, modo imperativo (`close`, `add`, `fix`).
- Español solo entre comillas para identificadores del dominio (`"EmailBlacklist"`, `"EmailOutboxService"`, `"INV-MAIL01/02/03"`, `"FAILED_INVALID_FORMAT"`, `"MailKit"`, `"EmailValidator"`, `"EmailService"`).
- Subject ≤ 72 caracteres (`docs(maestro): Plan 29 Chat 1 — close /design with 8 decisions for SMTP defer/fail cascade` = 95 caracteres → **acortar a**: `docs(maestro): Plan 29 Chat 1 — close /design with 8 decisions`, 64 caracteres ✓).
- **NO agregar `Co-Authored-By`** (prohibido por la skill).

**Subject final recomendado**:

```
docs(maestro): Plan 29 Chat 1 — close /design with 8 decisions
```

## CIERRE

Feedback a pedir al usuario al cerrar el chat:

1. **Decisión 5 (CrossChex)** — la más crítica. Si el jefe aprueba el corte (opción a), ¿cuándo se ejecuta? ¿Chat 3 del Plan 29 o antes? Si no aprueba, documentar la razón para revisitar en Plan 24.
2. **Decisión 8 (saneamiento)** — ¿cuántos registros aproximadamente va a tocar el script de pre-deploy? (depende del resultado de la query A). Si son miles, considerar ejecución en batch.
3. **Wording de invariantes** — confirmar que el usuario está OK con agregar una nueva sección §17 en `business-rules.md` (o integrar a §16 "Reportes de Usuario"). Si prefiere otro lugar, decidir aquí.
4. **Plan 28 Chat 3** — reconfirmar que efectivamente se posterga hasta cerrar Plan 29 Chat 2. ¿O hay urgencia suficiente en AA para paralelizar? Si se paraleliza, alguien coordina los PRs simultáneos sobre `EmailOutboxService`.
5. **Widget Plan 22 Chat B** — ¿se agrega a la deuda del maestro un item explícito que diga "widget incluye métricas de defer/fail" para que Chat 2 del Plan 29 deje los campos listos (no solo agregados `ThrottleStatus`, sino también `DeferFailStatus`)?

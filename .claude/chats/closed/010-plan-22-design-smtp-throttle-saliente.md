> **Repo destino**: `Educa.API` (backend, branch `master`). Abrir el chat nuevo en este repo. El maestro vive en `educa-web/.claude/plan/maestro.md` — referencias con path relativo `../../educa-web/.claude/plan/maestro.md`.
> **Plan**: 22 · **Chat**: diseño pre-F5 · **Fase**: revisión post-restricción SMTP · **Estado**: ⏳ pendiente arrancar.

---

# Plan 22 — Diseño: Throttle saliente por buzón remitente (post-restricción cPanel)

## PLAN FILE

- **Maestro**: `../../educa-web/.claude/plan/maestro.md` — sección `🚨 Restricción crítica — Límites SMTP del hosting (cPanel)` (agregada 2026-04-21).
- **Plan 22**: `Educa.API/.claude/plan/asistencia-correos-endurecimiento.md`.
- **Plan 24** (colateral): inline en maestro, fila 24 del inventario.
- **Plan 26** (colateral, dominio distinto): inline en maestro, sección Plan 26.

## OBJETIVO

Decidir si Plan 22 necesita una fase nueva (F5/F6) para respetar los techos reales del hosting cPanel antes de cerrarlo. El dato entró tarde: el `EmailOutboxWorker` actual consume el outbox sin límite de cadencia y los 50 envíos/hora por buzón remitente se pueden agotar en minutos. Los 51+ excedentes los descarta el hosting silenciosamente (sin bounce, sin error, sin log).

**Este chat es modo diseño, no ejecución.** Produce una decisión clara sobre:

1. Si F5/F6 (throttle saliente) se incorpora a Plan 22 y con qué alcance.
2. Si Plan 24 (CrossChex background) necesita ajuste para no colisionar cuotas.
3. Qué pre-work de validación queda pendiente (rolling window, bounce-como-envío, inventario de remitentes).

El entregable es un update al maestro (fila 22 + sección 🚨) y al plan file de Plan 22 con las fases nuevas agregadas. No se toca código en este chat.

## PRE-WORK OBLIGATORIO

Antes de proponer el diseño, confirmar con el usuario y/o inspeccionar:

### 1. Cifras exactas (ya confirmadas, documentadas en maestro)

| Ámbito | Límite/hora |
|--------|-------------|
| Por cuenta cPanel | 300 |
| Por dominio | 200 |
| Por dirección de correo individual (buzón remitente) | 50 |
| Por script PHP (no aplica .NET) | 30 |

### 2. Validaciones con el hosting (3 preguntas abiertas)

- [ ] ¿Rolling window de 60 min o hora del reloj (00-59)? Cambia el algoritmo del throttle.
- [ ] ¿Un 550 cuenta como "envío" para la cuota? Afecta cuánto consume un lote con emails inválidos.
- [ ] ¿La cuota del buzón se reinicia si se cambia la contraseña / se re-autentica? (Si pasó durante los 7 fallos históricos marcados `FAILED_UNKNOWN` por auth rota.)

### 3. Inspección de BD (pedir al usuario ejecutar)

Antes de decidir estrategia de throttle, conocer el universo real:

```sql
-- Remitentes activos últimos 30 días + cadencia promedio por hora
SELECT
  EO_Remitente,
  COUNT(*)                                          AS total_envios,
  COUNT(*) / 30.0                                   AS promedio_diario,
  COUNT(*) / (30.0 * 24.0)                          AS promedio_horario,
  MAX(EO_FechaReg)                                  AS ultimo_envio,
  SUM(CASE WHEN EO_Estado = 'SENT' THEN 1 ELSE 0 END) AS enviados_ok,
  SUM(CASE WHEN EO_Estado LIKE 'FAILED%' THEN 1 ELSE 0 END) AS fallidos
FROM EmailOutbox
WHERE EO_FechaReg >= DATEADD(DAY, -30, SYSDATETIME())
GROUP BY EO_Remitente
ORDER BY total_envios DESC;
```

```sql
-- Picos horarios reales: identificar si alguna hora histórica rebasó los 50/h
SELECT
  EO_Remitente,
  CAST(EO_FechaReg AS DATE)     AS fecha,
  DATEPART(HOUR, EO_FechaReg)   AS hora,
  COUNT(*)                      AS envios_en_hora
FROM EmailOutbox
WHERE EO_FechaReg >= DATEADD(DAY, -30, SYSDATETIME())
GROUP BY EO_Remitente, CAST(EO_FechaReg AS DATE), DATEPART(HOUR, EO_FechaReg)
HAVING COUNT(*) > 40  -- cerca del techo
ORDER BY envios_en_hora DESC;
```

**Regla** (feedback `db_select_first`): mostrar las queries al usuario, que él las ejecute en prod y prueba, y comparta resultados antes de decidir estrategia.

### 4. Inventario de remitentes configurados

- [ ] Leer `appsettings.json` / User Secrets: cuántos buzones distintos están configurados como remitentes (`EmailSettings:FromAddress` y variantes).
- [ ] ¿Hay campos en BD que guardan `EO_Remitente` o siempre viene del config? Grep en `EmailOutboxService` y `EmailNotificationService`.

## ALCANCE DE ESTE CHAT (diseño)

Producir respuestas a 5 preguntas:

### Q1. Alcance de F5 — ¿throttle en worker o en `EnqueueAsync`?

- **Opción A**: Throttle en `EmailOutboxWorker` (el worker espera antes de enviar si se superó el umbral). Pro: una sola responsabilidad, simple. Contra: la cola crece sin control si la cadencia de enqueue > 50/h.
- **Opción B**: Throttle en `EnqueueAsync` (rechaza con 429 o con estado especial si el remitente está saturado). Pro: backpressure visible al caller. Contra: complejidad en llamadores (import masivo, aprobación batch).
- **Opción C**: Mixto — enqueue siempre acepta, worker respeta ventana y si se llena marca `FAILED_QUOTA_EXCEEDED` después de N minutos en cola. Permite al admin ver en la UI Email-Outbox que hubo saturación.

Decidir: A, B, o C.

### Q2. Algoritmo del throttle

- **Sliding window 60 min** (cuenta envíos en últimos 60 min por remitente, rechaza/espera si ≥ 50). Preciso pero requiere query por cada envío.
- **Fixed bucket por hora del reloj** (contador in-memory reinicia 00:00 cada hora). Simple, coincide con cPanel si su techo es hora-del-reloj.
- **Token bucket** (50 tokens, recarga 1 token cada 72s). Más suave, pero no es lo que hace cPanel.

Decidir tras validación #1 con el hosting.

### Q3. Granularidad

- ¿Throttle solo por buzón remitente (50/h) o también por dominio (200/h)?
- Si el dominio es uno solo (`laazulitasac.com`), el techo de dominio (200/h) aplica sobre el agregado de todos los buzones. Si varios buzones activos = necesitamos agregado.

### Q4. Qué pasa al saturar

- **Retry diferido**: el correo queda `PENDING` con `EO_SiguienteIntento` seteado al próximo slot libre (ej. +1h). Usuario ve demora.
- **Fallback a otro buzón**: si `sistemas@` está saturado, probar `notificaciones@` del mismo dominio (respetando el techo conjunto). Requiere lista ordenada de remitentes válidos.
- **Fail explícito**: marcar `FAILED_QUOTA_EXCEEDED` y notificar en correo resumen de F3. Usuario decide si reenqueue manual.

### Q5. Impacto en Plan 24 (CrossChex background)

- Si el job de sync al finalizar encola correos (resumen, notificaciones a afectados), decide qué remitente usa.
- Recomendación a agregar al diseño de Plan 24: usar remitente distinto del que emite correcciones de asistencia, o encolar con prioridad baja para que el throttle respete primero los correos transaccionales en tiempo real.

## FUERA DE ALCANCE

- **Ejecución de código**: este chat solo diseña y actualiza plan files. F5/F6 se ejecuta en chat(s) separado(s).
- **Decisiones sobre Plan 26**: dominio distinto (rate limit HTTP entrante vs SMTP saliente). Solo mencionar en el diseño si el patrón `RateLimitEvent` inspira un `EmailSendEvent` análogo.
- **Tocar políticas de retry ya cerradas en F2**: la política 0/1 por causa permanente / transitoria está bien. F5/F6 es ortogonal.
- **Crear nuevos buzones en cPanel**: decisión de infraestructura del usuario, no del chat.

## CRITERIOS DE CIERRE

Entregables concretos:

- [ ] Queries SQL del pre-work #3 mostradas al usuario, ejecutadas por él, resultados pegados en el chat.
- [ ] Las 3 preguntas al hosting (pre-work #2) marcadas como respondidas o como TODO explícito del plan.
- [ ] Inventario de remitentes actuales documentado (pre-work #4).
- [ ] Decisión clara sobre Q1-Q5 con justificación de 1-2 líneas cada una.
- [ ] Plan file `Educa.API/.claude/plan/asistencia-correos-endurecimiento.md` actualizado con F5 (y F6 si aplica) desglosado en chats atómicos (BE + FE si necesita UI admin).
- [ ] Maestro actualizado:
  - Fila 22 del inventario: agregar "+ F5/F6 pendiente" al estado.
  - Sección `🚨 Restricción crítica`: marcar los items de "Qué planes revisar" con decisiones tomadas.
- [ ] Plan 24 en el maestro: nota explícita sobre coordinación de remitentes con Plan 22.
- [ ] Commit con los cambios de los plan files (solo `docs(maestro)` / `docs(plan22)`, sin código).
- [ ] Mover este archivo a `educa-web/.claude/chats/closed/` al cerrar.

## APRENDIZAJES TRANSFERIBLES (del chat actual)

- **Los 5 fallos/hora que originaron Plan 22 NO son este mismo techo**. Esos eran bounces acumulados (5 bounces seguidos pausa el SMTP saliente 1h). Los 50/h nuevos son **envíos aceptados**. Son dos mecanismos distintos del hosting que se combinan.
- **F2 del Plan 22 bajó retry de 5 → 2**. El throttle saliente de F5 es complementario, no redundante: aunque no se reintente, un lote grande de primeras-entregas ya satura.
- **Clasificación F2** (`FAILED_INVALID_ADDRESS`, `FAILED_MAILBOX_FULL`, `FAILED_REJECTED`, `TRANSIENT`, `FAILED_UNKNOWN`): F5 podría agregar `FAILED_QUOTA_EXCEEDED` como tipo nuevo o `TRANSIENT_QUOTA` si se reintenta después.
- **Reglas de diseño aplicables**:
  - `rules/optimistic-ui.md` no aplica directo (backend).
  - `rules/backend.md` § Corrección sistemática de patrones — grep de `Task.Run` ya se hizo en Plan 21. Para F5, grep de `EO_Remitente` usage.
  - `rules/business-rules.md` INV-S07 (fire-and-forget de notificaciones) se preserva — un throttle que falla no debe tumbar el worker.
  - `feedback_db_select_first` — pre-work #3 lo invoca explícitamente.
- **Archivos que el chat nuevo probablemente toca** (solo para referencia, NO editar en este chat):
  - `Educa.API/Services/Sistema/EmailOutboxWorker.cs` (273 ln tras F3) — aquí vive `ApplyAsistenciaPolicy`.
  - `Educa.API/Services/Sistema/EmailOutboxService.cs` (296 ln) — si Q1 elige opción B.
  - `Educa.API/.claude/plan/asistencia-correos-endurecimiento.md`.
  - `educa-web/.claude/plan/maestro.md`.

## COMMIT MESSAGE sugerido

Un solo commit de docs al terminar el diseño (no hay código):

```
docs(maestro,plan22): add F5 throttle design for cPanel SMTP caps

Document the design decisions for "throttle saliente" per sender mailbox
in response to the newly confirmed hosting limits (300/h account,
200/h domain, 50/h mailbox). Update Plan 22 with F5 (and F6 if admin UI
is needed) broken down into atomic chats. Update maestro row 22 status
and mark resolved items in the "Restricción crítica" section.

Plan 24 gets a cross-reference note about sender coordination.
```

- Idioma: inglés (regla `feedback_commit_style`).
- Scope: `docs(maestro,plan22)` porque toca ambos archivos.
- NO agregar `Co-Authored-By` (skill `commit` lo prohíbe).
- Si el usuario prefiere separar, puede hacer dos commits: uno en educa-web (maestro) y otro en Educa.API (plan22).

## CIERRE

Al terminar el chat, pedir al usuario feedback sobre:

- ¿Q1 (dónde poner el throttle) convence o hay un tercer camino que no se consideró?
- ¿Los picos horarios del pre-work #3 confirmaron que el problema es real o fue paranoia?
- ¿Las 3 preguntas al hosting quedaron respondidas o se difieren a un chat de investigación posterior?
- ¿F5/F6 arrancan antes que Chat 5 (F4.BE auditoría de correos) del Plan 22, o Chat 5 puede proceder en paralelo porque no toca el worker?

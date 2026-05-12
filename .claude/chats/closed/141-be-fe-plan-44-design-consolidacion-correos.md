# 141 · BE+FE — Plan 44 design: estrategia de reducción de volumen SMTP

> ⚠️ Renombrado: el "Plan 42" original del prompt de creación colisionaba con el Plan 42 vigente (Normalización de casing FE↔BE). Asignado **Plan 44** (siguiente libre tras 43 = Monitoreo Cowork).
>
> **Creado**: 2026-05-12 · **Estado**: ⏸ waiting (`/block-chat` 2026-05-12: pausa externa por orden de jefatura — abrir chat 143 con prioridad mayor para uniformizar vista de asistencia entre los 4 roles administrativos) · **Repo**: ambos (`Educa.API` + `educa-web`)
> **Modo sugerido**: `/design` (ADR + plan de ejecución por fases). NO ejecutar todavía.
> **Origen**: 2026-05-12 jefe confirmó que el hosting denegó subir el techo `max_defer_fail_percentage`. Las defensas reactivas del Plan 22/29/37/38/39 ya están en prod o awaiting-prod. Para no agotar la cuota de 5 defers+fails/h por dominio, el siguiente paso es **reducir el volumen real** de correos salientes, no solo defenderse cuando rompen.
>
> **🆕 2026-05-12 — Absorbe scope residual de Plan 29 Chat 3 (WONTDO)**: la decisión CrossChex SMTP (desactivar su SMTP / migrar a remitente propio / esperar Plan 24 que consuma directo el biométrico) entra como sub-decisión de la línea **E** (push/canal alterno) o como nueva línea **F** según resulte del análisis. Hosting denegó subir techo — CrossChex pasa de "trámite OPS independiente" a "palanca técnica del Plan 44".

## Contexto y motivación

- INV-MAIL03 (techo cPanel) confirmado como **hard cap no negociable**.
- Volumen actual (smoke 2026-05-12): 5208 correos totales, 5128 enviados, 14 fallidos, 0 pendientes. **Concentración matutina pesada** (5 envíos entre 08:08 y 08:15 vistos en muestreo).
- Defensas en producción que ya minimizan deuda: pre-filter `EnqueueAsync` (INV-MAIL01), auto-blacklist 5.x.x (INV-MAIL02), mailbox-full handler 4.2.2 (INV-MAIL07), quarantine + domain pause (INV-MAIL09, Plan 37).
- Pero **el volumen legítimo sigue creciendo** con la cantidad de estudiantes. Sin reducción de volumen, en algún momento el throttle Plan 22 (50/h × 7 buzones = 350/h) deja de escalar.

## Objetivo del chat

Producir un ADR + plan de ejecución por fases para **reducir el volumen real de correos salientes** sin perder funcionalidad observable. Salir con scope acordado, no con código.

## Líneas de exploración candidatas

| # | Idea | Reducción estimada | Costo BE | Costo FE | Riesgo UX |
|---|------|---------------------|----------|----------|-----------|
| A | **Consolidación diaria por apoderado**: 1 correo `RESUMEN_ASISTENCIA_DIA` con todos los hijos + todos los eventos (entrada/salida/tardanza/ausencia/justificación), enviado a las 18:00 hora Perú | 60-80% en horario pico | Alto (nuevo worker, nuevo template, lógica de buffer) | Bajo | Pierde inmediatez de "entró 08:15" |
| B | **Calendarización fuera de pico**: postponer todos los correos no críticos a ventanas de baja carga (12:00, 18:00, 22:00) | 30-40% en pico 08:00-09:00 | Medio (scheduler en `EmailOutbox`) | Bajo | Atrasos de 30min-3h por correo |
| C | **Opt-out granular por categoría**: apoderado elige en su perfil qué tipos recibe (asistencia entrada/salida/tardanza/eventos) | 10-30% según adopción | Bajo (filtros en EnqueueAsync) | Medio (UI preferencias) | Apoderado debe configurar — quien no lo haga sigue como hoy |
| D | **Reducción de eventos generados**: revisar si correos como "Salida 13:55" son realmente necesarios o si bastan los "Entrada" y "Tardanza" | 20-30% si dropean salidas | Bajo (toggle config + flag por sede) | Nulo | Decisión del jefe |
| E | **Push notification como canal alternativo** para entradas/salidas (mantener correo solo para tardanza/ausencia/justificación) | 50%+ si los apoderados con app activa migran | Alto (Firebase wiring pendiente) | Alto (UI preferencia + onboarding) | Apoderado debe instalar app — adopción incierta |

Combinaciones útiles:
- **A + D**: consolidación + drop salidas → -80% volumen estimado.
- **B + C**: cambios chicos sin tocar mucho la UX → -40% sin pérdida funcional.
- **E** habilita opciones para una fase 3 cuando la app esté instalada.

## Decisiones a tomar en este chat

1. ¿Cuál es la reducción objetivo? (ej: -50% vs -80%)
2. ¿Qué línea (A/B/C/D/E) o combinación se prioriza?
3. ¿Quién decide qué eventos son "críticos" y cuáles "consolidables"? — propuesta al jefe necesaria.
4. Para opción A: ¿el resumen es por apoderado o por hijo? ¿hora de envío?
5. Para opción C: ¿la preferencia es por apoderado o por hijo?
6. ¿Migración: feature flag por sede + rollout escalonado, o big-bang?

## Entregables del chat

- ADR (`Educa.API/.claude/decisions/000X-volume-reduction-strategy.md`) con la decisión.
- Plan dedicado (`Educa.API/.claude/plan/email-volume-reduction.md` o equivalente) con fases.
- Si se elige opción A: diseño del worker de consolidación + DTO `EmailDailyDigest` + lógica de buffer (probable nueva tabla `EmailOutboxBuffer` o uso del `EmailOutbox` existente con `EO_Estado='BUFFERED'`).
- Actualización del maestro con Plan 42.

## Pre-work obligatorio

- Releer §18 `business-rules.md` (correos salientes) + INV-MAIL01/02/03/04/06/07/08/09.
- Mirar query de distribución por hora del día y por tipo: 
  ```sql
  SELECT DATEPART(HOUR, EO_FechaReg) hora, COUNT(*) total, COUNT(CASE WHEN EO_Estado='SENT' THEN 1 END) sent
  FROM EmailOutbox WHERE EO_FechaReg >= DATEADD(DAY, -7, GETDATE()) GROUP BY DATEPART(HOUR, EO_FechaReg) ORDER BY hora;
  ```
- Confirmar adopción real de la app móvil (Plan 19 pendiente — afecta viabilidad opción E).

## Aprendizajes transferibles

- Hosting compartido tiene techos no negociables. Diseñar para **reducir demanda**, no solo para **resistir el techo**, escala mejor.
- Los planes 22/29/37/38/39 son defensivos. Plan 42 es ofensivo. Ambos modos son necesarios.

---

## 🏁 Conclusión del `/design` — Plan 44 DESCARTADO (2026-05-12)

### Restricciones finales del usuario

1. **CrossChex se queda** — funcional, sin reemplazo aprobado. Línea F (corte SMTP CrossChex) descartada.
2. **Sin aprobación adicional** — sin SMTP relay externo (línea J), sin subdominio dedicado (línea I), sin costo, sin fricción.
3. **Mínimo viable, menor riesgo** — descartadas líneas A (consolidación, fricción al apoderado), C (opt-out, UI nueva), D (drop salida regular, ack del jefe), E (push, bloqueado por Plan 19).

### Insight clave del análisis

**El contador `max_defer_fail_percentage` mira FAILED, no SENT.** Educa hoy: 14 FAILED / 5208 SENT = **0.27% FAILED rate**. Las defensas INV-MAIL01/02/07/09 ya cubren la métrica relevante del contador. Reducir volumen total NO mueve la aguja del contador — mueve UX del apoderado.

Consecuencia: el "Plan 44 ofensivo" original (líneas A/B/C/D/E) ataca un problema que la métrica del techo NO mide. Bajo las restricciones del usuario, la única acción que mueve la aguja sin fricción es **ceder automáticamente cuando el contador compartido con CrossChex está caliente**.

### Decisión

**Plan 44 descartado. Scope mínimo viable absorbido por Plan 22 ampliado**:

| Chat | Repo | Scope | Estado |
|---|---|---|---|
| **Plan 22 Chat 5 (F4.BE)** | BE | Auditoría destinatarios inválidos (endpoint admin) | ✅ Ya planificado (cola del Plan 22) |
| **Plan 22 Chat 6 (F4.FE)** | FE | UI admin de la auditoría | ✅ Ya planificado (cola del Plan 22) |
| **Plan 22 Chat 7 (F5.BE)** 🆕 | BE | Guard de cesión automática en `EmailOutboxWorker` cuando contador ≥80% — pausa correos informativos (`Asistencia`, `AsistenciaProfesor`), mantiene críticos administrativos. Sin UI, sin opt-in, transparente. Formaliza **INV-MAIL10**. | 🆕 Brief en `chats/open/146` |

### Entregables ejecutados en este chat

1. ✅ **Maestro actualizado** — Plan 44 marcado DESCARTADO; Plan 22 con Chat 7 nuevo en cola; nota operativa actualizada.
2. ✅ **`business-rules.md §15.14`** — agregada **INV-MAIL10** documentando el guard de cesión automática + referencia desde §18.5.
3. ✅ **Brief Plan 22 Chat 7** creado en `chats/open/146-be-plan-22-chat-7-defer-fail-cession-guard.md` con scope concreto, decisiones tomadas, pre-work y tests esperados.
4. ✅ **Sin ADR nuevo** — la estrategia ya vive implícita en `business-rules.md §18 + INV-MAIL01-10`. ADR-0007 no necesario.

### Líneas explícitamente descartadas (registro para futuro)

| Línea | Razón descarte |
|---|---|
| A — Consolidación diaria | Fricción percibida por apoderado; no mueve métrica del contador (FAILED no SENT) |
| B — Scheduling fuera de pico | Redundante si A entra; sin A, complejidad sin ganancia clara |
| C — Opt-out granular | UI nueva, requiere apoderados configurar, default sigue como hoy |
| D — Drop salida regular | Ack del jefe (fricción política), no técnica |
| E — Push canal alterno | Bloqueado por Plan 19 F1+F2 sin cerrar |
| F — Corte CrossChex SMTP | **Restricción explícita del usuario** (2026-05-12): CrossChex funcional, sin reemplazo aprobado |
| I — Subdominio dedicado | Sin aprobación adicional disponible |
| J — SMTP relay externo | Sin aprobación adicional + costo recurrente $10-20/mes |

### Si la situación empeora en el futuro

Si crece la matrícula y los FAILED suben proporcionalmente, o si el contador del hosting se vuelve crónicamente saturado por CrossChex, revisar en este orden:

1. **G (auditoría + cleanup BD)** — Plan 22 Chat 5/6 — barrido manual al pico de FAILED.
2. **H ampliado** — bajar `DeferFailCessionThresholdPercentage` de 80 a 60 si el guard del Chat 7 no se está disparando lo suficiente.
3. **A (consolidación diaria)** — si la presión del usuario hace que la fricción ya no sea bloqueante.
4. **J (SMTP relay externo)** — escalar a empresa con datos reales de bloqueos del dominio post-Chat 7.

### Estado del chat

🏁 `/design` completado. **Siguiente paso**: `/end` para commit + mover brief 141 a `closed/`. El próximo `/start-chat` debería tomar el brief 146 (Plan 22 Chat 7) o cualquiera de la cola priorizada del maestro.

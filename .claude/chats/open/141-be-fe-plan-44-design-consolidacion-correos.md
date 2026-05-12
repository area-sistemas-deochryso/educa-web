# 141 · BE+FE — Plan 44 design: estrategia de reducción de volumen SMTP

> ⚠️ Renombrado: el "Plan 42" original del prompt de creación colisionaba con el Plan 42 vigente (Normalización de casing FE↔BE). Asignado **Plan 44** (siguiente libre tras 43 = Monitoreo Cowork).
>
> **Creado**: 2026-05-12 · **Estado**: ⏳ pendiente arrancar · **Repo**: ambos (`Educa.API` + `educa-web`)
> **Modo sugerido**: `/design` (ADR + plan de ejecución por fases). NO ejecutar todavía.
> **Origen**: 2026-05-12 jefe confirmó que el hosting denegó subir el techo `max_defer_fail_percentage`. Las defensas reactivas del Plan 22/29/37/38/39 ya están en prod o awaiting-prod. Para no agotar la cuota de 5 defers+fails/h por dominio, el siguiente paso es **reducir el volumen real** de correos salientes, no solo defenderse cuando rompen.

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

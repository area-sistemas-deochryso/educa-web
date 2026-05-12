# 144 · BE+FE — Auditoría de invariantes y ADR en conflicto con brief 143

> **Creado**: 2026-05-12 · **Estado**: ✅ closed (audit terminado 2026-05-12 con 3 decisiones del usuario) · **Repo**: ambos (`Educa.API` + `educa-web`)
> **Modo sugerido**: `/audit`. Producir matriz de conflictos + propuesta de cambios documentales. Toma decisiones el usuario; aplicación de cambios va en chat siguiente.
> **Origen**: Continuación directa de brief 143 (Plan 28 Chat 4a reversión). El usuario solicitó explícitamente: *"luego acabando esto vamos a tener que revisar qué invariantes y ADR están en conflicto y reconsiderar cambios"*. Mensaje 2026-05-12: *"hay que verificar invariantes y adr para ajustar según el nuevo requerimiento"*.

## Contexto

Brief 143 unificó la vista de asistencia para los 4 roles administrativos en el FE. El BE no cambió. Esto deja varias invariantes documentadas con redacción incoherente con el nuevo comportamiento. Adicionalmente, hay un gate fino server-side **no implementado todavía** que la documentación menciona como "preparado para Chat 6 BE" (INV-AD08) — ahora que el AA puede llegar al panel completo, esa deuda se vuelve más visible.

## Objetivo del chat

1. **Auditar** las invariantes y ADRs que mencionan Plan 28 Chat 4a o el aislamiento del AA.
2. **Producir matriz de conflicto**: invariante → estado actual → opciones de ajuste → riesgo.
3. **Pedir decisiones al usuario** sobre cada invariante en conflicto.
4. **NO modificar código ni docs en este chat** — solo proponer. La ejecución va a un chat siguiente.

## Hipótesis de invariantes a revisar (a confirmar con grep)

### En `educa-web/.claude/rules/business-rules.md`

- **§1.8 INV-AD05** — *"AsistenciaAdminService envía correo diferenciado [...] Destinatarios polimórficos por TipoPersona: E → apoderado; P → profesor; A → el propio Asistente Administrativo (`Director.DIR_Correo` filtrado por rol). Destinatario único."* — No conflicto directo con brief 143. Sigue válida. ✅
- **§1.8 INV-AD06** — *"Un profesor no puede autojustificarse [...] toda mutación sobre AsistenciaPersona con TipoPersona='P' requiere rol administrativo."* — No conflicto con brief 143 (es sobre profesor). Sigue válida. ✅
- **§1.8 INV-AD08** — *"Principio general: ningún rol administrativo corrige asistencia de su propio rol. El AA NO puede mutar AsistenciaPersona con TipoPersona='A' (propia ni de un colega AA). Jurisdicción sobre 'A' = SupervisoresAsistenteAdmin = {Director, Promotor, Coordinador Académico}. Enforcement controller-level con autorización condicional por TipoPersona del target pendiente Chat 6 BE — hoy [Authorize(Roles = Roles.Administrativos)] en AsistenciaAdminController es necesario pero no suficiente."* — **CONFLICTO DOCUMENTAL**: brief 143 dijo "sin importar qué halla que hacer". ¿Sigue válida o se afloja? Decisión pendiente del usuario.
- **§1.8 INV-AD09** — *"Mutaciones admin sobre AsistenciaPersona con TipoPersona='A' envían correo de corrección al propio AA [...] simetría con INV-AD05."* — No conflicto directo. Sigue válida si INV-AD08 se mantiene. Si se afloja AD08, esta también debe ajustarse.
- **§16 INV-RU***  — Reportes de usuario, no relacionado. ✅

### Comentarios del Plan 28 Chat 4a en business-rules.md

- §1.1 Periodo regular menciona *"Asistente Admin) reusa los thresholds de 'P'"* y *"Plan 28 Chat 1 — decisión 6"* — No conflicto, es lógica de cálculo.
- §1.8 INV-AD05 menciona *"Self-service AA es read-only (Plan 28 Chat 3d, 2026-05-08)"* y describe los endpoints `/api/asistente-administrativo/me/dia` y `/me/mes`. **CONFLICTO POTENCIAL**: si el AA ahora ve el panel director igual que Director/Promotor/Coordinador, ¿siguen existiendo esos endpoints `/me/*`? ¿El AA los consume aún? Investigar.

### En ADRs (`Educa.API/.claude/decisions/`)

- A confirmar con grep: ¿hay un ADR de Plan 28 Chat 4a o similar?

### En código (TODOs sembrados por brief 143)

- `educa-web/src/app/features/intranet/pages/cross-role/home-component/home.component.ts` línea ~44 — `TODO Plan 28 Chat 4a reversion`.
- `educa-web/src/app/features/intranet/pages/cross-role/attendance-component/attendance.component.ts` línea ~62 — `TODO Plan 28 Chat 4a reversion`.
- `educa-web/src/app/features/intranet/pages/cross-role/attendance-component/attendance.component.html` — `TODO Plan 28 Chat 4a reversion`.

Estos quedaron como recordatorio para este chat.

## Decisión clave a resolver con el usuario

> ¿INV-AD08 se mantiene o se afloja?

| Opción | Implica | Riesgo |
|---|---|---|
| **A) Mantener INV-AD08** | El AA ve el panel completo pero recibe 403 al intentar mutar sobre `'A'`. Hay que implementar el guard fino server-side **ahora** (deuda Plan 28 Chat 6 BE). | Implementación BE pendiente, UX inconsistente hasta que se haga. |
| **B) Aflojar INV-AD08 a todos los `Administrativos`** | El AA puede mutar `'A'` propia y de colegas AA igual que Director/Promotor/Coordinador. Reescribir INV-AD08 y AD09. | El AA puede autojustificarse. Ya no hay separación de poderes para `TipoPersona='A'`. |
| **C) Intermedio: AA puede mutar `'A'` de colegas pero NO la propia** | Mantener "no autojustificación" pero permitir mutar a colegas AA. | Guard fino más complejo: comparar `User.GetDni()` con el DNI del registro. |

## Pasos

1. **Grep / Read** `business-rules.md` completo para confirmar la lista de invariantes afectadas (no solo las hipotéticas arriba).
2. **Grep** `Educa.API/.claude/decisions/` por ADRs que mencionen Plan 28 o INV-AD0*.
3. **Grep** código BE/FE para usos de `Roles.SupervisoresAsistenteAdmin` y patrones que solo aplicarían si AA tiene UI separada.
4. **Producir matriz consolidada** + propuesta para cada item.
5. **Reportar al usuario** y esperar decisiones.

## OUT

- No modificar invariantes ni código en este chat. Solo proponer.
- No tocar tests todavía (cualquier test que mencione Plan 28 Chat 4a se ajustará en el chat de ejecución).
- No tocar BE — el guard server-side de INV-AD08 (opción A) o el aflojamiento (B/C) son decisión del usuario y se aplican en chat siguiente.

## Cierre esperado

Reporte estructurado al usuario + decisiones tomadas. Brief queda en `closed/` con el reporte como referencia. La ejecución del ajuste documental (y eventual BE) se hace en brief 145.

---

## Decisiones tomadas (2026-05-12)

1. **INV-AD08 → Opción B**: aflojar a `Roles.Administrativos`. Cero BE. Reescribir invariante AD08 + ajustar AD09 + actualizar texto §1.8 "Self-service AA es read-only". AA puede autojustificarse — la evidencia queda vía correo AD09. Argumento decisivo: el guard nunca se implementó en 4 días de deuda y la orden de jefatura fue explícita ("sin importar qué halla que hacer").
2. **Cleanup huérfano → Opción A**: deprecar/eliminar todo el flujo "AA self-service":
   - BE: `AsistenteAdministrativoController`, su service + interface, sus tests.
   - FE: `AsistenteAdminAttendanceWidget`, `AttendanceAsistenteAdminPropia`, `AsistenciaAsistenteAdminApiService` + specs + exports del barrel.
3. **Ejecución → Un solo chat 145** que aplique todo, commitee FE+BE y haga push.

## ADR pendiente

No se creó ADR para esta reversión porque cae en categoría "decisión de producto por orden de jefatura" y no toca arquitectura. Si en el futuro se quiere registrar formalmente, el ADR vivirá en `Educa.API/.claude/decisions/0007-asistente-admin-jurisdiction.md` (siguiente número libre).

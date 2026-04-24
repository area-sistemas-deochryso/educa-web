> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 32 (**nuevo**) · **Chat**: 1 · **Fase**: /design · **Estado**: ⏳ pendiente arrancar.

---

# Plan 32 Chat 1 — /design — Centralización de errores vía Correlation ID

## PLAN FILE

Este es un **plan nuevo** — no existe plan file todavía. La decisión del Chat 1 es precisamente si el plan cabe inline en el maestro (`educa-web/.claude/plan/maestro.md`) o amerita archivo dedicado en `.claude/plan/`.

Consultar siempre el maestro como fuente de autoridad para contexto circundante:
- `.claude/plan/maestro.md` (FE). Ahí se registra la nueva entrada "Plan 32".
- Reglas de negocio relevantes: `educa-web/.claude/rules/business-rules.md` §16 (`INV-RU03` — CorrelationId en reportes de usuario) + "Trazabilidad de Errores" (INV-ET01/ET02) + `CorrelationIdMiddleware` en BE.

## OBJETIVO

Hoy los 3 dashboards admin de errores (ErrorLog, RateLimitEvent, ReporteUsuario) comparten el mismo `CorrelationId` en BD pero el id **no es clickeable ni cruza de un dashboard al otro**. El usuario ve un GUID pegado en un detalle y no tiene cómo saltar al evento hermano. Diseñar cómo las 3 páginas quedan **conectadas como hipervínculos por CorrelationId**, con una página que opere como hub central donde converja el contexto completo de una request.

> **Frase del usuario**: *"un id correlational que no se puede usar no sirve de nada"*.

## PRE-WORK OBLIGATORIO

### 1. Inventariar estado actual (sin escribir código)

Antes de decidir nada, el chat debe confirmar lo que realmente existe hoy — qué columnas almacenan el id en cada tabla, qué endpoints hay, y qué pantallas lo muestran. Mapa estimado basado en CLAUDE.md + screenshots:

| Dashboard admin | Ruta frontend | Tabla BD | Columna CorrelationId | Endpoint BE conocido |
|---|---|---|---|---|
| Trazabilidad de errores | `/intranet/admin/trazabilidad-errores` | `ErrorLog` | `ERL_CorrelationId` | `GET /api/sistema/error-log/*` (confirmar) |
| Telemetría de Rate Limiting | `/intranet/admin/rate-limit-events` | `RateLimitEvent` | (confirmar nombre) | `GET /api/sistema/rate-limit-events/*` |
| Reportes de Usuarios | `/intranet/admin/reportes-usuario` | `ReporteUsuario` | `REU_CorrelationId` (INV-RU03) | `GET /api/sistema/reportes-usuario/*` |

Tareas concretas antes de diseñar:

1. Leer los 3 componentes page + drawers del detalle para confirmar dónde se muestra hoy el GUID (screenshots muestran texto plano).
2. Leer el handler del botón **"Buscar en ErrorLog"** en la página de rate-limit-events — ya existe según screenshot. Saber si funciona end-to-end o es placeholder.
3. Grep por `CorrelationId` en el FE para mapear qué componentes ya tienen el dato en signals.
4. Consultar con el usuario: ¿qué tablas BE tienen índice por `CorrelationId`? Si no lo tienen, las queries por id serán table scan — candidato a script SQL en el plan.

### 2. Ninguna decisión técnica sin validación del usuario

El /design cierra con entre 6 y 10 decisiones numeradas acordadas explícitamente. Las decisiones técnicas que incluyan cambios en BD (índice, columna) o nueva ruta admin requieren visto bueno del usuario antes de escribirlas en la lista final.

## ALCANCE DEL DISEÑO

Tabla de preguntas a resolver (la respuesta de cada una es una "decisión" del chat):

| # | Pregunta | Opciones preliminares |
|---|----------|-----------------------|
| 1 | ¿Cuál es el **hub central**? | A) `trazabilidad-errores` (ya existe, se enriquece con "eventos relacionados") · B) pantalla nueva `/intranet/admin/correlation/{id}` tipo "vista de 360°" · C) ambos (enriquecer ErrorLog + página dedicada para enlaces profundos). |
| 2 | ¿Modelo de navegación? | **Mesh** (cualquiera a cualquiera, 6 aristas) · **Hub-and-spoke** (todos apuntan al hub, 3 aristas salientes + hub con sección "ver en X") · **Híbrido** (RateLimitEvent y ReporteUsuario siempre van al hub; el hub tiene bloques "ver también" con links externos). |
| 3 | ¿Cómo se **renderiza** el id? | Pill clickeable que navega · texto + botón explícito "Ver eventos relacionados" · ambos. Considerar accesibilidad (aria-label obligatorio, ver `rules/a11y.md`). |
| 4 | ¿Qué pasa si **no hay eventos hermanos**? | Mensaje "No hay eventos asociados" inline · esconder el bloque · banner informativo. |
| 5 | ¿BE necesita endpoints nuevos? | Posibles: `GET /api/sistema/correlation/{id}` devolviendo `{errorLogs[], rateLimitEvents[], reportesUsuario[]}` en un solo hit · o 3 endpoints filter-by-correlation separados consumidos en paralelo. Decisión condiciona el número de chats del plan. |
| 6 | ¿Cómo se **filtra** en los dashboards? | Query param `?correlationId={id}` ya soportado por filtros existentes · botón "Buscar" en la propia página destino · ambas (URL portable + UI). |
| 7 | ¿Es necesario **índice en BD**? | Sin índice por `CorrelationId`, el lookup es table scan — probable con el crecimiento actual. Decidir si hay script SQL en el Chat 2. |
| 8 | ¿Qué pasa con el botón **"Buscar en ErrorLog"** ya existente? | Mantener funcionamiento actual (si existe) · reescribir según el modelo del punto 2 · consolidar con los links nuevos para evitar 2 UX distintas. |
| 9 | ¿Los **reportes de usuario anónimos** (sin login) también están cubiertos? | INV-RU05 permite reportes `REU_UsuarioReg = "Anónimo"` con `REU_CorrelationId` válido — deben ser linkeables igual. |
| 10 | ¿**Dirección inversa** ErrorLog → ReporteUsuario? | Un error del BE puede ser el gatillo de un reporte manual del usuario (frustración). Ver desde ErrorLog "este error generó el reporte #N" es información valiosa para cerrar el loop. |

## TESTS MÍNIMOS

El /design NO escribe tests — solo decide si el plan los necesita. Enumerar en el brief de salida:

- Tests de contrato para endpoints BE nuevos (si aplica decisión 5).
- Tests de navegación FE (click-to-route con query param).
- Tests de render con 0 / 1 / varios eventos hermanos.
- Tests de accesibilidad (aria-label en los links).

## REGLAS OBLIGATORIAS

Aplicables transversales al plan que salga del /design:

- `INV-RU03` — `REU_CorrelationId` es la última request ANTES del submit; jamás el POST del propio reporte. No debe romperse.
- `INV-ET01 / INV-ET02` — todo error HTTP ≥ 400 (excepto 401/403) se persiste fire-and-forget. La búsqueda por CorrelationId debe ser **fail-safe**: si una tabla falla, mostrar las otras dos, no caer la pantalla.
- `INV-S07` — ningún error de lookup secundario debe romper la pantalla principal.
- `INV-D08` — endpoints devuelven `ApiResponse<T>`.
- Cap 300 líneas por archivo BE.
- `rules/a11y.md` — botones icon-only de link requieren `[pt]="{ root: { 'aria-label': ... } }"`.
- `rules/dialogs-sync.md` — si el hub usa drawer/dialog para "vista 360°", nunca dentro de `@if`.
- `rules/design-system.md` — tags y pills del CorrelationId respetan la convención A1 Opción C (tag-neutral para metadatos).
- `rules/code-language.md` — nombres en inglés, URLs/UI en español.

## APRENDIZAJES TRANSFERIBLES (del chat actual)

Puntos del contexto acumulado útiles para el diseño:

1. **El botón "Buscar en ErrorLog" ya existe** en `rate-limit-events` según screenshot — hay código FE parcial que sirve como baseline. Revisar primero antes de duplicar.
2. **Plan 31 Chat 1** (cerrado `c46dfa0`) introdujo el header `X-Educa-Outbox-Id` con patrón similar (id propagado header → BD → admin). El pattern de correlación cross-tabla ya está probado allí.
3. **Plan 30 Chat 4** (cerrado `3c316a2`) armó el endpoint `email-outbox/diagnostico?correo=` que cruza 4+ tablas fail-safe INV-S07 — es el **modelo arquitectónico más cercano** a lo que pide Plan 32. Revisar `EmailDiagnosticoPersonaLookup` y `EmailDiagnosticoSnapshotFactory.BuildEmpty` como template.
4. **Reportes de usuario es la pieza más joven** — su `REU_CorrelationId` fue diseñado pensando en esto (INV-RU03 lo describe como "la pieza que cruza trazabilidad automática y manual"). La FE actual lo guarda pero no lo explota.
5. **El `CorrelationIdMiddleware` del BE** genera el id único por request. Todos los eventos que derivan de UNA request comparten el id — por eso el hub-and-spoke tiene sentido natural.
6. **Commit/style (feedback)**: commits en inglés, español solo entre `"..."`, NUNCA `Co-Authored-By` (aplica a ambos repos — se rompió 1 vez en este mismo chat y requirió `--amend`).

## FUERA DE ALCANCE

- Implementación (los chats /execute del plan se definen AL CIERRE del /design, no ahora).
- Integración con sistemas de observabilidad externos (App Insights, OpenTelemetry) — fuera del scope de Plan 32.
- Retención/purga de `ErrorLog` o `RateLimitEvent` — fuera del scope.
- Agregar CorrelationId a tablas que hoy NO lo tienen (ej: `EmailOutbox` — tiene `X-Educa-Outbox-Id` por Plan 31, propósito distinto).
- Cambiar el formato del GUID (uuid v4 con guiones). Hoy es consistente.

## CRITERIOS DE CIERRE

- [ ] Leído: los 3 page components admin (`trazabilidad-errores`, `rate-limit-events`, `reportes-usuario`) + cualquier drawer/detail asociado.
- [ ] Leído: la lógica actual del botón "Buscar en ErrorLog" — confirmar si funciona hoy.
- [ ] Confirmado: nombres exactos de columnas CorrelationId en las 3 tablas BD (requiere SELECT si el usuario no lo sabe de memoria).
- [ ] Confirmado: qué endpoints GET existen hoy para las 3 tablas y cuáles aceptan `correlationId` como filtro.
- [ ] Confirmado: si hay índice en BD por `CorrelationId` en cada tabla.
- [ ] Entre 6 y 10 **decisiones numeradas** explícitas y acordadas con el usuario (cubriendo las 10 preguntas de la tabla de alcance, pudiendo fusionarse).
- [ ] Decidido si Plan 32 va inline en maestro o amerita plan file dedicado.
- [ ] Decidido el **desglose de chats** de /execute (estimado preliminar: 1 BE + 1-2 FE si hay endpoint nuevo; 0 BE + 1 FE si se reusan endpoints con filtro).
- [ ] Actualizado `.claude/plan/maestro.md` con: (a) nueva fila del inventario "Plan 32 — Centralización de errores vía Correlation ID", (b) top-3 cola actualizada, (c) nota de cierre del /design.
- [ ] Identificadas **deudas laterales** que el diseño destape (columnas sin índice, campos sin persistir, botones placeholder) — listadas aunque no se resuelvan en Plan 32.
- [ ] Mover este archivo a `educa-web/.claude/chats/closed/` al cerrar el chat.

## COMMIT MESSAGE sugerido

Solo commit de docs en `educa-web main` (el /design no toca código).

```
docs(maestro): Plan 32 Chat 1 /design — correlation id cross-dashboard links

Design decisions for linking ErrorLog, RateLimitEvent and ReporteUsuario
dashboards via CorrelationId as navigable hyperlinks. The id is persisted
in all three tables today but stays inert in the UI — user clicks have
nowhere to go.

N decisions agreed with the user covering: hub strategy, navigation model
(mesh vs hub-and-spoke vs hybrid), rendering contract, empty-state UX, BE
endpoint shape (unified vs per-table), URL query-param filter, BD index
needs, reconciliation with the existing "Buscar en ErrorLog" button,
anonymous ReporteUsuario coverage, reverse ErrorLog → ReporteUsuario link.

Plan 32 scoped as inline in maestro (not a dedicated plan file) with M
execute chats queued.
```

Reglas de commit respetadas: inglés, español solo entre `"..."`, **sin `Co-Authored-By`**, subject ≤ 72 chars.

## CIERRE

Al cerrar el /design, pedirle al usuario feedback específico sobre:

1. ¿Faltó alguna dimensión del problema que el diseño no cubrió? (ej: mobile, permisos por rol, rate limiting sobre el nuevo endpoint de correlación).
2. ¿Quedó priorizada correctamente la secuencia de /execute chats? (BE primero para habilitar FE, o paralelo si se reusan endpoints existentes).
3. ¿Hay una **página distinta** que el usuario querría también enlazar vía CorrelationId y que no salió en este chat? (ej: bandeja de correos si comparte el mismo id).
4. ¿El nombre del hub ("trazabilidad-errores" enriquecido vs nueva ruta `/correlation/:id`) es el final, o debería renombrarse ahora para evitar rename posterior?

Recordar al usuario: después de cerrar este /design, **agregar Plan 32 a la cola del maestro** con los chats /execute resultantes antes de iniciar el siguiente `/execute`.

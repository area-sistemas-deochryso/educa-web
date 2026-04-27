> **Plan**: 36 · Fecha creación: 2026-04-27 · Estado: ⏳ pendiente arrancar
> **Repo**: `educa-web` (main) — FE-only
> **Prioridad**: media. No bloquea ni es bloqueado por otros planes activos. Continuación natural de Plan 35 (hub Monitoreo).

# Plan 36 — Rediseño UX/UI de las páginas internas de Monitoreo

## Objetivo

Plan 35 reagrupó las 7 entradas planas en **1 hub + 3 dominios con shells**. Quedó pendiente **revisar y mejorar el diseño interno de cada sub-página** para que la experiencia sea consistente con el hub y con el resto del Design System (`rules/design-system.md`).

Este plan **no rediseña por gusto**: arranca con un Chat 1 de `/investigate` donde **el usuario describe los problemas concretos** que ve en cada página antes de decidir qué tocar. Sin diagnóstico, no hay rediseño.

> *"Crea un nuevo plan para mejorar el diseño de las demás páginas de monitoreo, el plan debe empezar preguntándome el problema del diseño actual de cada página."* — usuario, 2026-04-27.

## Páginas en alcance

Las **7 sub-páginas** del submódulo Monitoreo (rutas post-Plan 35):

| # | Sub-vista | Ruta nueva | Componente |
|---|-----------|-----------|------------|
| 1 | Bandeja de Correos | `/intranet/admin/monitoreo/correos/bandeja` | `email-outbox` |
| 2 | Dashboard del día | `/intranet/admin/monitoreo/correos/dashboard` | `email-outbox-dashboard-dia` |
| 3 | Diagnóstico de Correos | `/intranet/admin/monitoreo/correos/diagnostico` | `email-outbox-diagnostico` |
| 4 | Auditoría de Correos | `/intranet/admin/monitoreo/correos/auditoria` | `auditoria-correos` |
| 5 | Trazabilidad de Errores | `/intranet/admin/monitoreo/incidencias/errores` | `error-groups` (Plan 34) |
| 6 | Reportes de Usuarios | `/intranet/admin/monitoreo/incidencias/reportes` | `feedback-reports` |
| 7 | Rate Limit Events | `/intranet/admin/monitoreo/seguridad/rate-limit` | `rate-limit-events` |

**Out of scope**: el hub `/intranet/admin/monitoreo` (ya rediseñado en Plan 35) y los 2 shells (Correos / Incidencias).

## Estado de cada página (resumen objetivo, sin opinión)

> Esto es **lo que el chat de `/investigate` va a confirmar/refutar con el usuario**. No es decisión; es punto de partida para la conversación.

| Página | Componentes que ya tiene | Patrones del Design System que usa | Notas |
|--------|--------------------------|-------------------------------------|-------|
| 1. Bandeja de Correos | header, stats, filters, table, chart | B1 container, B2 page-header, B3 stat-card, B4 tabla, B6 filter-bar | Página más completa. Recientemente actualizada por Plan 22/29. |
| 2. Dashboard del día | header simple, métricas del día, varios charts | Híbrido. No es CRUD. | Plan 30 — relativamente nueva. |
| 3. Diagnóstico | tabs internos (entradas con/sin correo) | Tabs propios, no shell. | Plan 30 Chat 3+4. |
| 4. Auditoría | universo + tabla de envíos | B4 tabla, B6 filter-bar | Plan 30. |
| 5. Trazabilidad de Errores | Kanban + tabla con toggle | Kanban con drag-drop CDK. | Plan 34 Chat 5 — **rediseño reciente, posiblemente fuera de scope**. |
| 6. Reportes de Usuarios | tabla + drawer detalle | B4 tabla, drawer | Plan 16 + Plan 32 wiring. |
| 7. Rate Limit Events | tabla con paginador | B4 tabla, B6 filter-bar | Plan 26-ish. |

## Plan de ejecución (por chats)

### Chat 1 — `/investigate` (FE, sin código)

> **Objetivo**: que el usuario diga qué le molesta de cada página actual y qué espera ver mejor. No se toca código en este chat.

**Pre-work del chat**:
- Tomar capturas (o pedirlas al usuario) de las 7 páginas en estado actual.
- Para cada página, leer rápidamente la estructura HTML/SCSS (sin profundizar) para tener vocabulario común con el usuario.

**Estructura de la conversación**:

El chat **DEBE** abrir con un mensaje único que liste las 7 páginas y, para cada una, **3 preguntas guía** que el usuario contesta libremente:

```
## 📋 Auditoría de diseño — preguntas por página

Para cada una de las 7 páginas de Monitoreo, contestá lo que se te ocurra
(no tienen que ser respuestas largas, una línea cada una está bien):

### 1. Bandeja de Correos (/correos/bandeja)
   a) ¿Qué te molesta visualmente HOY?
   b) ¿Qué información te falta encontrar de un vistazo?
   c) ¿Hay algún flujo que tarde mucho o requiera scroll innecesario?

### 2. Dashboard del día (/correos/dashboard)
   a) ¿Los gráficos comunican lo que tienen que comunicar?
   b) ¿Hay datos que esperarías ver y no están?
   c) ¿La densidad de información es apropiada?

[... mismo formato para las 7 páginas]
```

**Salida del chat**: un documento (acta del Chat 1) con la respuesta del usuario por página. Para cada página, decisión binaria:

| Decisión | Significado |
|---|---|
| ✅ rediseñar | Hay problemas concretos identificados → entra a un Chat de diseño/ejecución |
| 🟡 ajuste menor | 1-2 cambios pequeños sin necesidad de rediseño completo → se hace en chat de polish agrupado |
| ⏭️ no tocar | El usuario está conforme → fuera de scope de este plan |

### Chat 2-N — `/design + /execute` (FE, según los hallazgos)

> Cantidad de chats **se decide DESPUÉS del Chat 1**. Los planes no se sobre-diseñan: el alcance real depende de la respuesta del usuario.

Heurística de agrupación esperada:

| Si el Chat 1 dice... | Entonces... |
|---|---|
| 1-2 páginas necesitan rediseño profundo | 1 chat por página (`/design + /execute` en el mismo chat si el cambio es estructural pero acotado) |
| 3+ páginas necesitan rediseño profundo | Chats por dominio (1 chat para Correos, 1 para Incidencias, 1 para Seguridad) |
| Hay múltiples ajustes menores en muchas páginas | 1 chat agrupado de "polish de design system" sin decisiones grandes |
| La mayoría requiere solo cambios visuales (no estructurales) | Posible 1 chat único de polish global |

**Restricción dura**: ningún chat de ejecución toca **funcionalidad** (carga de datos, filtros, mutaciones). Solo HTML/SCSS y, si hace falta, refactor presentacional. La regla `crud-patterns.md` prohíbe modificar funcionalidad existente sin necesidad.

### Chat final — `/validate`

> Si los chats de ejecución ya hicieron `/validate` cada uno, este puede saltarse. Solo si quedaron tests pendientes globales.

## Criterios de éxito (DoD a nivel plan)

- [ ] Chat 1 produjo decisión binaria documentada para las 7 páginas
- [ ] Cada página marcada como ✅ tiene Chat de diseño que respeta el Design System (`rules/design-system.md`)
- [ ] Cada página marcada como 🟡 tiene los 1-2 ajustes implementados
- [ ] Páginas marcadas como ⏭️ no se tocan
- [ ] Tests verdes después de cada chat (sin regresiones — la suite actual son **1683 tests**)
- [ ] Lint OK
- [ ] Build production OK
- [ ] Browser check manual de cada página tocada (golden path: cargar datos, filtrar, abrir drawer/dialog)
- [ ] Coherencia con el hub Plan 35 (mismas paletas tonales si aplica, misma densidad visual, misma jerarquía de stats)

## Decisiones explícitas que NO se toman en este plan (sin Chat 1)

- ❌ "Vamos a usar tonos azul/ámbar/verde como el hub" → puede que sí, puede que no. Lo decide el Chat 1.
- ❌ "Vamos a unificar los page-headers" → ya lo están vía `<app-page-header>`. No es alcance salvo el Chat 1 lo pida.
- ❌ "Vamos a quitar columnas de las tablas" → riesgo de perder funcionalidad. Solo si el usuario lo pide explícitamente.

## Riesgos y mitigación

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Trazabilidad de Errores recién rediseñado en Plan 34 → tocarlo es destructivo | Alta | El Chat 1 lo pregunta explícitamente. Si el usuario dice "está bien", ⏭️ obligatorio. |
| Rediseño accidentalmente cambia funcionalidad | Media | Restricción dura: solo HTML/SCSS, no TS de lógica de negocio. |
| Ningún rediseño es necesario → plan se cierra rápido | Baja | OK — un plan que cierra "no hacer nada" después de auditoría es éxito, no fracaso. |
| Usuario quiere rediseñar todo a la vez (chat gigante) | Media | Romper en chats por dominio o por página antes de arrancar `/execute`. |

## Reversibilidad

100% reversible si algún rediseño no convence en post-deploy:
1. Revertir el commit de la página específica (no afecta a las demás)
2. Las URLs y la lógica permanecen intactas
3. Sin migraciones BD ni cambios de contratos

## Dependencias y coordinación

- **No bloquea ni es bloqueado por** Plan 31 (Bounce Parser BE), Plan 24 (CrossChex polling), Plan 28 (Asistentes Admin), Plan 33 (Pagination audit).
- **Continuación natural de** Plan 35 (hub Monitoreo) — pero independiente. No hace falta que Plan 35 esté en producción para arrancar este.
- **Sinergia con** mejoras eventuales del Design System: si en el Chat 1 sale un patrón nuevo (ej: pattern de "página de monitoreo en tiempo real"), promoverlo a `rules/design-system.md` como pauta B12+ para futuro reuso.

## Aprendizajes que se pueden capitalizar después

- Si el patrón **Hub + páginas internas con misma paleta tonal** funciona, aplicarlo a otros submódulos cuando crezcan (ej: Permisos, Académico, Comunicación).
- Si el chat de auditoría con preguntas guía resulta útil, usarlo como template para futuras auditorías de UX (`rules/audit-template.md` derivable).
- El chat de polish agrupado es un patrón válido de "limpieza de design drift" que puede repetirse cada N planes.

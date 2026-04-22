> **Repo destino**: `educa-web` (frontend, branch `main`). Abrir el chat nuevo en este repo.
> **Plan**: 27 · **Chat**: 4 · **Fase**: `/execute` FE · **Estado**: ⏳ pendiente arrancar.

---

# Plan 27 Chat 4 — `/execute` FE — Banner admin + self-service + widget home con filtro INV-C11

## PLAN FILE

**Maestro**: `.claude/plan/maestro.md` § "🔴 Plan 27 — Filtro temporal de asistencia diaria por grado (5to Primaria en adelante)".

Path desde el repo destino:

- Desde `educa-web`: `.claude/plan/maestro.md`

Secciones relevantes del maestro:

- "Plan de ejecución (confirmado post-Chat 1)" — fila **Chat 4** (este chat).
- "Decisiones tomadas en Chat 1 (`/design` ✅ 2026-04-22)" — **decisiones 4 y 5** (banner admin estático + mensaje por-hijo) y **decisión 8** ("widget Asistencia de Hoy: filtro aplicado a numerador y denominador").
- "Invariantes a formalizar en Chat 5" — `INV-C11` (este chat lo consume en UI; Chat 5 lo documenta formalmente).

Chat anterior (Chat 3 `/execute` BE): `.claude/chats/closed/018-plan-27-chat-3-be-reportes-filtro-grado.md`. Commit BE: `19e74d5`.

Referencias de frontend:

- `.claude/rules/design-system.md` §9 (banners `color-mix()`) + §A5 (botones success texto blanco).
- `.claude/rules/a11y.md` — azul oscuro `#1e40af` sobre fondo claro, NUNCA celeste del tema.
- `.claude/rules/state-management.md` — signals + facade; no poner estado nuevo en el componente.
- `.claude/rules/architecture.md` — container vs presentational; widget es presentational.
- `.claude/rules/testing.md` — Vitest + jsdom, tests colocados al lado del archivo con `.spec.ts`.

## OBJETIVO

Hacer visible INV-C11 en 3 lugares del FE para que admin, estudiante y apoderado entiendan **sin pedir soporte** por qué ciertos grados no tienen asistencia diaria:

1. **Banner admin fijo** en `/intranet/admin/asistencias` (página de gestión de asistencia formal).
2. **Mensaje por-hijo** en self-service estudiante + apoderado cuando el estudiante consultado tiene `GRA_Orden < 8`.
3. **Widget "Asistencia de Hoy"** del home respeta el filtro: numerador y denominador ambos sobre `GRA_Orden ≥ 8`. La "búsqueda de estudiantes" del home **queda intacta** — busca sobre el universo completo.

## PRE-WORK OBLIGATORIO

### 1. Detectar si `graOrden` ya viaja en los DTOs de self-service

El mensaje por-hijo **requiere** saber el `GRA_Orden` del estudiante consultado. Antes de tocar HTML, verificar:

```bash
# Desde educa-web:
grep -rn "graOrden\|GRA_Orden" src/app/features/intranet/pages/cross-role/attendance-component/ src/app/data/models/ --include="*.ts"
```

Casos posibles:

| Caso | Acción |
|------|--------|
| `graOrden` ya viene en el DTO del estudiante/salón | Consumirlo directo. No hay trabajo backend. |
| `graOrden` no viaja pero `salon.grado.nombre` sí | Usar tabla estática `GRADO_ORDEN_MAP` en el frontend (`.claude/plan/maestro.md` tiene la tabla de grados 1-14). |
| Ni `graOrden` ni `grado` viajan | **Bloqueo**: ampliar DTO backend en un commit pequeño del mismo Chat 4. Coordinar con usuario antes. |

**Si hay bloqueo backend**, este chat puede commitear primero el commit FE (banner + widget), y dejar el mensaje por-hijo para un commit separado después del commit BE mínimo. Avisar al usuario al detectar el bloqueo.

### 2. Verificar que el widget "Asistencia de Hoy" del home ya consume un endpoint filtrado

```bash
# Endpoint consumido por el widget:
grep -rn "ObtenerEstadisticasDia\|stats-dia\|estadisticas.*dia" \
  src/app/features/intranet/pages/cross-role/home-component/components/attendance-summary-widget/ \
  src/app/core/services/asistencia/
```

En **Chat 2** (commit `2738eaf`) el BE ya filtró las queries admin de estadísticas del día por `GRA_Orden >= 8` (`AsistenciaAdminQueryRepository.CalcularEstadisticasDelDiaAsync`). **Verificar** que el widget consume el mismo endpoint — si sí, queda automáticamente filtrado (trabajo 0 en widget). Si consume uno distinto (ej: un endpoint público sin filtro), **agregar filtro en el BE en el mismo chat** o documentar deuda.

### 3. Confirmar con el usuario

```text
[ ] Texto exacto del banner admin (propuesto abajo — confirmar o ajustar).
[ ] Texto exacto del mensaje por-hijo (propuesto abajo — confirmar o ajustar).
[ ] ¿Widget home ya consume endpoint filtrado? (decisión de qué tocar).
[ ] Git status limpio en educa-web (sin WIP de otro chat).
[ ] Branch: main.
```

## ALCANCE

### Textos propuestos (a confirmar con usuario antes de codear)

**Banner admin** (fondo azul claro, texto azul oscuro — ver `design-system.md` §9 pattern `color-mix(var(--blue-500) 15%, transparent)`):

> **Filtro temporal activo** — Solo se registra asistencia diaria biométrica de **5to Primaria en adelante** (`GRA_Orden ≥ 8`). Los grados inferiores están temporalmente fuera del alcance del CrossChex. Reportes, listados y correos reflejan este filtro. Plan 27 · `INV-C11`.

**Mensaje por-hijo self-service** (cuando el estudiante consultado tiene `GRA_Orden < 8`, reemplaza el listado de asistencias):

> **Este alumno aún no usa asistencia biométrica.**
>
> El colegio habilitó el CrossChex solo desde 5to Primaria en adelante. Su asistencia diaria se sigue manejando con el cuaderno del salón.

### Archivos a crear / modificar (FE)

| Archivo | Acción | Líneas estimadas |
|---------|--------|------------------|
| `src/app/shared/constants/attendance-scope.ts` *(nuevo)* | Exportar `UMBRAL_GRADO_ASISTENCIA_DIARIA = 8` + `GRADO_ORDEN_MAP` (nombre → orden). Paridad con `AsistenciaGrados.UmbralGradoAsistenciaDiaria` del BE | +30 |
| `src/app/shared/components/attendance-scope-banner/attendance-scope-banner.component.ts` + `.html` + `.scss` *(nuevo)* | Presentational — banner estático, `ChangeDetectionStrategy.OnPush`. Usado en admin/attendances y donde aplique | +60 |
| `src/app/features/intranet/pages/admin/attendances/attendances.component.html` | Insertar `<app-attendance-scope-banner />` al tope (antes del filtro) | +3 |
| `src/app/features/intranet/pages/admin/attendances/attendances.component.ts` | Agregar el import al `imports: []` | +1 |
| `src/app/features/intranet/pages/cross-role/attendance-component/attendance-estudiante/` *(componente)* | Mostrar mensaje "Este alumno aún no usa asistencia biométrica" cuando `graOrden < 8`. Envolver el listado en `@if (tieneAsistenciaDiaria()) { ... } @else { ... }` | +15 |
| `src/app/features/intranet/pages/cross-role/attendance-component/attendance-apoderado/` *(componente)* | Idem para cada hijo listado. El componente mapea una lista de hijos → renderiza mensaje por-hijo si `hijo.graOrden < 8` | +20 |
| `src/app/features/intranet/pages/cross-role/home-component/components/attendance-summary-widget/` | **Verificar** que consume endpoint filtrado (Chat 2). Si sí, NO TOCAR. Si no, ajustar llamada al service + agregar test | +0 a +10 |

### Tests a agregar (FE — Vitest)

Mínimo **8 tests**, target **12**.

| Archivo | Tests |
|---------|-------|
| `attendance-scope-banner.component.spec.ts` *(nuevo)* | +2: renderiza el texto esperado; tiene role="note" o aria-live adecuado |
| `attendance-scope.ts` (constante) si aplica lógica de helper | +1: `esGradoAsistenciaDiaria(gradoNombre)` returns true para "5to Primaria", false para "2do Inicial" |
| `attendance-estudiante.component.spec.ts` | +2: muestra mensaje si `graOrden = 5`; muestra listado si `graOrden = 10` |
| `attendance-apoderado.component.spec.ts` | +3: mensaje por-hijo solo en hijos `< 8`; hijos `>= 8` ven listado; mix (1 de cada) renderiza los dos lados simultáneos |
| `attendance-summary-widget.component.spec.ts` | +2: total del endpoint filtrado coincide con el denominador; widget no muestra grados bajos en conteos |

Si algún archivo `.spec.ts` no existe aún en el componente target, crearlo siguiendo el patrón de `src/app/shared/components/page-header/page-header.component.spec.ts` o equivalente.

## TESTS MÍNIMOS (casos input → output)

| Caso | Input | Resultado esperado |
|------|-------|---------------------|
| Admin abre `/intranet/admin/asistencias` | Ruta accedida con rol Director | Banner azul claro visible arriba del filtro, texto contiene "5to Primaria" y "INV-C11" |
| Estudiante de 3ro Primaria (`graOrden = 6`) consulta su asistencia | `/intranet/mi-asistencia` o equivalente | Vista sin listado + mensaje "Este alumno aún no usa asistencia biométrica" |
| Estudiante de 1ro Secundaria (`graOrden = 10`) consulta su asistencia | idem | Vista normal con listado |
| Apoderado con 2 hijos (3ro Prim + 2do Sec) | `/intranet/mis-hijos-asistencia` | Hijo 1 con mensaje, hijo 2 con listado. Los dos renderizados al mismo tiempo |
| Widget "Asistencia de Hoy" en home de admin | Home | `"18 de 24 asistieron"` donde 24 = solo estudiantes `GRA_Orden ≥ 8`. Misma métrica que `/intranet/admin/asistencias` muestra |
| Búsqueda de estudiantes del home | Home → input de búsqueda | Retorna estudiantes de TODOS los grados (no filtrada) — la búsqueda es transversal, INV-C11 NO aplica |

## REGLAS OBLIGATORIAS

Frontend — aplicables al código generado:

- **OnPush en presentationals** (banner, mensaje por-hijo) — `ChangeDetectionStrategy.OnPush`.
- **Design system §9** — banner usa `color-mix(in srgb, var(--blue-500) 15%, transparent)` + border `var(--blue-500)` + texto `var(--text-color)`. NO hex literal. NO `var(--primary-color)` (celeste del tema).
- **a11y** — banner con `role="note"` + icono con `aria-hidden="true"` + texto fuera del icono. Si tiene botón de cerrar (NO aplica en este banner — es estático), seguir la regla de `[pt]="{ root: { 'aria-label': ... } }"`.
- **Signal-based**: si el banner se vuelve condicional (ej: escondido por usuario), estado vive en un store/facade, NO en el componente.
- **Sin duplicar umbral**: `UMBRAL_GRADO_ASISTENCIA_DIARIA = 8` vive en un solo archivo (`@shared/constants/attendance-scope.ts`) y se importa donde haga falta. Paridad con `AsistenciaGrados.UmbralGradoAsistenciaDiaria` del BE — la tabla de grados 1-14 vive en el mapa de frontend si no viene del backend.
- **Sin funciones en template** — usar `computed()`. Ej: `readonly esGradoBajo = computed(() => (this.estudiante()?.graOrden ?? 99) < UMBRAL_GRADO_ASISTENCIA_DIARIA)`.
- **`@if / @else if / @else`** — no `*ngIf`.
- **PrimeNG**: si usa `p-message` o `p-messages`, seguir reglas de `primeng.md`. Alternativa: banner HTML propio siguiendo `design-system.md §9` (patrón `.migration-banner` adaptado).
- **Tests con Vitest** — `describe`/`it`/`expect` + `TestBed.configureTestingModule` + `ComponentFixture`. Ver `testing.md`.
- **ESLint** — cumplir `architecture.md` (container vs presentational), `eslint.md` (cap 300 ln por archivo, no imports relativos profundos, no `console.log`).

## APRENDIZAJES TRANSFERIBLES (del Chat 3)

### 1. Constantes y texto canónicos

El BE expone la constante `AsistenciaGrados.UmbralGradoAsistenciaDiaria = 8` y el string público `AsistenciaGrados.NotaReportePlan27`. El FE **no importa** estos valores de BE directamente (son un repo distinto) — los duplica en `@shared/constants/attendance-scope.ts` con el mismo umbral y un texto user-friendly distinto al que va en los reportes.

El texto para el header del PDF/Excel es más técnico:

> "Datos filtrados: GRA_Orden >= 8 (5to Primaria en adelante). Plan 27 · INV-C11."

El texto del banner y del mensaje por-hijo debe ser **más amigable** — el admin y el apoderado no leen "GRA_Orden". Proponer variantes en el PRE-WORK y confirmar con el usuario antes de codear.

### 2. Endpoints ya filtrados por Chat 2

Los siguientes endpoints ya aplican `GRA_Orden >= 8` en el backend:

- `GET /api/consultaasistencia/reporte-consolidado/*`
- `GET /api/consultaasistencia/reporte-filtrado/*`
- `GET /api/consultaasistencia/director/estadisticas-dia` (si es el que alimenta el widget — **confirmar en el PRE-WORK**)
- `GET /api/consultaasistencia/director/listar-estudiantes-del-dia`

Si el widget consume uno de estos, **NO HAY TRABAJO** en el widget — el filtro viene implícito. Los tests del widget deben validar eso, no duplicar el filtro.

### 3. Profesores NO se filtran

Los endpoints de profesor (`GET /api/consultaasistencia/profesor/*`) están **intactos**. Cualquier widget / página de asistencia de profesor NO debe mostrar banner INV-C11 — aplica solo a estudiantes. Si hay dudas al tocar archivos de profesor, verificar que el contexto es estudiante antes de insertar el banner.

### 4. Commit BE de Chat 3 ya mergeado

El commit `19e74d5` en `Educa.API` ya está en `master`. Cualquier deploy de FE funcionará siempre que el BE esté desplegado con esa versión. Confirmar con el usuario que el deploy BE precede al deploy FE — los reportes mostrarían sin nota pero filtrados si FE se despliega antes (no rompe funcionalidad, solo desalineación visual temporal).

### 5. Build / lint / test estándar

```bash
npm run lint
npm run test -- --run  # Vitest single-run
npm run build
```

Todo en verde antes del commit. Baseline: ver CI / último commit main.

### 6. Commit message — reglas skill `commit`

- Inglés, imperativo, subject ≤ 72 chars.
- Términos de dominio en español entre comillas (`"asistencia admin"`, `"attendance-estudiante"`).
- NUNCA `Co-Authored-By`.

## FUERA DE ALCANCE

Explícitamente NO se toca en Chat 4:

- **Backend** (salvo extensión mínima del DTO si el PRE-WORK lo detecta bloqueante).
- **Documentación formal en `business-rules.md`** — Chat 5.
- **Formalización de `INV-C11` en §15.4** — Chat 5.
- **Banners en otras páginas** — solo `/intranet/admin/asistencias`. El banner NO va en reportes FE, no va en el home, no va en profesor.
- **Widgets de asistencia de profesor** (`profesor-attendance-widget`) — profesores no están filtrados.
- **Búsqueda de estudiantes en home** — queda intacta sobre universo completo.
- **Regresión `ASISTENCIA_PROFESOR`** — chat aparte.
- **Plan 22 / 24 / 26** — frentes paralelos.

## CRITERIOS DE CIERRE

```text
PRE-WORK
[ ] Verificado si `graOrden` viaja en los DTOs de self-service (estudiante/apoderado)
[ ] Verificado qué endpoint consume el widget "Asistencia de Hoy"
[ ] Textos del banner y del mensaje por-hijo confirmados con usuario
[ ] Git status limpio antes de empezar, branch main

IMPLEMENTACIÓN
[ ] Constante `UMBRAL_GRADO_ASISTENCIA_DIARIA` en `@shared/constants/attendance-scope.ts`
[ ] Componente `AttendanceScopeBannerComponent` (presentational, OnPush)
[ ] Banner insertado en `/intranet/admin/asistencias`
[ ] Mensaje por-hijo en self-service estudiante (`graOrden < 8`)
[ ] Mensaje por-hijo en self-service apoderado (mix de hijos funciona)
[ ] Widget home: verificado o ajustado para consumir endpoint filtrado
[ ] Búsqueda de estudiantes del home sigue intacta (sin filtro de INV-C11)
[ ] Archivos respetan cap 300 líneas y reglas de arquitectura

TESTS
[ ] +8 a +12 tests en Vitest (banner, self-service, widget)
[ ] `npm run test -- --run` → 100% verde
[ ] `npm run lint` → 0 warnings nuevos
[ ] `npm run build` → OK

VALIDACIÓN MANUAL (mandatoria para FE)
[ ] Abrir dev server y verificar banner en `/intranet/admin/asistencias`
[ ] Simular login estudiante con `graOrden < 8` → ver mensaje
[ ] Simular login apoderado con 2 hijos mixtos → ver comportamiento
[ ] Verificar widget "Asistencia de Hoy" con métricas consistentes con listado admin

CIERRE
[ ] Commit en educa-web con mensaje sugerido abajo
[ ] Actualizar maestro Plan 27: marcar Chat 4 ✅
[ ] Preparar Chat 5 (documentación + cierre) con /next-chat
[ ] Mover este archivo a `.claude/chats/closed/` al cerrar el chat
```

## COMMIT MESSAGE sugerido

Solo hay commit en `educa-web` (Chat 4 no toca BE, salvo si el PRE-WORK detecta un bloqueo del DTO — en ese caso, 2 commits: uno BE mínimo + uno FE).

```text
feat(asistencia): Plan 27 Chat 4 — grade filter banner + per-child message + home widget

Make INV-C11 visible in 3 UI surfaces so admin, student and apoderado
understand which grades fall outside the CrossChex scope without asking
support (Plan 27 decisions 4, 5 and 8).

- "@shared/constants/attendance-scope" with "UmbralGradoAsistenciaDiaria = 8"
  (mirror of backend constant). Helper "esGradoAsistenciaDiaria(gradoNombre)".
- "AttendanceScopeBannerComponent" presentational (OnPush) — blue-100/blue-800
  banner rendered inside "/intranet/admin/asistencias".
- Self-service "attendance-estudiante" renders a per-child explanation when
  "graOrden < 8" instead of the daily attendance list.
- Self-service "attendance-apoderado" renders the message per hijo — mixed
  cases (one hijo below umbral, one above) render both branches side by side.
- Home widget "Asistencia de Hoy" verified to consume the backend endpoint
  already filtered in Chat 2 — numerator and denominator both respect
  "GRA_Orden >= 8". The global student search of the home stays intact
  (INV-C11 does not apply there).

+XX Vitest tests (banner + self-service + widget coverage). Baseline
NNNN → NNNN green. Reversible by lowering "UmbralGradoAsistenciaDiaria".
```

**Subject alternativo más corto** (68 chars):

```text
feat(asistencia): Plan 27 Chat 4 — banner + per-child msg + home widget
```

## CIERRE

Al terminar Chat 4, pedir al usuario feedback sobre:

1. **¿El banner es suficientemente visible sin ser intrusivo?** — si ocupa demasiado espacio sobre la tabla principal, considerar versión compacta (una sola línea con ícono + link "más info").
2. **¿El mensaje por-hijo tiene el tono correcto?** — no debería sonar técnico ni culpabilizador. Propuesta neutra: "Este alumno aún no usa asistencia biométrica."
3. **¿El widget home refleja correctamente el universo filtrado?** — pedir al usuario cruzar el número del widget con el conteo del listado admin del mismo día.
4. **¿Chat 5 arranca inmediato o hay pausa para validación intermedia post-deploy con el jefe?** — según política declarada en Chat 1, Chat 5 documenta pero **no cierra hasta validación del jefe post-deploy**. Confirmar secuencia.

Si Chat 4 cierra limpio (lint verde, tests verdes, commit hecho, maestro actualizado), invocar `/next-chat` para generar el prompt de Chat 5 (documentación formal + cierre del Plan 27).

# Widgets de Asistencia del Día en /intranet (Plan 22)

> **Estado**: ✅ Diseño cerrado 2026-04-20. Listo para `/execute` en Chat 2.
> **Origen**: Plan 21 (Asistencia de Profesores en CrossChex) cerró el backend y la vista `/intranet/asistencia`. Queda pendiente el **resumen del día en el home** (`/intranet`) para roles por encima de estudiante.
> **Capa en el maestro**: Plan #22 — solo frontend, sin backend.
> **Ámbito**: `src/app/features/intranet/pages/cross-role/home-component/` y sus dos widgets hijos.

---

## Contexto

En `/intranet`, cada rol "por encima de estudiante" debe ver un resumen de asistencia del día acorde a su jurisdicción. Hoy:

| Rol | Ve hoy | Debe ver |
|-----|--------|----------|
| Director | Widget admin (solo estudiantes) | Sede: estudiantes + profesores |
| Asistente Admin | Widget admin (solo estudiantes) | Sede: estudiantes + profesores |
| Promotor | Widget admin (solo estudiantes) | Sede: estudiantes + profesores |
| Coordinador Académico | **Nada** | Sede: estudiantes + profesores |
| Profesor tutor | Widget profesor (su salón) | Mi asistencia + mi salón |
| Profesor no tutor | **Widget vacío** | Mi asistencia |
| Estudiante / Apoderado | Nada | Sin cambios — fuera de scope |

Backend ya expone todo lo necesario (Plan 21 Chat 2, 4 y 7). No se requiere endpoint nuevo.

---

## Decisiones cerradas (2026-04-20)

### D1 · Widget admin — **un card con dos secciones siempre visibles**

Reescribir `attendance-summary-widget` para mostrar dos secciones apiladas dentro del mismo card: "Estudiantes" arriba, "Profesores" abajo, separadas por divisor. Cada sección con su main-stat + porcentaje + 3 stat-bars.

**Descartado**:

- ❌ Toggle Est/Prof — suma click sin valor.
- ❌ Endpoint backend consolidado — duplica lógica; los dos endpoints existen.
- ❌ Dos widgets separados — desperdicia vertical y rompe narrativa "resumen de hoy".

### D2 · Widget profesor — **"Mi asistencia" arriba + "Mi salón" abajo (solo si tutor)**

Reescribir `profesor-attendance-widget` para:

- Siempre mostrar la fila "Mi asistencia" con hora de entrada/salida + badge de estado del día.
- Agregar sección "Mi salón (Grado Sección)" solo si el profesor es tutor de al menos un salón (`hasSalones === true`), con las 3 stat-bars actuales.

**Razones**: el dato propio se busca primero; el profesor no-tutor hoy ve un widget vacío (bug real).

### D3 · Gate en home — agregar Coordinador Académico

`UserProfileService` no tiene `isCoordinadorAcademico` (solo `isPromotor`, `isAsistenteAdministrativo`, `isDirector`). Agregarlo y sumarlo a `showAttendanceWidget` en `home.component.ts`.

### D4 · Fetching — forkJoin paralelo en el cliente

| Widget | Calls |
|--------|-------|
| Admin | `forkJoin({ est: AttendanceService.getEstadisticasDirector(), prof: AsistenciaProfesorApiService.obtenerAsistenciaDiaProfesoresDirector(hoy) })` |
| Profesor tutor | `forkJoin({ mi: obtenerMiAsistenciaDia(hoy), salon: getAsistenciaDia(grado, seccion, hoy) })` |
| Profesor no tutor | `obtenerMiAsistenciaDia(hoy)` solo |

Errores manejados por widget: si una call falla, la otra sigue; la sección con error muestra el estado vacío existente.

### D5 · Navegación del click

- Admin widget: mantiene `routerLink="/intranet/asistencia"` sin query params. El submenú Est/Prof ya existe en el destino.
- Profesor widget: mantiene `routerLink="/intranet/profesor/asistencia"`. El shell profesor elige tab según `hasSalones`.

---

## Invariantes aplicables (solo lectura)

- Jurisdicción de `permissions.md` (tabla del Plan 21, Chat 5 pendiente formalizar).
- INV-AD05 (correos polimórficos) — irrelevante, el widget solo lee.
- INV-AS04 (tutor pleno) — `esTutor` ya se expone en `SalonProfesor`.

---

## Archivos a tocar (Chat 2)

### 1. `src/app/core/services/user/user-profile.service.ts`

Agregar computed `isCoordinadorAcademico` en la región `isProfesor`/`isDirector`/`isAsistenteAdministrativo`/`isPromotor`:

```typescript
readonly isCoordinadorAcademico = computed(
  () => this._userRole() === APP_USER_ROLES.CoordinadorAcademico,
);
```

`APP_USER_ROLES.CoordinadorAcademico` ya existe (verificado: `shared/constants/app-roles.ts:9`).

### 2. `src/app/features/intranet/pages/cross-role/home-component/home.component.ts`

Ampliar `showAttendanceWidget` para incluir `isCoordinadorAcademico`:

```typescript
readonly showAttendanceWidget = computed(
  () =>
    this.userProfile.isDirector() ||
    this.userProfile.isAsistenteAdministrativo() ||
    this.userProfile.isPromotor() ||
    this.userProfile.isCoordinadorAcademico(),
);
```

### 3. `components/attendance-summary-widget/attendance-summary-widget.component.ts`

Reescribir: en lugar de consumir solo `getEstadisticasDirector()`, hacer `forkJoin` con `obtenerAsistenciaDiaProfesoresDirector(hoy)`.

**Cambios clave**:

- Inyectar `AsistenciaProfesorApiService` (alias `@shared/services/attendance`).
- Dos signals: `estStats: EstadisticasDia | null`, `profStats: EstadisticasAsistenciaDia | null`.
- Template pasa de 1 a 2 secciones con `<section class="resumen-section">` cada una, separadas por `<div class="section-divider"></div>`. Cada sección tiene su header `<h4>Estudiantes</h4>` / `<h4>Profesores</h4>`, main-stat + percentage + 3 bars.
- Sección estudiantes conserva las barras actuales: Completas / Solo entrada / Faltas.
- Sección profesores tiene barras: Asistió / Tardanza / Falta (shape `EstadisticasAsistenciaDia`).
- Height total del card pasa de ~150 a ~280 px; aceptable por prompt del diseño.
- Loading único al inicio — mostrar skeleton que replica las 2 secciones (2 rect + 6 bars).
- Si la call de estudiantes falla y la de profesores no (o viceversa), mostrar la sección respectiva en empty state, no bloquear todo.

### 4. `components/profesor-attendance-widget/profesor-attendance-widget.component.{ts,html,scss}`

Agregar sección "Mi asistencia" arriba + preservar "Mi salón" (ahora condicional a `hasSalonData`).

**TS**:

- Nuevos signals: `misDatos: AsistenciaProfesorDto | null`, `hasSalonData` computed derivado de `salon() !== null`.
- `ngOnInit` cambia a: primero `getSalonesProfesor()` → definir `salon`/`hasSalonData` → `forkJoin({ mi: obtenerMiAsistenciaDia(hoy), salon: (hasSalonData ? getAsistenciaDia(...) : of(null)) })`.
- Si el profesor no tiene salones como tutor, la rama `salon` del forkJoin es `of(null)` y no se hace la llamada.

**HTML**:

- Nueva sección arriba: main-stat del día del profesor con hora de entrada (`misDatos()?.asistenciasPorFecha[hoy]?.horaEntrada`) y badge de estado (`estadoCodigo`: A/T/F/J).
- Divisor `<div class="section-divider"></div>`.
- Sección existente "Mi salón" envuelta en `@if (hasSalonData())`.

**SCSS**:

- Agregar `.section-divider`, `.mi-asistencia-row`, `.estado-badge` con colores por estado (alineados a tokens del design system — `--green-500` para A, `--yellow-500` para T, `--red-500` para F, `--blue-500` para J).

### 5. Tests (Vitest)

- `home.component.spec.ts` (si existe) — agregar test que verifique `showAttendanceWidget` true para Coordinador Académico.
- `attendance-summary-widget.component.spec.ts` — no existe hoy; crear uno mínimo con mocks de los dos servicios (forkJoin success, uno rojo y otro verde).
- `profesor-attendance-widget.component.spec.ts` — similar; verificar rama tutor y rama no-tutor.

Si los specs existen y son simples, ampliar. Si no existen, crearlos con patrón estándar de `@shared/services/attendance` mock.

---

## Validación al cerrar Chat 2

```
FRONTEND
[ ] npm run lint limpio
[ ] npx tsc --noEmit limpio
[ ] npm run build OK
[ ] Vitest: 1341+ tests verdes (no regresiones)
[ ] Smoke manual con usuario Director, Asistente Admin, Promotor, Coordinador Académico, Profesor tutor, Profesor no-tutor, Estudiante, Apoderado
```

---

## Estimado

- **1 chat de ejecución** (`/execute`): ~4 archivos a tocar, lógica conocida.
- Sin backend, sin migrations, sin cambios de rutas.

---

## Fuera de scope (confirmado del prompt)

- Estudiante / Apoderado (no tienen widget).
- Cambios en `/intranet/asistencia` (cerró Plan 21 Chat 7).
- Actualización de `business-rules.md` / `permissions.md` (sigue en Plan 21 Chat 5).

---

## Referencias

- Plan 21: `.claude/plan/asistencia-profesores.md`
- Endpoints backend: Plan 21 Chat 2/4/7 (todos implementados y desplegados a nivel código).
- Servicios frontend existentes: `@shared/services/attendance/attendance.service.ts`, `@shared/services/attendance/asistencia-profesor-api.service.ts`.

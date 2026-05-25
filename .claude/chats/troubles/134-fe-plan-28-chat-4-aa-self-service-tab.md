# 134 · Plan 28 Chat 4a + 4b-tab FE — Self-service AA + tab director-profesores

> **Creado**: 2026-05-09 · **Reabierto**: 2026-05-25 · **Estado**: 🔴 troubles (4a dudoso, 4b-tab ✅) · **Repo**: `educa-web` (main)
> **Bloquea**: Plan 28 al 100% (cierra Chat 4 FE — pendiente deploy BE 3d para validación funcional).
> **Validación prod**: ✅ 4a verificada 2026-05-12 (Cowork: login AA DNI 72884913 → widget home "Mi asistencia de hoy", `/intranet/asistencia` con leyenda y empty state legítimo, GET `/api/asistente-administrativo/me/mes` y `/me/dia` responden 200, sin botones edición). ⚠️ 4b-tab director-profesores tab AA bloqueada por bug FE F-018 (botón "Registrar" disabled en dialog asistencia manual AA — ver brief F-018 en open/).

## ❌ Verificación parcial localhost (2026-05-25)

### ✅ 4b-tab — Director ve tab "Asistentes Administrativos"
- Tab existe, lista AAs con estado de asistencia del día. Tabs Estudiantes/Profesores sin regresión.

### ⚠️ 4a — Self-service AA (dudoso)
- Login AA → `/intranet/asistencia`: la vista se ve igual que desde otro rol admin. No queda claro si el AA está viendo **su propia asistencia** o el panel admin.
- Widget home: no parece estar como se espera.
- GET `/api/asistente-administrativo/me/dia`: pendiente de verificar (sin tiempo).
- **Acción siguiente**: investigar si la ruta AA cae en la vista self-service o en la admin. Comparar con la experiencia del Profesor en `/intranet/asistencia`.

## Modo sugerido

`/investigate → /design → /execute → /validate`. Hay decisiones arquitectónicas (rename vs duplicar componentes, ruta nueva vs reuso con guard) — design light pero requerido.

## Contexto

- **BE Chat 3d ✅ awaiting-prod** (brief 133, `Educa.API/master`). Endpoints disponibles:
  - `GET /api/asistente-administrativo/me/dia` — espejo de `/profesor/me/dia`
  - `GET /api/asistente-administrativo/me/mes` — espejo de `/profesor/me/mes`
  - `GET /api/ConsultaAsistencia/director/asistentes-admin-asistencia-dia` — espejo de `director/profesores-asistencia-dia`
- Chat 4b-c ya shipped: cross-cutting FE (`TipoPersona='A'`, badge AA `tag-neutral`, filtros/form/stats admin, EMAIL_OUTBOX_TIPOS, composer notif).
- Resta: el **AA viendo su propia asistencia** (4a) + el **director viendo a los AAs como grupo** (4b-tab).

## Alcance

### 4a — Self-service AA generalizado

- API service nuevo `AsistenciaAsistenteAdminApiService` (`@shared/services/attendance/`), mirror de `AsistenciaProfesorApiService` con:
  - `obtenerMiAsistenciaDia(fecha)` → `/api/asistente-administrativo/me/dia`
  - `obtenerMiAsistenciaMes(mes?, anio?)` → `/api/asistente-administrativo/me/mes`
- Tipos en `@data/models/attendance.models.ts`:
  - `AsistenciaAsistenteAdminDto` (espejo `AsistenciaProfesorDto`)
  - `AsistenciaDiaAsistentesAdminConEstadisticas` (espejo profesores)
  - Helper `asistenteAdminToPersonaAsistencia` si se necesita.
- Generalización del componente self-service: decidir entre (a) duplicar `attendance-profesor-propia` → `attendance-asistente-admin-propia`, o (b) parametrizar con `Input tipoPersona`. **Default por ahora**: (a) duplicar, simple y reversible. Refactor a (b) si aparece un 3er rol.
- Ruta nueva en `intranet.routes.ts`: branch en `AttendanceComponent` para `AsistenteAdministrativo` (hoy cae en admin via `isAdminRole`) — el AA viendo `/intranet/asistencia` debería ver **su propia asistencia**, no el panel admin. Decisión a confirmar: ¿preserva acceso al panel admin via `/intranet/admin/asistencias`? Sí — INV-AD08 cubre la jurisdicción.
- Widget home AA: idem profesor, replicar `profesor-attendance-widget`.
- Menú `intranet-menu.config.ts`: módulo "Seguimiento" entry "Mi asistencia" visible para `AsistenteAdministrativo`.

### 4b-tab — Tab dedicada AA en director-profesores

- Submenu de `attendance-director.component.ts`: agregar tercera opción `'asistentes-admin'`.
- Nuevo componente `AttendanceDirectorAsistentesAdminComponent` (mirror profesores) que:
  - Día: consume `director/asistentes-admin-asistencia-dia`.
  - Mes: lista AAs con paginación (reusa endpoint listar profesores? → no, requiere endpoint AA. Si no existe, fase mes queda en deuda — solo día por ahora).
- Cross-link a admin con `tipoPersona='A'` (Plan 23 patrón).

## Excluido

- Refactor general de `attendance-profesor-propia` a polimórfico — pospuesto hasta 3er caso.
- Edición de asistencia AA desde la vista AA — INV-AD08 prohíbe (se hace via `AsistenciaAdminController`).
- Endpoint listar AAs paginado (mes) si no existe en BE — degradar 4b-tab a solo día.
- Tests vitest — pospuestos a chat de testing dedicado.

## Plan de ejecución

- [x] Crear brief
- [x] `AsistenciaAsistenteAdminApiService` con `obtenerMiAsistenciaDia/Mes` + `obtenerAsistenciaDiaAsistentesAdminDirector`
- [x] Tipos en `attendance.models.ts` (`AsistenciaAsistenteAdminDto`, `AsistenciaDiaAsistentesAdminConEstadisticas`, `asistenteAdminToPersonaAsistencia`) + extensión `TIPO_PERSONA` con `'A'`
- [x] Re-export en barrel `@shared/services/attendance`
- [x] Side-effect: label `'A': 'Asistente Administrativo'` en `UiMappingService.TIPO_PERSONA_LABEL`
- [x] **4a self-service component** — `attendance-asistente-admin/propia/` (ts+html, mirror profesor-propia, consume `obtenerMiAsistenciaMes`).
- [x] **4a shell branch** — `AttendanceComponent`: `isAdminRole` → `isDirectorPanelRole` (excluye AA), AA renderiza `<app-attendance-asistente-admin-propia />`. ViewChild + delegación en `onModeChange`/`onReload`/`showModeSelector`. Acceso admin preservado vía `/intranet/admin/asistencias` (INV-AD08).
- [x] **4a widget home** — `asistente-admin-attendance-widget/` (ts+html+scss, simplificado: solo "Mi asistencia hoy", sin sección "Mi salón" porque AA no tiene salón). `home.component.ts` separa AA del summary widget admin con `showAsistenteAdminWidget` propio.
- [x] **4b-tab director** — `attendance-director/asistentes-admin/` (ts+html, día-only) + opción `'asistentes-admin'` con `pi pi-id-card` en submenu de `AttendanceDirectorComponent`. ViewChild + branches en `reload`/`applyPendingViewMode`. Mes no soportado (`setViewMode` ignora `mes` sin romper); cross-link a `/intranet/admin/asistencias?tab=gestion&tipoPersona=A&dni=...&fecha=...` (INV-AD08).
- [x] Ruta + menú: ya wireados — `/intranet/asistencia` cross-role (la branch del shell decide la vista por rol); permiso `PERMISOS.ASISTENCIA` cubre AA en menú "Asistencia diaria".
- [x] Lint + tsc OK (archivos modificados); 0 errores.
- [x] `/end` ship a `awaiting-prod/` (depende de deploy BE 3d para funcionalidad real).

## Aprendizajes transferibles

- **Polimorfismo "self-service" FE por rol**: el patrón `obtenerMi*` se replica por rol con DNI extraído del claim BE. Cuando aparezca un 3er rol con vista propia se migra a parametrización (no antes — `attendance-{profesor,asistente-admin}-propia` siguen suficientemente similares pero distinguibles).
- **`isAdminRole` mezclado**: el helper original incluía AA, lo cual entraba en conflicto con la decisión "AA viendo `/intranet/asistencia` ve su propia asistencia". Renombrar a `isDirectorPanelRole` y excluir AA dejó la intención explícita en el nombre. Lección: cuando un helper `isXxx` sirve a >1 propósito divergente, dividir antes de seguir.
- **Widget home por rol**: el summary widget admin asume "salón con agregados". El AA no tiene salón. Conclusión: separar `showAsistenteAdminWidget` con widget propio simplificado en lugar de adaptar el summary a un edge case más.
- **Tab director-AAs día-only**: el shell del director acepta el toggle día/mes. Para AAs, mes se silencia (`setViewMode(mes)` → no-op) hasta que BE exponga endpoint paginado de listar AAs por mes. Patrón: degradar visualmente sin romper el shell ni el header pill compartido.
- **Cross-link admin con `tipoPersona='A'`**: reusa el mismo patrón Plan 23 (deep-link a `/intranet/admin/asistencias` con queryParams). INV-AD08 garantiza que el AA viendo el link no podrá editar (autorización condicional pendiente Chat 6 BE).

## Métricas

- **Archivos**: 9 (3 nuevos dirs + 6 modificados existentes).
- **Componentes nuevos**: 3 (`attendance-asistente-admin-propia`, `asistente-admin-attendance-widget`, `attendance-director-asistentes-admin`).
- **Validación**: `tsc --noEmit` 0 errores · `eslint` 0 errores en archivos tocados.

## Pendiente fuera de scope (no para Chat 4)

- **PDF/Excel para AAs en director-tab** — endpoints BE existen (Plan 28 Chat 3a awaiting-prod), falta wiring FE en `AsistenciaAsistenteAdminApiService` (`descargarPdf*`/`descargarExcel*`) + menú PDF en `attendance-director-asistentes-admin.component.html`.
- **Mes paginado en director-tab** — bloqueado por BE: requiere endpoint `listar-asistentes-admin?fechaInicio&fechaFin&page&pageSize` (no existe).
- **Tests vitest** — pospuestos a chat de testing dedicado (acuerdo del brief).
- **Chat 6 BE gap-fix** — autorización condicional INV-AD08 (`AsistenciaAdminController` rechazando AA target cuando caller también es AA), patrón Plan 27 reservado.

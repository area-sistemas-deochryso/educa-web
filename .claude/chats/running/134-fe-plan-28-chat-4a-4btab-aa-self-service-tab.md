# 134 · Plan 28 Chat 4a + 4b-tab FE — Self-service AA + tab director-profesores

> **Creado**: 2026-05-09 · **Estado**: 🟡 running · **Repo**: `educa-web` (main)
> **Bloquea**: Plan 28 al 100% (cierra Chat 4 FE).

<!-- minimal-from-go -->

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

## Aprendizajes transferibles

- Self-service polimórfico FE: el patrón `obtenerMiAsistenciaDia/Mes` se replica por rol con DNI extraído del claim BE.
- El switch en `AttendanceComponent.userRole` requiere distinguir AA explícitamente cuando el comportamiento difiere de admin.

## Plan de ejecución (este chat)

Dado el tamaño, este chat aborda solo la **base**: API service AA + tipos. UI components + ruta + menú + widget quedan para chat siguiente con el cimiento ya en place.

- [x] Crear brief
- [x] `AsistenciaAsistenteAdminApiService` con `obtenerMiAsistenciaDia/Mes` + `obtenerAsistenciaDiaAsistentesAdminDirector`
- [x] Tipos en `attendance.models.ts` (`AsistenciaAsistenteAdminDto`, `AsistenciaDiaAsistentesAdminConEstadisticas`, `asistenteAdminToPersonaAsistencia`) + extensión `TIPO_PERSONA` con `'A'`
- [x] Re-export en barrel `@shared/services/attendance`
- [x] Side-effect: agregado label `'A': 'Asistente Administrativo'` en `UiMappingService.TIPO_PERSONA_LABEL` (el cambio de `Record<TipoPersona, string>` lo exigió en compile time — bueno para la UI cuando 4b-tab consuma el label)
- [x] Lint + tsc OK
- [ ] `/end` con commit parcial; brief queda activo para chat siguiente que toma UI (componentes, ruta, menú, widget, tab director).

## Siguiente chat (continuación de 134)

UI work pendiente sobre el cimiento ya en place:

1. **4a-self-service component**: duplicar `attendance-profesor-propia` → `attendance-asistente-admin-propia` consumiendo `AsistenciaAsistenteAdminApiService.obtenerMiAsistenciaMes`.
2. **4a-shell**: agregar branch en `AttendanceComponent` para `AsistenteAdministrativo` que renderice el self-service en lugar de caer en `isAdminRole` → admin panel. Decidir si el AA preserva acceso al panel admin via `/intranet/admin/asistencias` directamente (probable que sí — INV-AD08 lo cubre).
3. **4a-ruta + menú**: revisar `intranet.routes.ts` y `intranet-menu.config.ts` para que el módulo "Seguimiento → Mi asistencia" sea visible al rol AA.
4. **4a-widget home**: replicar `profesor-attendance-widget` para AA en home cross-role.
5. **4b-tab**: agregar opción `'asistentes-admin'` al submenu de `attendance-director.component.ts` + crear `AttendanceDirectorAsistentesAdminComponent` (mirror profesores, modo día consumiendo `obtenerAsistenciaDiaAsistentesAdminDirector`; modo mes degradado por ahora — no hay listar AAs paginado en BE).

# 143 · BE+FE — Vista de asistencia uniforme para los 4 roles administrativos

> **Creado**: 2026-05-12 · **Estado**: 🚢 awaiting-prod (commit `329500f` pusheado a `origin/main` 2026-05-12, Netlify deployando; pendiente smoke del usuario logueado como AA — confirmar widget en `/intranet` + panel director en `/intranet/asistencia`) · **Repo**: solo `educa-web` (BE sin cambios)
> **Modo sugerido**: `/execute`. Diseño y alcance ya acordados con el usuario.
> **Origen**: Orden de jefatura (2026-05-12). El usuario reporta que los 4 roles administrativos (Director, Asistente Administrativo, Promotor, Coordinador Académico) deben ver y consumir lo mismo en `/intranet` (home) y `/intranet/asistencia`. La división actual entre "Director/Promotor/Coordinador" y "Asistente Administrativo" introducida por Plan 28 Chat 4a queda revertida por decisión de negocio.

## Contexto y motivación

- **Decisión del usuario textual**: *"todos los que pertenecen a un rol administrativo (tabla director) deben poder acceder a la misma vista de asistencia del director y los mismos endpoints. Es darle la misma vista para /intranet y para /intranet/asistencia"*.
- **Ratificación frente a invariantes**: *"órdenes de arriba, quieren que estén iguales sin importar qué halla que hacer, luego acabando esto vamos a tener que revisar que invariantes y ADR están en conflicto y reconsiderar cambios. Ordenes son ordenes"*.
- Hoy el AsistenteAdministrativo (AA) ve UI propia simplificada en ambas pantallas, mientras Director/Promotor/CoordinadorAcademico ven el panel admin completo. Esto fue diseñado en **Plan 28 Chat 4a** y formalizado en `INV-AD05/INV-AD08` (mutaciones del AA sobre `TipoPersona='A'` quedan en `Roles.SupervisoresAsistenteAdmin = {Director, Promotor, CoordinadorAcademico}`).
- **Este chat trata SOLO la lectura/vista**. Las mutaciones sobre `'A'` siguen gateadas por INV-AD08 server-side hasta que el usuario decida si también aflojarlas (auditoría posterior).

## Hallazgos previos a ejecutar

### BE — buena noticia

`ConsultaAsistenciaController` ya tiene **todos los endpoints `/director/*`** abiertos a `Roles.Administrativos` (los 4):

- `/director/salones`, `/director/profesores`, `/director/grado`
- `/director/reporte`, `/director/estadisticas`, `/director/asistencia-dia`
- `/director/profesores-asistencia-dia`, `/director/asistentes-admin-asistencia-dia`
- Exports PDF/Excel (`/director/asistencia-dia/pdf`, `/director/reporte/todos-salones/*/pdf`, `/director/asistencia-mes/pdf`, etc.)

Esto cubre el panel director y los stats que consume el home widget de Director.

### FE — asimetría real

`src/app/features/intranet/pages/cross-role/home-component/home.component.ts:45-52`:

```typescript
readonly showAttendanceWidget = computed(
  () => this.userProfile.isDirector() ||
        this.userProfile.isPromotor() ||
        this.userProfile.isCoordinadorAcademico(),
);
readonly showAsistenteAdminWidget = computed(() => this.userProfile.isAsistenteAdministrativo());
```

`src/app/features/intranet/pages/cross-role/attendance-component/attendance.component.ts:124-130`:

```typescript
private isDirectorPanelRole(role: string): boolean {
  return role === APP_USER_ROLES.Director ||
         role === APP_USER_ROLES.Promotor ||
         role === APP_USER_ROLES.CoordinadorAcademico;
}
```

Hay que incluir `APP_USER_ROLES.AsistenteAdministrativo` en ambos predicados.

## Alcance

### IN

1. **FE — home (`/intranet`)**: AA pasa a ver `AttendanceSummaryWidget` igual que Director/Promotor/CoordinadorAcademico. El `AsistenteAdminAttendanceWidget` queda deprecado (eliminar import/render — el componente queda en el repo pendiente de borrado en chat de cleanup posterior).
2. **FE — `/intranet/asistencia`**: AA pasa a ver `AttendanceDirectorComponent` (panel admin completo). El `AttendanceAsistenteAdminPropiaComponent` queda deprecado.
3. **FE — auditoría defensiva**: revisar `AttendanceDirectorComponent` y subcomponentes (`AttendanceDirectorEstudiantes`, `AttendanceDirectorProfesores`, `AttendanceDirectorAsistentesAdmin`) por condicionales internos `isDirector()` / `=== 'Director'` que excluirían AA.
4. **FE — `UserProfileService` y helpers**: si hay helpers tipo `isDirectorPanelUser()` o similar, normalizarlos a `isAdministrativo()` que cubra los 4.
5. **BE — auditoría defensiva**: confirmar que TODOS los endpoints consumidos por la vista del Director están en `Roles.Administrativos` (no en `Roles.Director` ni en `Roles.SupervisoresAsistenteAdmin`). Si alguno está más restrictivo, aflojar a `Roles.Administrativos`. **Excepción explícita**: mutaciones sobre `TipoPersona='A'` permanecen como están (INV-AD08).

### OUT

- Aflojar las mutaciones sobre `TipoPersona='A'` (sigue INV-AD08). El usuario lo revisará después.
- Borrar físicamente `AsistenteAdminAttendanceWidget` y `AttendanceAsistenteAdminPropiaComponent` — quedan en el repo huérfanos. Chat futuro de cleanup los elimina.
- Actualizar `business-rules.md` con la reversión del Plan 28 Chat 4a — esto se hace en el chat de revisión de invariantes posterior (el usuario lo solicitó explícitamente: *"vamos a tener que revisar que invariantes y ADR están en conflicto"*).

## Pasos

1. **Audit BE**: grep `Roles.Director\b` (con boundary, no `Director`-string del rol) en controllers consumidos por home/asistencia. Identificar endpoints más restrictivos que `Roles.Administrativos` que cubran lecturas del panel.
2. **Audit FE**: grep `isAsistenteAdministrativo`, `isDirector`, `=== 'Director'`, `Promotor`, `CoordinadorAcademico` para mapear todos los gates por rol en las dos vistas.
3. **Aplicar cambios FE**:
   - `home.component.ts`: `showAttendanceWidget` incluye AA; `showAsistenteAdminWidget` queda en `false` (o se elimina) según resulte de la auditoría.
   - `attendance.component.ts`: `isDirectorPanelRole()` incluye AA; ajustar nombre del helper si conviene.
   - Subcomponentes del Director panel: revisar y ajustar role gates internos.
4. **Aplicar cambios BE** (solo si la auditoría descubre endpoints faltantes): aflojar a `Roles.Administrativos`.
5. **Validate**: `npm run lint` + `dotnet build` en ambos repos.
6. **Commit**: dos commits (FE + BE) con scope claro.

## Riesgos conocidos

- **INV-AD08 sigue activo** — un AA viendo el panel del Director puede intentar mutar asistencia de otro AA o de sí mismo. El controller BE rechaza la mutación pero la UI puede mostrar botones que disparan 403. **Mitigación**: la auditoría FE debe verificar si el panel del Director expone botones de mutación sobre `'A'`; si los expone, dejarlos visibles y que el 403 server-side los corte (consistente con la orden del usuario "sin importar qué halla que hacer").
- **Plan 28 Chat 4a quedó documentado en BE y FE** (comentarios en código, tests, `business-rules.md`). Los comentarios quedan obsoletos. **Mitigación**: marcar los comentarios afectados con `// TODO Plan 28 Chat 4a reversion — revisar invariantes` para el chat de auditoría posterior.

## Cierre esperado

- Commit FE: `feat(intranet): grant Asistente Administrativo the same attendance views as Director`.
- Commit BE (si aplica): `chore(api): broaden attendance endpoints to Roles.Administrativos`.
- Brief queda en `awaiting-prod/` esperando smoke del usuario en el navegador (login como AA → ver home con summary widget; ir a /intranet/asistencia y ver panel director).

## Referencias

- Plan 28 Chat 4a: `business-rules.md` §1.8 INV-AD05/AD08, comentarios en `attendance.component.ts:62-67` y `home.component.ts:42-44`.
- `Educa.API/Constants/Auth/Roles.cs` — `Roles.Administrativos` y `Roles.SupervisoresAsistenteAdmin`.
- `src/app/shared/constants/app-roles.ts` — `APP_USER_ROLE_ADMIN_LIST`.

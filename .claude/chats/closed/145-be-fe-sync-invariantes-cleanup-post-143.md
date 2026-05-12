# 145 · BE+FE — Sync invariantes AD08/AD09 + cleanup huérfano post-brief 143

> **Creado**: 2026-05-12 · **Estado**: ✅ closed (ejecutado y commiteado 2026-05-12: FE + BE en commits separados, ambos pusheados) · **Repo**: ambos (`Educa.API` + `educa-web`)
> **Modo sugerido**: `/execute`. Decisiones tomadas en brief 144 (cerrado).
> **Origen**: Continuación de brief 143 (UI unificada) → brief 144 (audit). El usuario aprobó las 3 opciones recomendadas en brief 144.

## Decisiones que se aplican

1. **INV-AD08 → aflojada a `Roles.Administrativos`**. AD09 ajustada. Texto §1.8 ("Self-service AA es read-only") reemplazado por la realidad post-143.
2. **Cleanup huérfano completo**: BE (`AsistenteAdministrativoController` + service + interface + tests) y FE (`AsistenteAdminAttendanceWidget`, `AttendanceAsistenteAdminPropia`, `AsistenciaAsistenteAdminApiService` + specs + barrel exports).
3. **TODOs Plan 28 Chat 4a reversion** en 3 archivos FE: quitar tras commit.

## Pasos

### FE (educa-web)

1. `business-rules.md` §1.8: reemplazar bloque "Self-service AA es read-only (Plan 28 Chat 3d)" por bloque "Plan 28 Chat 4a revertido (brief 143/145, 2026-05-12)" que describe el estado actual.
2. `business-rules.md` §15.9 INV-AD08: reescribir como "AA puede mutar `AsistenciaPersona` con `TipoPersona='A'` igual que los demás administrativos. El correo AD09 actúa como auditoría. La constante `Roles.SupervisoresAsistenteAdmin` queda solo como label histórico; no enforza nada."
3. `business-rules.md` §15.9 INV-AD09: ajustar enforcement note para reflejar que el AA puede ser tanto el mutador como el destinatario.
4. Eliminar TODOs `Plan 28 Chat 4a reversion` en `home.component.ts`, `attendance.component.ts`, `attendance.component.html`.
5. Eliminar archivos huérfanos:
   - `src/app/features/intranet/pages/cross-role/home-component/components/asistente-admin-attendance-widget/` (carpeta entera)
   - `src/app/features/intranet/pages/cross-role/attendance-component/attendance-asistente-admin/` (carpeta entera)
   - `src/app/shared/services/attendance/asistencia-asistente-admin-api.service.ts` + su `.spec.ts` (si tiene)
   - Export del barrel `src/app/shared/services/attendance/index.ts`.
6. Verificar que nada compile en rojo (`npx eslint` sobre los paths tocados, `npx vitest run` sobre los specs cercanos).

### BE (Educa.API)

7. Eliminar `Controllers/Asistencias/AsistenteAdministrativoController.cs` + sus tests.
8. Eliminar métodos `ObtenerAsistenciaAsistenteAdminDia` / `ObtenerAsistenciaAsistenteAdminMes` de `IConsultaAsistenciaService` y su implementación (si NO son consumidos por otro endpoint).
9. Verificar que `dotnet build` sigue verde.

### Commit

10. Dos commits separados FE + BE (repos distintos). Mensajes en inglés siguiendo conventional commits.
11. Push de ambos.

## Riesgos

- **Métodos del service compartidos**: si `ObtenerAsistenciaAsistenteAdminDia` lo usa otro controller (no debería, pero verificar), no se borra.
- **Specs huérfanos**: si un test consume `AsistenciaAsistenteAdminApiService`, hay que borrarlo en la misma operación.

## OUT

- No tocar maestro.md (modificado de antes, fuera de scope).
- No tocar ADRs (audit confirmó cero conflicto).

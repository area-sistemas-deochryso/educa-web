// #region Implementation
/**
 * Roles that an Administrador can "view as" (P92 F2). Mirrors the two roles
 * `ADMIN_VER_COMO` supports on the backend — `Educa.API` brief 498,
 * `BaseApiController.RequireProfesorId()`/`RequireEstudianteId()`.
 */
export type ViewAsRol = 'Profesor' | 'Estudiante';

/**
 * Chosen user for an active "ver como" session. `entityId` must be the
 * role-scoped entity id (ProfesorId/EstudianteId) — the same id already
 * carried in `AuthUser.entityId` for a real session of that role, NOT the
 * `Usuario` (login) table id. `PermissionsService.searchUsers()` already
 * returns entity ids per role (confirmed against `Educa.API` F1: each
 * `IUsuarioQueryStrategy` projects `Id = <entity>.<Entity>_CodID`), so no
 * mapping is needed between the picker result and this shape.
 */
export interface ViewAsContext {
	entityId: number;
	rol: ViewAsRol;
	nombreCompleto: string;
}
// #endregion

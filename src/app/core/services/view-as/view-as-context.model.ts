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

/**
 * Capability that lets a role "view as" a profesor/estudiante (read-only). Mirrors
 * `USUARIOS_API_IMPERSONATE` on the backend; no role is hard-coded in the FE (P115).
 */
export const VIEW_AS_CAPABILITY = 'USUARIOS_API_IMPERSONATE';

/**
 * Second capability, required to write while viewing as someone else. Without it the backend answers
 * 403 `ADMIN_VER_COMO_MUTACION_NO_AUTORIZADA` on every non-GET request (P115 F2).
 */
export const VIEW_AS_MUTATE_CAPABILITY = 'USUARIOS_IMPERSONATE_API_MANAGE';
// #endregion

/**
 * 1:1 match with backend RolDto (Educa.API/DTOs/Usuarios/RolDto.cs).
 * Source of truth: GET /api/roles endpoint.
 */
export interface Rol {
	readonly id: number;
	readonly codigo: string;
	readonly nombre: string;
	readonly esStaff: boolean;
	readonly esPasivo: boolean;
	readonly requiereSalon: boolean;
	readonly orden: number;
}

/** @deprecated 2026-06-08 — use Rol.nombre or Rol behavioral flags instead. Remove after 2026-07-08. */
export type RolNombre =
	| 'Estudiante'
	| 'Apoderado'
	| 'Profesor'
	| 'Director'
	| 'Asistente Administrativo'
	| 'Promotor'
	| 'Coordinador Académico'
	| 'Administrador';

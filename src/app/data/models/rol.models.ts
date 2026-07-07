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

/**
 * Auth Models - Interfaces que coinciden con el backend educa.API
 */

// Roles disponibles en el sistema
export type UserRole = 'Estudiante' | 'Apoderado' | 'Profesor' | 'Director';

// Request para el endpoint POST /api/Auth/login
export interface LoginRequest {
	dni: string;
	contraseña: string;
	rol: UserRole;
}

// Response del endpoint POST /api/Auth/login
export interface LoginResponse {
	token: string;
	rol: UserRole;
	nombreCompleto: string;
	entityId: number;
	sedeId: number;
	mensaje: string;
}

// Response del endpoint GET /api/Auth/perfil (PascalCase del backend)
export interface UserProfile {
	dni: string;
	rol: UserRole;
	nombreCompleto: string;
	entityId: string;
	sedeId: string;
}

// Usuario autenticado almacenado localmente (uso interno, camelCase)
export interface AuthUser {
	token: string;
	rol: UserRole;
	nombreCompleto: string;
	entityId: number;
	sedeId: number;
	dni?: string;
}

// Response del endpoint POST /api/Auth/verificar
export interface VerifyTokenResponse {
	dni: string;
	contraseña: string;
	rol: UserRole;
	nombreCompleto: string;
	entityId: number;
	sedeId: number;
}

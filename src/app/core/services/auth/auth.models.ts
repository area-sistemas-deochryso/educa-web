// #region Implementation
/**
 * Auth models that match backend DTOs.
 */

/**
 * Available user roles in the system.
 */
export type UserRole =
	| 'Estudiante'
	| 'Apoderado'
	| 'Profesor'
	| 'Director'
	| 'Asistente Administrativo';

/**
 * Request payload for POST /api/Auth/login.
 */
export interface LoginRequest {
	/** User DNI. */
	dni: string;
	/** User password. */
	contraseña: string;
	/** Role to authenticate. */
	rol: UserRole;
	/** Whether to persist the session cookie across browser restarts. */
	rememberMe: boolean;
}

/**
 * Response payload for POST /api/Auth/login.
 */
export interface LoginResponse {
	/** Whether the login succeeded. */
	success: boolean;
	/** Access token. Kept during transition — will be removed after full cookie migration. */
	token: string;
	/** User role. */
	rol: UserRole;
	/** Full name for display. */
	nombreCompleto: string;
	/** Entity id for the role context. */
	entityId: number;
	/** Sede id for the role context. */
	sedeId: number;
	/** Optional message from backend. */
	mensaje: string;
}

/**
 * Response payload for GET /api/Auth/perfil.
 */
export interface UserProfile {
	/** User DNI. */
	dni: string;
	/** User role. */
	rol: UserRole;
	/** Full name. */
	nombreCompleto: string;
	/** Entity id as string from backend. */
	entityId: string;
	/** Sede id as string from backend. */
	sedeId: string;
}

/**
 * Locally stored authenticated user data.
 * Token is NO LONGER stored here — it lives in an HttpOnly cookie.
 */
export interface AuthUser {
	/** User role. */
	rol: UserRole;
	/** Full name. */
	nombreCompleto: string;
	/** Entity id for the role context. */
	entityId: number;
	/** Sede id for the role context. */
	sedeId: number;
	/** DNI if available. */
	dni?: string;
}

/**
 * A stored server-side session for multi-user switching.
 */
export interface StoredSession {
	sessionId: string;
	nombreCompleto: string;
	rol: string;
	entityId: number;
	sedeId: number;
}

/**
 * Response payload for POST /api/Auth/verificar.
 * @deprecated Will be removed after full cookie migration.
 */
export interface VerifyTokenResponse {
	/** User DNI. */
	dni: string;
	/** User password (if included by backend). */
	contraseña: string;
	/** User role. */
	rol: UserRole;
	/** Full name. */
	nombreCompleto: string;
	/** Entity id for the role context. */
	entityId: number;
	/** Sede id for the role context. */
	sedeId: number;
}
// #endregion

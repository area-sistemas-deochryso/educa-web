import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { logger } from '@app/core/helpers';
import { AuthUser, ScheduleModalsState } from './storage.models';

/**
 * SessionStorageService - Para datos que deben existir solo durante la sesión del navegador
 *
 * Ideal para:
 * - Estado de UI temporal (modales abiertos, tabs activos)
 * - Datos de sesión que no necesitan persistir al cerrar el navegador
 * - Datos por pestaña (cada pestaña tiene su propio sessionStorage)
 *
 * Ventajas sobre localStorage:
 * - Se limpia automáticamente al cerrar la pestaña/navegador
 * - Aislado por pestaña (no se comparte entre pestañas)
 * - Reduce superficie de ataque XSS (datos no persisten)
 */

const SESSION_KEYS = {
	// Auth (más seguro que localStorage para tokens) - Ahora con prefijos base para múltiples sesiones
	TOKEN_PREFIX: 'educa_session_token',
	USER_PREFIX: 'educa_session_user',
	REMEMBER_ME_PREFIX: 'educa_remember_me',
	CURRENT_SESSION_KEY: 'educa_current_session', // Guarda la clave de la sesión activa

	// UI State
	SCHEDULE_MODALS_STATE: 'educa_schedule_modals',
	LAST_NOTIFICATION_CHECK: 'educa_last_notif_check',

	// Navigation state
	LAST_ROUTE: 'educa_last_route',
} as const;

const LOCAL_KEYS = {
	TOKEN_PREFIX: 'educa_persistent_token',
	USER_PREFIX: 'educa_persistent_user',
	REMEMBER_ME_PREFIX: 'educa_remember_me',
	REMEMBER_TOKEN: 'educa_remember_token', // Token para autocompletar login (no se borra con logout)
	CURRENT_SESSION_KEY: 'educa_current_persistent_session', // Guarda la clave de la sesión persistente activa
} as const;

@Injectable({
	providedIn: 'root',
})
export class SessionStorageService {
	private platformId = inject(PLATFORM_ID);

	private get isBrowser(): boolean {
		return isPlatformBrowser(this.platformId);
	}

	// ============================================
	// Métodos genéricos privados
	// ============================================

	private getItem(key: string): string | null {
		if (!this.isBrowser) return null;
		return sessionStorage.getItem(key);
	}

	private setItem(key: string, value: string): void {
		if (!this.isBrowser) return;
		sessionStorage.setItem(key, value);
	}

	private removeItem(key: string): void {
		if (!this.isBrowser) return;
		sessionStorage.removeItem(key);
	}

	private getJSON<T>(key: string): T | null {
		try {
			const value = this.getItem(key);
			return value ? JSON.parse(value) : null;
		} catch (e) {
			logger.error(`[SessionStorage] Error parsing JSON for key ${key}:`, e);
			return null;
		}
	}

	private setJSON<T>(key: string, value: T): void {
		try {
			this.setItem(key, JSON.stringify(value));
		} catch (e) {
			logger.error(`[SessionStorage] Error stringifying JSON for key ${key}:`, e);
		}
	}

	// ============================================
	// UTILIDADES PARA MÚLTIPLES SESIONES
	// ============================================

	/**
	 * Genera un identificador único para una sesión basado en nombreCompleto y rol
	 * Ej: "Juan Pérez" + "Estudiante" -> "juan_perez_estudiante"
	 */
	private generateSessionKey(nombreCompleto: string, rol: string): string {
		const sanitized = nombreCompleto
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '') // Remover acentos
			.replace(/[^a-z0-9]+/g, '_') // Reemplazar caracteres especiales con _
			.replace(/^_+|_+$/g, ''); // Remover _ al inicio/final

		const sanitizedRol = rol.toLowerCase();
		return `${sanitized}_${sanitizedRol}`;
	}

	/**
	 * Limpia cualquier sesión previa del mismo usuario en ambos storages
	 * Mantiene solo la sesión en el storage correspondiente al valor de rememberMe
	 */
	private cleanPreviousUserSessions(nombreCompleto: string, rol: string): void {
		const sessionKey = this.generateSessionKey(nombreCompleto, rol);

		// Construir las claves completas
		const sessionTokenKey = `${SESSION_KEYS.TOKEN_PREFIX}_${sessionKey}`;
		const sessionUserKey = `${SESSION_KEYS.USER_PREFIX}_${sessionKey}`;
		const sessionRememberMeKey = `${SESSION_KEYS.REMEMBER_ME_PREFIX}_${sessionKey}`;
		const localTokenKey = `${LOCAL_KEYS.TOKEN_PREFIX}_${sessionKey}`;
		const localUserKey = `${LOCAL_KEYS.USER_PREFIX}_${sessionKey}`;
		const localRememberMeKey = `${LOCAL_KEYS.REMEMBER_ME_PREFIX}_${sessionKey}`;

		// Limpiar de sessionStorage
		this.removeItem(sessionTokenKey);
		this.removeItem(sessionUserKey);
		this.removeItem(sessionRememberMeKey);

		// Limpiar de localStorage
		this.removeLocalItem(localTokenKey);
		this.removeLocalItem(localUserKey);
		this.removeLocalItem(localRememberMeKey);
	}

	// ============================================
	// AUTH - Token y Usuario (sesión o persistente)
	// ============================================

	private getLocalItem(key: string): string | null {
		if (!this.isBrowser) return null;
		return localStorage.getItem(key);
	}

	private setLocalItem(key: string, value: string): void {
		if (!this.isBrowser) return;
		localStorage.setItem(key, value);
	}

	private removeLocalItem(key: string): void {
		if (!this.isBrowser) return;
		localStorage.removeItem(key);
	}

	private getLocalJSON<T>(key: string): T | null {
		try {
			const value = this.getLocalItem(key);
			return value ? JSON.parse(value) : null;
		} catch (e) {
			logger.error(`[SessionStorage] Error parsing localStorage JSON for key ${key}:`, e);
			return null;
		}
	}

	private setLocalJSON<T>(key: string, value: T): void {
		try {
			this.setLocalItem(key, JSON.stringify(value));
		} catch (e) {
			logger.error(
				`[SessionStorage] Error stringifying localStorage JSON for key ${key}:`,
				e,
			);
		}
	}

	getToken(): string | null {
		// Obtener la clave de sesión activa
		const sessionKey =
			this.getLocalItem(LOCAL_KEYS.CURRENT_SESSION_KEY) ||
			this.getItem(SESSION_KEYS.CURRENT_SESSION_KEY);
		logger.log('[SessionStorage] getToken - sessionKey:', sessionKey);

		if (!sessionKey) {
			logger.warn('[SessionStorage] No session key found');
			return null;
		}

		// Primero verificar localStorage (sesión persistente)
		const localTokenKey = `${LOCAL_KEYS.TOKEN_PREFIX}_${sessionKey}`;
		const persistentToken = this.getLocalItem(localTokenKey);
		logger.log(
			'[SessionStorage] getToken - persistentToken from',
			localTokenKey,
			':',
			!!persistentToken,
		);

		if (persistentToken) return persistentToken;

		// Luego sessionStorage (sesión temporal)
		const sessionTokenKey = `${SESSION_KEYS.TOKEN_PREFIX}_${sessionKey}`;
		const sessionToken = this.getItem(sessionTokenKey);
		logger.log(
			'[SessionStorage] getToken - sessionToken from',
			sessionTokenKey,
			':',
			!!sessionToken,
		);

		return sessionToken;
	}

	setToken(
		token: string,
		rememberMe: boolean = false,
		nombreCompleto?: string,
		rol?: string,
	): void {
		logger.log('[SessionStorage] setToken called with:', {
			rememberMe,
			nombreCompleto,
			rol,
			hasToken: !!token,
		});

		// Si no se proporciona información del usuario, intentar obtenerla del usuario actual
		if (!nombreCompleto || !rol) {
			logger.warn('[SessionStorage] Missing user info, trying to get from current user');
			const currentUser = this.getUser();
			if (currentUser) {
				nombreCompleto = currentUser.nombreCompleto;
				rol = currentUser.rol;
				logger.log('[SessionStorage] Got user from storage:', { nombreCompleto, rol });
			} else {
				// Fallback: no se puede generar clave de sesión sin información del usuario
				logger.error('[SessionStorage] Cannot set token without user information');
				return;
			}
		}

		// Limpiar sesiones previas del mismo usuario en ambos storages
		this.cleanPreviousUserSessions(nombreCompleto, rol);

		// Generar clave de sesión
		const sessionKey = this.generateSessionKey(nombreCompleto, rol);
		logger.log('[SessionStorage] Generated sessionKey:', sessionKey);

		if (rememberMe) {
			// Guardar en localStorage para persistir
			const localTokenKey = `${LOCAL_KEYS.TOKEN_PREFIX}_${sessionKey}`;
			const localRememberMeKey = `${LOCAL_KEYS.REMEMBER_ME_PREFIX}_${sessionKey}`;
			logger.log('[SessionStorage] Saving to localStorage with keys:', {
				localTokenKey,
				localRememberMeKey,
			});

			this.setLocalItem(localTokenKey, token);
			this.setLocalItem(LOCAL_KEYS.CURRENT_SESSION_KEY, sessionKey);
			this.setLocalItem(localRememberMeKey, 'true');
			// Guardar token para autocompletar (no se borra con logout)
			this.setLocalItem(LOCAL_KEYS.REMEMBER_TOKEN, token);
			// Limpiar sessionStorage
			this.removeItem(SESSION_KEYS.CURRENT_SESSION_KEY);

			logger.log('[SessionStorage] Token saved to localStorage successfully');
		} else {
			// Guardar solo en sessionStorage
			const sessionTokenKey = `${SESSION_KEYS.TOKEN_PREFIX}_${sessionKey}`;
			logger.log('[SessionStorage] Saving to sessionStorage with key:', sessionTokenKey);

			this.setItem(sessionTokenKey, token);
			this.setItem(SESSION_KEYS.CURRENT_SESSION_KEY, sessionKey);
			// Limpiar localStorage Y remember token si no quiere recordar sesión
			this.removeLocalItem(LOCAL_KEYS.CURRENT_SESSION_KEY);
			this.removeLocalItem(LOCAL_KEYS.REMEMBER_TOKEN);

			logger.log('[SessionStorage] Token saved to sessionStorage successfully');
		}
	}

	removeToken(): void {
		const sessionKey =
			this.getLocalItem(LOCAL_KEYS.CURRENT_SESSION_KEY) ||
			this.getItem(SESSION_KEYS.CURRENT_SESSION_KEY);
		if (!sessionKey) return;

		const sessionTokenKey = `${SESSION_KEYS.TOKEN_PREFIX}_${sessionKey}`;
		const localTokenKey = `${LOCAL_KEYS.TOKEN_PREFIX}_${sessionKey}`;

		this.removeItem(sessionTokenKey);
		this.removeLocalItem(localTokenKey);
	}

	hasToken(): boolean {
		return !!this.getToken();
	}

	getUser(): AuthUser | null {
		// Obtener la clave de sesión activa
		const sessionKey =
			this.getLocalItem(LOCAL_KEYS.CURRENT_SESSION_KEY) ||
			this.getItem(SESSION_KEYS.CURRENT_SESSION_KEY);
		if (!sessionKey) return null;

		// Primero verificar localStorage (sesión persistente)
		const localUserKey = `${LOCAL_KEYS.USER_PREFIX}_${sessionKey}`;
		const persistentUser = this.getLocalJSON<AuthUser>(localUserKey);
		if (persistentUser) return persistentUser;

		// Luego sessionStorage (sesión temporal)
		const sessionUserKey = `${SESSION_KEYS.USER_PREFIX}_${sessionKey}`;
		return this.getJSON<AuthUser>(sessionUserKey);
	}

	setUser(user: AuthUser, rememberMe: boolean = false): void {
		// NOTA: No llamar a cleanPreviousUserSessions aquí porque ya se llamó en setToken
		// y borraría el token que acabamos de guardar

		// Generar clave de sesión
		const sessionKey = this.generateSessionKey(user.nombreCompleto, user.rol);
		logger.log('[SessionStorage] setUser with sessionKey:', sessionKey);

		if (rememberMe) {
			// Guardar en localStorage para persistir
			const localUserKey = `${LOCAL_KEYS.USER_PREFIX}_${sessionKey}`;
			this.setLocalJSON(localUserKey, user);
			this.setLocalItem(LOCAL_KEYS.CURRENT_SESSION_KEY, sessionKey);
			// Limpiar sessionStorage
			this.removeItem(SESSION_KEYS.CURRENT_SESSION_KEY);
			logger.log('[SessionStorage] User saved to localStorage');
		} else {
			// Guardar solo en sessionStorage
			const sessionUserKey = `${SESSION_KEYS.USER_PREFIX}_${sessionKey}`;
			this.setJSON(sessionUserKey, user);
			this.setItem(SESSION_KEYS.CURRENT_SESSION_KEY, sessionKey);
			// Limpiar localStorage
			this.removeLocalItem(LOCAL_KEYS.CURRENT_SESSION_KEY);
			logger.log('[SessionStorage] User saved to sessionStorage');
		}
	}

	removeUser(): void {
		const sessionKey =
			this.getLocalItem(LOCAL_KEYS.CURRENT_SESSION_KEY) ||
			this.getItem(SESSION_KEYS.CURRENT_SESSION_KEY);
		if (!sessionKey) return;

		const sessionUserKey = `${SESSION_KEYS.USER_PREFIX}_${sessionKey}`;
		const localUserKey = `${LOCAL_KEYS.USER_PREFIX}_${sessionKey}`;

		this.removeItem(sessionUserKey);
		this.removeLocalItem(localUserKey);
	}

	clearAuth(): void {
		// Obtener la clave de sesión activa antes de limpiar
		const sessionKey =
			this.getLocalItem(LOCAL_KEYS.CURRENT_SESSION_KEY) ||
			this.getItem(SESSION_KEYS.CURRENT_SESSION_KEY);

		// Solo limpiar tokens de sessionStorage (NO los persistentes de localStorage)
		// Los tokens persistentes se mantienen para autocompletado
		if (sessionKey) {
			const sessionTokenKey = `${SESSION_KEYS.TOKEN_PREFIX}_${sessionKey}`;
			const sessionUserKey = `${SESSION_KEYS.USER_PREFIX}_${sessionKey}`;
			const sessionRememberMeKey = `${SESSION_KEYS.REMEMBER_ME_PREFIX}_${sessionKey}`;

			this.removeItem(sessionTokenKey);
			this.removeItem(sessionUserKey);
			this.removeItem(sessionRememberMeKey);
		}

		// Limpiar claves de sesión activa (pero NO los tokens/users persistentes)
		this.removeItem(SESSION_KEYS.CURRENT_SESSION_KEY);
		this.removeLocalItem(LOCAL_KEYS.CURRENT_SESSION_KEY);

		// Nota: Los tokens persistentes (educa_persistent_token_*) NO se borran
		// Se mantienen para el autocompletado del login
		logger.log('[SessionStorage] Auth cleared, persistent tokens preserved');
	}

	// ============================================
	// REMEMBER TOKEN - Para autocompletar login
	// ============================================

	getRememberToken(): string | null {
		return this.getLocalItem(LOCAL_KEYS.REMEMBER_TOKEN);
	}

	clearRememberToken(): void {
		this.removeLocalItem(LOCAL_KEYS.REMEMBER_TOKEN);
	}

	/**
	 * Obtiene todos los tokens persistentes guardados de sesiones recordadas
	 * @returns Array de objetos con token y sessionKey
	 */
	getAllPersistentTokens(): Array<{ token: string; sessionKey: string }> {
		if (!this.isBrowser) return [];

		const tokens: Array<{ token: string; sessionKey: string }> = [];
		const prefix = LOCAL_KEYS.TOKEN_PREFIX + '_';

		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith(prefix)) {
				const token = localStorage.getItem(key);
				if (token) {
					const sessionKey = key.substring(prefix.length);
					tokens.push({ token, sessionKey });
				}
			}
		}

		logger.log('[SessionStorage] Found persistent tokens:', tokens.length);
		return tokens;
	}

	// ============================================
	// UI STATE - Estado temporal de la interfaz
	// ============================================

	getScheduleModalsState(): ScheduleModalsState {
		return this.getJSON<ScheduleModalsState>(SESSION_KEYS.SCHEDULE_MODALS_STATE) || {};
	}

	setScheduleModalsState(state: ScheduleModalsState): void {
		this.setJSON(SESSION_KEYS.SCHEDULE_MODALS_STATE, state);
	}

	updateScheduleModalState(
		modal: keyof ScheduleModalsState,
		value: boolean | { visible: boolean; course: string },
	): void {
		const state = this.getScheduleModalsState();
		if (value === false || (typeof value === 'object' && !value.visible)) {
			delete state[modal];
		} else {
			(state as any)[modal] = value;
		}
		this.setScheduleModalsState(state);
	}

	clearScheduleModalsState(): void {
		this.removeItem(SESSION_KEYS.SCHEDULE_MODALS_STATE);
	}

	// ============================================
	// NOTIFICATIONS - Check temporal
	// ============================================

	getLastNotificationCheck(): string | null {
		return this.getItem(SESSION_KEYS.LAST_NOTIFICATION_CHECK);
	}

	setLastNotificationCheck(date: string): void {
		this.setItem(SESSION_KEYS.LAST_NOTIFICATION_CHECK, date);
	}

	// ============================================
	// NAVIGATION - Estado de navegación
	// ============================================

	getLastRoute(): string | null {
		return this.getItem(SESSION_KEYS.LAST_ROUTE);
	}

	setLastRoute(route: string): void {
		this.setItem(SESSION_KEYS.LAST_ROUTE, route);
	}

	// ============================================
	// UTILIDADES
	// ============================================

	clearAll(): void {
		this.clearAuth();
		this.clearScheduleModalsState();
		this.removeItem(SESSION_KEYS.LAST_NOTIFICATION_CHECK);
		this.removeItem(SESSION_KEYS.LAST_ROUTE);
	}
}

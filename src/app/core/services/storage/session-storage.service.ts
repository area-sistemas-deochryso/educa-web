import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { logger } from '@app/core/helpers';
import { AuthUser, PermisosStorageData } from './storage.models';

/**
 * Session storage service for auth and permissions with dual storage.
 *
 * This service uses sessionStorage and localStorage based on rememberMe.
 * It also maintains session keys derived from full name and role so
 * multiple remembered sessions can coexist.
 *
 * @example
 * session.setToken(token, true, 'Juan Perez', 'Student');
 */
const SESSION_KEYS = {
	TOKEN_PREFIX: 'educa_session_token',
	USER_PREFIX: 'educa_session_user',
	REMEMBER_ME_PREFIX: 'educa_remember_me',
	CURRENT_SESSION_KEY: 'educa_current_session',
	PERMISOS_PREFIX: 'educa_session_permisos',
} as const;

/**
 * Local storage keys for persistent sessions.
 */
const LOCAL_KEYS = {
	TOKEN_PREFIX: 'educa_persistent_token',
	USER_PREFIX: 'educa_persistent_user',
	REMEMBER_ME_PREFIX: 'educa_remember_me',
	REMEMBER_TOKEN: 'educa_remember_token',
	CURRENT_SESSION_KEY: 'educa_current_persistent_session',
	PERMISOS_PREFIX: 'educa_persistent_permisos',
} as const;

@Injectable({
	providedIn: 'root',
})
export class SessionStorageService {
	private platformId = inject(PLATFORM_ID);

	/**
	 * True when running in the browser.
	 *
	 * @example
	 * if (!this.isBrowser) return;
	 */
	private get isBrowser(): boolean {
		return isPlatformBrowser(this.platformId);
	}

	// #region PRIVATE GENERIC HELPERS

	/**
	 * Read a sessionStorage value by key.
	 *
	 * @param key Storage key.
	 * @returns String value or null.
	 * @example
	 * const raw = this.getItem('educa_session_token_x');
	 */
	private getItem(key: string): string | null {
		if (!this.isBrowser) return null;
		return sessionStorage.getItem(key);
	}

	/**
	 * Write a sessionStorage value by key.
	 *
	 * @param key Storage key.
	 * @param value String value.
	 * @example
	 * this.setItem('educa_session_token_x', token);
	 */
	private setItem(key: string, value: string): void {
		if (!this.isBrowser) return;
		sessionStorage.setItem(key, value);
	}

	/**
	 * Remove a sessionStorage value by key.
	 *
	 * @param key Storage key.
	 * @example
	 * this.removeItem('educa_session_token_x');
	 */
	private removeItem(key: string): void {
		if (!this.isBrowser) return;
		sessionStorage.removeItem(key);
	}

	/**
	 * Read and parse JSON from sessionStorage.
	 *
	 * @param key Storage key.
	 * @returns Parsed value or null.
	 * @example
	 * const user = this.getJSON<AuthUser>('educa_session_user_x');
	 */
	private getJSON<T>(key: string): T | null {
		try {
			const value = this.getItem(key);
			return value ? JSON.parse(value) : null;
		} catch (e) {
			logger.error(`[SessionStorage] Error parsing JSON for key ${key}:`, e);
			return null;
		}
	}

	/**
	 * Stringify and store JSON into sessionStorage.
	 *
	 * @param key Storage key.
	 * @param value Value to store.
	 * @example
	 * this.setJSON('educa_session_user_x', user);
	 */
	private setJSON<T>(key: string, value: T): void {
		try {
			this.setItem(key, JSON.stringify(value));
		} catch (e) {
			logger.error(`[SessionStorage] Error stringifying JSON for key ${key}:`, e);
		}
	}

	// #endregion
	// #region MULTI SESSION UTILITIES

	/**
	 * Build a session key from full name and role.
	 * Example: "Juan Perez" + "Student" -> "juan_perez_student".
	 *
	 * @param nombreCompleto Full name.
	 * @param rol Role name.
	 * @returns Normalized session key.
	 * @example
	 * const key = this.generateSessionKey('Juan Perez', 'Student');
	 */
	private generateSessionKey(nombreCompleto: string, rol: string): string {
		const sanitized = nombreCompleto
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-z0-9]+/g, '_')
			.replace(/^_+|_+$/g, '');

		const sanitizedRol = rol.toLowerCase();
		return `${sanitized}_${sanitizedRol}`;
	}

	/**
	 * Remove any previous session for the same user in both storages.
	 *
	 * @param nombreCompleto Full name.
	 * @param rol Role name.
	 * @example
	 * this.cleanPreviousUserSessions('Juan Perez', 'Student');
	 */
	private cleanPreviousUserSessions(nombreCompleto: string, rol: string): void {
		const sessionKey = this.generateSessionKey(nombreCompleto, rol);

		const sessionTokenKey = `${SESSION_KEYS.TOKEN_PREFIX}_${sessionKey}`;
		const sessionUserKey = `${SESSION_KEYS.USER_PREFIX}_${sessionKey}`;
		const sessionRememberMeKey = `${SESSION_KEYS.REMEMBER_ME_PREFIX}_${sessionKey}`;
		const localTokenKey = `${LOCAL_KEYS.TOKEN_PREFIX}_${sessionKey}`;
		const localUserKey = `${LOCAL_KEYS.USER_PREFIX}_${sessionKey}`;
		const localRememberMeKey = `${LOCAL_KEYS.REMEMBER_ME_PREFIX}_${sessionKey}`;

		this.removeItem(sessionTokenKey);
		this.removeItem(sessionUserKey);
		this.removeItem(sessionRememberMeKey);

		this.removeLocalItem(localTokenKey);
		this.removeLocalItem(localUserKey);
		this.removeLocalItem(localRememberMeKey);
	}

	// #endregion
	// #region AUTH - localStorage helpers (used by user and permisos too)

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

	// [COOKIE_MIGRATION] Token methods disabled — auth token lives in HttpOnly cookie.
	// getToken(): string | null { ... }
	// setToken(token: string, rememberMe = false, nombreCompleto?: string, rol?: string): void { ... }
	// removeToken(): void { ... }
	// hasToken(): boolean { return !!this.getToken(); }

	/**
	 * Get current user from storage.
	 *
	 * @returns Current user or null.
	 * @example
	 * const user = session.getUser();
	 */
	getUser(): AuthUser | null {
		const sessionKey =
			this.getLocalItem(LOCAL_KEYS.CURRENT_SESSION_KEY) ||
			this.getItem(SESSION_KEYS.CURRENT_SESSION_KEY);
		if (!sessionKey) return null;

		const localUserKey = `${LOCAL_KEYS.USER_PREFIX}_${sessionKey}`;
		const persistentUser = this.getLocalJSON<AuthUser>(localUserKey);
		if (persistentUser) return persistentUser;

		const sessionUserKey = `${SESSION_KEYS.USER_PREFIX}_${sessionKey}`;
		return this.getJSON<AuthUser>(sessionUserKey);
	}

	/**
	 * Store current user.
	 *
	 * @param user User object.
	 * @param rememberMe Persist user in localStorage when true.
	 * @example
	 * session.setUser(user, true);
	 */
	setUser(user: AuthUser, rememberMe = false): void {
		const sessionKey = this.generateSessionKey(user.nombreCompleto, user.rol);

		if (rememberMe) {
			this.setLocalJSON(`${LOCAL_KEYS.USER_PREFIX}_${sessionKey}`, user);
			this.setLocalItem(LOCAL_KEYS.CURRENT_SESSION_KEY, sessionKey);
			this.removeItem(SESSION_KEYS.CURRENT_SESSION_KEY);
		} else {
			this.setJSON(`${SESSION_KEYS.USER_PREFIX}_${sessionKey}`, user);
			this.setItem(SESSION_KEYS.CURRENT_SESSION_KEY, sessionKey);
			this.removeLocalItem(LOCAL_KEYS.CURRENT_SESSION_KEY);
		}
	}

	/**
	 * Remove current user from storage.
	 *
	 * @example
	 * session.removeUser();
	 */
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

	/**
	 * Clear auth data for the active session.
	 *
	 * This removes session tokens and users but keeps persistent tokens
	 * for remember-me login flows.
	 *
	 * @example
	 * session.clearAuth();
	 */
	clearAuth(): void {
		const sessionKey =
			this.getLocalItem(LOCAL_KEYS.CURRENT_SESSION_KEY) ||
			this.getItem(SESSION_KEYS.CURRENT_SESSION_KEY);

		if (sessionKey) {
			// sessionStorage
			this.removeItem(`${SESSION_KEYS.TOKEN_PREFIX}_${sessionKey}`);
			this.removeItem(`${SESSION_KEYS.USER_PREFIX}_${sessionKey}`);
			this.removeItem(`${SESSION_KEYS.REMEMBER_ME_PREFIX}_${sessionKey}`);
			this.removeItem(`${SESSION_KEYS.PERMISOS_PREFIX}_${sessionKey}`);

			// localStorage (persistent/rememberMe data)
			this.removeLocalItem(`${LOCAL_KEYS.TOKEN_PREFIX}_${sessionKey}`);
			this.removeLocalItem(`${LOCAL_KEYS.USER_PREFIX}_${sessionKey}`);
			this.removeLocalItem(`${LOCAL_KEYS.REMEMBER_ME_PREFIX}_${sessionKey}`);
			this.removeLocalItem(`${LOCAL_KEYS.PERMISOS_PREFIX}_${sessionKey}`);
		}

		this.removeItem(SESSION_KEYS.CURRENT_SESSION_KEY);
		this.removeLocalItem(LOCAL_KEYS.CURRENT_SESSION_KEY);
	}

	// #endregion
	// #region REMEMBER TOKEN

	// [COOKIE_MIGRATION] Remember/persistent token methods disabled — sessions managed server-side now.
	// getRememberToken(): string | null { return this.getLocalItem(LOCAL_KEYS.REMEMBER_TOKEN); }
	// clearRememberToken(): void { this.removeLocalItem(LOCAL_KEYS.REMEMBER_TOKEN); }
	// getAllPersistentTokens(): { token: string; sessionKey: string }[] { ... }

	// #endregion
	// #region PERMISSIONS - Session scoped permissions

	/**
	 * Get permissions data for the active session.
	 *
	 * @returns Permissions data or null.
	 * @example
	 * const permisos = session.getPermisos();
	 */
	getPermisos(): PermisosStorageData | null {
		const sessionKey =
			this.getLocalItem(LOCAL_KEYS.CURRENT_SESSION_KEY) ||
			this.getItem(SESSION_KEYS.CURRENT_SESSION_KEY);
		if (!sessionKey) return null;

		const persistentPermisos = this.getLocalJSON<PermisosStorageData>(
			`${LOCAL_KEYS.PERMISOS_PREFIX}_${sessionKey}`,
		);
		if (persistentPermisos) return persistentPermisos;

		return this.getJSON<PermisosStorageData>(
			`${SESSION_KEYS.PERMISOS_PREFIX}_${sessionKey}`,
		);
	}

	/**
	 * Store permissions data for the active session.
	 *
	 * @param permisos Permissions data.
	 * @example
	 * session.setPermisos(permisos);
	 */
	setPermisos(permisos: PermisosStorageData): void {
		const sessionKey =
			this.getLocalItem(LOCAL_KEYS.CURRENT_SESSION_KEY) ||
			this.getItem(SESSION_KEYS.CURRENT_SESSION_KEY);
		if (!sessionKey) return;

		const isPersistent = !!this.getLocalItem(LOCAL_KEYS.CURRENT_SESSION_KEY);

		if (isPersistent) {
			this.setLocalJSON(`${LOCAL_KEYS.PERMISOS_PREFIX}_${sessionKey}`, permisos);
		} else {
			this.setJSON(`${SESSION_KEYS.PERMISOS_PREFIX}_${sessionKey}`, permisos);
		}
	}

	/**
	 * Clear all permissions from session and local storage.
	 *
	 * @example
	 * session.clearPermisos();
	 */
	clearPermisos(): void {
		if (!this.isBrowser) return;

		const sessionPermisosPrefix = SESSION_KEYS.PERMISOS_PREFIX + '_';
		const sessionKeysToRemove: string[] = [];

		for (let i = 0; i < sessionStorage.length; i++) {
			const key = sessionStorage.key(i);
			if (key && key.startsWith(sessionPermisosPrefix)) {
				sessionKeysToRemove.push(key);
			}
		}

		sessionKeysToRemove.forEach((key) => sessionStorage.removeItem(key));

		const localPermisosPrefix = LOCAL_KEYS.PERMISOS_PREFIX + '_';
		const localKeysToRemove: string[] = [];

		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith(localPermisosPrefix)) {
				localKeysToRemove.push(key);
			}
		}

		localKeysToRemove.forEach((key) => localStorage.removeItem(key));
	}

	// #endregion
	// #region UTILITIES

	/**
	 * Clear auth and permissions data for the active session.
	 *
	 * @example
	 * session.clearAll();
	 */
	clearAll(): void {
		this.clearAuth();
		this.clearPermisos();
	}
	// #endregion
}

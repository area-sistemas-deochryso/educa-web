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
	// Auth (más seguro que localStorage para tokens)
	TOKEN: 'educa_session_token',
	USER: 'educa_session_user',
	REMEMBER_ME: 'educa_remember_me',

	// UI State
	SCHEDULE_MODALS_STATE: 'educa_schedule_modals',
	LAST_NOTIFICATION_CHECK: 'educa_last_notif_check',

	// Navigation state
	LAST_ROUTE: 'educa_last_route',
} as const;

const LOCAL_KEYS = {
	TOKEN: 'educa_persistent_token',
	USER: 'educa_persistent_user',
	REMEMBER_TOKEN: 'educa_remember_token', // Token para autocompletar login (no se borra con logout)
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
			logger.error(`[SessionStorage] Error stringifying localStorage JSON for key ${key}:`, e);
		}
	}

	getToken(): string | null {
		// Primero verificar localStorage (sesión persistente)
		const persistentToken = this.getLocalItem(LOCAL_KEYS.TOKEN);
		if (persistentToken) return persistentToken;
		// Luego sessionStorage (sesión temporal)
		return this.getItem(SESSION_KEYS.TOKEN);
	}

	setToken(token: string, rememberMe: boolean = false): void {
		if (rememberMe) {
			// Guardar en localStorage para persistir
			this.setLocalItem(LOCAL_KEYS.TOKEN, token);
			this.setLocalItem(SESSION_KEYS.REMEMBER_ME, 'true');
			// Guardar token para autocompletar (no se borra con logout)
			this.setLocalItem(LOCAL_KEYS.REMEMBER_TOKEN, token);
			// Limpiar sessionStorage
			this.removeItem(SESSION_KEYS.TOKEN);
		} else {
			// Guardar solo en sessionStorage
			this.setItem(SESSION_KEYS.TOKEN, token);
			// Limpiar localStorage
			this.removeLocalItem(LOCAL_KEYS.TOKEN);
			this.removeLocalItem(SESSION_KEYS.REMEMBER_ME);
		}
	}

	removeToken(): void {
		this.removeItem(SESSION_KEYS.TOKEN);
		this.removeLocalItem(LOCAL_KEYS.TOKEN);
	}

	hasToken(): boolean {
		return !!this.getToken();
	}

	getUser(): AuthUser | null {
		// Primero verificar localStorage (sesión persistente)
		const persistentUser = this.getLocalJSON<AuthUser>(LOCAL_KEYS.USER);
		if (persistentUser) return persistentUser;
		// Luego sessionStorage (sesión temporal)
		return this.getJSON<AuthUser>(SESSION_KEYS.USER);
	}

	setUser(user: AuthUser, rememberMe: boolean = false): void {
		if (rememberMe) {
			// Guardar en localStorage para persistir
			this.setLocalJSON(LOCAL_KEYS.USER, user);
			// Limpiar sessionStorage
			this.removeItem(SESSION_KEYS.USER);
		} else {
			// Guardar solo en sessionStorage
			this.setJSON(SESSION_KEYS.USER, user);
			// Limpiar localStorage
			this.removeLocalItem(LOCAL_KEYS.USER);
		}
	}

	removeUser(): void {
		this.removeItem(SESSION_KEYS.USER);
		this.removeLocalItem(LOCAL_KEYS.USER);
	}

	clearAuth(): void {
		this.removeToken();
		this.removeUser();
		this.removeLocalItem(SESSION_KEYS.REMEMBER_ME);
		// Nota: REMEMBER_TOKEN NO se borra, se usa para autocompletar el login
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

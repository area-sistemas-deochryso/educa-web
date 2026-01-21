import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { logger } from '@app/helpers';
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

	// UI State
	SCHEDULE_MODALS_STATE: 'educa_schedule_modals',
	LAST_NOTIFICATION_CHECK: 'educa_last_notif_check',

	// Navigation state
	LAST_ROUTE: 'educa_last_route',
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
	// AUTH - Token y Usuario (sesión)
	// ============================================

	getToken(): string | null {
		return this.getItem(SESSION_KEYS.TOKEN);
	}

	setToken(token: string): void {
		this.setItem(SESSION_KEYS.TOKEN, token);
	}

	removeToken(): void {
		this.removeItem(SESSION_KEYS.TOKEN);
	}

	hasToken(): boolean {
		return !!this.getToken();
	}

	getUser(): AuthUser | null {
		return this.getJSON<AuthUser>(SESSION_KEYS.USER);
	}

	setUser(user: AuthUser): void {
		this.setJSON(SESSION_KEYS.USER, user);
	}

	removeUser(): void {
		this.removeItem(SESSION_KEYS.USER);
	}

	clearAuth(): void {
		this.removeToken();
		this.removeUser();
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

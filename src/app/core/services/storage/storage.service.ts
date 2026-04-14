import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { logger } from '@app/core/helpers';
import {
	AuthUser,
	ScheduleModalsState,
	NotificationStorageData,
	AttendanceMonthData,
	PermisosStorageData,
} from './storage.models';
import { SessionStorageService } from './session-storage.service';
import { PreferencesStorageService } from './preferences-storage.service';
import { NotificationStorageService } from './notification-storage.service';

/**
 * Storage facade for auth, permissions, notifications, and preferences.
 *
 * Coordinates SessionStorageService (auth/permisos), PreferencesStorageService
 * (prefs persistentes), NotificationStorageService/IndexedDB (notifications) y
 * sessionStorage directo (UI efímera).
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
	private session = inject(SessionStorageService);
	private preferences = inject(PreferencesStorageService);
	private notificationStorage = inject(NotificationStorageService);
	private platformId = inject(PLATFORM_ID);

	private get isBrowser(): boolean {
		return isPlatformBrowser(this.platformId);
	}

	// #region AUTH — delega en session
	// [COOKIE_MIGRATION] Token methods disabled — auth token now lives in HttpOnly cookie.
	// Uncomment ONLY if you need to rollback to token-based auth.
	// getToken, setToken, removeToken, hasToken — ver SessionStorageService.

	hasUserInfo(): boolean {
		return this.getUser() !== null;
	}

	getUser(): AuthUser | null {
		return this.session.getUser();
	}

	setUser(user: AuthUser, rememberMe = false): void {
		this.session.setUser(user, rememberMe);
	}

	removeUser(): void {
		this.session.removeUser();
	}

	clearAuth(): void {
		this.session.clearAuth();
	}
	// [COOKIE_MIGRATION] Remember/persistent token methods disabled — sessions managed server-side now.
	// #endregion

	// #region PERMISSIONS — delega en session
	getPermisos(): PermisosStorageData | null {
		return this.session.getPermisos();
	}

	setPermisos(permisos: PermisosStorageData): void {
		this.session.setPermisos(permisos);
	}

	clearPermisos(): void {
		this.session.clearPermisos();
	}
	// #endregion

	// #region NOTIFICATIONS — IndexedDB con fallback síncrono a localStorage

	/** @deprecated Use getDismissedNotificationsAsync. */
	getDismissedNotifications(): NotificationStorageData | null {
		return this._getSyncFallback<NotificationStorageData>('educa_dismissed_notifications');
	}

	async getDismissedNotificationsAsync(): Promise<NotificationStorageData | null> {
		const data = await this.notificationStorage.getDismissedNotifications();
		if (data) return data;
		return this._getSyncFallback<NotificationStorageData>('educa_dismissed_notifications');
	}

	/** @deprecated Use setDismissedNotificationsAsync. */
	setDismissedNotifications(data: NotificationStorageData): void {
		this._setSyncFallback('educa_dismissed_notifications', data);
		this.notificationStorage.setDismissedNotifications(data);
	}

	async setDismissedNotificationsAsync(data: NotificationStorageData): Promise<void> {
		await this.notificationStorage.setDismissedNotifications(data);
	}

	removeDismissedNotifications(): void {
		this._removeSyncFallback('educa_dismissed_notifications');
		this.notificationStorage.removeDismissedNotifications();
	}

	/** @deprecated Use getReadNotificationsAsync. */
	getReadNotifications(): NotificationStorageData | null {
		return this._getSyncFallback<NotificationStorageData>('educa_read_notifications');
	}

	async getReadNotificationsAsync(): Promise<NotificationStorageData | null> {
		const data = await this.notificationStorage.getReadNotifications();
		if (data) return data;
		return this._getSyncFallback<NotificationStorageData>('educa_read_notifications');
	}

	/** @deprecated Use setReadNotificationsAsync. */
	setReadNotifications(data: NotificationStorageData): void {
		this._setSyncFallback('educa_read_notifications', data);
		this.notificationStorage.setReadNotifications(data);
	}

	async setReadNotificationsAsync(data: NotificationStorageData): Promise<void> {
		await this.notificationStorage.setReadNotifications(data);
	}

	removeReadNotifications(): void {
		this._removeSyncFallback('educa_read_notifications');
		this.notificationStorage.removeReadNotifications();
	}

	getLastNotificationCheck(): string | null {
		if (!this.isBrowser) return null;
		return sessionStorage.getItem('educa_last_notif_check');
	}

	setLastNotificationCheck(date: string): void {
		if (!this.isBrowser) return;
		sessionStorage.setItem('educa_last_notif_check', date);
	}

	clearNotifications(): void {
		this._removeSyncFallback('educa_dismissed_notifications');
		this._removeSyncFallback('educa_read_notifications');
		this.notificationStorage.clearNotifications();
	}
	// #endregion

	// #region SCHEDULE — estado efímero de UI (sessionStorage directo)
	getScheduleModalsState(): ScheduleModalsState {
		if (!this.isBrowser) return {};
		try {
			const raw = sessionStorage.getItem('educa_schedule_modals');
			return raw ? JSON.parse(raw) : {};
		} catch {
			return {};
		}
	}

	setScheduleModalsState(state: ScheduleModalsState): void {
		if (!this.isBrowser) return;
		sessionStorage.setItem('educa_schedule_modals', JSON.stringify(state));
	}

	updateScheduleModalState(
		modal: keyof ScheduleModalsState,
		value: boolean | { visible: boolean; course: string },
	): void {
		const state = this.getScheduleModalsState();
		if (value === false || (typeof value === 'object' && !value.visible)) {
			delete state[modal];
		} else {
			(state as Record<string, unknown>)[modal] = value;
		}
		this.setScheduleModalsState(state);
	}

	clearScheduleModalsState(): void {
		if (!this.isBrowser) return;
		sessionStorage.removeItem('educa_schedule_modals');
	}
	// #endregion

	// #region ATTENDANCE — delega en preferences
	getAttendanceMonth(): AttendanceMonthData | null {
		return this.preferences.getAttendanceMonth();
	}

	setAttendanceMonth(data: AttendanceMonthData): void {
		this.preferences.setAttendanceMonth(data);
	}

	clearAttendanceMonth(): void {
		this.preferences.clearAttendanceMonth();
	}

	getSelectedHijoId(): number | null {
		return this.preferences.getSelectedHijoId();
	}

	setSelectedHijoId(id: number): void {
		this.preferences.setSelectedHijoId(id);
	}

	clearSelectedHijoId(): void {
		this.preferences.clearSelectedHijoId();
	}

	getSelectedSalonId(): number | null {
		return this.preferences.getSelectedSalonId();
	}

	setSelectedSalonId(id: number): void {
		this.preferences.setSelectedSalonId(id);
	}

	clearSelectedSalonId(): void {
		this.preferences.clearSelectedSalonId();
	}

	getSelectedEstudianteId(): number | null {
		return this.preferences.getSelectedEstudianteId();
	}

	setSelectedEstudianteId(id: number): void {
		this.preferences.setSelectedEstudianteId(id);
	}

	clearSelectedEstudianteId(): void {
		this.preferences.clearSelectedEstudianteId();
	}

	getSelectedGradoSeccionDirector(): { grado: string; seccion: string } | null {
		return this.preferences.getSelectedGradoSeccionDirector();
	}

	setSelectedGradoSeccionDirector(gs: { grado: string; seccion: string }): void {
		this.preferences.setSelectedGradoSeccionDirector(gs);
	}

	clearSelectedGradoSeccionDirector(): void {
		this.preferences.clearSelectedGradoSeccionDirector();
	}

	getSelectedEstudianteDirectorId(): number | null {
		return this.preferences.getSelectedEstudianteDirectorId();
	}

	setSelectedEstudianteDirectorId(id: number): void {
		this.preferences.setSelectedEstudianteDirectorId(id);
	}

	clearSelectedEstudianteDirectorId(): void {
		this.preferences.clearSelectedEstudianteDirectorId();
	}

	clearAttendance(): void {
		this.preferences.clearAttendancePreferences();
	}
	// #endregion

	// #region GENERAL UTILITIES
	clearAll(): void {
		this.clearAuth();
		this.clearPermisos();
		this.clearNotifications();
		this.clearScheduleModalsState();
		this.clearAttendance();
	}

	async migrateFromLegacyStorage(): Promise<void> {
		logger.log('[Storage] Checking for legacy data to migrate...');

		const legacyDismissed = this._getSyncFallback<NotificationStorageData>(
			'educa_dismissed_notifications',
		);
		if (legacyDismissed) {
			await this.notificationStorage.setDismissedNotifications(legacyDismissed);
			logger.log('[Storage] Migrated dismissed notifications to IndexedDB');
		}

		const legacyRead = this._getSyncFallback<NotificationStorageData>(
			'educa_read_notifications',
		);
		if (legacyRead) {
			await this.notificationStorage.setReadNotifications(legacyRead);
			logger.log('[Storage] Migrated read notifications to IndexedDB');
		}

		logger.log('[Storage] Migration complete');
	}
	// #endregion

	// #region QUICK ACCESS FAVORITES
	getFavoriteRoutes(): string[] {
		return this.preferences.getFavoriteRoutes();
	}

	setFavoriteRoutes(routes: string[]): void {
		this.preferences.setFavoriteRoutes(routes);
	}
	// #endregion

	// #region SYNC FALLBACKS — localStorage cuando IndexedDB no está disponible
	private _getSyncFallback<T>(key: string): T | null {
		try {
			const value = localStorage.getItem(key);
			return value ? JSON.parse(value) : null;
		} catch {
			return null;
		}
	}

	private _setSyncFallback<T>(key: string, value: T): void {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch (e) {
			logger.error(`[Storage] Fallback set error for ${key}:`, e);
		}
	}

	private _removeSyncFallback(key: string): void {
		try {
			localStorage.removeItem(key);
		} catch {
			// Silently ignore — localStorage may be unavailable
		}
	}
	// #endregion
}

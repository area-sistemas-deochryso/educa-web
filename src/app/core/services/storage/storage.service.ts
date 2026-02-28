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
import { IndexedDBService } from './indexed-db.service';

/**
 * Storage facade for auth, permissions, notifications, and preferences.
 *
 * This service coordinates:
 * - SessionStorageService for auth and permissions
 * - PreferencesStorageService for persistent user preferences
 * - IndexedDBService for async and larger payloads
 * - sessionStorage for ephemeral UI state
 *
 * @example
 * storage.setToken(token, true);
 * storage.setAttendanceMonth({ month: 6, year: 2025 });
 */
@Injectable({
	providedIn: 'root',
})
export class StorageService {
	private session = inject(SessionStorageService);
	private preferences = inject(PreferencesStorageService);
	private idb = inject(IndexedDBService);
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

	// #region AUTH - Session storage delegation

	// [COOKIE_MIGRATION] Token methods disabled — auth token now lives in HttpOnly cookie.
	// Uncomment ONLY if you need to rollback to token-based auth.
	// getToken(): string | null { return this.session.getToken(); }
	// setToken(token: string, rememberMe = false, nombreCompleto?: string, rol?: string): void { this.session.setToken(token, rememberMe, nombreCompleto, rol); }
	// removeToken(): void { this.session.removeToken(); }
	// hasToken(): boolean { return this.session.hasToken(); }

	/**
	 * Check if user info exists in storage.
	 * Auth state hydration — token lives in HttpOnly cookie, this is for UI state only.
	 */
	hasUserInfo(): boolean {
		return this.getUser() !== null;
	}
	/**
	 * Get current user from storage.
	 *
	 * @returns Current user or null.
	 * @example
	 * const user = storage.getUser();
	 */
	getUser(): AuthUser | null {
		return this.session.getUser();
	}
	/**
	 * Store current user.
	 *
	 * @param user User object.
	 * @param rememberMe Persist in localStorage when true.
	 * @example
	 * storage.setUser(user, true);
	 */
	setUser(user: AuthUser, rememberMe = false): void {
		this.session.setUser(user, rememberMe);
	}
	/**
	 * Remove current user from storage.
	 *
	 * @example
	 * storage.removeUser();
	 */
	removeUser(): void {
		this.session.removeUser();
	}
	/**
	 * Clear auth token and user data.
	 *
	 * @example
	 * storage.clearAuth();
	 */
	clearAuth(): void {
		this.session.clearAuth();
	}
	// [COOKIE_MIGRATION] Remember/persistent token methods disabled — sessions managed server-side now.
	// getRememberToken(): string | null { return this.session.getRememberToken(); }
	// clearRememberToken(): void { this.session.clearRememberToken(); }
	// getAllPersistentTokens(): { token: string; sessionKey: string }[] { return this.session.getAllPersistentTokens(); }

	// #endregion
	// #region PERMISSIONS - Session storage delegation
	/**
	 * Get permissions data for current session.
	 *
	 * @returns Permissions data or null.
	 * @example
	 * const permisos = storage.getPermisos();
	 */
	getPermisos(): PermisosStorageData | null {
		return this.session.getPermisos();
	}
	/**
	 * Store permissions data for current session.
	 *
	 * @param permisos Permissions data.
	 * @example
	 * storage.setPermisos(permisos);
	 */
	setPermisos(permisos: PermisosStorageData): void {
		this.session.setPermisos(permisos);
	}
	/**
	 * Clear permissions data from storage.
	 *
	 * @example
	 * storage.clearPermisos();
	 */
	clearPermisos(): void {
		this.session.clearPermisos();
	}

	// #endregion
	// #region NOTIFICATIONS - IndexedDB with sync fallback

	/**
	 * Get dismissed notification ids from sync fallback.
	 *
	 * @deprecated Use getDismissedNotificationsAsync.
	 * @returns Notification storage data or null.
	 * @example
	 * const data = storage.getDismissedNotifications();
	 */
	getDismissedNotifications(): NotificationStorageData | null {
		return this._getSyncFallback<NotificationStorageData>('educa_dismissed_notifications');
	}
	/**
	 * Get dismissed notification ids using IndexedDB.
	 *
	 * @returns Notification storage data or null.
	 * @example
	 * const data = await storage.getDismissedNotificationsAsync();
	 */
	async getDismissedNotificationsAsync(): Promise<NotificationStorageData | null> {
		const data = await this.idb.getDismissedNotifications();
		if (data) return data;
		return this._getSyncFallback<NotificationStorageData>('educa_dismissed_notifications');
	}

	/**
	 * Store dismissed notification ids using sync fallback.
	 *
	 * @deprecated Use setDismissedNotificationsAsync.
	 * @param data Notification storage data.
	 * @example
	 * storage.setDismissedNotifications({ ids: [1, 2] });
	 */
	setDismissedNotifications(data: NotificationStorageData): void {
		this._setSyncFallback('educa_dismissed_notifications', data);
		this.idb.setDismissedNotifications(data);
	}
	/**
	 * Store dismissed notification ids using IndexedDB.
	 *
	 * @param data Notification storage data.
	 * @example
	 * await storage.setDismissedNotificationsAsync({ ids: [1, 2] });
	 */
	async setDismissedNotificationsAsync(data: NotificationStorageData): Promise<void> {
		await this.idb.setDismissedNotifications(data);
	}
	/**
	 * Remove dismissed notification ids.
	 *
	 * @example
	 * storage.removeDismissedNotifications();
	 */
	removeDismissedNotifications(): void {
		this._removeSyncFallback('educa_dismissed_notifications');
		this.idb.removeDismissedNotifications();
	}

	/**
	 * Get read notification ids from sync fallback.
	 *
	 * @deprecated Use getReadNotificationsAsync.
	 * @returns Notification storage data or null.
	 * @example
	 * const data = storage.getReadNotifications();
	 */
	getReadNotifications(): NotificationStorageData | null {
		return this._getSyncFallback<NotificationStorageData>('educa_read_notifications');
	}
	/**
	 * Get read notification ids using IndexedDB.
	 *
	 * @returns Notification storage data or null.
	 * @example
	 * const data = await storage.getReadNotificationsAsync();
	 */
	async getReadNotificationsAsync(): Promise<NotificationStorageData | null> {
		const data = await this.idb.getReadNotifications();
		if (data) return data;
		return this._getSyncFallback<NotificationStorageData>('educa_read_notifications');
	}

	/**
	 * Store read notification ids using sync fallback.
	 *
	 * @deprecated Use setReadNotificationsAsync.
	 * @param data Notification storage data.
	 * @example
	 * storage.setReadNotifications({ ids: [10, 11] });
	 */
	setReadNotifications(data: NotificationStorageData): void {
		this._setSyncFallback('educa_read_notifications', data);
		this.idb.setReadNotifications(data);
	}
	/**
	 * Store read notification ids using IndexedDB.
	 *
	 * @param data Notification storage data.
	 * @example
	 * await storage.setReadNotificationsAsync({ ids: [10, 11] });
	 */
	async setReadNotificationsAsync(data: NotificationStorageData): Promise<void> {
		await this.idb.setReadNotifications(data);
	}
	/**
	 * Remove read notification ids.
	 *
	 * @example
	 * storage.removeReadNotifications();
	 */
	removeReadNotifications(): void {
		this._removeSyncFallback('educa_read_notifications');
		this.idb.removeReadNotifications();
	}
	/**
	 * Get last notification check timestamp string.
	 *
	 * @returns ISO date string or null.
	 * @example
	 * const lastCheck = storage.getLastNotificationCheck();
	 */
	getLastNotificationCheck(): string | null {
		if (!this.isBrowser) return null;
		return sessionStorage.getItem('educa_last_notif_check');
	}
	/**
	 * Set last notification check timestamp string.
	 *
	 * @param date Date string.
	 * @example
	 * storage.setLastNotificationCheck(new Date().toISOString());
	 */
	setLastNotificationCheck(date: string): void {
		if (!this.isBrowser) return;
		sessionStorage.setItem('educa_last_notif_check', date);
	}
	/**
	 * Clear all notification data.
	 *
	 * @example
	 * storage.clearNotifications();
	 */
	clearNotifications(): void {
		this._removeSyncFallback('educa_dismissed_notifications');
		this._removeSyncFallback('educa_read_notifications');
		this.idb.clearNotifications();
	}

	// #endregion
	// #region SCHEDULE - Ephemeral UI state
	/**
	 * Get schedule modal state from session storage.
	 *
	 * @returns Modal state map.
	 * @example
	 * const state = storage.getScheduleModalsState();
	 */
	getScheduleModalsState(): ScheduleModalsState {
		if (!this.isBrowser) return {};
		try {
			const raw = sessionStorage.getItem('educa_schedule_modals');
			return raw ? JSON.parse(raw) : {};
		} catch {
			return {};
		}
	}
	/**
	 * Store schedule modal state in session storage.
	 *
	 * @param state Modal state.
	 * @example
	 * storage.setScheduleModalsState({ courseDetails: { visible: true, course: 'A1' } });
	 */
	setScheduleModalsState(state: ScheduleModalsState): void {
		if (!this.isBrowser) return;
		sessionStorage.setItem('educa_schedule_modals', JSON.stringify(state));
	}
	/**
	 * Update a single schedule modal entry.
	 *
	 * @param modal Modal key.
	 * @param value Modal state or visible flag.
	 * @example
	 * storage.updateScheduleModalState('courseDetails', { visible: true, course: 'A1' });
	 */
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
	/**
	 * Clear schedule modal state in session storage.
	 *
	 * @example
	 * storage.clearScheduleModalsState();
	 */
	clearScheduleModalsState(): void {
		if (!this.isBrowser) return;
		sessionStorage.removeItem('educa_schedule_modals');
	}

	// #endregion
	// #region ATTENDANCE - Preferences storage delegation
	/**
	 * Get selected attendance month and year.
	 *
	 * @returns Month and year data or null.
	 * @example
	 * const month = storage.getAttendanceMonth();
	 */
	getAttendanceMonth(): AttendanceMonthData | null {
		return this.preferences.getAttendanceMonth();
	}
	/**
	 * Store selected attendance month and year.
	 *
	 * @param data Month and year data.
	 * @example
	 * storage.setAttendanceMonth({ month: 6, year: 2025 });
	 */
	setAttendanceMonth(data: AttendanceMonthData): void {
		this.preferences.setAttendanceMonth(data);
	}
	/**
	 * Clear attendance month selection.
	 *
	 * @example
	 * storage.clearAttendanceMonth();
	 */
	clearAttendanceMonth(): void {
		this.preferences.clearAttendanceMonth();
	}
	/**
	 * Get selected child id.
	 *
	 * @returns Child id or null.
	 * @example
	 * const id = storage.getSelectedHijoId();
	 */
	getSelectedHijoId(): number | null {
		return this.preferences.getSelectedHijoId();
	}
	/**
	 * Set selected child id.
	 *
	 * @param id Child id.
	 * @example
	 * storage.setSelectedHijoId(123);
	 */
	setSelectedHijoId(id: number): void {
		this.preferences.setSelectedHijoId(id);
	}
	/**
	 * Clear selected child id.
	 *
	 * @example
	 * storage.clearSelectedHijoId();
	 */
	clearSelectedHijoId(): void {
		this.preferences.clearSelectedHijoId();
	}
	/**
	 * Get selected classroom id.
	 *
	 * @returns Classroom id or null.
	 * @example
	 * const id = storage.getSelectedSalonId();
	 */
	getSelectedSalonId(): number | null {
		return this.preferences.getSelectedSalonId();
	}
	/**
	 * Set selected classroom id.
	 *
	 * @param id Classroom id.
	 * @example
	 * storage.setSelectedSalonId(45);
	 */
	setSelectedSalonId(id: number): void {
		this.preferences.setSelectedSalonId(id);
	}
	/**
	 * Clear selected classroom id.
	 *
	 * @example
	 * storage.clearSelectedSalonId();
	 */
	clearSelectedSalonId(): void {
		this.preferences.clearSelectedSalonId();
	}
	/**
	 * Get selected student id.
	 *
	 * @returns Student id or null.
	 * @example
	 * const id = storage.getSelectedEstudianteId();
	 */
	getSelectedEstudianteId(): number | null {
		return this.preferences.getSelectedEstudianteId();
	}
	/**
	 * Set selected student id.
	 *
	 * @param id Student id.
	 * @example
	 * storage.setSelectedEstudianteId(77);
	 */
	setSelectedEstudianteId(id: number): void {
		this.preferences.setSelectedEstudianteId(id);
	}
	/**
	 * Clear selected student id.
	 *
	 * @example
	 * storage.clearSelectedEstudianteId();
	 */
	clearSelectedEstudianteId(): void {
		this.preferences.clearSelectedEstudianteId();
	}
	/**
	 * Get selected grade and section for director attendance.
	 *
	 * @returns Grade and section data or null.
	 * @example
	 * const gs = storage.getSelectedGradoSeccionDirector();
	 */
	getSelectedGradoSeccionDirector(): { grado: string; seccion: string } | null {
		return this.preferences.getSelectedGradoSeccionDirector();
	}
	/**
	 * Set selected grade and section for director attendance.
	 *
	 * @param gs Grade and section data.
	 * @example
	 * storage.setSelectedGradoSeccionDirector({ grado: '3', seccion: 'B' });
	 */
	setSelectedGradoSeccionDirector(gs: { grado: string; seccion: string }): void {
		this.preferences.setSelectedGradoSeccionDirector(gs);
	}
	/**
	 * Clear selected grade and section for director attendance.
	 *
	 * @example
	 * storage.clearSelectedGradoSeccionDirector();
	 */
	clearSelectedGradoSeccionDirector(): void {
		this.preferences.clearSelectedGradoSeccionDirector();
	}
	/**
	 * Get selected student id for director attendance.
	 *
	 * @returns Student id or null.
	 * @example
	 * const id = storage.getSelectedEstudianteDirectorId();
	 */
	getSelectedEstudianteDirectorId(): number | null {
		return this.preferences.getSelectedEstudianteDirectorId();
	}
	/**
	 * Set selected student id for director attendance.
	 *
	 * @param id Student id.
	 * @example
	 * storage.setSelectedEstudianteDirectorId(88);
	 */
	setSelectedEstudianteDirectorId(id: number): void {
		this.preferences.setSelectedEstudianteDirectorId(id);
	}
	/**
	 * Clear selected student id for director attendance.
	 *
	 * @example
	 * storage.clearSelectedEstudianteDirectorId();
	 */
	clearSelectedEstudianteDirectorId(): void {
		this.preferences.clearSelectedEstudianteDirectorId();
	}
	/**
	 * Clear all attendance related preferences.
	 *
	 * @example
	 * storage.clearAttendance();
	 */
	clearAttendance(): void {
		this.preferences.clearAttendancePreferences();
	}

	// #endregion
	// #region GENERAL UTILITIES
	/**
	 * Clear all storage managed by this service.
	 *
	 * @example
	 * storage.clearAll();
	 */
	clearAll(): void {
		this.clearAuth();
		this.clearPermisos();
		this.clearNotifications();
		this.clearScheduleModalsState();
		this.clearAttendance();
	}

	/**
	 * Migrate legacy localStorage data into the new storage system.
	 *
	 * @example
	 * await storage.migrateFromLegacyStorage();
	 */
	async migrateFromLegacyStorage(): Promise<void> {
		logger.log('[Storage] Checking for legacy data to migrate...');

		const legacyDismissed = this._getSyncFallback<NotificationStorageData>(
			'educa_dismissed_notifications',
		);
		if (legacyDismissed) {
			await this.idb.setDismissedNotifications(legacyDismissed);
			logger.log('[Storage] Migrated dismissed notifications to IndexedDB');
		}

		const legacyRead = this._getSyncFallback<NotificationStorageData>(
			'educa_read_notifications',
		);
		if (legacyRead) {
			await this.idb.setReadNotifications(legacyRead);
			logger.log('[Storage] Migrated read notifications to IndexedDB');
		}

		logger.log('[Storage] Migration complete');
	}

	// #endregion
	// #region SYNC FALLBACKS FOR COMPATIBILITY
	/**
	 * Read from localStorage when IndexedDB is not available.
	 *
	 * @param key Storage key.
	 * @returns Parsed value or null.
	 * @example
	 * const data = this._getSyncFallback('educa_read_notifications');
	 */
	private _getSyncFallback<T>(key: string): T | null {
		try {
			const value = localStorage.getItem(key);
			return value ? JSON.parse(value) : null;
		} catch {
			return null;
		}
	}

	/**
	 * Write to localStorage as a sync fallback.
	 *
	 * @param key Storage key.
	 * @param value Value to store.
	 * @example
	 * this._setSyncFallback('educa_read_notifications', { ids: [1] });
	 */
	private _setSyncFallback<T>(key: string, value: T): void {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch (e) {
			logger.error(`[Storage] Fallback set error for ${key}:`, e);
		}
	}

	/**
	 * Remove a sync fallback key from localStorage.
	 *
	 * @param key Storage key.
	 * @example
	 * this._removeSyncFallback('educa_read_notifications');
	 */
	private _removeSyncFallback(key: string): void {
		try {
			localStorage.removeItem(key);
		} catch {
		}
	}
	// #endregion
}

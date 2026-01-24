import { Injectable, inject } from '@angular/core';
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
 * StorageService - Facade que coordina los diferentes tipos de almacenamiento
 *
 * Este servicio actúa como punto de entrada único para el almacenamiento,
 * delegando a los servicios especializados según el tipo de dato:
 *
 * - SessionStorageService: Auth, estado de UI temporal
 * - PreferencesStorageService: Preferencias de usuario persistentes
 * - IndexedDBService: Datos complejos (notificaciones) - async
 *
 * Mantiene compatibilidad con la API existente mientras usa el storage apropiado.
 */
@Injectable({
	providedIn: 'root',
})
export class StorageService {
	private session = inject(SessionStorageService);
	private preferences = inject(PreferencesStorageService);
	private idb = inject(IndexedDBService);

	// ============================================
	// AUTH - Delegado a SessionStorage
	// (más seguro que localStorage para tokens)
	// ============================================

	getToken(): string | null {
		return this.session.getToken();
	}

	setToken(token: string, rememberMe = false, nombreCompleto?: string, rol?: string): void {
		this.session.setToken(token, rememberMe, nombreCompleto, rol);
	}

	removeToken(): void {
		this.session.removeToken();
	}

	hasToken(): boolean {
		return this.session.hasToken();
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

	getRememberToken(): string | null {
		return this.session.getRememberToken();
	}

	clearRememberToken(): void {
		this.session.clearRememberToken();
	}

	getAllPersistentTokens(): { token: string; sessionKey: string }[] {
		return this.session.getAllPersistentTokens();
	}

	// ============================================
	// PERMISOS - Delegado a SessionStorage
	// (permisos del usuario por sesión)
	// ============================================

	getPermisos(): PermisosStorageData | null {
		return this.session.getPermisos();
	}

	setPermisos(permisos: PermisosStorageData): void {
		this.session.setPermisos(permisos);
	}

	clearPermisos(): void {
		this.session.clearPermisos();
	}

	// ============================================
	// NOTIFICATIONS - Delegado a IndexedDB (async)
	// Con fallback síncrono para compatibilidad
	// ============================================

	/**
	 * @deprecated Usar getDismissedNotificationsAsync para mejor rendimiento
	 */
	getDismissedNotifications(): NotificationStorageData | null {
		// Fallback síncrono para compatibilidad
		return this._getSyncFallback<NotificationStorageData>('educa_dismissed_notifications');
	}

	async getDismissedNotificationsAsync(): Promise<NotificationStorageData | null> {
		const data = await this.idb.getDismissedNotifications();
		if (data) return data;
		// Fallback a localStorage si IDB falla
		return this._getSyncFallback<NotificationStorageData>('educa_dismissed_notifications');
	}

	/**
	 * @deprecated Usar setDismissedNotificationsAsync para mejor rendimiento
	 */
	setDismissedNotifications(data: NotificationStorageData): void {
		// Guardar en ambos para migración gradual
		this._setSyncFallback('educa_dismissed_notifications', data);
		this.idb.setDismissedNotifications(data);
	}

	async setDismissedNotificationsAsync(data: NotificationStorageData): Promise<void> {
		await this.idb.setDismissedNotifications(data);
	}

	removeDismissedNotifications(): void {
		this._removeSyncFallback('educa_dismissed_notifications');
		this.idb.removeDismissedNotifications();
	}

	/**
	 * @deprecated Usar getReadNotificationsAsync para mejor rendimiento
	 */
	getReadNotifications(): NotificationStorageData | null {
		return this._getSyncFallback<NotificationStorageData>('educa_read_notifications');
	}

	async getReadNotificationsAsync(): Promise<NotificationStorageData | null> {
		const data = await this.idb.getReadNotifications();
		if (data) return data;
		return this._getSyncFallback<NotificationStorageData>('educa_read_notifications');
	}

	/**
	 * @deprecated Usar setReadNotificationsAsync para mejor rendimiento
	 */
	setReadNotifications(data: NotificationStorageData): void {
		this._setSyncFallback('educa_read_notifications', data);
		this.idb.setReadNotifications(data);
	}

	async setReadNotificationsAsync(data: NotificationStorageData): Promise<void> {
		await this.idb.setReadNotifications(data);
	}

	removeReadNotifications(): void {
		this._removeSyncFallback('educa_read_notifications');
		this.idb.removeReadNotifications();
	}

	getLastNotificationCheck(): string | null {
		return this.session.getLastNotificationCheck();
	}

	setLastNotificationCheck(date: string): void {
		this.session.setLastNotificationCheck(date);
	}

	clearNotifications(): void {
		this._removeSyncFallback('educa_dismissed_notifications');
		this._removeSyncFallback('educa_read_notifications');
		this.idb.clearNotifications();
	}

	// ============================================
	// SCHEDULE - Delegado a SessionStorage
	// (estado temporal de UI por pestaña)
	// ============================================

	getScheduleModalsState(): ScheduleModalsState {
		return this.session.getScheduleModalsState();
	}

	setScheduleModalsState(state: ScheduleModalsState): void {
		this.session.setScheduleModalsState(state);
	}

	updateScheduleModalState(
		modal: keyof ScheduleModalsState,
		value: boolean | { visible: boolean; course: string },
	): void {
		this.session.updateScheduleModalState(modal, value);
	}

	clearScheduleModalsState(): void {
		this.session.clearScheduleModalsState();
	}

	// ============================================
	// ATTENDANCE - Delegado a PreferencesStorage
	// (preferencias persistentes del usuario)
	// ============================================

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

	clearAttendance(): void {
		this.preferences.clearAttendancePreferences();
	}

	// ============================================
	// UTILIDADES GENERALES
	// ============================================

	clearAll(): void {
		this.clearAuth();
		this.clearPermisos();
		this.clearNotifications();
		this.clearScheduleModalsState();
		this.clearAttendance();
	}

	/**
	 * Migra datos del localStorage antiguo al nuevo sistema de storage
	 * Llamar una vez al iniciar la app para migrar datos existentes
	 */
	async migrateFromLegacyStorage(): Promise<void> {
		logger.log('[Storage] Checking for legacy data to migrate...');

		// Migrar notificaciones a IndexedDB
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

	// ============================================
	// Fallbacks síncronos para compatibilidad
	// ============================================

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
			// Ignorar errores
		}
	}
}

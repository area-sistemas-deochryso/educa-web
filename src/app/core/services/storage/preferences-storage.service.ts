import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { logger } from '@app/core/helpers';
import { AttendanceMonthData } from './storage.models';

/**
 * PreferencesStorageService - Para preferencias de usuario que deben persistir
 *
 * Ideal para:
 * - Preferencias de usuario (tema, idioma, configuraciones)
 * - Selecciones que deben recordarse entre sesiones
 * - Datos pequeños que no son sensibles
 *
 * Usa localStorage porque:
 * - Las preferencias deben persistir al cerrar el navegador
 * - Se comparten entre pestañas (consistencia de preferencias)
 * - Son datos no sensibles
 */

const PREFERENCES_KEYS = {
	// Attendance preferences
	ATTENDANCE_MONTH: 'educa_pref_attendance_month',
	SELECTED_HIJO: 'educa_pref_selected_hijo',
	SELECTED_SALON: 'educa_pref_selected_salon',
	SELECTED_ESTUDIANTE: 'educa_pref_selected_estudiante',
	// Director attendance preferences
	SELECTED_GRADO_SECCION_DIRECTOR: 'educa_pref_selected_grado_seccion_director',
	SELECTED_ESTUDIANTE_DIRECTOR: 'educa_pref_selected_estudiante_director',

	// UI Preferences
	THEME: 'educa_pref_theme',
	SIDEBAR_COLLAPSED: 'educa_pref_sidebar_collapsed',
	NOTIFICATIONS_SOUND: 'educa_pref_notif_sound',
} as const;

export type ThemePreference = 'light' | 'dark' | 'system';

export interface GradoSeccionPref {
	grado: string;
	seccion: string;
}

@Injectable({
	providedIn: 'root',
})
export class PreferencesStorageService {
	private platformId = inject(PLATFORM_ID);

	private get isBrowser(): boolean {
		return isPlatformBrowser(this.platformId);
	}

	// ============================================
	// Métodos genéricos privados
	// ============================================

	private getItem(key: string): string | null {
		if (!this.isBrowser) return null;
		return localStorage.getItem(key);
	}

	private setItem(key: string, value: string): void {
		if (!this.isBrowser) return;
		localStorage.setItem(key, value);
	}

	private removeItem(key: string): void {
		if (!this.isBrowser) return;
		localStorage.removeItem(key);
	}

	private getJSON<T>(key: string): T | null {
		try {
			const value = this.getItem(key);
			return value ? JSON.parse(value) : null;
		} catch (e) {
			logger.error(`[Preferences] Error parsing JSON for key ${key}:`, e);
			return null;
		}
	}

	private setJSON<T>(key: string, value: T): void {
		try {
			this.setItem(key, JSON.stringify(value));
		} catch (e) {
			logger.error(`[Preferences] Error stringifying JSON for key ${key}:`, e);
		}
	}

	// ============================================
	// ATTENDANCE - Preferencias de asistencia
	// ============================================

	getAttendanceMonth(): AttendanceMonthData | null {
		return this.getJSON<AttendanceMonthData>(PREFERENCES_KEYS.ATTENDANCE_MONTH);
	}

	setAttendanceMonth(data: AttendanceMonthData): void {
		this.setJSON(PREFERENCES_KEYS.ATTENDANCE_MONTH, data);
	}

	clearAttendanceMonth(): void {
		this.removeItem(PREFERENCES_KEYS.ATTENDANCE_MONTH);
	}

	getSelectedHijoId(): number | null {
		const value = this.getItem(PREFERENCES_KEYS.SELECTED_HIJO);
		return value ? parseInt(value, 10) : null;
	}

	setSelectedHijoId(id: number): void {
		this.setItem(PREFERENCES_KEYS.SELECTED_HIJO, id.toString());
	}

	clearSelectedHijoId(): void {
		this.removeItem(PREFERENCES_KEYS.SELECTED_HIJO);
	}

	getSelectedSalonId(): number | null {
		const value = this.getItem(PREFERENCES_KEYS.SELECTED_SALON);
		return value ? parseInt(value, 10) : null;
	}

	setSelectedSalonId(id: number): void {
		this.setItem(PREFERENCES_KEYS.SELECTED_SALON, id.toString());
	}

	clearSelectedSalonId(): void {
		this.removeItem(PREFERENCES_KEYS.SELECTED_SALON);
	}

	getSelectedEstudianteId(): number | null {
		const value = this.getItem(PREFERENCES_KEYS.SELECTED_ESTUDIANTE);
		return value ? parseInt(value, 10) : null;
	}

	setSelectedEstudianteId(id: number): void {
		this.setItem(PREFERENCES_KEYS.SELECTED_ESTUDIANTE, id.toString());
	}

	clearSelectedEstudianteId(): void {
		this.removeItem(PREFERENCES_KEYS.SELECTED_ESTUDIANTE);
	}

	// Director preferences
	getSelectedGradoSeccionDirector(): GradoSeccionPref | null {
		return this.getJSON<GradoSeccionPref>(PREFERENCES_KEYS.SELECTED_GRADO_SECCION_DIRECTOR);
	}

	setSelectedGradoSeccionDirector(gs: GradoSeccionPref): void {
		this.setJSON(PREFERENCES_KEYS.SELECTED_GRADO_SECCION_DIRECTOR, gs);
	}

	clearSelectedGradoSeccionDirector(): void {
		this.removeItem(PREFERENCES_KEYS.SELECTED_GRADO_SECCION_DIRECTOR);
	}

	getSelectedEstudianteDirectorId(): number | null {
		const value = this.getItem(PREFERENCES_KEYS.SELECTED_ESTUDIANTE_DIRECTOR);
		return value ? parseInt(value, 10) : null;
	}

	setSelectedEstudianteDirectorId(id: number): void {
		this.setItem(PREFERENCES_KEYS.SELECTED_ESTUDIANTE_DIRECTOR, id.toString());
	}

	clearSelectedEstudianteDirectorId(): void {
		this.removeItem(PREFERENCES_KEYS.SELECTED_ESTUDIANTE_DIRECTOR);
	}

	clearAttendancePreferences(): void {
		this.clearAttendanceMonth();
		this.clearSelectedHijoId();
		this.clearSelectedSalonId();
		this.clearSelectedEstudianteId();
		this.clearSelectedGradoSeccionDirector();
		this.clearSelectedEstudianteDirectorId();
	}

	// ============================================
	// UI PREFERENCES - Preferencias de interfaz
	// ============================================

	getTheme(): ThemePreference {
		return (this.getItem(PREFERENCES_KEYS.THEME) as ThemePreference) || 'system';
	}

	setTheme(theme: ThemePreference): void {
		this.setItem(PREFERENCES_KEYS.THEME, theme);
	}

	getSidebarCollapsed(): boolean {
		return this.getItem(PREFERENCES_KEYS.SIDEBAR_COLLAPSED) === 'true';
	}

	setSidebarCollapsed(collapsed: boolean): void {
		this.setItem(PREFERENCES_KEYS.SIDEBAR_COLLAPSED, collapsed.toString());
	}

	getNotificationsSoundEnabled(): boolean {
		const value = this.getItem(PREFERENCES_KEYS.NOTIFICATIONS_SOUND);
		return value === null ? true : value === 'true'; // Default: enabled
	}

	setNotificationsSoundEnabled(enabled: boolean): void {
		this.setItem(PREFERENCES_KEYS.NOTIFICATIONS_SOUND, enabled.toString());
	}

	// ============================================
	// UTILIDADES
	// ============================================

	clearAll(): void {
		this.clearAttendancePreferences();
		this.removeItem(PREFERENCES_KEYS.THEME);
		this.removeItem(PREFERENCES_KEYS.SIDEBAR_COLLAPSED);
		this.removeItem(PREFERENCES_KEYS.NOTIFICATIONS_SOUND);
	}
}

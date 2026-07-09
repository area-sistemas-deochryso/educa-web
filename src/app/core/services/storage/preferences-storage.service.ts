import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { logger } from '@app/core/helpers';
import { AttendanceMonthData } from './storage.models';
import { SessionStorageService } from './session-storage.service';

/**
 * Preferences storage for user settings that must persist across sessions.
 *
 * This service uses localStorage because preferences are not sensitive
 * and should be shared across tabs and browser restarts.
 *
 * @example
 * prefs.setTheme('system');
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

	// UI preferences
	THEME: 'educa_pref_theme',
	SIDEBAR_COLLAPSED: 'educa_pref_sidebar_collapsed',
	NOTIFICATIONS_SOUND: 'educa_pref_notif_sound',

	// Quick access favorites
	FAVORITE_ROUTES: 'educa_pref_favorite_routes',

	// Plan 22 Chat B — throttle status widget
	THROTTLE_WIDGET_AUTO_REFRESH: 'educa_pref_throttle_widget_auto_refresh',
	THROTTLE_WIDGET_COLLAPSED: 'educa_pref_throttle_widget_collapsed',

	// Plan 22 Chat B / Plan 29 Chat 2.6 — defer/fail status widget
	DEFER_FAIL_WIDGET_AUTO_REFRESH: 'educa_pref_defer_fail_widget_auto_refresh',
	DEFER_FAIL_WIDGET_COLLAPSED: 'educa_pref_defer_fail_widget_collapsed',

	// Brief 386 — bandeja overview strip (stats + trend chart)
	OVERVIEW_WIDGET_COLLAPSED: 'educa_pref_email_outbox_overview_collapsed',

	// Plan 34 Chat 5 — error-groups view mode (kanban vs table)
	ERROR_GROUPS_VIEW_MODE: 'educa_pref_error_groups_view_mode',

	// Plan 41 F1 — correlation hub view mode (timeline vs section)
	CORRELATION_VIEW_MODE: 'educa_pref_correlation_view_mode',

	// Plan 41 Chat 11 — correlation hub auto-refresh opt-in
	CORRELATION_AUTO_REFRESH: 'educa_pref_correlation_auto_refresh',

	// Brief 102 — runtime health widget
	RUNTIME_HEALTH_WIDGET_AUTO_REFRESH: 'educa_pref_runtime_health_widget_auto_refresh',
	RUNTIME_HEALTH_WIDGET_COLLAPSED: 'educa_pref_runtime_health_widget_collapsed',
} as const;

export type ErrorGroupsViewMode = 'kanban' | 'table' | 'events';

export type CorrelationViewMode = 'timeline' | 'section';

/**
 * Theme preference for the UI.
 */
export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Grade and section preference.
 */
export interface GradoSeccionPref {
	grado: string;
	seccion: string;
}

@Injectable({
	providedIn: 'root',
})
export class PreferencesStorageService {
	private platformId = inject(PLATFORM_ID);
	private session = inject(SessionStorageService);

	/**
	 * True when running in the browser.
	 *
	 * @example
	 * if (!this.isBrowser) return;
	 */
	private get isBrowser(): boolean {
		return isPlatformBrowser(this.platformId);
	}

	/**
	 * Suffix that scopes a preference key to the logged-in user, so switching
	 * accounts on the same browser (multi-sesión) doesn't leak one user's
	 * favorites/prefs into another's.
	 *
	 * @example
	 * this.getItem(`${PREFERENCES_KEYS.FAVORITE_ROUTES}${this.userScope}`);
	 */
	private get userScope(): string {
		const user = this.session.getUser();
		return user ? `_${user.rol}_${user.entityId}` : '';
	}

	// #region PRIVATE GENERIC HELPERS

	/**
	 * Read a localStorage value by key.
	 *
	 * @param key Storage key.
	 * @returns String value or null.
	 * @example
	 * const raw = this.getItem('educa_pref_theme');
	 */
	private getItem(key: string): string | null {
		if (!this.isBrowser) return null;
		return localStorage.getItem(key);
	}

	/**
	 * Write a localStorage value by key.
	 *
	 * @param key Storage key.
	 * @param value String value.
	 * @example
	 * this.setItem('educa_pref_theme', 'dark');
	 */
	private setItem(key: string, value: string): void {
		if (!this.isBrowser) return;
		localStorage.setItem(key, value);
	}

	/**
	 * Remove a localStorage value by key.
	 *
	 * @param key Storage key.
	 * @example
	 * this.removeItem('educa_pref_theme');
	 */
	private removeItem(key: string): void {
		if (!this.isBrowser) return;
		localStorage.removeItem(key);
	}

	/**
	 * Read and parse JSON from localStorage.
	 *
	 * @param key Storage key.
	 * @returns Parsed value or null.
	 * @example
	 * const month = this.getJSON<AttendanceMonthData>('educa_pref_attendance_month');
	 */
	private getJSON<T>(key: string): T | null {
		try {
			const value = this.getItem(key);
			return value ? JSON.parse(value) : null;
		} catch (e) {
			logger.error(`[Preferences] Error parsing JSON for key ${key}:`, e);
			return null;
		}
	}

	/**
	 * Stringify and store JSON into localStorage.
	 *
	 * @param key Storage key.
	 * @param value Value to store.
	 * @example
	 * this.setJSON('educa_pref_attendance_month', { month: 6, year: 2025 });
	 */
	private setJSON<T>(key: string, value: T): void {
		try {
			this.setItem(key, JSON.stringify(value));
		} catch (e) {
			logger.error(`[Preferences] Error stringifying JSON for key ${key}:`, e);
		}
	}

	// #endregion
	// #region ATTENDANCE PREFERENCES

	/**
	 * Get selected attendance month and year.
	 *
	 * @returns Month and year data or null.
	 * @example
	 * const month = prefs.getAttendanceMonth();
	 */
	getAttendanceMonth(): AttendanceMonthData | null {
		return this.getJSON<AttendanceMonthData>(PREFERENCES_KEYS.ATTENDANCE_MONTH);
	}

	/**
	 * Store selected attendance month and year.
	 *
	 * @param data Month and year data.
	 * @example
	 * prefs.setAttendanceMonth({ month: 6, year: 2025 });
	 */
	setAttendanceMonth(data: AttendanceMonthData): void {
		this.setJSON(PREFERENCES_KEYS.ATTENDANCE_MONTH, data);
	}

	/**
	 * Clear attendance month selection.
	 *
	 * @example
	 * prefs.clearAttendanceMonth();
	 */
	clearAttendanceMonth(): void {
		this.removeItem(PREFERENCES_KEYS.ATTENDANCE_MONTH);
	}

	/**
	 * Get selected child id.
	 *
	 * @returns Child id or null.
	 * @example
	 * const id = prefs.getSelectedHijoId();
	 */
	getSelectedHijoId(): number | null {
		const value = this.getItem(PREFERENCES_KEYS.SELECTED_HIJO);
		return value ? parseInt(value, 10) : null;
	}

	/**
	 * Set selected child id.
	 *
	 * @param id Child id.
	 * @example
	 * prefs.setSelectedHijoId(123);
	 */
	setSelectedHijoId(id: number): void {
		this.setItem(PREFERENCES_KEYS.SELECTED_HIJO, id.toString());
	}

	/**
	 * Clear selected child id.
	 *
	 * @example
	 * prefs.clearSelectedHijoId();
	 */
	clearSelectedHijoId(): void {
		this.removeItem(PREFERENCES_KEYS.SELECTED_HIJO);
	}

	/**
	 * Get selected classroom id.
	 *
	 * @returns Classroom id or null.
	 * @example
	 * const id = prefs.getSelectedSalonId();
	 */
	getSelectedSalonId(): number | null {
		const value = this.getItem(PREFERENCES_KEYS.SELECTED_SALON);
		return value ? parseInt(value, 10) : null;
	}

	/**
	 * Set selected classroom id.
	 *
	 * @param id Classroom id.
	 * @example
	 * prefs.setSelectedSalonId(45);
	 */
	setSelectedSalonId(id: number): void {
		this.setItem(PREFERENCES_KEYS.SELECTED_SALON, id.toString());
	}

	/**
	 * Clear selected classroom id.
	 *
	 * @example
	 * prefs.clearSelectedSalonId();
	 */
	clearSelectedSalonId(): void {
		this.removeItem(PREFERENCES_KEYS.SELECTED_SALON);
	}

	/**
	 * Get selected student id.
	 *
	 * @returns Student id or null.
	 * @example
	 * const id = prefs.getSelectedEstudianteId();
	 */
	getSelectedEstudianteId(): number | null {
		const value = this.getItem(PREFERENCES_KEYS.SELECTED_ESTUDIANTE);
		return value ? parseInt(value, 10) : null;
	}

	/**
	 * Set selected student id.
	 *
	 * @param id Student id.
	 * @example
	 * prefs.setSelectedEstudianteId(77);
	 */
	setSelectedEstudianteId(id: number): void {
		this.setItem(PREFERENCES_KEYS.SELECTED_ESTUDIANTE, id.toString());
	}

	/**
	 * Clear selected student id.
	 *
	 * @example
	 * prefs.clearSelectedEstudianteId();
	 */
	clearSelectedEstudianteId(): void {
		this.removeItem(PREFERENCES_KEYS.SELECTED_ESTUDIANTE);
	}

	/**
	 * Get selected grade and section for director attendance.
	 *
	 * @returns Grade and section data or null.
	 * @example
	 * const gs = prefs.getSelectedGradoSeccionDirector();
	 */
	getSelectedGradoSeccionDirector(): GradoSeccionPref | null {
		return this.getJSON<GradoSeccionPref>(PREFERENCES_KEYS.SELECTED_GRADO_SECCION_DIRECTOR);
	}

	/**
	 * Set selected grade and section for director attendance.
	 *
	 * @param gs Grade and section data.
	 * @example
	 * prefs.setSelectedGradoSeccionDirector({ grado: '3', seccion: 'B' });
	 */
	setSelectedGradoSeccionDirector(gs: GradoSeccionPref): void {
		this.setJSON(PREFERENCES_KEYS.SELECTED_GRADO_SECCION_DIRECTOR, gs);
	}

	/**
	 * Clear selected grade and section for director attendance.
	 *
	 * @example
	 * prefs.clearSelectedGradoSeccionDirector();
	 */
	clearSelectedGradoSeccionDirector(): void {
		this.removeItem(PREFERENCES_KEYS.SELECTED_GRADO_SECCION_DIRECTOR);
	}

	/**
	 * Get selected student id for director attendance.
	 *
	 * @returns Student id or null.
	 * @example
	 * const id = prefs.getSelectedEstudianteDirectorId();
	 */
	getSelectedEstudianteDirectorId(): number | null {
		const value = this.getItem(PREFERENCES_KEYS.SELECTED_ESTUDIANTE_DIRECTOR);
		return value ? parseInt(value, 10) : null;
	}

	/**
	 * Set selected student id for director attendance.
	 *
	 * @param id Student id.
	 * @example
	 * prefs.setSelectedEstudianteDirectorId(88);
	 */
	setSelectedEstudianteDirectorId(id: number): void {
		this.setItem(PREFERENCES_KEYS.SELECTED_ESTUDIANTE_DIRECTOR, id.toString());
	}

	/**
	 * Clear selected student id for director attendance.
	 *
	 * @example
	 * prefs.clearSelectedEstudianteDirectorId();
	 */
	clearSelectedEstudianteDirectorId(): void {
		this.removeItem(PREFERENCES_KEYS.SELECTED_ESTUDIANTE_DIRECTOR);
	}

	/**
	 * Clear all attendance related preferences.
	 *
	 * @example
	 * prefs.clearAttendancePreferences();
	 */
	clearAttendancePreferences(): void {
		this.clearAttendanceMonth();
		this.clearSelectedHijoId();
		this.clearSelectedSalonId();
		this.clearSelectedEstudianteId();
		this.clearSelectedGradoSeccionDirector();
		this.clearSelectedEstudianteDirectorId();
	}

	// #endregion
	// #region UI PREFERENCES

	/**
	 * Get current theme preference.
	 *
	 * @returns Theme preference.
	 * @example
	 * const theme = prefs.getTheme();
	 */
	getTheme(): ThemePreference {
		return (this.getItem(PREFERENCES_KEYS.THEME) as ThemePreference) || 'system';
	}

	/**
	 * Set theme preference.
	 *
	 * @param theme Theme preference.
	 * @example
	 * prefs.setTheme('dark');
	 */
	setTheme(theme: ThemePreference): void {
		this.setItem(PREFERENCES_KEYS.THEME, theme);
	}

	/**
	 * Get sidebar collapsed preference.
	 *
	 * @returns True if collapsed.
	 * @example
	 * const collapsed = prefs.getSidebarCollapsed();
	 */
	getSidebarCollapsed(): boolean {
		return this.getItem(PREFERENCES_KEYS.SIDEBAR_COLLAPSED) === 'true';
	}

	/**
	 * Set sidebar collapsed preference.
	 *
	 * @param collapsed True to collapse.
	 * @example
	 * prefs.setSidebarCollapsed(true);
	 */
	setSidebarCollapsed(collapsed: boolean): void {
		this.setItem(PREFERENCES_KEYS.SIDEBAR_COLLAPSED, collapsed.toString());
	}

	/**
	 * Get notifications sound preference.
	 *
	 * @returns True if enabled.
	 * @example
	 * const enabled = prefs.getNotificationsSoundEnabled();
	 */
	getNotificationsSoundEnabled(): boolean {
		const value = this.getItem(PREFERENCES_KEYS.NOTIFICATIONS_SOUND);
		return value === null ? true : value === 'true';
	}

	/**
	 * Set notifications sound preference.
	 *
	 * @param enabled True to enable.
	 * @example
	 * prefs.setNotificationsSoundEnabled(false);
	 */
	setNotificationsSoundEnabled(enabled: boolean): void {
		this.setItem(PREFERENCES_KEYS.NOTIFICATIONS_SOUND, enabled.toString());
	}

	// #endregion
	// #region QUICK ACCESS FAVORITES

	getFavoriteRoutes(): string[] {
		return this.getJSON<string[]>(PREFERENCES_KEYS.FAVORITE_ROUTES + this.userScope) ?? [];
	}

	setFavoriteRoutes(routes: string[]): void {
		this.setJSON(PREFERENCES_KEYS.FAVORITE_ROUTES + this.userScope, routes);
	}

	// #endregion
	// #region THROTTLE STATUS WIDGET (Plan 22 Chat B)

	/**
	 * Whether the throttle status widget auto-refreshes every 30 seconds.
	 * Defaults to false — el admin opta in conscientemente antes de disparar
	 * polling sobre un endpoint que toca BD.
	 */
	getThrottleWidgetAutoRefresh(): boolean {
		return this.getItem(PREFERENCES_KEYS.THROTTLE_WIDGET_AUTO_REFRESH) === 'true';
	}

	setThrottleWidgetAutoRefresh(enabled: boolean): void {
		this.setItem(PREFERENCES_KEYS.THROTTLE_WIDGET_AUTO_REFRESH, enabled.toString());
	}

	/**
	 * Whether the throttle status widget starts collapsed on page load.
	 * Defaults to true (collapsed) — brief 386: bandeja's actionable table was
	 * pushed 3-4 folds down by widgets defaulting to expanded.
	 */
	getThrottleWidgetCollapsed(): boolean {
		return this.getItem(PREFERENCES_KEYS.THROTTLE_WIDGET_COLLAPSED) !== 'false';
	}

	setThrottleWidgetCollapsed(collapsed: boolean): void {
		this.setItem(PREFERENCES_KEYS.THROTTLE_WIDGET_COLLAPSED, collapsed.toString());
	}

	// #endregion
	// #region DEFER/FAIL STATUS WIDGET (Plan 22 Chat B / Plan 29 Chat 2.6)

	/**
	 * Whether the defer/fail status widget auto-refreshes every 60 seconds.
	 * Defaults to false — el admin opta in conscientemente antes de disparar
	 * polling del endpoint agregador (EmailOutbox + EmailBlacklist por llamada).
	 */
	getDeferFailWidgetAutoRefresh(): boolean {
		return this.getItem(PREFERENCES_KEYS.DEFER_FAIL_WIDGET_AUTO_REFRESH) === 'true';
	}

	setDeferFailWidgetAutoRefresh(enabled: boolean): void {
		this.setItem(PREFERENCES_KEYS.DEFER_FAIL_WIDGET_AUTO_REFRESH, enabled.toString());
	}

	/**
	 * Whether the defer/fail widget starts collapsed on page load.
	 * Defaults to true (collapsed) — brief 386: bandeja's actionable table was
	 * pushed 3-4 folds down by widgets defaulting to expanded.
	 */
	getDeferFailWidgetCollapsed(): boolean {
		return this.getItem(PREFERENCES_KEYS.DEFER_FAIL_WIDGET_COLLAPSED) !== 'false';
	}

	setDeferFailWidgetCollapsed(collapsed: boolean): void {
		this.setItem(PREFERENCES_KEYS.DEFER_FAIL_WIDGET_COLLAPSED, collapsed.toString());
	}

	// #endregion
	// #region OVERVIEW STRIP — stats + trend chart (brief 386)

	/**
	 * Whether the stats+trend overview strip starts collapsed on page load.
	 * Defaults to true (collapsed) — same rationale as throttle/defer-fail above.
	 */
	getOverviewWidgetCollapsed(): boolean {
		return this.getItem(PREFERENCES_KEYS.OVERVIEW_WIDGET_COLLAPSED) !== 'false';
	}

	setOverviewWidgetCollapsed(collapsed: boolean): void {
		this.setItem(PREFERENCES_KEYS.OVERVIEW_WIDGET_COLLAPSED, collapsed.toString());
	}

	// #endregion
	// #region RUNTIME HEALTH WIDGET (brief 102)

	getRuntimeHealthWidgetAutoRefresh(): boolean {
		// Default true — el panel sirve mejor con polling activo (60s, snapshot cacheado 10s en BE).
		const stored = this.getItem(PREFERENCES_KEYS.RUNTIME_HEALTH_WIDGET_AUTO_REFRESH);
		return stored === null ? true : stored === 'true';
	}

	setRuntimeHealthWidgetAutoRefresh(enabled: boolean): void {
		this.setItem(PREFERENCES_KEYS.RUNTIME_HEALTH_WIDGET_AUTO_REFRESH, enabled.toString());
	}

	getRuntimeHealthWidgetCollapsed(): boolean {
		return this.getItem(PREFERENCES_KEYS.RUNTIME_HEALTH_WIDGET_COLLAPSED) === 'true';
	}

	setRuntimeHealthWidgetCollapsed(collapsed: boolean): void {
		this.setItem(PREFERENCES_KEYS.RUNTIME_HEALTH_WIDGET_COLLAPSED, collapsed.toString());
	}

	// #endregion
	// #region ERROR GROUPS VIEW MODE (Plan 34 Chat 5)

	/**
	 * View mode for the admin "error-groups" page (kanban vs table).
	 * Defaults to 'kanban' first time — el admin entra al Kanban directo.
	 */
	getErrorGroupsViewMode(): ErrorGroupsViewMode {
		const stored = this.getItem(PREFERENCES_KEYS.ERROR_GROUPS_VIEW_MODE);
		return stored === 'table' ? 'table' : 'kanban';
	}

	setErrorGroupsViewMode(mode: ErrorGroupsViewMode): void {
		this.setItem(PREFERENCES_KEYS.ERROR_GROUPS_VIEW_MODE, mode);
	}

	// #endregion
	// #region CORRELATION HUB VIEW MODE (Plan 41 F1)

	/**
	 * View mode for the admin "correlation" hub (timeline vs section).
	 * Defaults to 'timeline' first time — la vista cronológica unificada
	 * resuelve la brecha #1 del Plan 41.
	 */
	getCorrelationViewMode(): CorrelationViewMode {
		const stored = this.getItem(PREFERENCES_KEYS.CORRELATION_VIEW_MODE);
		return stored === 'section' ? 'section' : 'timeline';
	}

	setCorrelationViewMode(mode: CorrelationViewMode): void {
		this.setItem(PREFERENCES_KEYS.CORRELATION_VIEW_MODE, mode);
	}

	// #endregion
	// #region CORRELATION HUB AUTO-REFRESH (Plan 41 Chat 11)

	/**
	 * Whether the correlation hub auto-refreshes the snapshot every 30 seconds.
	 * Default `false` — opt-in para admins que necesitan ver actualizaciones
	 * en vivo durante un incidente.
	 */
	getCorrelationAutoRefresh(): boolean {
		return this.getItem(PREFERENCES_KEYS.CORRELATION_AUTO_REFRESH) === 'true';
	}

	setCorrelationAutoRefresh(enabled: boolean): void {
		this.setItem(PREFERENCES_KEYS.CORRELATION_AUTO_REFRESH, enabled.toString());
	}

	// #endregion
	// #region UTILITIES

	/**
	 * Clear all stored preferences managed by this service.
	 *
	 * @example
	 * prefs.clearAll();
	 */
	clearAll(): void {
		this.clearAttendancePreferences();
		this.removeItem(PREFERENCES_KEYS.THEME);
		this.removeItem(PREFERENCES_KEYS.SIDEBAR_COLLAPSED);
		this.removeItem(PREFERENCES_KEYS.NOTIFICATIONS_SOUND);
		this.removeItem(PREFERENCES_KEYS.FAVORITE_ROUTES + this.userScope);
	}
	// #endregion
}

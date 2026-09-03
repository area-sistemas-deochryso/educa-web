import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { logger } from '@app/core/helpers';
import { QuickAccessLayout } from '@data/models';
import { AttendanceMonthData } from './storage.models';
import { SessionStorageService } from './session-storage.service';

/**
 * Preferences storage for user settings that must persist across sessions.
 *
 * This service uses localStorage because preferences are not sensitive
 * and should be shared across tabs and browser restarts.
 *
 * @example
 * prefs.setThemePreference('dark');
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
	// * Brief 523: key kept as `intranet-theme-mode` (not the `educa_pref_*`
	//   convention used elsewhere) per product decision — matches what a
	//   dev inspecting localStorage would expect to find.
	THEME: 'intranet-theme-mode',
	SIDEBAR_COLLAPSED: 'educa_pref_sidebar_collapsed',
	NOTIFICATIONS_SOUND: 'educa_pref_notif_sound',

	// Quick access favorites (legado, ver migración en getQuickAccessLayout)
	FAVORITE_ROUTES: 'educa_pref_favorite_routes',
	QUICK_ACCESS_LAYOUT: 'educa_pref_quick_access_layout',

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

	// Brief 485 — draggable "Ayuda" FAB position
	AYUDA_FAB_POSITION: 'educa_pref_ayuda_fab_position',

	// Fusión FAB Ayuda+Reportar — ocultar/mostrar manual
	FAB_MENU_HIDDEN: 'educa_pref_fab_menu_hidden',
} as const;

export type ErrorGroupsViewMode = 'kanban' | 'table' | 'events' | 'heatmap' | 'pareto';

const ERROR_GROUPS_VIEW_MODES: readonly ErrorGroupsViewMode[] = ['kanban', 'table', 'events', 'heatmap', 'pareto'];

export type CorrelationViewMode = 'timeline' | 'section';

/**
 * Explicit theme preference for the UI.
 *
 * There is no `'system'` value on purpose (brief 523): the absence of a
 * stored value already means "follow `prefers-color-scheme` live" — see
 * {@link PreferencesStorageService.getThemePreference}. Once the user
 * toggles manually, the choice freezes as one of these two.
 */
export type ThemePreference = 'light' | 'dark';

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
	 * Get the user's explicit theme preference, if any was ever set.
	 *
	 * `null` means the user never toggled manually — callers should follow
	 * `prefers-color-scheme` live instead of assuming a default.
	 *
	 * @returns 'light', 'dark', or null when no manual preference is stored.
	 * @example
	 * const pref = prefs.getThemePreference();
	 */
	getThemePreference(): ThemePreference | null {
		const stored = this.getItem(PREFERENCES_KEYS.THEME);
		return stored === 'light' || stored === 'dark' ? stored : null;
	}

	/**
	 * Store the user's explicit theme preference (set on manual toggle).
	 *
	 * @param theme Theme preference.
	 * @example
	 * prefs.setThemePreference('dark');
	 */
	setThemePreference(theme: ThemePreference): void {
		this.setItem(PREFERENCES_KEYS.THEME, theme);
	}

	/**
	 * Whether the user has an explicit theme preference stored, as opposed
	 * to following `prefers-color-scheme` live.
	 *
	 * @example
	 * if (!prefs.hasThemePreference()) { ... }
	 */
	hasThemePreference(): boolean {
		return this.getThemePreference() !== null;
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
	// #region QUICK ACCESS LAYOUT

	/** Migra el modelo legado (rutas favoritas simples) al layout nuevo, una sola vez. */
	getQuickAccessLayout(): QuickAccessLayout {
		const stored = this.getJSON<QuickAccessLayout>(PREFERENCES_KEYS.QUICK_ACCESS_LAYOUT + this.userScope);
		if (stored) return stored;

		const legacyRoutes = this.getJSON<string[]>(PREFERENCES_KEYS.FAVORITE_ROUTES + this.userScope) ?? [];
		if (legacyRoutes.length === 0) return { slots: [] };

		const migrated: QuickAccessLayout = {
			slots: legacyRoutes.map((route) => ({ kind: 'item', route, size: 'sm' })),
		};
		this.setQuickAccessLayout(migrated);
		this.removeItem(PREFERENCES_KEYS.FAVORITE_ROUTES + this.userScope);
		return migrated;
	}

	setQuickAccessLayout(layout: QuickAccessLayout): void {
		this.setJSON(PREFERENCES_KEYS.QUICK_ACCESS_LAYOUT + this.userScope, layout);
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
	 * View mode for the admin "error-groups" page (kanban/table/events/heatmap/pareto).
	 * Defaults to 'kanban' first time — el admin entra al Kanban directo.
	 */
	getErrorGroupsViewMode(): ErrorGroupsViewMode {
		const stored = this.getItem(PREFERENCES_KEYS.ERROR_GROUPS_VIEW_MODE) as ErrorGroupsViewMode | null;
		return stored && ERROR_GROUPS_VIEW_MODES.includes(stored) ? stored : 'kanban';
	}

	setErrorGroupsViewMode(mode: ErrorGroupsViewMode): void {
		this.setItem(PREFERENCES_KEYS.ERROR_GROUPS_VIEW_MODE, mode);
	}

	/**
	 * Brief 471 (P68 F9) — distingue "el usuario ya eligió una vista" de "cae
	 * al default 'kanban' de {@link getErrorGroupsViewMode}". Necesario para
	 * que la vista condicional por volumen (kanban/tabla según `totalCount`)
	 * solo se aplique la primera vez, sin pisar una preferencia explícita.
	 */
	hasErrorGroupsViewModePreference(): boolean {
		const stored = this.getItem(PREFERENCES_KEYS.ERROR_GROUPS_VIEW_MODE) as ErrorGroupsViewMode | null;
		return !!stored && ERROR_GROUPS_VIEW_MODES.includes(stored);
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
	// #region AYUDA FAB POSITION (Brief 485)

	/** Offset (px) del FAB "Ayuda" respecto de su posición por defecto (bottom-left). `null` si nunca se arrastró. */
	getAyudaFabPosition(): { x: number; y: number } | null {
		return this.getJSON<{ x: number; y: number }>(PREFERENCES_KEYS.AYUDA_FAB_POSITION);
	}

	setAyudaFabPosition(position: { x: number; y: number }): void {
		this.setJSON(PREFERENCES_KEYS.AYUDA_FAB_POSITION, position);
	}

	// #endregion
	// #region FAB MENU HIDDEN (fusión Ayuda+Reportar)

	/** Si el usuario ocultó manualmente el FAB de Ayuda/Reportar. Default false. */
	getFabMenuHidden(): boolean {
		return this.getItem(PREFERENCES_KEYS.FAB_MENU_HIDDEN) === 'true';
	}

	setFabMenuHidden(hidden: boolean): void {
		this.setItem(PREFERENCES_KEYS.FAB_MENU_HIDDEN, hidden.toString());
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
		this.removeItem(PREFERENCES_KEYS.QUICK_ACCESS_LAYOUT + this.userScope);
	}
	// #endregion
}

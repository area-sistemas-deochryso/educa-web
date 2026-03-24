// #region Imports
import { AuthUser } from '../auth/auth.models';
import { AppUserRoleValue } from '@app/shared/constants';

/**
 * Storage models for local and session persisted data.
 */
// #endregion
// #region Implementation

/**
 * UI modal state for schedule screens.
 */
export interface ScheduleModalsState {
	/** Schedule modal visibility. */
	schedule?: boolean;
	/** Summary modal visibility. */
	summary?: boolean;
	/** Details modal state. */
	details?: { visible: boolean; course: string };
	/** Grades modal state. */
	grades?: { visible: boolean; course: string };
}

/**
 * Notification ids with a stored date.
 */
export interface NotificationStorageData {
	/** Notification id list. */
	ids: string[];
	/** ISO date string. */
	date: string;
}

/**
 * Selected attendance month and year.
 */
export interface AttendanceMonthData {
	/** Month number (1-12). */
	month: number;
	/** Year number. */
	year: number;
}

/**
 * Permissions data stored for a user.
 */
export interface PermisosStorageData {
	/** User id. */
	usuarioId: number;
	/** Role name. */
	rol: AppUserRoleValue;
	/** Allowed view keys. */
	vistasPermitidas: string[];
	/** True when permissions are customized. */
	tienePermisosPersonalizados: boolean;
	/** JWT token that encodes permissions expiration. */
	permisosToken?: string;
}

/** Re-export AuthUser for convenience. */
export type { AuthUser };
// #endregion

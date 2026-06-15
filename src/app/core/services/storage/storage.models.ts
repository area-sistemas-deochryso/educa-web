// #region Imports
import { AuthUser } from '../auth/auth.models';

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
 * Permissions data stored for a user (capabilities format).
 */
export interface PermisosStorageData {
	/** Effective capability codes from BE. */
	capabilities: string[];
	/** Epoch ms when capabilities were fetched — used for TTL refresh. */
	timestamp: number;
}

/** Re-export AuthUser for convenience. */
export type { AuthUser };
// #endregion

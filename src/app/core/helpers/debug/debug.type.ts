// debug.types.ts
// * Types and DI token for the debug logger configuration.

// #region Imports
import { InjectionToken } from '@angular/core';

// #endregion
// #region Implementation
export type DbgLevel = 'ERROR' | 'WARN' | 'INFO' | 'TRACE';

export interface DebugConfig {
	/**
	 * Enable logging only when isDevMode() is true.
	 */
	enabled?: boolean;

	/**
	 * Minimum level to print. Default is INFO.
	 */
	minLevel?: DbgLevel;

	/**
	 * Default pattern if localStorage.DEBUG is not set.
	 * Example: "KARDEX*,UI:*,-UI:Noisy*".
	 */
	defaultPattern?: string;

	/**
	 * localStorage key for the pattern. Default is DEBUG.
	 */
	storageKey?: string;

	/**
	 * localStorage key for the minimum level. Default is DEBUG_LEVEL.
	 */
	storageLevelKey?: string;

	/**
	 * When true, include stack traces in TRACE level.
	 */
	enableStackInTrace?: boolean;
}

export const DEBUG_CONFIG = new InjectionToken<DebugConfig>('DEBUG_CONFIG');
// #endregion

// debug.types.ts
// * Types + DI token for the debug logger configuration.

// #region Imports
import { InjectionToken } from '@angular/core';

// #endregion
// #region Implementation
export type DbgLevel = 'ERROR' | 'WARN' | 'INFO' | 'TRACE';

export interface DebugConfig {
	/** Aun con true, igual se exige isDevMode() */
	enabled?: boolean;

	/** Nivel mÃƒÆ’Ã‚Â­nimo a imprimir. Default: 'INFO' */
	minLevel?: DbgLevel;

	/**
	 * PatrÃƒÆ’Ã‚Â³n por defecto si no hay localStorage.DEBUG.
	 * Ej: "KARDEX*,UI:*,-UI:Noisy*"
	 */
	defaultPattern?: string;

	/** Key de localStorage (default "DEBUG") */
	storageKey?: string;

	/** Key de localStorage para el nivel mÃƒÆ’Ã‚Â­nimo (default "DEBUG_LEVEL") */
	storageLevelKey?: string;

	/** Si true, agrega stack en TRACE (mÃƒÆ’Ã‚Â¡s costo) */
	enableStackInTrace?: boolean;
}

export const DEBUG_CONFIG = new InjectionToken<DebugConfig>('DEBUG_CONFIG');
// #endregion

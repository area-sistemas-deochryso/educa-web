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

	/** Nivel mínimo a imprimir. Default: 'INFO' */
	minLevel?: DbgLevel;

	/**
	 * Patrón por defecto si no hay localStorage.DEBUG.
	 * Ej: "KARDEX*,UI:*,-UI:Noisy*"
	 */
	defaultPattern?: string;

	/** Key de localStorage (default "DEBUG") */
	storageKey?: string;

	/** Key de localStorage para el nivel mínimo (default "DEBUG_LEVEL") */
	storageLevelKey?: string;

	/** Si true, agrega stack en TRACE (más costo) */
	enableStackInTrace?: boolean;
}

export const DEBUG_CONFIG = new InjectionToken<DebugConfig>('DEBUG_CONFIG');
// #endregion

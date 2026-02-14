import { Injectable, computed, signal } from '@angular/core';
import type { LogLevel } from '../logs/logger';
import type { DbgLevel } from '../debug/debug.type';

export interface LoggingConfigSnapshot {
	isDev: boolean;
	log: {
		enabled: boolean;
		minLevel: LogLevel;
		filter: string;
	};
	debug: {
		enabled: boolean;
		minLevel: DbgLevel;
		filter: string;
	};
}

/**
 * Store centralizado de configuracion para logging y debug.
 * Solo mantiene estado y provee un view model para UI.
 */
@Injectable({ providedIn: 'root' })
export class LoggingConfigStore {
	// #region Estado privado
	private readonly _isDev = signal(false);
	private readonly _logEnabled = signal(false);
	private readonly _logMinLevel = signal<LogLevel>('debug');
	private readonly _logFilter = signal('');
	private readonly _debugEnabled = signal(false);
	private readonly _debugMinLevel = signal<DbgLevel>('INFO');
	private readonly _debugFilter = signal('');

	// #endregion
	// #region Lecturas publicas (readonly)
	readonly isDev = this._isDev.asReadonly();
	readonly logEnabled = this._logEnabled.asReadonly();
	readonly logMinLevel = this._logMinLevel.asReadonly();
	readonly logFilter = this._logFilter.asReadonly();
	readonly debugEnabled = this._debugEnabled.asReadonly();
	readonly debugMinLevel = this._debugMinLevel.asReadonly();
	readonly debugFilter = this._debugFilter.asReadonly();

	/**
	 * ViewModel consolidado para consumir en UI.
	 */
	readonly vm = computed(() => ({
		isDev: this._isDev(),
		log: {
			enabled: this._logEnabled(),
			minLevel: this._logMinLevel(),
			filter: this._logFilter(),
		},
		debug: {
			enabled: this._debugEnabled(),
			minLevel: this._debugMinLevel(),
			filter: this._debugFilter(),
		},
	}));

	// #endregion
	// #region Mutaciones

	/**
	 * Set de snapshot completo, ideal para inicializar o refrescar.
	 */
	setSnapshot(snapshot: LoggingConfigSnapshot): void {
		this._isDev.set(snapshot.isDev);
		this._logEnabled.set(snapshot.log.enabled);
		this._logMinLevel.set(snapshot.log.minLevel);
		this._logFilter.set(snapshot.log.filter);
		this._debugEnabled.set(snapshot.debug.enabled);
		this._debugMinLevel.set(snapshot.debug.minLevel);
		this._debugFilter.set(snapshot.debug.filter);
	}

	setIsDev(isDev: boolean): void {
		this._isDev.set(isDev);
	}

	setLogEnabled(enabled: boolean): void {
		this._logEnabled.set(enabled);
	}

	setLogMinLevel(level: LogLevel): void {
		this._logMinLevel.set(level);
	}

	setLogFilter(pattern: string): void {
		this._logFilter.set(pattern);
	}

	setDebugEnabled(enabled: boolean): void {
		this._debugEnabled.set(enabled);
	}

	setDebugMinLevel(level: DbgLevel): void {
		this._debugMinLevel.set(level);
	}

	setDebugFilter(pattern: string): void {
		this._debugFilter.set(pattern);
	}
	// #endregion
}

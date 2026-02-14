// #region Imports
import { Injectable, inject, isDevMode } from '@angular/core';
import { environment } from '@config';
import { logger, type LogLevel } from '../logs/logger';
import { DebugService } from '../debug/debug.service';
import type { DbgLevel } from '../debug/debug.type';
import { LoggingConfigStore } from './logging.store';

/**
 * Facade para centralizar logging y debug en un solo punto.
 * Aplica configuracion a logger + DebugService y mantiene el store sincronizado.
 */
// #endregion
// #region Implementation
@Injectable({ providedIn: 'root' })
export class LoggingFacade {
	private readonly store = inject(LoggingConfigStore);
	private readonly debug = inject(DebugService);

	/**
	 * ViewModel para UI. Contiene el estado actual de configuracion.
	 */
	readonly vm = this.store.vm;

	constructor() {
		this.refresh();
	}

	/**
	 * Re-lee la configuracion actual desde logger y DebugService.
	 */
	refresh(): void {
		const logCfg = logger.getConfig();
		const dbgCfg = this.debug.getConfig();
		const isDev = isDevMode() && !environment.production;

		this.store.setSnapshot({
			isDev,
			log: {
				enabled: logCfg.enabled,
				minLevel: logCfg.activeMinLevel,
				filter: logCfg.activePattern,
			},
			debug: {
				enabled: dbgCfg.enabled,
				minLevel: dbgCfg.activeMinLevel,
				filter: dbgCfg.activePattern,
			},
		});
	}

	// ---------------- Logger ----------------
	setLogEnabled(enabled: boolean): void {
		logger.setEnabled(enabled);
		this.store.setLogEnabled(enabled);
	}

	setLogFilter(pattern: string, persist = true): void {
		const normalized = (pattern ?? '').trim();
		logger.setFilter(normalized, persist);
		this.store.setLogFilter(normalized);
	}

	setLogMinLevel(level: LogLevel, persist = true): void {
		logger.setMinLevel(level, persist);
		this.store.setLogMinLevel(level);
	}

	// ---------------- DebugService ----------------
	setDebugEnabled(enabled: boolean): void {
		this.debug.setEnabled(enabled);
		this.store.setDebugEnabled(enabled);
	}

	setDebugFilter(pattern: string, persist = true): void {
		const normalized = (pattern ?? '').trim();
		this.debug.setFilter(normalized, persist);
		this.store.setDebugFilter(normalized);
	}

	setDebugMinLevel(level: DbgLevel, persist = true): void {
		this.debug.setMinLevel(level, persist);
		this.store.setDebugMinLevel(level);
	}

	// ---------------- Shared helpers ----------------
	/**
	 * Habilita o deshabilita logger y debug al mismo tiempo.
	 */
	setAllEnabled(enabled: boolean): void {
		this.setLogEnabled(enabled);
		this.setDebugEnabled(enabled);
	}

	/**
	 * Limpia overrides persistidos y refresca el estado.
	 */
	clearOverrides(): void {
		logger.clearOverrides();
		this.debug.clearOverrides();
		this.refresh();
	}
}
// #endregion

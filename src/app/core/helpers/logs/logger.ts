// #region Imports
import { isDevMode } from '@angular/core';
import { environment } from '@config';
import {
	compileDebugFilter,
	safeGetLocalStorage,
	safeRemoveLocalStorage,
	safeSetLocalStorage,
} from '../debug/debug.filter';

// #endregion
// #region Implementation
export type LogLevel = 'log' | 'warn' | 'error' | 'info' | 'debug';

export interface LoggerConfig {
	/** Aun con true, igual se exige isDevMode() */
	enabled?: boolean;

	/** Nivel minimo a imprimir. Default: 'debug' */
	minLevel?: LogLevel;

	/**
	 * Patron por defecto si no hay localStorage.LOG.
	 * Ej: "AUTH*,UI:*,-UI:Noisy*"
	 */
	defaultPattern?: string;

	/** Key de localStorage (default "LOG") */
	storageKey?: string;

	/** Key de localStorage para el nivel minimo (default "LOG_LEVEL") */
	storageLevelKey?: string;
}

const DEFAULTS: Required<LoggerConfig> = {
	enabled: true,
	minLevel: 'debug',
	defaultPattern: '',
	storageKey: 'LOG',
	storageLevelKey: 'LOG_LEVEL',
};

const LEVEL_WEIGHT: Record<LogLevel, number> = {
	error: 0,
	warn: 1,
	info: 2,
	log: 2,
	debug: 3,
};

/**
 * Logger helper con filtro por tag y nivel.
 * Solo imprime en desarrollo (nunca en produccion).
 */
class Logger {
	private cfg: Required<LoggerConfig>;
	private filterFn: (tag: string) => boolean = () => true;
	private activePattern = '';
	private minLevel: LogLevel;

	constructor(cfg?: LoggerConfig) {
		this.cfg = { ...DEFAULTS, ...(cfg ?? {}) };
		this.minLevel = this.cfg.minLevel;
		this.refreshFromStorage();
	}

	private get isDev(): boolean {
		return isDevMode() && !environment.production;
	}

	/** Gate indispensable */
	get enabled(): boolean {
		return this.isDev && !!this.cfg.enabled;
	}

	getConfig(): Readonly<Required<LoggerConfig> & { activePattern: string; activeMinLevel: LogLevel }> {
		return {
			...this.cfg,
			activePattern: this.activePattern,
			activeMinLevel: this.minLevel,
		};
	}

	configure(cfg: LoggerConfig): void {
		this.cfg = { ...this.cfg, ...cfg };
		this.refreshFromStorage();
	}

	setFilter(pattern: string, persist = true): void {
		this.activePattern = (pattern ?? '').trim();
		this.filterFn = compileDebugFilter(this.activePattern);
		if (persist) {
			if (!this.activePattern) {
				safeRemoveLocalStorage(this.cfg.storageKey);
			} else {
				safeSetLocalStorage(this.cfg.storageKey, this.activePattern);
			}
		}
	}

	setMinLevel(level: LogLevel, persist = true): void {
		this.minLevel = level;
		if (persist) {
			safeSetLocalStorage(this.cfg.storageLevelKey, level);
		}
	}

	setEnabled(enabled: boolean): void {
		this.cfg.enabled = enabled;
	}

	refreshFromStorage(): void {
		const storagePattern = safeGetLocalStorage(this.cfg.storageKey);
		this.activePattern = (storagePattern ?? this.cfg.defaultPattern).trim();
		this.filterFn = compileDebugFilter(this.activePattern);

		const storageLevel = safeGetLocalStorage(this.cfg.storageLevelKey);
		const parsedLevel = parseLogLevel(storageLevel);
		this.minLevel = parsedLevel ?? this.cfg.minLevel;
	}

	clearOverrides(): void {
		safeRemoveLocalStorage(this.cfg.storageKey);
		safeRemoveLocalStorage(this.cfg.storageLevelKey);
		this.refreshFromStorage();
	}

	/**
	 * Log general (equivalente a console.log)
	 */
	log(...args: unknown[]): void {
		this.emit('log', args);
	}

	/**
	 * Warning (equivalente a console.warn)
	 */
	warn(...args: unknown[]): void {
		this.emit('warn', args);
	}

	/**
	 * Error (equivalente a console.error)
	 */
	error(...args: unknown[]): void {
		this.emit('error', args);
	}

	/**
	 * Info (equivalente a console.info)
	 */
	info(...args: unknown[]): void {
		this.emit('info', args);
	}

	/**
	 * Debug (equivalente a console.debug)
	 */
	debug(...args: unknown[]): void {
		this.emit('debug', args);
	}

	/**
	 * Log con prefijo/tag para identificar el origen
	 */
	tagged(tag: string, level: LogLevel, ...args: unknown[]): void {
		this.emit(level, args, tag, true);
	}

	/**
	 * Helper para crear un logger con tag fijo.
	 */
	scope(tag: string, scope?: string) {
		const fullTag = scope ? `${tag}::${scope}` : tag;
		return {
			log: (...args: unknown[]) => this.tagged(fullTag, 'log', ...args),
			warn: (...args: unknown[]) => this.tagged(fullTag, 'warn', ...args),
			error: (...args: unknown[]) => this.tagged(fullTag, 'error', ...args),
			info: (...args: unknown[]) => this.tagged(fullTag, 'info', ...args),
			debug: (...args: unknown[]) => this.tagged(fullTag, 'debug', ...args),
		};
	}

	private emit(level: LogLevel, args: unknown[], tag?: string, prependTag = false): void {
		const resolvedTag = normalizeTag(tag ?? extractTagFromArgs(args));

		if (!this.shouldLog(level, resolvedTag)) return;

		const payload = prependTag && resolvedTag ? [`[${resolvedTag}]`, ...args] : args;

		switch (level) {
			case 'log':
				console.log(...payload);
				break;
			case 'warn':
				console.warn(...payload);
				break;
			case 'error':
				console.error(...payload);
				break;
			case 'info':
				console.info(...payload);
				break;
			case 'debug':
				console.debug(...payload);
				break;
		}
	}

	private shouldLog(level: LogLevel, tag: string): boolean {
		if (!this.enabled) return false;
		if (LEVEL_WEIGHT[level] > LEVEL_WEIGHT[this.minLevel]) return false;
		return this.filterFn(tag);
	}
}

function parseLogLevel(value: string | null): LogLevel | null {
	if (!value) return null;
	const normalized = value.trim().toLowerCase();
	if (
		normalized === 'log' ||
		normalized === 'warn' ||
		normalized === 'error' ||
		normalized === 'info' ||
		normalized === 'debug'
	) {
		return normalized as LogLevel;
	}
	return null;
}

function extractTagFromArgs(args: unknown[]): string {
	const first = args[0];
	if (typeof first !== 'string') return '';
	const match = first.match(/^\s*\[([^\]]+)\]\s*/);
	return match?.[1]?.trim() ?? '';
}

function normalizeTag(tag: string | undefined | null): string {
	return (tag ?? '').trim();
}

/**
 * Instancia singleton del logger
 */
// * Shared singleton logger instance.
export const logger = new Logger();
// #endregion

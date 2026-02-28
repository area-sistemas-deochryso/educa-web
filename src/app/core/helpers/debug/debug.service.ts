// debug.service.ts
// #region Imports
import {
	Inject,
	Injectable,
	Optional,
	isDevMode,
	effect,
	EffectCleanupFn,
	EffectRef,
} from '@angular/core';
import { Observable, OperatorFunction, defer, finalize, tap } from 'rxjs';
import { logger } from '../logs/logger';
import { DEBUG_CONFIG, DebugConfig, DbgLevel } from './debug.type';
import {
	compileDebugFilter,
	safeGetLocalStorage,
	safeRemoveLocalStorage,
	safeSetLocalStorage,
} from './debug.filter';

// #endregion
// #region Implementation
const LEVEL_WEIGHT: Record<DbgLevel, number> = {
	ERROR: 0,
	WARN: 1,
	INFO: 2,
	TRACE: 3,
};

/**
 * Tagged debug logger with filtering and RxJS helpers.
 */
@Injectable({ providedIn: 'root' })
export class DebugService {
	// Tagged debug logger with filtering and helpers.
	private cfg: Required<DebugConfig>;
	private filterFn: (tag: string) => boolean = () => true;
	private activePattern = '';
	private minLevel: DbgLevel;

	constructor(@Optional() @Inject(DEBUG_CONFIG) cfg?: DebugConfig) {
		const defaults: Required<DebugConfig> = {
			enabled: true,
			minLevel: 'INFO',
			defaultPattern: '',
			storageKey: 'DEBUG',
			storageLevelKey: 'DEBUG_LEVEL',
			enableStackInTrace: false,
		};

		this.cfg = { ...defaults, ...(cfg ?? {}) };
		this.minLevel = this.cfg.minLevel;
		this.refreshFromStorage();
	}

	/**
	 * True when logging is enabled and dev mode is active.
	 */
	get enabled(): boolean {
		return isDevMode() && !!this.cfg.enabled;
	}

	/**
	 * Check if a tag is enabled by the current filter.
	 *
	 * @param tag Tag name.
	 */
	isTagEnabled(tag: string): boolean {
		return this.enabled && this.filterFn(tag);
	}

	/**
	 * Get the current debug configuration and active overrides.
	 */
	getConfig(): Readonly<Required<DebugConfig> & { activePattern: string; activeMinLevel: DbgLevel }> {
		return {
			...this.cfg,
			activePattern: this.activePattern,
			activeMinLevel: this.minLevel,
		};
	}

	/**
	 * Set the filter pattern and optionally persist it in localStorage.
	 *
	 * @param pattern Filter pattern.
	 * @param persist Persist to storage when true.
	 */
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

	/**
	 * Set the minimum debug level and optionally persist it.
	 *
	 * @param level Minimum level.
	 * @param persist Persist to storage when true.
	 */
	setMinLevel(level: DbgLevel, persist = true): void {
		this.minLevel = level;
		if (persist) {
			safeSetLocalStorage(this.cfg.storageLevelKey, level);
		}
	}

	/**
	 * Enable or disable debug output at runtime.
	 */
	setEnabled(enabled: boolean): void {
		this.cfg.enabled = enabled;
	}

	/**
	 * Refresh filters and levels from storage overrides.
	 */
	refreshFromStorage(): void {
		const storagePattern = safeGetLocalStorage(this.cfg.storageKey);
		this.activePattern = (storagePattern ?? this.cfg.defaultPattern).trim();
		this.filterFn = compileDebugFilter(this.activePattern);

		const storageLevel = safeGetLocalStorage(this.cfg.storageLevelKey);
		const parsedLevel = parseDbgLevel(storageLevel);
		this.minLevel = parsedLevel ?? this.cfg.minLevel;
	}

	/**
	 * Clear stored overrides and reload defaults.
	 */
	clearOverrides(): void {
		safeRemoveLocalStorage(this.cfg.storageKey);
		safeRemoveLocalStorage(this.cfg.storageLevelKey);
		this.refreshFromStorage();
	}

	/**
	 * Build a tagged logger helper with common methods.
	 *
	 * @param tag Log tag.
	 * @param scope Optional scope suffix.
	 */
	dbg(tag: string, scope?: string) {
		const fullTag = scope ? `${tag}:${scope}` : tag;
		return {
			error: (msg: string, data?: unknown) => this.emit(fullTag, 'ERROR', msg, data),
			warn: (msg: string, data?: unknown) => this.emit(fullTag, 'WARN', msg, data),
			info: (msg: string, data?: unknown) => this.emit(fullTag, 'INFO', msg, data),
			trace: (msg: string, data?: unknown) => this.emit(fullTag, 'TRACE', msg, data),

			time: <T>(label: string, fn: () => T): T => {
				const t0 = performance.now();
				try {
					return fn();
				} finally {
					this.emit(fullTag, 'INFO', `time:${label}`, {
						ms: round2(performance.now() - t0),
					});
				}
			},

			timeAsync: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
				const t0 = performance.now();
				try {
					return await fn();
				} finally {
					this.emit(fullTag, 'INFO', `timeAsync:${label}`, {
						ms: round2(performance.now() - t0),
					});
				}
			},

			once: (() => {
				const seen = new Set<string>();
				return (key: string, msg: string, data?: unknown) => {
					if (seen.has(key)) return;
					seen.add(key);
					this.emit(fullTag, 'INFO', `once:${key} ${msg}`, data);
				};
			})(),
		};
	}

	private emit(tag: string, level: DbgLevel, msg: string, data?: unknown) {
		if (!this.enabled) return;
		if (!this.filterFn(tag)) return;
		if (LEVEL_WEIGHT[level] > LEVEL_WEIGHT[this.minLevel]) return;

		const payload = data ? [msg, data] : [msg];

		if (level === 'TRACE' && this.cfg.enableStackInTrace) {
			const source = captureSource();
			logger.tagged(tag, 'debug', ...payload, source);
			return;
		}

		switch (level) {
			case 'ERROR':
				logger.tagged(tag, 'error', ...payload);
				break;
			case 'WARN':
				logger.tagged(tag, 'warn', ...payload);
				break;
			case 'INFO':
				logger.tagged(tag, 'info', ...payload);
				break;
			case 'TRACE':
				logger.tagged(tag, 'debug', ...payload);
				break;
		}
	}

	/**
	 * RxJS tap helper that logs next, error, and complete.
	 */
	tapDbg<T>(tag: string, label?: string): OperatorFunction<T, T> {
		const log = this.dbg(tag);
		return tap({
			next: (v) => log.trace(label ? `next:${label}` : 'next', v),
			error: (e) => log.error(label ? `error:${label}` : 'error', e),
			complete: () => log.trace(label ? `complete:${label}` : 'complete'),
		});
	}

	/**
	 * Subscribe helper that logs next, error, and complete.
	 */
	dbgSub<T>(
		tag: string,
		label?: string,
		observer?: {
			next?: (v: T) => void;
			error?: (e: unknown) => void;
			complete?: () => void;
		},
	): OperatorFunction<T, T> {
		const log = this.dbg(tag);
		return tap({
			next: (v: T) => {
				log.trace(label ? `sub:next:${label}` : 'sub:next', v);
				observer?.next?.(v);
			},
			error: (e: unknown) => {
				log.error(label ? `sub:error:${label}` : 'sub:error', e);
				observer?.error?.(e);
			},
			complete: () => {
				log.trace(label ? `sub:complete:${label}` : 'sub:complete');
				observer?.complete?.();
			},
		});
	}

	/**
	 * Track a stream lifecycle with timing metrics.
	 */
	track$<T>(tag: string, label: string): OperatorFunction<T, T> {
		return (source: Observable<T>) =>
			defer(() => {
				const log = this.dbg(tag);
				const t0 = performance.now();
				let first = true;

				log.info(`track:start:${label}`);

				return source.pipe(
					tap({
						next: () => {
							if (first) {
								first = false;
								log.info(`track:ttf:${label}`, {
									ms: round2(performance.now() - t0),
								});
							}
						},
						error: (e) => log.error(`track:error:${label}`, e),
					}),
					finalize(() => {
						log.info(`track:end:${label}`, {
							ms: round2(performance.now() - t0),
						});
					}),
				);
			});
	}

	/**
	 * Debug wrapper for Angular effect with run and cleanup logs.
	 */
	effectDbg(
		tag: string,
		label: string,
		fn: (onCleanup: (cleanupFn: EffectCleanupFn) => void) => void,
	): EffectRef {
		const log = this.dbg(tag);
		let run = 0;

		return effect((onCleanup) => {
			run += 1;
			log.trace(`effect:run:${label}`, { run });
			fn(onCleanup);
			onCleanup(() => {
				log.trace(`effect:cleanup:${label}`, { run });
			});
		});
	}
}

function round2(n: number) {
	return Math.round(n * 100) / 100;
}

function captureSource() {
	try {
		const err = new Error();
		return err.stack?.split('\n').slice(2, 6).join('\n');
	} catch {
		return undefined;
	}
}

function parseDbgLevel(value: string | null): DbgLevel | null {
	if (!value) return null;
	const normalized = value.trim().toUpperCase();
	if (normalized === 'ERROR' || normalized === 'WARN' || normalized === 'INFO' || normalized === 'TRACE') {
		return normalized as DbgLevel;
	}
	return null;
}
// #endregion

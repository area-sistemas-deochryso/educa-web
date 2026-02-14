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
import { logger } from '../logs/logger'; // <-- tu logger existente
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

@Injectable({ providedIn: 'root' })
export class DebugService {
	// * Tagged debug logger with filtering + RxJS helpers.
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

	/** Gate indispensable */
	get enabled(): boolean {
		return isDevMode() && !!this.cfg.enabled;
	}

	isTagEnabled(tag: string): boolean {
		return this.enabled && this.filterFn(tag);
	}

	getConfig(): Readonly<Required<DebugConfig> & { activePattern: string; activeMinLevel: DbgLevel }> {
		return {
			...this.cfg,
			activePattern: this.activePattern,
			activeMinLevel: this.minLevel,
		};
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

	setMinLevel(level: DbgLevel, persist = true): void {
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
		const parsedLevel = parseDbgLevel(storageLevel);
		this.minLevel = parsedLevel ?? this.cfg.minLevel;
	}

	clearOverrides(): void {
		safeRemoveLocalStorage(this.cfg.storageKey);
		safeRemoveLocalStorage(this.cfg.storageLevelKey);
		this.refreshFromStorage();
	}

	dbg(tag: string, scope?: string) {
		const fullTag = scope ? `${tag}::${scope}` : tag;

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
		// Si no es devMode, apagado total
		if (!this.enabled) return;

		// Filtrado por tag
		if (!this.filterFn(tag)) return;

		// Nivel mÃƒÆ’Ã‚Â­nimo
		if (LEVEL_WEIGHT[level] > LEVEL_WEIGHT[this.minLevel]) return;

		const payload = data === undefined ? [msg] : [msg, data];

		// Stack solo en TRACE si estÃƒÆ’Ã‚Â¡ habilitado
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

	// ---------------- RxJS ----------------
	tapDbg<T>(tag: string, label?: string): OperatorFunction<T, T> {
		const log = this.dbg(tag);
		return tap({
			next: (v) => log.trace(label ? `next:${label}` : 'next', v),
			error: (e) => log.error(label ? `error:${label}` : 'error', e),
			complete: () => log.trace(label ? `complete:${label}` : 'complete'),
		});
	}

	dbgSub<T>(
		tag: string,
		observer: Partial<{
			next: (v: T) => void;
			error: (e: unknown) => void;
			complete: () => void;
		}>,
		label?: string,
	) {
		const log = this.dbg(tag);
		return {
			next: (v: T) => {
				log.trace(label ? `sub:next:${label}` : 'sub:next', v);
				observer.next?.(v);
			},
			error: (e: unknown) => {
				log.error(label ? `sub:error:${label}` : 'sub:error', e);
				observer.error?.(e);
			},
			complete: () => {
				log.trace(label ? `sub:complete:${label}` : 'sub:complete');
				observer.complete?.();
			},
		};
	}

	track$<T>(tag: string, label: string): OperatorFunction<T, T> {
		return (source: Observable<T>) =>
			defer(() => {
				const log = this.dbg(tag);
				const t0 = performance.now();
				let first = true;
				let n = 0;

				log.info(`track:start:${label}`);

				return source.pipe(
					tap({
						next: () => {
							n++;
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
							count: n,
							ms: round2(performance.now() - t0),
						});
					}),
				);
			});
	}

	// ---------------- Signals ----------------
	effectDbg(
		tag: string,
		label: string,
		fn: (onCleanup: (cleanupFn: EffectCleanupFn) => void) => void,
	): EffectRef {
		const log = this.dbg(tag);
		let run = 0;

		return effect((onCleanup) => {
			run++;
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
		return err.stack?.split('\n').slice(2, 6).join('\n'); // 4 frames
	} catch {
		return '';
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

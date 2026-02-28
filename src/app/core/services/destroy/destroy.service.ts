// #region Imports
import { Injectable, OnDestroy, DestroyRef, Directive } from '@angular/core';
import { Subject, MonoTypeOperatorFunction } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Service to manage subscription lifecycles and avoid memory leaks.
 *
 * Recommended usage (Angular 16+):
 * ```typescript
 * private destroyRef = inject(DestroyRef);
 *
 * ngOnInit() {
 *   this.myService.getData()
 *     .pipe(takeUntilDestroyed(this.destroyRef))
 *     .subscribe(data => {...});
 * }
 * ```
 *
 * Alternative usage (services or special cases):
 * ```typescript
 * private destroy = inject(DestroyService);
 *
 * ngOnInit() {
 *   this.myService.getData()
 *     .pipe(this.destroy.takeUntil())
 *     .subscribe(data => {...});
 * }
 * ```
 */
// #endregion
// #region Implementation
@Injectable()
export class DestroyService implements OnDestroy {
	// Subject based cleanup helper for RxJS subscriptions.
	private readonly destroy$ = new Subject<void>();

	/**
	 * Observable that emits when the service is destroyed.
	 */
	readonly onDestroy$ = this.destroy$.asObservable();

	/**
	 * RxJS operator to auto unsubscribe on destroy.
	 *
	 * @returns Operator function.
	 * @example
	 * this.http.get(url).pipe(this.destroy.takeUntil()).subscribe();
	 */
	takeUntil<T>(): MonoTypeOperatorFunction<T> {
		return takeUntil<T>(this.destroy$);
	}

	/**
	 * Trigger cleanup and complete the subject.
	 */
	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}
}

/**
 * Helper to use takeUntilDestroyed where DestroyRef is not injected by default.
 *
 * @param destroyRef DestroyRef instance.
 * @returns Operator function.
 * @example
 * return this.http.get('/api/data').pipe(untilDestroyed(this.destroyRef));
 */
export function untilDestroyed<T>(destroyRef: DestroyRef): MonoTypeOperatorFunction<T> {
	return takeUntilDestroyed<T>(destroyRef);
}

/**
 * Base class for components that need subscription cleanup.
 *
 * @example
 * export class MyComponent extends DestroyableComponent {
 *   ngOnInit() {
 *     this.myService.getData()
 *       .pipe(this.untilDestroyed())
 *       .subscribe();
 *   }
 * }
 */
@Directive()
export abstract class DestroyableComponent implements OnDestroy {
	protected readonly destroy$ = new Subject<void>();

	/**
	 * Operator to auto unsubscribe on destroy.
	 */
	protected untilDestroyed<T>(): MonoTypeOperatorFunction<T> {
		return takeUntil<T>(this.destroy$);
	}

	/**
	 * Trigger cleanup and complete the subject.
	 */
	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}
}

/**
 * Utility to manage intervals and timeouts with centralized cleanup.
 */
export class TimerManager {
	private intervals: ReturnType<typeof setInterval>[] = [];
	private timeouts: ReturnType<typeof setTimeout>[] = [];

	/**
	 * Create and track an interval.
	 *
	 * @param callback Callback to run.
	 * @param ms Interval delay in ms.
	 * @returns Interval id.
	 */
	setInterval(callback: () => void, ms: number): ReturnType<typeof setInterval> {
		const id = setInterval(callback, ms);
		this.intervals.push(id);
		return id;
	}

	/**
	 * Create and track a timeout.
	 *
	 * @param callback Callback to run.
	 * @param ms Timeout delay in ms.
	 * @returns Timeout id.
	 */
	setTimeout(callback: () => void, ms: number): ReturnType<typeof setTimeout> {
		const id = setTimeout(callback, ms);
		this.timeouts.push(id);
		return id;
	}

	/**
	 * Clear a tracked interval.
	 *
	 * @param id Interval id.
	 */
	clearInterval(id: ReturnType<typeof setInterval>): void {
		clearInterval(id);
		this.intervals = this.intervals.filter((i) => i !== id);
	}

	/**
	 * Clear a tracked timeout.
	 *
	 * @param id Timeout id.
	 */
	clearTimeout(id: ReturnType<typeof setTimeout>): void {
		clearTimeout(id);
		this.timeouts = this.timeouts.filter((t) => t !== id);
	}

	/**
	 * Clear all tracked intervals and timeouts.
	 */
	clearAll(): void {
		this.intervals.forEach((id) => clearInterval(id));
		this.timeouts.forEach((id) => clearTimeout(id));
		this.intervals = [];
		this.timeouts = [];
	}
}
// #endregion

import { Injectable, OnDestroy, DestroyRef } from '@angular/core';
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

import { Directive, OnDestroy } from '@angular/core';
import { Subject, MonoTypeOperatorFunction } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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

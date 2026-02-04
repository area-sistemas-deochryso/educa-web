import { Injectable, OnDestroy, DestroyRef, Directive } from '@angular/core';
import { Subject, MonoTypeOperatorFunction } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Servicio para manejar el ciclo de vida de subscripciones.
 * Proporciona múltiples estrategias para evitar memory leaks.
 *
 * USO RECOMENDADO (Angular 16+):
 * ```typescript
 * // En componentes, usar takeUntilDestroyed directamente:
 * private destroyRef = inject(DestroyRef)
 *
 * ngOnInit() {
 *   this.myService.getData()
 *     .pipe(takeUntilDestroyed(this.destroyRef))
 *     .subscribe(data => {...})
 * }
 * ```
 *
 * USO ALTERNATIVO (para servicios o casos especiales):
 * ```typescript
 * // Inyectar el servicio
 * private destroy = inject(DestroyService)
 *
 * ngOnInit() {
 *   this.myService.getData()
 *     .pipe(this.destroy.takeUntil())
 *     .subscribe(data => {...})
 * }
 * ```
 */
@Injectable()
export class DestroyService implements OnDestroy {
	// * Subject-based cleanup helper for RxJS subscriptions.
	private readonly destroy$ = new Subject<void>();

	/**
	 * Observable que emite cuando el servicio/componente se destruye
	 */
	readonly onDestroy$ = this.destroy$.asObservable();

	/**
	 * Operador para cancelar subscripciones automáticamente
	 */
	takeUntil<T>(): MonoTypeOperatorFunction<T> {
		return takeUntil<T>(this.destroy$);
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}
}

/**
 * Helper function para usar takeUntilDestroyed en contextos donde
 * DestroyRef no está disponible automáticamente.
 *
 * @example
 * ```typescript
 * // En un servicio con inject context
 * export class MyService {
 *   private destroyRef = inject(DestroyRef)
 *
 *   loadData() {
 *     return this.http.get('/api/data').pipe(
 *       untilDestroyed(this.destroyRef)
 *     )
 *   }
 * }
 * ```
 */
export function untilDestroyed<T>(destroyRef: DestroyRef): MonoTypeOperatorFunction<T> {
	return takeUntilDestroyed<T>(destroyRef);
}

/**
 * Clase base para componentes que necesitan manejar subscripciones.
 * Alternativa a inyectar DestroyService.
 *
 * @example
 * ```typescript
 * export class MyComponent extends DestroyableComponent {
 *   ngOnInit() {
 *     this.myService.getData()
 *       .pipe(this.untilDestroyed())
 *       .subscribe(...)
 *   }
 * }
 * ```
 */
@Directive()
export abstract class DestroyableComponent implements OnDestroy {
	protected readonly destroy$ = new Subject<void>();

	protected untilDestroyed<T>(): MonoTypeOperatorFunction<T> {
		return takeUntil<T>(this.destroy$);
	}

	ngOnDestroy(): void {
		this.destroy$.next();
		this.destroy$.complete();
	}
}

/**
 * Utilidad para manejar intervalos y timeouts con cleanup automático
 */
export class TimerManager {
	private intervals: ReturnType<typeof setInterval>[] = [];
	private timeouts: ReturnType<typeof setTimeout>[] = [];

	setInterval(callback: () => void, ms: number): ReturnType<typeof setInterval> {
		const id = setInterval(callback, ms);
		this.intervals.push(id);
		return id;
	}

	setTimeout(callback: () => void, ms: number): ReturnType<typeof setTimeout> {
		const id = setTimeout(callback, ms);
		this.timeouts.push(id);
		return id;
	}

	clearInterval(id: ReturnType<typeof setInterval>): void {
		clearInterval(id);
		this.intervals = this.intervals.filter((i) => i !== id);
	}

	clearTimeout(id: ReturnType<typeof setTimeout>): void {
		clearTimeout(id);
		this.timeouts = this.timeouts.filter((t) => t !== id);
	}

	clearAll(): void {
		this.intervals.forEach((id) => clearInterval(id));
		this.timeouts.forEach((id) => clearTimeout(id));
		this.intervals = [];
		this.timeouts = [];
	}
}

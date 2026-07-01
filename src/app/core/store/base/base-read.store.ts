import { Injectable, Signal, computed, signal } from '@angular/core';

@Injectable()
export abstract class BaseReadStore<T> {
	// #region Private state
	private readonly _items = signal<T[]>([]);
	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);
	// #endregion

	// #region Public reads
	readonly items: Signal<T[]> = this._items.asReadonly();
	readonly loading: Signal<boolean> = this._loading.asReadonly();
	readonly error: Signal<string | null> = this._error.asReadonly();
	// #endregion

	// #region Computed
	readonly isEmpty = computed(() => this._items().length === 0);
	readonly itemCount = computed(() => this._items().length);
	// #endregion

	// #region Commands
	setItems(items: T[]): void {
		this._items.set(items);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setError(error: string | null): void {
		this._error.set(error);
	}

	clearError(): void {
		this._error.set(null);
	}
	// #endregion
}

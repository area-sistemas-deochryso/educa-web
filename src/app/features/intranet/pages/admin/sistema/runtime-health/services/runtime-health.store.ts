import { Injectable, computed, signal } from '@angular/core';

import { RuntimeHealthSnapshot } from '../models/runtime-health.models';

@Injectable({ providedIn: 'root' })
export class RuntimeHealthStore {
	// #region Estado privado
	private readonly _snapshot = signal<RuntimeHealthSnapshot | null>(null);
	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);
	private readonly _autoRefresh = signal(true);
	private readonly _collapsed = signal(false);
	// #endregion

	// #region Lecturas públicas
	readonly snapshot = this._snapshot.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly autoRefresh = this._autoRefresh.asReadonly();
	readonly collapsed = this._collapsed.asReadonly();

	readonly vm = computed(() => ({
		snapshot: this._snapshot(),
		loading: this._loading(),
		error: this._error(),
		autoRefresh: this._autoRefresh(),
		collapsed: this._collapsed(),
	}));
	// #endregion

	// #region Comandos
	setSnapshot(snapshot: RuntimeHealthSnapshot): void {
		this._snapshot.set(snapshot);
		this._error.set(null);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setError(error: string | null): void {
		this._error.set(error);
	}

	setAutoRefresh(value: boolean): void {
		this._autoRefresh.set(value);
	}

	setCollapsed(value: boolean): void {
		this._collapsed.set(value);
	}
	// #endregion
}

import { Injectable, computed, signal } from '@angular/core';

import { CorrelationSnapshot } from '../models';

@Injectable({ providedIn: 'root' })
export class CorrelationStore {
	// #region Estado privado
	private readonly _snapshot = signal<CorrelationSnapshot | null>(null);
	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);
	private readonly _correlationId = signal<string | null>(null);
	// #endregion

	// #region Lecturas públicas
	readonly snapshot = this._snapshot.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly correlationId = this._correlationId.asReadonly();
	// #endregion

	// #region Computed
	readonly errorLogs = computed(() => this._snapshot()?.errorLogs ?? []);
	readonly rateLimitEvents = computed(() => this._snapshot()?.rateLimitEvents ?? []);
	readonly reportesUsuario = computed(() => this._snapshot()?.reportesUsuario ?? []);
	readonly emailOutbox = computed(() => this._snapshot()?.emailOutbox ?? []);

	readonly totalEvents = computed(
		() =>
			this.errorLogs().length +
			this.rateLimitEvents().length +
			this.reportesUsuario().length +
			this.emailOutbox().length,
	);
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		snapshot: this._snapshot(),
		loading: this._loading(),
		error: this._error(),
		correlationId: this._correlationId(),
		errorLogs: this.errorLogs(),
		rateLimitEvents: this.rateLimitEvents(),
		reportesUsuario: this.reportesUsuario(),
		emailOutbox: this.emailOutbox(),
		totalEvents: this.totalEvents(),
	}));
	// #endregion

	// #region Comandos
	setCorrelationId(id: string | null): void {
		this._correlationId.set(id);
	}

	setSnapshot(snapshot: CorrelationSnapshot | null): void {
		this._snapshot.set(snapshot);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setError(error: string | null): void {
		this._error.set(error);
	}

	reset(): void {
		this._snapshot.set(null);
		this._error.set(null);
		this._correlationId.set(null);
		this._loading.set(false);
	}
	// #endregion
}

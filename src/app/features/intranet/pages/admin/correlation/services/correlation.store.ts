import { Injectable, computed, signal } from '@angular/core';

import {
	CorrelationSnapshot,
	SECTION_DEFENSIVE_CAP,
	TimelineEvent,
} from '../models';

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

	/**
	 * Plan 41 F1 — mezcla los 4 arrays en un único `TimelineEvent[]` ordenado
	 * por fecha descendente (más reciente primero). Outbox prefiere `fechaEnvio`
	 * y cae a `fechaReg` cuando el correo todavía no se envió.
	 */
	readonly timelineEvents = computed<TimelineEvent[]>(() => {
		const events: TimelineEvent[] = [];

		for (const e of this.errorLogs()) {
			events.push({ kind: 'error', fecha: e.fecha, payload: e });
		}
		for (const e of this.rateLimitEvents()) {
			events.push({ kind: 'rate-limit', fecha: e.fecha, payload: e });
		}
		for (const e of this.reportesUsuario()) {
			events.push({ kind: 'reporte', fecha: e.fechaReg, payload: e });
		}
		for (const e of this.emailOutbox()) {
			events.push({ kind: 'outbox', fecha: e.fechaEnvio ?? e.fechaReg, payload: e });
		}

		return events.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
	});

	/** Plan 41 F1 — true si alguna sección llegó al cap defensivo (100 filas). */
	readonly hasDefensiveCap = computed(
		() =>
			this.errorLogs().length >= SECTION_DEFENSIVE_CAP ||
			this.rateLimitEvents().length >= SECTION_DEFENSIVE_CAP ||
			this.reportesUsuario().length >= SECTION_DEFENSIVE_CAP ||
			this.emailOutbox().length >= SECTION_DEFENSIVE_CAP,
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
		timelineEvents: this.timelineEvents(),
		hasDefensiveCap: this.hasDefensiveCap(),
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

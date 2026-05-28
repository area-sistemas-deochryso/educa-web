import { computed, Injectable, signal } from '@angular/core';

import { DeferFailStatus } from '@features/intranet/pages/admin/email-outbox/models/defer-fail-status.models';

import {
	DashboardCandidatoBlacklist,
	DashboardDominioReceptor,
	DashboardSenderStat,
	DashboardSerieTemporalPunto,
	DashboardTopDestinatario,
	MAPA_ENVIO_DEFAULTS,
	MapaEnvioFilters,
	SerieTemporalGranularidad,
} from '../models/email-monitoreo.models';

/**
 * Plan 39 Chat C — estado independiente por tile (D11): cada tile carga,
 * fallba y refresca por separado. Loading y error son por-tile para que el
 * skeleton de un tile no bloquee al resto.
 */
@Injectable({ providedIn: 'root' })
export class EmailMonitoreoStore {
	// #region Error global
	private readonly _error = signal<string | null>(null);
	readonly error = this._error.asReadonly();

	setError(error: string | null): void {
		this._error.set(error);
	}
	// #endregion

	// #region Filtros
	private readonly _filters = signal<MapaEnvioFilters>({ ...MAPA_ENVIO_DEFAULTS });
	readonly filters = this._filters.asReadonly();

	setVentanaDias(ventanaDias: number): void {
		this._filters.update((f) => ({ ...f, ventanaDias }));
	}

	setGranularidad(granularidad: SerieTemporalGranularidad): void {
		this._filters.update((f) => ({ ...f, granularidad }));
	}

	setTopLimit(topLimit: number): void {
		this._filters.update((f) => ({ ...f, topLimit }));
	}
	// #endregion

	// #region Tile: defer-fail status (live)
	private readonly _deferFailStatus = signal<DeferFailStatus | null>(null);
	private readonly _deferFailLoading = signal(false);
	readonly deferFailStatus = this._deferFailStatus.asReadonly();
	readonly deferFailLoading = this._deferFailLoading.asReadonly();

	setDeferFailStatus(status: DeferFailStatus | null): void {
		this._deferFailStatus.set(status);
	}

	setDeferFailLoading(loading: boolean): void {
		this._deferFailLoading.set(loading);
	}
	// #endregion

	// #region Tile: sender-stats
	private readonly _senderStats = signal<DashboardSenderStat[]>([]);
	private readonly _senderLoading = signal(false);
	readonly senderStats = this._senderStats.asReadonly();
	readonly senderLoading = this._senderLoading.asReadonly();

	setSenderStats(items: DashboardSenderStat[]): void {
		this._senderStats.set(items);
	}

	setSenderLoading(loading: boolean): void {
		this._senderLoading.set(loading);
	}
	// #endregion

	// #region Tile: top-destinatarios
	private readonly _topDestinatarios = signal<DashboardTopDestinatario[]>([]);
	private readonly _topLoading = signal(false);
	readonly topDestinatarios = this._topDestinatarios.asReadonly();
	readonly topLoading = this._topLoading.asReadonly();

	setTopDestinatarios(items: DashboardTopDestinatario[]): void {
		this._topDestinatarios.set(items);
	}

	setTopLoading(loading: boolean): void {
		this._topLoading.set(loading);
	}
	// #endregion

	// #region Tile: serie-temporal
	private readonly _serieTemporal = signal<DashboardSerieTemporalPunto[]>([]);
	private readonly _serieLoading = signal(false);
	readonly serieTemporal = this._serieTemporal.asReadonly();
	readonly serieLoading = this._serieLoading.asReadonly();

	setSerieTemporal(items: DashboardSerieTemporalPunto[]): void {
		this._serieTemporal.set(items);
	}

	setSerieLoading(loading: boolean): void {
		this._serieLoading.set(loading);
	}
	// #endregion

	// #region Tile: dominios-receptores
	private readonly _dominios = signal<DashboardDominioReceptor[]>([]);
	private readonly _dominiosLoading = signal(false);
	readonly dominios = this._dominios.asReadonly();
	readonly dominiosLoading = this._dominiosLoading.asReadonly();

	setDominios(items: DashboardDominioReceptor[]): void {
		this._dominios.set(items);
	}

	setDominiosLoading(loading: boolean): void {
		this._dominiosLoading.set(loading);
	}
	// #endregion

	// #region Tile: candidatos-blacklist
	private readonly _candidatos = signal<DashboardCandidatoBlacklist[]>([]);
	private readonly _candidatosLoading = signal(false);
	readonly candidatos = this._candidatos.asReadonly();
	readonly candidatosLoading = this._candidatosLoading.asReadonly();

	setCandidatos(items: DashboardCandidatoBlacklist[]): void {
		this._candidatos.set(items);
	}

	setCandidatosLoading(loading: boolean): void {
		this._candidatosLoading.set(loading);
	}
	// #endregion

	// #region SignalR live state
	/** Marca de tiempo del último BlacklistEntryCreated para resaltar UI ~5min. */
	private readonly _lastBlacklistEventAt = signal<number | null>(null);
	readonly lastBlacklistEventAt = this._lastBlacklistEventAt.asReadonly();

	markBlacklistEvent(): void {
		this._lastBlacklistEventAt.set(Date.now());
	}

	clearBlacklistEvent(): void {
		this._lastBlacklistEventAt.set(null);
	}
	// #endregion

	// #region ViewModel agregado
	readonly vm = computed(() => ({
		error: this._error(),
		filters: this._filters(),
		deferFailStatus: this._deferFailStatus(),
		deferFailLoading: this._deferFailLoading(),
		senderStats: this._senderStats(),
		senderLoading: this._senderLoading(),
		topDestinatarios: this._topDestinatarios(),
		topLoading: this._topLoading(),
		serieTemporal: this._serieTemporal(),
		serieLoading: this._serieLoading(),
		dominios: this._dominios(),
		dominiosLoading: this._dominiosLoading(),
		candidatos: this._candidatos(),
		candidatosLoading: this._candidatosLoading(),
		lastBlacklistEventAt: this._lastBlacklistEventAt(),
	}));
	// #endregion
}

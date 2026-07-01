import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, timer } from 'rxjs';

import { logger, facadeErrorHandler, type FacadeErrorHandler } from '@core/helpers';
import { ErrorHandlerService } from '@core/services';

import { EmailOutboxApiService } from '@features/intranet/pages/admin/email-outbox/services/email-outbox.service';

import { SerieTemporalGranularidad } from '../models/email-monitoreo.models';

const LOG_TAG = 'EmailMonitoreo:Facade';

import { EmailHubService } from './email-hub.service';
import { EmailMonitoreoApiService } from './email-monitoreo.api.service';
import { EmailMonitoreoStore } from './email-monitoreo.store';

/** Polling fallback cuando SignalR no conecta — INV-MAIL04 (60s para defer-fail-status). */
const DEFER_FAIL_POLL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class EmailMonitoreoFacade {
	// #region Dependencias
	private api = inject(EmailMonitoreoApiService);
	private store = inject(EmailMonitoreoStore);
	private hub = inject(EmailHubService);
	private outboxApi = inject(EmailOutboxApiService);
	private destroyRef = inject(DestroyRef);
	private errHandler: FacadeErrorHandler = facadeErrorHandler({
		tag: 'EmailMonitoreoFacade',
		errorHandler: inject(ErrorHandlerService),
	});
	// #endregion

	private deferFailPollSub: Subscription | null = null;
	private hubStarted = false;

	// #region Estado expuesto
	readonly vm = this.store.vm;
	readonly hubConnected = this.hub.connected;
	// #endregion

	// #region Comandos: orquestación
	loadAll(): void {
		this.loadDeferFailStatus();
		this.loadSenderStats();
		this.loadTopDestinatarios();
		this.loadSerieTemporal();
		this.loadDominios();
		this.loadCandidatos();
	}

	refreshAll(): void {
		this.loadAll();
	}
	// #endregion

	// #region Comandos: por-tile
	loadDeferFailStatus(): void {
		this.store.setDeferFailLoading(true);
		this.outboxApi
			.deferFailStatus()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (status) => {
					this.store.setDeferFailStatus(status);
					this.store.setDeferFailLoading(false);
				},
				error: (err) => {
					this.errHandler.handle(err, 'cargar estado defer/fail', () => {
						this.store.setDeferFailLoading(false);
					});
				},
			});
	}

	loadSenderStats(): void {
		this.store.setSenderLoading(true);
		const { ventanaDias } = this.store.filters();
		this.api
			.getSenderStats(ventanaDias)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this.store.setSenderStats(items);
					this.store.setSenderLoading(false);
				},
				error: (err) => {
					this.errHandler.handle(err, 'cargar estadísticas de remitentes', () => {
						this.store.setSenderLoading(false);
					});
				},
			});
	}

	loadTopDestinatarios(): void {
		this.store.setTopLoading(true);
		const { ventanaDias, topLimit } = this.store.filters();
		this.api
			.getTopDestinatarios(ventanaDias, topLimit)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this.store.setTopDestinatarios(items);
					this.store.setTopLoading(false);
				},
				error: (err) => {
					this.errHandler.handle(err, 'cargar top destinatarios', () => {
						this.store.setTopLoading(false);
					});
				},
			});
	}

	loadSerieTemporal(): void {
		this.store.setSerieLoading(true);
		const { granularidad } = this.store.filters();
		this.api
			.getSerieTemporal(granularidad)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this.store.setSerieTemporal(items);
					this.store.setSerieLoading(false);
				},
				error: (err) => {
					this.errHandler.handle(err, 'cargar serie temporal', () => {
						this.store.setSerieLoading(false);
					});
				},
			});
	}

	loadDominios(): void {
		this.store.setDominiosLoading(true);
		const { ventanaDias } = this.store.filters();
		this.api
			.getDominiosReceptores(ventanaDias)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this.store.setDominios(items);
					this.store.setDominiosLoading(false);
				},
				error: (err) => {
					this.errHandler.handle(err, 'cargar dominios receptores', () => {
						this.store.setDominiosLoading(false);
					});
				},
			});
	}

	loadCandidatos(): void {
		this.store.setCandidatosLoading(true);
		this.api
			.getCandidatosBlacklist()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this.store.setCandidatos(items);
					this.store.setCandidatosLoading(false);
				},
				error: (err) => {
					this.errHandler.handle(err, 'cargar candidatos a blacklist', () => {
						this.store.setCandidatosLoading(false);
					});
				},
			});
	}
	// #endregion

	// #region Filtros
	setVentanaDias(ventanaDias: number): void {
		this.store.setVentanaDias(ventanaDias);
		this.loadSenderStats();
		this.loadTopDestinatarios();
		this.loadDominios();
	}

	setGranularidad(granularidad: SerieTemporalGranularidad): void {
		this.store.setGranularidad(granularidad);
		this.loadSerieTemporal();
	}
	// #endregion

	// #region SignalR lifecycle
	async startHub(): Promise<void> {
		if (this.hubStarted) return;
		this.hubStarted = true;

		this.hub.blacklistEntryCreated$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				this.store.markBlacklistEvent();
				// Refresca tile candidatos sin polling — un destinatario salió a blacklist.
				this.loadCandidatos();
			});

		this.hub.deferFailStatusUpdated$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				// Refresca el snapshot completo del defer-fail-status.
				this.loadDeferFailStatus();
			});

		this.hub.candidatoBlacklistDetectado$
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => {
				// Early warning — refresca tile candidatos sin polling.
				this.loadCandidatos();
			});

		try {
			await this.hub.connect();
			this.stopDeferFailPolling();
		} catch (err) {
			logger.tagged(LOG_TAG, 'warn', 'hub_connect_failed_fallback_polling', err);
			this.startDeferFailPolling();
		}
	}

	async stopHub(): Promise<void> {
		this.hubStarted = false;
		this.stopDeferFailPolling();
		await this.hub.disconnect();
	}

	private startDeferFailPolling(): void {
		this.stopDeferFailPolling();
		this.deferFailPollSub = timer(DEFER_FAIL_POLL_MS, DEFER_FAIL_POLL_MS)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.loadDeferFailStatus());
	}

	private stopDeferFailPolling(): void {
		this.deferFailPollSub?.unsubscribe();
		this.deferFailPollSub = null;
	}
	// #endregion
}

import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { ErrorHandlerService } from '@core/services/error/error-handler.service';
import { StorageService } from '@core/services/storage/storage.service';

import { EmailOutboxApiService } from './email-outbox.service';
import { EmailOutboxStore } from './email-outbox.store';

const THROTTLE_POLL_INTERVAL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class EmailOutboxDataFacade {
	// #region Dependencias
	private api = inject(EmailOutboxApiService);
	private store = inject(EmailOutboxStore);
	private destroyRef = inject(DestroyRef);
	private errorHandler = inject(ErrorHandlerService);
	private storage = inject(StorageService);

	// Handle del polling activo. null cuando no hay polling corriendo.
	private pollHandle: ReturnType<typeof setInterval> | null = null;
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	constructor() {
		// Cleanup automático: detener polling cuando el servicio se destruye.
		// El provider es root-singleton, así que solo dispara si la app se
		// reinicia — igual dejamos el guard para no leakear el interval.
		this.destroyRef.onDestroy(() => this.stopThrottlePolling());
	}

	// #region Carga de datos
	loadData(): void {
		this.store.setLoading(true);

		const filtros = {
			tipo: this.store.filterTipo() ?? undefined,
			estado: this.store.filterEstado() ?? undefined,
			desde: this.store.filterDesde() ?? undefined,
			hasta: this.store.filterHasta() ?? undefined,
		};

		forkJoin({
			items: this.api.listar(filtros),
			stats: this.api.estadisticas(filtros.desde, filtros.hasta),
			tendencias: this.api.tendencias(filtros.desde, filtros.hasta),
		})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: ({ items, stats, tendencias }) => {
					this.store.setItems(items);
					this.store.setEstadisticas(stats);
					this.store.setTendencias(tendencias);
					this.store.setStatsReady(true);
					this.store.setTableReady(true);
					this.store.setTendenciasReady(true);
					this.store.setLoading(false);
				},
				error: () => {
					this.store.setLoading(false);
					this.store.setStatsReady(true);
					this.store.setTableReady(true);
					this.store.setTendenciasReady(true);
				},
			});
	}

	refresh(): void {
		this.loadData();
	}
	// #endregion

	// #region Filtros
	onSearchChange(term: string): void {
		this.store.setSearchTerm(term);
	}

	onFilterTipoChange(tipo: string | null): void {
		this.store.setFilterTipo(tipo as ReturnType<typeof this.store.filterTipo>);
		this.loadData();
	}

	onFilterEstadoChange(estado: string | null): void {
		this.store.setFilterEstado(estado as ReturnType<typeof this.store.filterEstado>);
		this.loadData();
	}

	onFilterTipoFalloChange(tipoFallo: string | null): void {
		this.store.setFilterTipoFallo(tipoFallo);
	}

	onFilterDesdeChange(desde: string | null): void {
		this.store.setFilterDesde(desde);
		this.loadData();
	}

	onFilterHastaChange(hasta: string | null): void {
		this.store.setFilterHasta(hasta);
		this.loadData();
	}
	// #endregion

	// #region Throttle status widget (Plan 22 Chat B)

	/**
	 * Hidrata auto-refresh + collapsed desde PreferencesStorage. Se llama una vez
	 * al montar el componente. Si auto-refresh venía ON, arranca el polling.
	 */
	initThrottleWidget(): void {
		const autoRefresh = this.storage.getThrottleWidgetAutoRefresh();
		const collapsed = this.storage.getThrottleWidgetCollapsed();
		this.store.setThrottleAutoRefresh(autoRefresh);
		this.store.setThrottleCollapsed(collapsed);

		this.loadThrottleStatus();
		if (autoRefresh) this.startThrottlePolling();
	}

	loadThrottleStatus(): void {
		this.store.setThrottleLoading(true);
		this.api
			.throttleStatus()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (status) => {
					this.store.setThrottleStatus(status);
					this.store.setThrottleLoading(false);
				},
				error: () => {
					this.store.setThrottleLoading(false);
					this.errorHandler.showError(
						'Throttle',
						'No se pudo cargar el estado del throttle',
					);
				},
			});
	}

	setThrottleAutoRefresh(enabled: boolean): void {
		this.store.setThrottleAutoRefresh(enabled);
		this.storage.setThrottleWidgetAutoRefresh(enabled);
		if (enabled) this.startThrottlePolling();
		else this.stopThrottlePolling();
	}

	setThrottleCollapsed(collapsed: boolean): void {
		this.store.setThrottleCollapsed(collapsed);
		this.storage.setThrottleWidgetCollapsed(collapsed);
	}

	private startThrottlePolling(): void {
		if (this.pollHandle) return;
		this.pollHandle = setInterval(
			() => this.loadThrottleStatus(),
			THROTTLE_POLL_INTERVAL_MS,
		);
	}

	private stopThrottlePolling(): void {
		if (this.pollHandle) {
			clearInterval(this.pollHandle);
			this.pollHandle = null;
		}
	}

	// #endregion
}

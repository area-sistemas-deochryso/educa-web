import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { facadeErrorHandler, type FacadeErrorHandler } from '@core/helpers';
import { ErrorHandlerService } from '@core/services/error';
import { StorageService } from '@core/services/storage';

import { EmailOutboxApiService } from './email-outbox.service';
import { EmailOutboxStore } from './email-outbox.store';

const THROTTLE_POLL_INTERVAL_MS = 30_000;
const DEFER_FAIL_POLL_INTERVAL_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class EmailOutboxDataFacade {
	// #region Dependencias
	private api = inject(EmailOutboxApiService);
	private store = inject(EmailOutboxStore);
	private destroyRef = inject(DestroyRef);
	private storage = inject(StorageService);
	private errHandler: FacadeErrorHandler = facadeErrorHandler({
		tag: 'EmailOutboxDataFacade',
		errorHandler: inject(ErrorHandlerService),
	});

	// Handle del polling activo. null cuando no hay polling corriendo.
	private pollHandle: ReturnType<typeof setInterval> | null = null;
	private deferFailPollHandle: ReturnType<typeof setInterval> | null = null;
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	constructor() {
		// Cleanup automático: detener polling cuando el servicio se destruye.
		// El provider es root-singleton, así que solo dispara si la app se
		// reinicia — igual dejamos el guard para no leakear el interval.
		this.destroyRef.onDestroy(() => {
			this.stopThrottlePolling();
			this.stopDeferFailPolling();
		});
	}

	// #region Carga de datos
	/**
	 * Plan 43 Chat 4.1b — paginación server-side variante B. Al aplicar filtros
	 * o refrescar, dispatch en paralelo: items (página actual) + count (total
	 * real) + stats + tendencias. El count se omite al cambiar de página
	 * (`loadPage`) porque los filtros no cambiaron — solo el offset.
	 */
	loadData(): void {
		this.store.setLoading(true);
		this.store.setError(null);

		const filtros = this.currentFiltros();
		const page = this.store.page();
		const pageSize = this.store.pageSize();

		forkJoin({
			items: this.api.listar({ ...filtros, page, pageSize }),
			count: this.api.count(filtros),
			stats: this.api.estadisticas(filtros.desde, filtros.hasta),
			tendencias: this.api.tendencias(filtros.desde, filtros.hasta),
		})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: ({ items, count, stats, tendencias }) => {
					this.store.setItems(items);
					this.store.setTotalCount(count);
					this.store.setEstadisticas(stats);
					this.store.setTendencias(tendencias);
					this.store.setDataReady(true);
					this.store.setLoading(false);
				},
				error: (err) => {
					this.errHandler.handle(err, 'cargar bandeja de correos', () => {
						this.store.setError('No se pudo cargar la bandeja de correos.');
						this.store.setDataReady(true);
						this.store.setLoading(false);
					});
				},
			});
	}

	/**
	 * Refetch solo del listado para una página dada — NO recarga el count
	 * (los filtros no cambiaron, el total tampoco; ahorra requests).
	 * Per `rules/pagination.md` §"loadPage no recarga el count".
	 *
	 * Guard idempotente: PrimeNG `[lazy]` dispara `onLazyLoad` al montar la
	 * tabla con el state inicial. Si los parámetros pedidos coinciden con el
	 * state actual del store y ya cargamos (loading o tableReady), ignoramos
	 * para evitar el doble fetch que de otro modo ocurriría tras `loadData()`.
	 */
	loadPage(page: number, pageSize: number): void {
		if (
			this.store.page() === page &&
			this.store.pageSize() === pageSize &&
			(this.store.loading() || this.store.tableReady())
		) {
			return;
		}

		this.store.setPaginationState(page, pageSize);
		this.store.setLoading(true);

		this.api
			.listar({ ...this.currentFiltros(), page, pageSize })
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this.store.setItems(items);
					this.store.setLoading(false);
				},
				error: (err) => {
					this.errHandler.handle(err, 'cargar página de correos', () => {
						this.store.setLoading(false);
					});
				},
			});
	}

	refresh(): void {
		this.store.setPage(1);
		this.loadData();
	}

	private currentFiltros(): {
		tipo: string | undefined;
		estado: string | undefined;
		tipoFallo: string | undefined;
		lastSmtpCode: string | undefined;
		correlationId: string | undefined;
		desde: string | undefined;
		hasta: string | undefined;
		search: string | undefined;
	} {
		return {
			tipo: this.store.filterTipo() ?? undefined,
			estado: this.store.filterEstado() ?? undefined,
			tipoFallo: this.store.filterTipoFallo() ?? undefined,
			lastSmtpCode: this.store.filterLastSmtpCode() ?? undefined,
			correlationId: this.store.filterCorrelationId() ?? undefined,
			desde: this.store.filterDesde() ?? undefined,
			hasta: this.store.filterHasta() ?? undefined,
			search: this.store.searchTerm() || undefined,
		};
	}
	// #endregion

	// #region Filtros
	onSearchChange(term: string): void {
		this.store.setSearchTerm(term);
		this.store.setPage(1);
		this.loadData();
	}

	onFilterTipoChange(tipo: string | null): void {
		this.store.setFilterTipo(tipo as ReturnType<typeof this.store.filterTipo>);
		this.store.setPage(1);
		this.loadData();
	}

	onFilterEstadoChange(estado: string | null): void {
		this.store.setFilterEstado(estado as ReturnType<typeof this.store.filterEstado>);
		this.store.setPage(1);
		this.loadData();
	}

	/**
	 * Plan 43 Chat 4.1b — bug fix: el handler dejaba el signal seteado pero no
	 * refetcheaba, así el filtro `tipoFallo` quedaba inerte en la UI.
	 */
	onFilterTipoFalloChange(tipoFallo: string | null): void {
		this.store.setFilterTipoFallo(tipoFallo);
		this.store.setPage(1);
		this.loadData();
	}

	onFilterLastSmtpCodeChange(code: string | null): void {
		this.store.setFilterLastSmtpCode(code);
		this.store.setPage(1);
		this.loadData();
	}

	onFilterCorrelationIdChange(correlationId: string | null): void {
		this.store.setFilterCorrelationId(correlationId);
		this.store.setPage(1);
		this.loadData();
	}

	onFilterDesdeChange(desde: string | null): void {
		this.store.setFilterDesde(desde);
		this.store.setPage(1);
		this.loadData();
	}

	onFilterHastaChange(hasta: string | null): void {
		this.store.setFilterHasta(hasta);
		this.store.setPage(1);
		this.loadData();
	}

	/**
	 * Plan 32 Chat 4 — deep-link desde el hub con `?correlationId=<id>`. Solo
	 * setea el signal (el caller decide cuándo refetchear; en init, dataFacade
	 * llama a `loadData()` después de setear el deep-link).
	 */
	setFilterCorrelationId(correlationId: string | null): void {
		this.store.setFilterCorrelationId(correlationId);
	}

	/**
	 * Plan 43 Chat 4.1b — resetea todos los filtros + page=1 + refetch.
	 */
	clearFilters(): void {
		this.store.clearFilters();
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
				error: (err) => {
					this.errHandler.handle(err, 'cargar estado del throttle', () => {
						this.store.setThrottleLoading(false);
					});
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

	// #region Defer/fail status widget (Plan 22 Chat B / Plan 29 Chat 2.6)

	/**
	 * Hidrata auto-refresh + collapsed desde PreferencesStorage. Se llama una
	 * vez al montar el componente. Si auto-refresh venía ON, arranca polling.
	 */
	initDeferFailWidget(): void {
		const autoRefresh = this.storage.getDeferFailWidgetAutoRefresh();
		const collapsed = this.storage.getDeferFailWidgetCollapsed();
		this.store.setDeferFailAutoRefresh(autoRefresh);
		this.store.setDeferFailCollapsed(collapsed);

		this.loadDeferFailStatus();
		if (autoRefresh) this.startDeferFailPolling();
	}

	loadDeferFailStatus(): void {
		this.store.setDeferFailLoading(true);
		this.api
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

	setDeferFailAutoRefresh(enabled: boolean): void {
		this.store.setDeferFailAutoRefresh(enabled);
		this.storage.setDeferFailWidgetAutoRefresh(enabled);
		if (enabled) this.startDeferFailPolling();
		else this.stopDeferFailPolling();
	}

	setDeferFailCollapsed(collapsed: boolean): void {
		this.store.setDeferFailCollapsed(collapsed);
		this.storage.setDeferFailWidgetCollapsed(collapsed);
	}

	private startDeferFailPolling(): void {
		if (this.deferFailPollHandle) return;
		this.deferFailPollHandle = setInterval(
			() => this.loadDeferFailStatus(),
			DEFER_FAIL_POLL_INTERVAL_MS,
		);
	}

	private stopDeferFailPolling(): void {
		if (this.deferFailPollHandle) {
			clearInterval(this.deferFailPollHandle);
			this.deferFailPollHandle = null;
		}
	}

	// #endregion

	// #region Overview strip — stats + trend chart (brief 386)

	/** Hidrata el estado colapsado desde PreferencesStorage al montar el componente. */
	initOverviewWidget(): void {
		this.store.setOverviewCollapsed(this.storage.getOverviewWidgetCollapsed());
	}

	setOverviewCollapsed(collapsed: boolean): void {
		this.store.setOverviewCollapsed(collapsed);
		this.storage.setOverviewWidgetCollapsed(collapsed);
	}

	// #endregion
}

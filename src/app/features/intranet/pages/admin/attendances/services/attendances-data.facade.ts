import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';

import { logger, facadeErrorHandler, type FacadeErrorHandler } from '@core/helpers';
import { ErrorHandlerService, WalCrossTabRefetchService } from '@core/services';
import {
	CrossChexSyncAceptadoDto,
	CrossChexSyncStatusService,
} from '@core/services/signalr';
import { SyncRangoRequest, TipoPersonaAsistencia, TipoPersonaFilter } from '../models';
import { AttendancesAdminService } from './attendances-admin.service';
import { AttendancesAdminStore } from './attendances-admin.store';

/** Convierte el filtro UI (`'todos'`) al param que el backend espera (`null`). */
function toApiTipoPersona(filter: TipoPersonaFilter): TipoPersonaAsistencia | null {
	return filter === 'todos' ? null : filter;
}

@Injectable({ providedIn: 'root' })
export class AttendancesDataFacade {
	// #region Dependencias
	private api = inject(AttendancesAdminService);
	private store = inject(AttendancesAdminStore);
	private syncService = inject(CrossChexSyncStatusService);
	private crossTabRefetch = inject(WalCrossTabRefetchService);
	private destroyRef = inject(DestroyRef);
	private errHandler: FacadeErrorHandler = facadeErrorHandler({
		tag: 'AttendancesDataFacade',
		errorHandler: inject(ErrorHandlerService),
	});
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// Trigger debounced para input search del usuario (300ms). Deep-links
	// usan `setSearchAndReload` que salta el debounce.
	private readonly _searchTrigger$ = new Subject<string>();

	// Trigger debounced para búsqueda server-side de personas en el modal
	// "Registrar asistencia manual" (brief 204). Cambiar de tipo (E/P/A) o
	// tipear en el dropdown emite acá; switchMap cancela la request anterior.
	private readonly _personasSearchTrigger$ = new Subject<{
		tipo: TipoPersonaAsistencia;
		search: string;
	}>();

	constructor() {
		this.crossTabRefetch.subscribe({
			resourceType: 'asistencia-admin',
			refetchItems: () => this.refreshItemsOnly(),
			refetchStats: () => this.loadEstadisticas(),
			destroyRef: this.destroyRef,
		});
		this.crossTabRefetch.subscribe({
			resourceType: 'cierre-asistencia',
			refetchItems: () => this.loadCierres(),
			destroyRef: this.destroyRef,
		});

		this._searchTrigger$
			.pipe(
				debounceTime(300),
				distinctUntilChanged(),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe(() => {
				this.store.setTableReady(false);
				this.loadItems();
			});

		this._personasSearchTrigger$
			.pipe(
				debounceTime(250),
				distinctUntilChanged((a, b) => a.tipo === b.tipo && a.search === b.search),
				switchMap(({ tipo, search }) => {
					this.store.setPersonasLoading(true);
					const sedeId = this.store.sedeId() ?? undefined;
					return this.api
						.listarPersonas(sedeId, search || undefined, tipo)
						.pipe(catchError((err) => {
							this.errHandler.handle(err, 'buscar personas', () => {
								this.store.setPersonasLoading(false);
							});
							return of([]);
						}));
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((personas) => {
				this.store.setPersonas(personas ?? []);
				this.store.setPersonasLoading(false);
			});
	}

	// #region Carga de datos

	loadData(): void {
		this.loadEstadisticas();
		this.loadItems();
	}

	loadEstadisticas(): void {
		const fecha = this.store.fecha();
		const sedeId = this.store.sedeId() ?? undefined;
		this.api
			.obtenerEstadisticas(fecha, sedeId, null)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (stats) => {
					if (stats) this.store.setEstadisticas(stats);
					this.store.setStatsReady(true);
				},
				error: (err) => {
					this.errHandler.handle(err, 'cargar estadísticas', () => {
						this.store.setStatsReady(true);
					});
				},
			});
	}

	loadItems(): void {
		if (this.store.loading()) return;
		this.store.setLoading(true);
		this.store.setError(null);

		const fecha = this.store.fecha();
		const sedeId = this.store.sedeId() ?? undefined;
		const tipoPersona = toApiTipoPersona(this.store.tipoPersonaFilter());
		const search = this.store.searchTerm()?.trim() || undefined;

		this.api
			.listarDelDia(fecha, sedeId, search, tipoPersona)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this.store.setItems(items ?? []);
					this.store.setTableReady(true);
					this.store.setLoading(false);
				},
				error: (err) => {
					this.errHandler.handle(err, 'cargar asistencias del día', () => {
						this.store.setError('No se pudieron cargar las asistencias.');
						this.store.setTableReady(true);
						this.store.setLoading(false);
					});
				},
			});
	}

	refreshItemsOnly(): void {
		const fecha = this.store.fecha();
		const sedeId = this.store.sedeId() ?? undefined;
		const tipoPersona = toApiTipoPersona(this.store.tipoPersonaFilter());
		const search = this.store.searchTerm()?.trim() || undefined;

		this.api
			.listarDelDia(fecha, sedeId, search, tipoPersona)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this.store.setItems(items ?? []);
				},
				error: (err) => {
					this.errHandler.handle(err, 'refrescar asistencias');
				},
			});
	}

	loadPersonas(tipoPersona: TipoPersonaAsistencia | null, search?: string): void {
		const sedeId = this.store.sedeId() ?? undefined;
		this.store.setPersonasLoading(true);

		this.api
			.listarPersonas(sedeId, search, tipoPersona)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (personas) => {
					this.store.setPersonas(personas ?? []);
					this.store.setPersonasLoading(false);
				},
				error: (err) => {
					this.errHandler.handle(err, 'cargar personas', () => {
						this.store.setPersonasLoading(false);
					});
				},
			});
	}

	/**
	 * Brief 204 — búsqueda server-side de personas para el modal "Registrar
	 * asistencia manual". Emite al trigger debounced (250ms) con switchMap
	 * para cancelar requests en vuelo. Llamar desde el evento `onFilter` del
	 * `p-select` de personas.
	 */
	searchPersonas(tipo: TipoPersonaAsistencia, search: string): void {
		this._personasSearchTrigger$.next({ tipo, search: search?.trim() ?? '' });
	}

	/** Alias retrocompat — carga personas del tipo configurado (default `E`). */
	loadEstudiantes(search?: string): void {
		const filter = this.store.tipoPersonaFilter();
		this.loadPersonas(toApiTipoPersona(filter), search);
	}

	/** Carga personas de todos los tipos — para el dialog de sync por rango. */
	loadAllPersonas(search?: string): void {
		this.loadPersonas(null, search);
	}

	loadCierres(): void {
		const sedeId = this.store.sedeId() ?? undefined;
		const anio = new Date().getFullYear();

		this.api
			.listarCierres(sedeId, anio)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (cierres) => {
					this.store.setCierres(cierres ?? []);
				},
				error: (err) => {
					this.errHandler.handle(err, 'cargar cierres mensuales');
				},
			});
	}

	// #endregion

	// #region Sincronización CrossChex (Plan 24 Chat 3 — background job)

	/**
	 * Dispara el sync background y delega el tracking del progreso al
	 * `CrossChexSyncStatusService`. El POST retorna 202 Accepted con
	 * `{ jobId, estado: "QUEUED" }`; en 409 Conflict el body del error trae
	 * el jobId del sync ya activo (UX conveniente — re-suscribimos a ese).
	 *
	 * El éxito final (COMPLETED) y error (FAILED) se observan vía
	 * `syncService.terminal$` — el componente orquesta toast + refetch ahí.
	 */
	sincronizarDesdeCrossChex(onError?: (err: unknown) => void): void {
		if (this.syncService.isActive()) return;
		if (this.store.syncing()) return;
		this.store.setSyncing(true);

		const fecha = this.store.fecha();

		this.api
			.sincronizarDesdeCrossChex(fecha)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (dto) => {
					this.store.setSyncing(false);
					void this.syncService.startTracking(dto.jobId);
				},
				error: (err) => {
					this.store.setSyncing(false);
					const conflict = this.tryExtractConflict(err);
					if (conflict) {
						logger.log('[Sync] 409 con job activo — re-suscribiendo', conflict);
						void this.syncService.startTracking(conflict.jobId);
						return;
					}
					logger.error('Error al sincronizar:', err);
					onError?.(err);
				},
			});
	}

	sincronizarRango(
		body: SyncRangoRequest,
		onError?: (err: unknown) => void,
	): void {
		if (this.syncService.isActive()) return;
		if (this.store.syncing()) return;
		this.store.setSyncing(true);

		this.api
			.sincronizarRango(body)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (dto) => {
					this.store.setSyncing(false);
					void this.syncService.startTracking(dto.jobId);
				},
				error: (err) => {
					this.store.setSyncing(false);
					const conflict = this.tryExtractConflict(err);
					if (conflict) {
						logger.log('[SyncRange] 409 con job activo — re-suscribiendo', conflict);
						void this.syncService.startTracking(conflict.jobId);
						return;
					}
					logger.error('Error al sincronizar rango:', err);
					onError?.(err);
				},
			});
	}

	/**
	 * Extrae el DTO del 409 Conflict. El BE responde con
	 * `{ success: false, data: { jobId, estado }, message }` y el interceptor
	 * NO unwrappea respuestas con `success: false` → el body queda crudo en
	 * `HttpErrorResponse.error`.
	 */
	private tryExtractConflict(err: unknown): CrossChexSyncAceptadoDto | null {
		if (!(err instanceof HttpErrorResponse) || err.status !== 409) return null;
		const body = err.error as { data?: unknown } | null;
		if (!body?.data) return null;

		const data = body.data as Record<string, unknown>;
		const jobId = (data['jobId'] ?? data['JobId']) as string | undefined;
		const estado = (data['estado'] ?? data['Estado']) as
			| CrossChexSyncAceptadoDto['estado']
			| undefined;
		if (!jobId || !estado) return null;
		return { jobId, estado };
	}

	// #endregion

	// #region Filtros

	onFechaChange(fecha: string): void {
		this.store.setFecha(fecha);
		this.store.setStatsReady(false);
		this.store.setTableReady(false);
		this.loadData();
	}

	onSedeChange(sedeId: number | null): void {
		this.store.setSedeId(sedeId);
		this.store.setStatsReady(false);
		this.store.setTableReady(false);
		this.loadData();
	}

	onSearch(term: string): void {
		this.store.setSearchTerm(term);
		this._searchTrigger$.next(term);
	}

	/**
	 * Setea el término de búsqueda y dispara refetch inmediato (sin debounce).
	 * Pensado para deep-links (`?dni=...`) donde el valor viene de queryParam,
	 * no de input del usuario.
	 */
	setSearchAndReload(term: string): void {
		this.store.setSearchTerm(term);
		this.store.setTableReady(false);
		this.loadItems();
	}

	onTipoPersonaChange(tipo: TipoPersonaFilter): void {
		if (this.store.tipoPersonaFilter() === tipo) return;
		this.store.setTipoPersonaFilter(tipo);
		this.store.setTableReady(false);
		this.loadItems();
	}

	// #endregion
}

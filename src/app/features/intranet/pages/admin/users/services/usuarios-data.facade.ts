import { DestroyRef, Injectable, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, filter, switchMap, tap } from 'rxjs/operators';
import { forkJoin, from, of, Subject } from 'rxjs';

import { ErrorHandlerService, SwService, WalService } from '@core/services';
import { logger, withRetry } from '@core/helpers';
import { UI_ADMIN_ERROR_DETAILS, UI_SUMMARIES } from '@app/shared/constants';
import { RolUsuarioAdmin, UsuarioLista, UsuariosEstadisticas } from '../models';
import { UsersService } from './usuarios.service';
import { UsersStore } from './usuarios.store';
import { ClassroomsApiService } from '@features/intranet/pages/admin/schedules/services/salones-api.service';
import { ApiResponse } from '@shared/models';
import { map } from 'rxjs/operators';
import { SalonListDto } from '@features/intranet/pages/admin/schedules/models/salon.interface';

/**
 * Facade for data loading, search, filtering, and cache refresh.
 * Handles the read side of usuarios management.
 */
@Injectable({ providedIn: 'root' })
export class UsersDataFacade {
	private usuariosService = inject(UsersService);
	private salonesApi = inject(ClassroomsApiService);
	private store = inject(UsersStore);
	private errorHandler = inject(ErrorHandlerService);
	private swService = inject(SwService);
	private walService = inject(WalService);
	private destroyRef = inject(DestroyRef);
	private readonly searchTrigger$ = new Subject<string>();
	// Timestamp de última mutación CRUD para ignorar cache updates stale
	private lastCrudMutationTime = 0;
	private static readonly CACHE_COOLDOWN_MS = 3000;

	// Expone ViewModel del store
	readonly vm = this.store.vm;

	constructor() {
		this.setupSearchPipeline();
		this.setupCacheRefresh();
		this.setupRefreshOnCrudCommit();
	}

	// #region Data Loading

	loadData(): void {
		this.store.setShowSkeletons(true);
		this.store.setStatsReady(false);
		this.store.setTableReady(false);
		this.store.setLoading(true);
		this.store.clearError();

		const page = this.store.page();
		const pageSize = this.store.pageSize();
		const rol = this.store.filterRol() ?? undefined;
		const estado = (this.store.filterEstado() as boolean | null) ?? undefined;
		const search = this.store.searchTerm() || undefined;
		const salonId = this.store.filterSalonId() ?? undefined;

		forkJoin({
			estadisticas: this.usuariosService.obtenerEstadisticas().pipe(
				withRetry({ tag: 'UsuariosDataFacade:loadEstadisticas' }),
				catchError((err) => {
					logger.error('Error cargando estadisticas:', err);
					return of(null);
				}),
			),
			salones: this.salonesApi.listar().pipe(
				withRetry({ tag: 'UsuariosDataFacade:loadSalones' }),
				catchError((err) => {
					logger.error('Error cargando salones:', err);
					return of([] as SalonListDto[]);
				}),
			),
			usuarios: this.usuariosService.listarUsuariosPaginado(page, pageSize, rol, estado, search, salonId).pipe(
				withRetry({ tag: 'UsuariosDataFacade:loadUsuarios' }),
				catchError((err) => {
					logger.error('Error cargando usuarios:', err);
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						UI_ADMIN_ERROR_DETAILS.loadUsuarios,
					);
					this.store.setError(UI_ADMIN_ERROR_DETAILS.loadUsuarios);
					return of({
						data: [] as UsuarioLista[],
						total: 0,
						page,
						pageSize,
						totalPages: 0,
						hasNextPage: false,
						hasPreviousPage: false,
					});
				}),
			),
		})
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe(({ estadisticas, salones, usuarios }) => {
				if (estadisticas) {
					this.store.setEstadisticas(estadisticas);
				}
				this.store.setStatsReady(true);

				this.store.setSalones(salones);
				this.store.setSalonesFilter(salones);

				this.store.setItems(usuarios.data);
				this.store.setPaginationData(usuarios.page, usuarios.pageSize, usuarios.total);
				this.store.setTableReady(true);
				this.store.setLoading(false);

				setTimeout(() => {
					this.store.setShowSkeletons(false);
				}, 50);
			});
	}

	refresh(): void {
		// Invalidar cache SW para garantizar datos frescos del servidor
		this.swService.invalidateCacheByPattern('/usuarios').then(() => {
			this.loadData();
		});
	}

	/** Cargar una pagina especifica (llamado desde onLazyLoad de p-table) */
	loadPage(page: number, pageSize: number): void {
		this.store.setPage(page);
		this.store.setPageSize(pageSize);
		this.refreshUsuariosOnly();
	}

	// #endregion
	// #region Filters

	/**
	 * Busqueda server-side con debounce via RxJS Subject.
	 * El usuario escribe -> Subject emite -> debounceTime(300) -> distinctUntilChanged -> switchMap a API.
	 */
	setSearchTerm(term: string): void {
		this.store.setSearchTerm(term);
		this.searchTrigger$.next(term);
	}

	setFilterRol(rol: string | null): void {
		this.store.setFilterRol(rol as RolUsuarioAdmin | null);
		this.store.setPage(1);
		this.refreshUsuariosOnly();
	}

	setFilterEstado(estado: boolean | null): void {
		this.store.setFilterEstado(estado);
		this.store.setPage(1);
		this.refreshUsuariosOnly();
	}

	setFilterSalonId(salonId: number | null): void {
		this.store.setFilterSalonId(salonId);
		this.store.setPage(1);
		this.refreshUsuariosOnly();
	}

	clearFilters(): void {
		this.store.clearFiltros();
		this.refreshUsuariosOnly();
	}

	// #endregion
	// #region Private Helpers

	/**
	 * Refresh solo la lista de usuarios paginada (sin resetear skeletons ni estadisticas).
	 * @param silent - Si true, no muestra loading en la tabla (para refetch post-CRUD sin interrumpir UX)
	 */
	refreshUsuariosOnly(silent = false): void {
		if (!silent) {
			this.store.setLoading(true);
		}

		const page = this.store.page();
		const pageSize = this.store.pageSize();
		const rol = this.store.filterRol() ?? undefined;
		const estado = (this.store.filterEstado() as boolean | null) ?? undefined;
		const search = this.store.searchTerm() || undefined;
		const salonId = this.store.filterSalonId() ?? undefined;

		this.usuariosService
			.listarUsuariosPaginado(page, pageSize, rol, estado, search, salonId)
			.pipe(
				withRetry({ tag: 'UsuariosDataFacade:refreshUsuariosOnly' }),
				catchError((err) => {
					logger.error('Error cargando usuarios:', err);
					this.errorHandler.showError(
						UI_SUMMARIES.error,
						UI_ADMIN_ERROR_DETAILS.loadUsuarios,
					);
					return of({
						data: [] as UsuarioLista[],
						total: 0,
						page,
						pageSize,
						totalPages: 0,
						hasNextPage: false,
						hasPreviousPage: false,
					});
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((result) => {
				this.store.setItems(result.data);
				this.store.setPaginationData(result.page, result.pageSize, result.total);
				if (!silent) {
					this.store.setLoading(false);
				}
			});
	}

	/**
	 * Marca que una mutación CRUD acaba de ocurrir.
	 * Esto evita que cacheUpdated$ sobreescriba datos optimistas con cache stale.
	 */
	markCrudMutation(): void {
		this.lastCrudMutationTime = Date.now();
	}

	/** Wire refresh so CrudFacade can trigger refresh without circular dependency */
	private setupRefreshOnCrudCommit(): void {
		effect(() => {
			const counter = this.store.refreshCounter();
			if (counter > 0) {
				this.lastCrudMutationTime = Date.now();
				// El interceptor swCacheInvalidationInterceptor invalida el cache del SW
				// de forma asíncrona (tap sin await). Forzamos la invalidación aquí antes
				// del refetch para evitar que el GET pegue contra cache stale y pierda
				// los registros recién creados. Silent=true: sin loading visible.
				this.swService.invalidateCacheByPattern('/usuarios').then(() => {
					this.refreshUsuariosOnly(true);
				});
			}
		});
	}

	/**
	 * Pipeline de busqueda server-side:
	 * searchTrigger$ -> debounceTime(300ms) -> distinctUntilChanged -> switchMap(API)
	 */
	private setupSearchPipeline(): void {
		this.searchTrigger$
			.pipe(
				debounceTime(300),
				distinctUntilChanged(),
				tap(() => {
					this.store.setPage(1);
					this.store.setLoading(true);
				}),
				switchMap((search) => {
					const page = 1;
					const pageSize = this.store.pageSize();
					const rol = this.store.filterRol() ?? undefined;
					const estado = (this.store.filterEstado() as boolean | null) ?? undefined;
					const salonId = this.store.filterSalonId() ?? undefined;

					return this.usuariosService
						.listarUsuariosPaginado(page, pageSize, rol, estado, search || undefined, salonId)
						.pipe(
							withRetry({ tag: 'UsuariosDataFacade:searchUsuarios' }),
							catchError((err) => {
								logger.error('Error buscando usuarios:', err);
								this.errorHandler.showError(
									UI_SUMMARIES.error,
									UI_ADMIN_ERROR_DETAILS.loadUsuarios,
								);
								return of({
									data: [] as UsuarioLista[],
									total: 0,
									page,
									pageSize,
									totalPages: 0,
									hasNextPage: false,
									hasPreviousPage: false,
								});
							}),
						);
				}),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((result) => {
				this.store.setItems(result.data);
				this.store.setPaginationData(result.page, result.pageSize, result.total);
				this.store.setLoading(false);
			});
	}

	/**
	 * Auto-refresh cuando el SW detecta datos nuevos del servidor (SWR).
	 * Skips update if WAL has pending mutations or if a CRUD mutation just happened
	 * (cooldown) to avoid overwriting optimistic state with stale cache.
	 */
	private setupCacheRefresh(): void {
		const isInCooldown = () =>
			Date.now() - this.lastCrudMutationTime < UsersDataFacade.CACHE_COOLDOWN_MS;

		this.swService.cacheUpdated$
			.pipe(
				filter(
					(event) =>
						event.url.includes('/usuarios') && !event.url.includes('estadisticas'),
				),
				filter(() => !isInCooldown()),
				switchMap((event) =>
					from(this.walService.hasPendingForResource('usuarios')).pipe(
						filter((hasPending) => !hasPending),
						switchMap(() => of(event)),
					),
				),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((event) => {
				logger.log('[UsuariosDataFacade] Lista usuarios actualizada desde SW');
				const data = event.data;

				if (data && typeof data === 'object' && 'data' in data && 'total' in data) {
					const paginated = data as { data: UsuarioLista[]; total: number; page: number; pageSize: number };
					this.store.setItems(paginated.data);
					this.store.setPaginationData(paginated.page, paginated.pageSize, paginated.total);
				} else if (Array.isArray(data)) {
					this.store.setItems(data);
				} else {
					logger.warn('[UsuariosDataFacade] Formato de cache inesperado, ignorando');
				}
			});

		this.swService.cacheUpdated$
			.pipe(
				filter((event) => event.url.includes('/usuarios/estadisticas')),
				filter(() => !isInCooldown()),
				switchMap((event) =>
					from(this.walService.hasPendingForResource('usuarios')).pipe(
						filter((hasPending) => !hasPending),
						switchMap(() => of(event)),
					),
				),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((event) => {
				logger.log('[UsuariosDataFacade] Estadisticas actualizadas desde SW');
				this.store.setEstadisticas(event.data as UsuariosEstadisticas);
			});
	}

	// #endregion
}

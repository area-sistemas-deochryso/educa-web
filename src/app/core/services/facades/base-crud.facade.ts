import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Observable } from 'rxjs';

import {
	logger, withRetry, getEstadoToggleDeltas,
	facadeErrorHandler, type FacadeErrorHandler,
} from '@core/helpers';
// eslint-disable-next-line layer-enforcement/imports-error -- DEBT: xrepo-50-F3a
import { HasId } from '@shared/interfaces';
// eslint-disable-next-line layer-enforcement/imports-error -- DEBT: xrepo-50-F3a
import { UI_ADMIN_ERROR_DETAILS, UI_SUMMARIES } from '@shared/constants';
import { ActivityTrackerService, ErrorHandlerService } from '@core/services/error';
import { SwService } from '@core/services/sw';
import { WalFacadeHelper, WalCrossTabRefetchService } from '@core/services/wal';
import type { BaseCrudStore } from '@core/store';
import type {
	BaseCrudFacadeConfig,
	EstadisticaKeys,
	HasEstado,
	PaginatedResult,
} from './base-crud.facade.types';
import { WalCrudOps } from './wal-crud-ops';

export type {
	BaseCrudFacadeConfig,
	EstadisticaKeys,
	HasEstado,
	PaginatedResult,
} from './base-crud.facade.types';

/**
 * Clase base para facades de módulos CRUD admin.
 *
 * Elimina ~200 líneas de boilerplate por facade al proveer:
 * - Dialog delegation (openNew, openEdit, close, confirm)
 * - WAL CRUD operations (create, update, toggle, delete) con optimistic UI
 * - Load initial (forkJoin items + stats)
 * - Pagination (loadPage + refreshItemsOnly)
 * - Error handling vía facadeErrorHandler
 * - Stats incrementales en toggle/delete
 *
 * El facade concreto solo define lo que es ESPECÍFICO del feature:
 * - Qué API llama (observables)
 * - Cómo construir payloads
 * - Claves de estadísticas
 * - Filtros adicionales
 *
 * @typeParam T - Tipo de la entidad (debe tener `id: number`)
 * @typeParam TForm - Shape del formulario
 * @typeParam TStats - Shape de las estadísticas
 */
@Injectable()
export abstract class BaseCrudFacade<
	T extends HasId & HasEstado,
	TForm = Record<string, unknown>,
	TStats = Record<string, unknown>,
> {
	// #region Dependencias (heredadas)
	protected readonly errorHandler = inject(ErrorHandlerService);
	protected readonly swService = inject(SwService);
	protected readonly wal = inject(WalFacadeHelper);
	protected readonly crossTabRefetch = inject(WalCrossTabRefetchService);
	protected readonly destroyRef = inject(DestroyRef);
	protected readonly errHandler: FacadeErrorHandler;
	private readonly _activityTracker = inject(ActivityTrackerService);
	protected crudOps!: WalCrudOps<T, TForm, TStats>;
	// #endregion

	// #region Configuración (provista por el concreto)
	protected abstract readonly store: BaseCrudStore<T, TForm, TStats>;
	protected abstract readonly config: BaseCrudFacadeConfig;
	// #endregion

	// #endregion

	constructor() {
		// Defer errHandler initialization to allow subclass to set config
		this.errHandler = null!;
	}

	/** Llamar en el constructor del facade concreto después de super() */
	protected initErrorHandler(): void {
		(this as unknown as { errHandler: FacadeErrorHandler }).errHandler = facadeErrorHandler({
			tag: this.config.tag,
			errorHandler: this.errorHandler,
		});
		this.crudOps = new WalCrudOps(this.wal, this.store, {
			tag: this.config.tag,
			resourceType: this.config.resourceType,
			apiUrl: this.config.apiUrl,
		}, this.errorHandler);
	}

	/** Llamar tras `initErrorHandler()`. Ver `rules/optimistic-ui.md` § "Refetch cross-tab". */
	protected initCrossTabRefetch(): void {
		if (this.config.crossTabRefetch === false) return;
		this.crossTabRefetch.subscribe({
			resourceType: this.config.resourceType,
			refetchItems: () => this.silentRefreshAfterCrud(),
			refetchStats: () => this.refreshEstadisticas(),
			destroyRef: this.destroyRef,
		});
	}

	// #region Carga inicial

	/**
	 * Carga inicial: items paginados + estadísticas en paralelo.
	 * Override `getLoadAllSources()` para agregar fuentes adicionales (ej: grados).
	 */
	loadAll(): void {
		this.store.setLoading(true);
		this.store.clearError();

		forkJoin(this.getLoadAllSources())
			.pipe(
				withRetry({ tag: `${this.config.tag}:loadAll` }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (result) => {
					this.applyLoadAllResult(result);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error(`${this.config.tag}: Error al cargar:`, err);
					this.errorHandler.showError(UI_SUMMARIES.error, this.config.loadErrorMessage);
					this.store.setError(this.config.loadErrorMessage);
					this.store.setLoading(false);
				},
			});
	}

	/** Fuentes para la carga inicial. Override para agregar (ej: grados). */
	protected getLoadAllSources(): Record<string, Observable<unknown>> {
		return {
			items: this.fetchItems(),
			stats: this.fetchEstadisticas(),
		};
	}

	/** Aplica los resultados de loadAll. Override para manejar fuentes adicionales. */
	protected applyLoadAllResult(result: Record<string, unknown>): void {
		const items = result['items'] as PaginatedResult<T>;
		this.store.setItems(items.data);
		this.store.setPaginationData(items.page, items.pageSize, items.total);
		this.store.setEstadisticas(result['stats'] as TStats);
	}

	// #endregion

	// #region Paginación y Refresh

	loadPage(page: number, pageSize: number): void {
		this.store.setPage(page);
		this.store.setPageSize(pageSize);
		this.refreshItemsOnly();
	}

	/**
	 * Refresh manual (botón Actualizar): invalida cache SW + recarga completa.
	 * Override en facades concretos si necesitan recargar fuentes adicionales.
	 */
	refresh(): void {
		this.swService.invalidateCacheByPattern(this.getCachePattern()).then(() => {
			this.loadAll();
		});
	}

	/**
	 * @param silent - Si true, no muestra loading (para refetch post-CRUD sin interrumpir UX)
	 */
	protected refreshItemsOnly(silent = false): void {
		if (!silent) {
			this.store.setLoading(true);
		}

		this.fetchItems()
			.pipe(
				withRetry({ tag: `${this.config.tag}:refreshItems` }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (result) => {
					this.store.setItems(result.data);
					this.store.setPaginationData(result.page, result.pageSize, result.total);
					if (!silent) {
						this.store.setLoading(false);
					}
				},
				error: (err) => {
					logger.error(`${this.config.tag}: Error al refrescar:`, err);
					this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.refreshData);
					if (!silent) {
						this.store.setLoading(false);
					}
				},
			});
	}

	/**
	 * Refetch silencioso post-CRUD: refresh sin loading visible.
	 * El interceptor swCacheInvalidationInterceptor ya invalidó el cache
	 * del SW al completarse la mutación, así que el GET va directo a red.
	 */
	protected silentRefreshAfterCrud(): void {
		this.refreshItemsOnly(true);
	}

	protected refreshEstadisticas(): void {
		this.fetchEstadisticas()
			.pipe(
				withRetry({ tag: `${this.config.tag}:refreshStats` }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (stats) => this.store.setEstadisticas(stats),
				error: (err) => {
					logger.error(`${this.config.tag}: Error al refrescar estadísticas:`, err);
					this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.refreshData);
				},
			});
	}

	/** Patrón de URL para invalidar cache SW. Override si la ruta API no coincide con resourceType. */
	protected getCachePattern(): string {
		return `/${this.config.resourceType.toLowerCase()}`;
	}

	// #endregion

	// #region WAL CRUD — delegated to WalCrudOps

	protected walCreate(
		payload: unknown,
		http$: () => Observable<unknown>,
		endpointSuffix = 'crear',
	): void {
		this.crudOps.walCreate(payload, http$, {
			endpointSuffix,
			callbacks: {
				optimisticApply: () => this.store.closeDialog(),
				onCommit: () => {
					this.silentRefreshAfterCrud();
					this.refreshEstadisticas();
				},
				errorLabel: this.getCreateErrorLabel(),
			},
		});
	}

	protected walUpdate(
		id: number,
		payload: unknown,
		optimisticUpdates: Partial<T>,
		http$: () => Observable<unknown>,
		endpointSuffix = `${id}/actualizar`,
	): void {
		this.crudOps.walUpdate(id, payload, optimisticUpdates, http$, {
			endpointSuffix,
			callbacks: {
				onCommit: () => this.silentRefreshAfterCrud(),
				errorLabel: this.getUpdateErrorLabel(),
			},
		});
	}

	protected walToggle(
		item: T,
		payload: unknown,
		http$: () => Observable<unknown>,
		statsKeys: EstadisticaKeys,
		toggleFn: (id: number) => void,
	): void {
		const isActivo = this.resolveEstadoActivo(item);
		this.crudOps.walToggle(item as T & HasEstado, payload, http$, toggleFn, {
			statsDelta: (sign) => {
				const d = getEstadoToggleDeltas(isActivo);
				this.store.incrementarEstadistica(statsKeys.activos as keyof TStats, sign * d.activosDelta);
				this.store.incrementarEstadistica(statsKeys.inactivos as keyof TStats, sign * d.inactivosDelta);
			},
		});
	}

	protected walDelete(
		item: T,
		http$: () => Observable<unknown>,
		statsKeys: EstadisticaKeys,
		endpointSuffix?: string,
		mode: 'soft' | 'hard' = 'soft',
	): void {
		const isActivo = this.resolveEstadoActivo(item);
		const op = mode === 'soft' ? 'delete-soft' : 'delete-hard';
		const statsDelta = (sign: 1 | -1): void => {
			const d = getEstadoToggleDeltas(isActivo, op);
			if (mode === 'hard') {
				this.store.incrementarEstadistica(statsKeys.total as keyof TStats, sign * -1);
			}
			this.store.incrementarEstadistica(statsKeys.activos as keyof TStats, sign * d.activosDelta);
			this.store.incrementarEstadistica(statsKeys.inactivos as keyof TStats, sign * d.inactivosDelta);
		};

		if (mode === 'soft') {
			this.crudOps.walDeleteSoft(item as T & HasEstado, http$, {
				endpointSuffix,
				statsDelta,
				callbacks: { errorLabel: this.getDeleteErrorLabel() },
			});
		} else {
			this.crudOps.walDeleteHard(item, http$, {
				endpointSuffix,
				statsDelta,
				callbacks: { errorLabel: this.getDeleteErrorLabel() },
			});
		}
	}

	// #endregion

	// #region Dialog delegation

	openEditDialog(item: T): void {
		this._activityTracker.track('USER_ACTION', `Abrir dialog: Editar ${this.config.resourceType}`, { action: 'click' });
		this.store.setSelectedItem(item);
		this.store.setFormData(this.mapItemToFormData(item));
		this.store.setIsEditing(true);
		this.store.openDialog();
	}

	protected mapItemToFormData(item: T): TForm {
		return item as unknown as TForm;
	}

	openNewDialog(): void {
		this._activityTracker.track('USER_ACTION', `Abrir dialog: Crear ${this.config.resourceType}`, { action: 'click' });
		this.store.closeDialog();
		this.store.openDialog();
	}

	closeDialog(): void {
		this.store.closeDialog();
	}

	openConfirmDialog(): void {
		this._activityTracker.track('USER_ACTION', `Confirmar eliminación: ${this.config.resourceType}`, { action: 'click' });
		this.store.openConfirmDialog();
	}

	closeConfirmDialog(): void {
		this.store.closeConfirmDialog();
	}

	// #endregion

	// #region Filtros base

	setSearchTerm(term: string): void {
		this.store.setSearchTerm(term);
		this.store.setPage(1);
		this.refreshItemsOnly();
	}

	setFilterEstado(estado: boolean | number | null): void {
		this.store.setFilterEstado(estado);
		this.store.setPage(1);
		this.refreshItemsOnly();
	}

	clearFilters(): void {
		this.store.clearFiltros();
		this.refreshItemsOnly();
	}

	// #endregion

	// #region Abstract — API calls

	/** Fetch items paginados con filtros actuales del store. */
	protected abstract fetchItems(): Observable<PaginatedResult<T>>;

	/** Fetch estadísticas. */
	protected abstract fetchEstadisticas(): Observable<TStats>;

	// #endregion

	// #region Hooks — Labels de error (overrideable)

	protected getCreateErrorLabel(): string { return 'guardar'; }
	protected getUpdateErrorLabel(): string { return 'guardar'; }
	protected getDeleteErrorLabel(): string { return 'eliminar'; }

	// #endregion

	// #region Helpers

	private resolveEstadoActivo(item: T): boolean {
		const estado = (item as HasEstado).estado;
		return typeof estado === 'number' ? estado === 1 : !!estado;
	}

	// #endregion
}

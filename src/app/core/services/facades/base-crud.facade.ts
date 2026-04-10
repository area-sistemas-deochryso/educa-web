import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, Observable } from 'rxjs';

import {
	logger, withRetry, getEstadoToggleDeltas, getEstadoRollbackDeltas,
	facadeErrorHandler, type FacadeErrorHandler,
} from '@core/helpers';
import { HasId } from '@shared/interfaces';
import { UI_ADMIN_ERROR_DETAILS, UI_SUMMARIES } from '@shared/constants';
import { ActivityTrackerService } from '@core/services/error/activity-tracker.service';
import { ErrorHandlerService } from '@core/services/error/error-handler.service';
import { SwService } from '@features/intranet/services/sw/sw.service';
import { WalFacadeHelper } from '@core/services/wal/wal-facade-helper.service';
import type { BaseCrudStore } from '@core/store/base/base-crud.store';

// #region Types

export interface HasEstado {
	estado: boolean | number | null;
}

/** Configuración que cada facade concreto provee al construir. */
export interface BaseCrudFacadeConfig {
	/** Tag para logs y errores (ej: 'CursosFacade') */
	tag: string;
	/** Tipo de recurso para WAL (ej: 'Curso') */
	resourceType: string;
	/** URL base de la API (ej: `${environment.apiUrl}/api/sistema/cursos`) */
	apiUrl: string;
	/** Mensaje para error de carga inicial */
	loadErrorMessage: string;
}

/** Resultado paginado de la API */
export interface PaginatedResult<T> {
	data: T[];
	page: number;
	pageSize: number;
	total: number;
}

/** Claves de estadísticas para toggle/delete */
export interface EstadisticaKeys {
	total: string;
	activos: string;
	inactivos: string;
}

// #endregion

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
	protected readonly destroyRef = inject(DestroyRef);
	protected readonly errHandler: FacadeErrorHandler;
	private readonly _activityTracker = inject(ActivityTrackerService);
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

	// #region WAL CRUD — Create

	/**
	 * CREAR: WAL → optimistic close dialog → refetch on commit.
	 * El facade concreto llama a esto con el payload y la API call.
	 */
	protected walCreate(
		payload: unknown,
		http$: () => Observable<unknown>,
		endpointSuffix = 'crear',
	): void {
		this.wal.execute({
			operation: 'CREATE',
			resourceType: this.config.resourceType,
			endpoint: `${this.config.apiUrl}/${endpointSuffix}`,
			method: 'POST',
			payload,
			http$,
			optimistic: {
				apply: () => this.store.closeDialog(),
				rollback: () => {},
			},
			onCommit: () => {
				this.silentRefreshAfterCrud();
				this.refreshEstadisticas();
			},
			onError: (err) => this.errHandler.handle(err, this.getCreateErrorLabel()),
		});
	}

	// #endregion

	// #region WAL CRUD — Update

	/**
	 * EDITAR: WAL → optimistic update + close dialog → rollback to snapshot.
	 */
	protected walUpdate(
		id: number,
		payload: unknown,
		optimisticUpdates: Partial<T>,
		http$: () => Observable<unknown>,
		endpointSuffix = `${id}/actualizar`,
	): void {
		const snapshot = this.store.items().find((i) => i.id === id);

		this.wal.execute({
			operation: 'UPDATE',
			resourceType: this.config.resourceType,
			resourceId: id,
			endpoint: `${this.config.apiUrl}/${endpointSuffix}`,
			method: 'PUT',
			payload,
			http$,
			optimistic: {
				apply: () => {
					this.store.updateItem(id, optimisticUpdates);
					this.store.closeDialog();
				},
				rollback: () => {
					if (snapshot) this.store.updateItem(id, snapshot);
				},
			},
			onCommit: () => this.silentRefreshAfterCrud(),
			onError: (err) => this.errHandler.handle(err, this.getUpdateErrorLabel()),
		});
	}

	// #endregion

	// #region WAL CRUD — Toggle Estado

	/**
	 * TOGGLE: WAL → optimistic toggle + stats incrementales → rollback reverses.
	 */
	protected walToggle(
		item: T,
		payload: unknown,
		http$: () => Observable<unknown>,
		statsKeys: EstadisticaKeys,
		toggleFn: (id: number) => void,
		endpointSuffix = `${item.id}/actualizar`,
	): void {
		const isActivo = this.resolveEstadoActivo(item);

		this.wal.execute({
			operation: 'UPDATE',
			resourceType: this.config.resourceType,
			resourceId: item.id,
			endpoint: `${this.config.apiUrl}/${endpointSuffix}`,
			method: 'PUT',
			payload,
			http$,
			optimistic: {
				apply: () => {
					const { activosDelta, inactivosDelta } = getEstadoToggleDeltas(isActivo);
					toggleFn(item.id);
					this.store.incrementarEstadistica(statsKeys.activos as keyof TStats, activosDelta);
					this.store.incrementarEstadistica(statsKeys.inactivos as keyof TStats, inactivosDelta);
				},
				rollback: () => {
					const { activosDelta, inactivosDelta } = getEstadoRollbackDeltas(isActivo);
					toggleFn(item.id);
					this.store.incrementarEstadistica(statsKeys.activos as keyof TStats, activosDelta);
					this.store.incrementarEstadistica(statsKeys.inactivos as keyof TStats, inactivosDelta);
				},
			},
			onCommit: () => {},
			onError: (err) => this.errHandler.handle(err, 'cambiar el estado'),
		});
	}

	// #endregion

	// #region WAL CRUD — Delete

	/**
	 * ELIMINAR: WAL → optimistic remove + stats → rollback re-adds.
	 */
	protected walDelete(
		item: T,
		http$: () => Observable<unknown>,
		statsKeys: EstadisticaKeys,
		endpointSuffix = `${item.id}/eliminar`,
	): void {
		const isActivo = this.resolveEstadoActivo(item);

		this.wal.execute({
			operation: 'DELETE',
			resourceType: this.config.resourceType,
			resourceId: item.id,
			endpoint: `${this.config.apiUrl}/${endpointSuffix}`,
			method: 'DELETE',
			payload: null,
			http$,
			optimistic: {
				apply: () => {
					const { activosDelta, inactivosDelta } = getEstadoToggleDeltas(isActivo, 'delete');
					this.store.removeItem(item.id);
					this.store.incrementarEstadistica(statsKeys.total as keyof TStats, -1);
					this.store.incrementarEstadistica(statsKeys.activos as keyof TStats, activosDelta);
					this.store.incrementarEstadistica(statsKeys.inactivos as keyof TStats, inactivosDelta);
				},
				rollback: () => {
					const { activosDelta, inactivosDelta } = getEstadoRollbackDeltas(isActivo, 'delete');
					this.store.addItem(item);
					this.store.incrementarEstadistica(statsKeys.total as keyof TStats, 1);
					this.store.incrementarEstadistica(statsKeys.activos as keyof TStats, activosDelta);
					this.store.incrementarEstadistica(statsKeys.inactivos as keyof TStats, inactivosDelta);
				},
			},
			onCommit: () => {},
			onError: (err) => this.errHandler.handle(err, this.getDeleteErrorLabel()),
		});
	}

	// #endregion

	// #region Dialog delegation

	openNewDialog(): void {
		this._activityTracker.track('USER_ACTION', `Abrir dialog: Crear ${this.config.resourceType}`);
		this.store.closeDialog();
		this.store.openDialog();
	}

	closeDialog(): void {
		this.store.closeDialog();
	}

	openConfirmDialog(): void {
		this._activityTracker.track('USER_ACTION', `Confirmar eliminación: ${this.config.resourceType}`);
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

	// #region Helpers privados

	/** Resuelve si el item está activo (soporta boolean y number). */
	private resolveEstadoActivo(item: T): boolean {
		const estado = (item as HasEstado).estado;
		return typeof estado === 'number' ? estado === 1 : !!estado;
	}

	// #endregion
}

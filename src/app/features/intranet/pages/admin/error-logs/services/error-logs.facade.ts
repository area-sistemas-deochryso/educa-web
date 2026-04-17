import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';

import { logger } from '@core/helpers';
import { ErrorHandlerService } from '@core/services/error';
import { SwService } from '@core/services/sw';

import { ErrorOrigen, ErrorSeveridad, ErrorLogLista } from '../models';
import { ErrorLogsService } from './error-logs.service';
import { ErrorLogsStore } from './error-logs.store';

@Injectable({ providedIn: 'root' })
export class ErrorLogsFacade {
	// #region Dependencias
	private readonly api = inject(ErrorLogsService);
	private readonly store = inject(ErrorLogsStore);
	private readonly destroyRef = inject(DestroyRef);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly swService = inject(SwService);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Auto-refresh por CACHE_UPDATED del SW
	/** Timestamp de la última mutación CRUD para ignorar cache updates stale. */
	private lastCrudMutationTime = 0;
	private static readonly CACHE_COOLDOWN_MS = 3000;
	// #endregion

	constructor() {
		this.setupCacheRefresh();
	}

	// #region Carga de datos
	loadData(): void {
		if (this.store.loading()) return;
		this.store.setLoading(true);

		this.api
			.getErrores(
				this.store.filterOrigen(),
				this.store.filterSeveridad(),
				null,
				this.store.page(),
				this.store.pageSize(),
				this.store.filterHttp(),
				this.store.filterUsuarioRol(),
			)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (items) => {
					this.store.setItems(items);
					this.store.setTableReady(true);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('[ErrorLogsFacade] Error al cargar errores:', err);
					this.store.setLoading(false);
					this.store.setTableReady(true);
				},
			});
	}

	refresh(): void {
		this.store.setPage(1);
		this.loadData();
	}
	// #endregion

	// #region Filtros
	setFilterOrigen(origen: ErrorOrigen | null): void {
		this.store.setFilterOrigen(origen);
		this.store.setPage(1);
		this.loadData();
	}

	setFilterSeveridad(severidad: ErrorSeveridad | null): void {
		this.store.setFilterSeveridad(severidad);
		this.store.setPage(1);
		this.loadData();
	}

	setFilterHttp(http: string | null): void {
		this.store.setFilterHttp(http);
		this.store.setPage(1);
		this.loadData();
	}

	setFilterUsuarioRol(rol: string | null): void {
		this.store.setFilterUsuarioRol(rol);
		this.store.setPage(1);
		this.loadData();
	}

	loadPage(page: number): void {
		this.store.setPage(page);
		this.loadData();
	}

	setPageSize(pageSize: number): void {
		this.store.setPageSize(pageSize);
		this.store.setPage(1);
		this.loadData();
	}
	// #endregion

	// #region Drawer — abre/cierra. La carga del detalle la maneja el drawer standalone.
	openDetail(item: ErrorLogLista): void {
		this.store.openDrawer(item);
	}

	closeDrawer(): void {
		this.store.closeDrawer();
	}
	// #endregion

	// #region Mutaciones
	/**
	 * Elimina un error con optimistic update: cierra drawer, remueve del listado
	 * local y dispara el DELETE al backend. Si falla, restaura el item.
	 */
	deleteError(id: number): void {
		// Snapshot para rollback
		const snapshot = this.store.items();

		// Optimistic: cerrar drawer, remover del listado y marcar mutación
		// (el timestamp evita que CACHE_UPDATED sobreescriba con data stale).
		this.store.closeDrawer();
		this.store.removeItem(id);
		this.lastCrudMutationTime = Date.now();

		// eslint-disable-next-line wal/no-direct-mutation-subscribe -- Razón: error-logs es admin-only, no está en WAL_CACHE_MAP. Si DELETE falla debemos mostrar el error al admin (no encolar offline retry) para que pueda reintentar manualmente.
		this.api
			.deleteError(id)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.errorHandler.showSuccess('Error eliminado', 'El registro se eliminó correctamente');
				},
				error: (err) => {
					logger.error('[ErrorLogsFacade] Error al eliminar:', err);
					// Rollback: restaurar snapshot
					this.store.setItems(snapshot);
					this.errorHandler.showError(
						'No se pudo eliminar',
						'Ocurrió un error al eliminar el registro. Se restauró la lista.',
					);
				},
			});
	}
	// #endregion

	// #region Auto-refresh por SWR del Service Worker
	/**
	 * Cuando el SW revalida en background y detecta que el listado cambió,
	 * emite CACHE_UPDATED con la data fresca. Aquí actualizamos el store sin
	 * disparar un fetch adicional.
	 *
	 * Condiciones para aplicar:
	 *  - URL del evento contiene `/api/sistema/errors` (no correlaciona con detalle)
	 *  - No estamos en ventana de cooldown post-mutación (evita pisar optimistic)
	 *  - Los filtros/página del evento coinciden con el estado actual del store
	 */
	private setupCacheRefresh(): void {
		this.swService.cacheUpdated$
			.pipe(
				filter((event) => this.isListEvent(event.url)),
				filter(() => !this.isInCacheCooldown()),
				filter((event) => this.matchesCurrentFilters(event.url)),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((event) => {
				const items = this.extractItems(event.data);
				if (items) {
					this.store.setItems(items);
					logger.log('[ErrorLogsFacade] Lista actualizada desde SW (background revalidation)');
				}
			});
	}

	private isInCacheCooldown(): boolean {
		return Date.now() - this.lastCrudMutationTime < ErrorLogsFacade.CACHE_COOLDOWN_MS;
	}

	private isListEvent(url: string): boolean {
		// /api/sistema/errors (list) — excluir detalle /{id} y /{id}/detalles
		if (!url.includes('/api/sistema/errors')) return false;
		const pathOnly = url.split('?')[0];
		return /\/api\/sistema\/errors\/?$/.test(pathOnly);
	}

	/** Verifica que los query params del evento coincidan con el estado actual del store. */
	private matchesCurrentFilters(eventUrl: string): boolean {
		try {
			const qIdx = eventUrl.indexOf('?');
			const params = new URLSearchParams(qIdx >= 0 ? eventUrl.slice(qIdx + 1) : '');

			const matchString = (paramName: string, current: string | null): boolean => {
				const eventValue = params.get(paramName);
				// URLSearchParams devuelve null si no existe; store también usa null
				return eventValue === current;
			};
			const matchNumber = (paramName: string, current: number, defaultValue: number): boolean => {
				const eventValue = params.get(paramName);
				const parsed = eventValue !== null ? Number(eventValue) : defaultValue;
				return parsed === current;
			};

			return (
				matchNumber('pagina', this.store.page(), 1) &&
				matchNumber('pageSize', this.store.pageSize(), 20) &&
				matchString('origen', this.store.filterOrigen()) &&
				matchString('severidad', this.store.filterSeveridad()) &&
				matchString('httpFilter', this.store.filterHttp()) &&
				matchString('usuarioRol', this.store.filterUsuarioRol())
			);
		} catch {
			return false;
		}
	}

	/** Extrae el array de items del payload del SW (maneja wrapper ApiResponse o array directo). */
	private extractItems(data: unknown): ErrorLogLista[] | null {
		if (Array.isArray(data)) return data as ErrorLogLista[];
		if (data && typeof data === 'object' && 'data' in data) {
			const inner = (data as { data: unknown }).data;
			if (Array.isArray(inner)) return inner as ErrorLogLista[];
		}
		return null;
	}
	// #endregion
}

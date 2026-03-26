import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { logger, withRetry, facadeErrorHandler } from '@core/helpers';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { UI_SUMMARIES, UI_ADMIN_ERROR_DETAILS } from '@shared/constants';
import { environment } from '@config';
import { ProfesorApiService } from '../../services/profesor-api.service';
import { CursoContenidoStore } from './curso-contenido.store';
import { CrearCursoContenidoRequest } from '../../models';

/**
 * Facade for course content lifecycle: load, create, delete content structures.
 *
 * @example
 * const facade = inject(CursoContenidoDataFacade);
 * facade.loadContenido(120);
 */
@Injectable({ providedIn: 'root' })
export class CursoContenidoDataFacade {
	// #region Dependencias
	private readonly api = inject(ProfesorApiService);
	private readonly store = inject(CursoContenidoStore);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly wal = inject(WalFacadeHelper);
	private readonly destroyRef = inject(DestroyRef);
	private readonly contenidoUrl = `${environment.apiUrl}/api/CursoContenido`;
	private readonly errHandler = facadeErrorHandler({
		tag: 'CursoContenidoDataFacade',
		errorHandler: this.errorHandler,
	});
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Comandos de carga

	/**
	 * Load course content for a schedule and open the proper dialog.
	 *
	 * @param horarioId Schedule id.
	 * @param options.initialTab Tab to open on dialog show.
	 * @param options.salonId SalonId del horario — almacenado para que CalificacionesFacade no lea stores ajenos.
	 */
	loadContenido(horarioId: number, options?: { initialTab?: string; salonId?: number }): void {
		if (this.store.loading()) return;
		this.store.setSelectedHorarioId(horarioId);
		this.store.setInitialTab(options?.initialTab ?? null);
		if (options?.salonId != null) {
			this.store.setSalonId(options.salonId);
		}
		this.store.setLoading(true);
		this.store.clearError();

		this.api
			.getContenido(horarioId)
			.pipe(
				withRetry({ tag: 'CursoContenidoDataFacade:loadContenido' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (contenido) => {
					this.store.setContenido(contenido);
					this.store.setLoading(false);

					if (contenido) {
						this.store.openContentDialog();
					} else {
						this.store.openBuilderDialog();
					}
				},
				error: (err) => {
					logger.error('CursoContenidoDataFacade: Error al cargar contenido', err);
					this.errorHandler.showError(UI_SUMMARIES.error, UI_ADMIN_ERROR_DETAILS.loadContenido);
					this.store.setError(UI_ADMIN_ERROR_DETAILS.loadContenido);
					this.store.setLoading(false);
				},
			});
	}

	/** Refresh content using the currently selected horarioId. */
	refreshContenido(): void {
		const horarioId = this.store.selectedHorarioId();
		if (!horarioId) return;
		this.store.setLoading(true);
		this.store.clearError();

		this.api
			.getContenido(horarioId)
			.pipe(
				withRetry({ tag: 'CursoContenidoDataFacade:refreshContenido' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (contenido) => {
					this.store.setContenido(contenido);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('CursoContenidoDataFacade: Error al refrescar contenido', err);
					this.store.setLoading(false);
				},
			});
	}

	// #endregion
	// #region CRUD Contenido

	/**
	 * Create content with WAL and close builder dialog optimistically.
	 *
	 * @param request Creation payload.
	 */
	crearContenido(request: CrearCursoContenidoRequest): void {
		this.wal.execute({
			operation: 'CREATE',
			resourceType: 'CursoContenido',
			endpoint: this.contenidoUrl,
			method: 'POST',
			payload: request,
			http$: () => this.api.crearContenido(request),
			optimistic: {
				apply: () => {
					this.store.setSaving(false);
					this.store.closeBuilderDialog();
				},
				rollback: () => {
					this.store.openBuilderDialog();
				},
			},
			onCommit: (contenido) => {
				this.store.setContenido(contenido);
				this.store.openContentDialog();
			},
			onError: (err) => this.errHandler.handle(err, 'crear contenido', () => this.store.setSaving(false)),
		});
	}

	/**
	 * Delete content with WAL and close content dialog optimistically.
	 *
	 * @param contenidoId Content id.
	 */
	eliminarContenido(contenidoId: number): void {
		this.wal.execute({
			operation: 'DELETE',
			resourceType: 'CursoContenido',
			resourceId: contenidoId,
			endpoint: `${this.contenidoUrl}/${contenidoId}`,
			method: 'DELETE',
			payload: null,
			http$: () => this.api.eliminarContenido(contenidoId),
			optimistic: {
				apply: () => {
					this.store.closeContentDialog();
					this.store.setSaving(false);
				},
				rollback: () => {
					this.store.openContentDialog();
				},
			},
			onCommit: () => {},
			onError: (err) => this.errHandler.handle(err, 'eliminar contenido', () => this.store.setSaving(false)),
		});
	}

	// #endregion

	// #region Helpers privados
	// #endregion
}

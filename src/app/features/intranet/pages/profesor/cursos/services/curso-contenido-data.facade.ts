import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { logger, withRetry } from '@core/helpers';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
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
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Comandos de carga

	/**
	 * Load course content for a schedule and open the proper dialog.
	 *
	 * @param horarioId Schedule id.
	 * @param initialTab Optional tab to open on dialog show.
	 */
	loadContenido(horarioId: number, initialTab?: string): void {
		if (this.store.loading()) return;
		this.store.setSelectedHorarioId(horarioId);
		this.store.setInitialTab(initialTab ?? null);
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
					this.errorHandler.showError('Error', 'No se pudo cargar el contenido del curso');
					this.store.setError('No se pudo cargar el contenido del curso');
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
			onError: (err) => this.handleApiError(err, 'crear contenido'),
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
			onError: (err) => this.handleApiError(err, 'eliminar contenido'),
		});
	}

	// #endregion

	// #region Helpers privados
	private handleApiError(err: unknown, accion: string): void {
		logger.error(`CursoContenidoDataFacade: Error al ${accion}`, err);
		this.errorHandler.showError('Error', `No se pudo ${accion}`);
		this.store.setSaving(false);
	}
	// #endregion
}

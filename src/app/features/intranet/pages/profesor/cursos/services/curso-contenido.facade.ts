import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { logger, withRetry } from '@core/helpers';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { environment } from '@config';
import { ProfesorApiService } from '../../services/profesor-api.service';
import { CursoContenidoStore } from './curso-contenido.store';
import {
	CrearCursoContenidoRequest,
	ActualizarSemanaRequest,
	RegistrarArchivoRequest,
	CrearTareaRequest,
	ActualizarTareaRequest,
	CursoContenidoSemanaDto,
	CursoContenidoTareaDto,
} from '../../models';

/**
 * Facade that coordinates API calls, WAL, and store updates for course content.
 *
 * @example
 * const facade = inject(CursoContenidoFacade);
 * facade.loadContenido(horarioId);
 */
@Injectable({ providedIn: 'root' })
export class CursoContenidoFacade {
	// #region Dependencias
	private readonly api = inject(ProfesorApiService);
	private readonly store = inject(CursoContenidoStore);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly wal = inject(WalFacadeHelper);
	private readonly destroyRef = inject(DestroyRef);
	/** Base API endpoint for course content. */
	private readonly contenidoUrl = `${environment.apiUrl}/api/CursoContenido`;
	// #endregion

	// #region Estado expuesto
	/** View model stream for UI binding. */
	readonly vm = this.store.vm;
	// #endregion

	// #region Comandos de carga

	/**
	 * Load course content for a schedule and open the proper dialog.
	 *
	 * @param horarioId Schedule id.
	 *
	 * @example
	 * facade.loadContenido(120);
	 */
	loadContenido(horarioId: number): void {
		this.store.setSelectedHorarioId(horarioId);
		this.store.setLoading(true);
		this.store.clearError();

		this.api
			.getContenido(horarioId)
			.pipe(
				withRetry({ tag: 'CursoContenidoFacade:loadContenido' }),
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
					logger.error('CursoContenidoFacade: Error al cargar contenido', err);
					this.errorHandler.showError('Error', 'No se pudo cargar el contenido del curso');
					this.store.setError('No se pudo cargar el contenido del curso');
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
	 *
	 * @example
	 * facade.crearContenido({ horarioId: 120, numeroSemanas: 16 });
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
	 *
	 * @example
	 * facade.eliminarContenido(15);
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
	// #region Semanas

	/**
	 * Update a week with WAL and rollback on failure.
	 *
	 * @param semanaId Week id.
	 * @param request Update payload.
	 *
	 * @example
	 * facade.actualizarSemana(5, { titulo: 'Week 1', descripcion: 'Intro', mensajeDocente: '' });
	 */
	actualizarSemana(semanaId: number, request: ActualizarSemanaRequest): void {
		const snapshot = this.store
			.vm()
			.contenido?.semanas?.find((s) => s.id === semanaId);

		const requestWithVersion = { ...request, rowVersion: snapshot?.rowVersion };

		this.wal.execute({
			operation: 'UPDATE',
			resourceType: 'CursoContenidoSemana',
			resourceId: semanaId,
			endpoint: `${this.contenidoUrl}/semana/${semanaId}`,
			method: 'PUT',
			payload: requestWithVersion,
			http$: () => this.api.actualizarSemana(semanaId, requestWithVersion),
			optimistic: {
				apply: () => {
					this.store.updateSemana(semanaId, {
						titulo: request.titulo,
						descripcion: request.descripcion,
					} as CursoContenidoSemanaDto);
					this.store.setSaving(false);
					this.store.closeSemanaEditDialog();
				},
				rollback: () => {
					if (snapshot) this.store.updateSemana(semanaId, snapshot);
				},
			},
			onCommit: (semana) => {
				// Server-confirmed data replaces optimistic
				this.store.updateSemana(semanaId, semana);
			},
			onError: (err) => this.handleApiError(err, 'actualizar semana'),
		});
	}

	// #endregion
	// #region Archivos

	/**
	 * Upload a blob directly, then register metadata with WAL.
	 *
	 * @param semanaId Week id that owns the file.
	 * @param file File selected by the user.
	 *
	 * @example
	 * facade.uploadArchivo(semanaId, file);
	 */
	uploadArchivo(semanaId: number, file: File): void {
		this.store.setSaving(true);

		// Paso 1: Upload directo al BlobStorage (sin WAL)
		this.api
			.uploadFile(file)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (blobResponse) => {
					// Paso 2: Registrar metadata con WAL
					const request: RegistrarArchivoRequest = {
						nombreArchivo: file.name,
						urlArchivo: blobResponse.url,
						tipoArchivo: file.type || null,
						tamanoBytes: file.size,
					};

					this.wal.execute({
						operation: 'CREATE',
						resourceType: 'CursoContenidoArchivo',
						endpoint: `${this.contenidoUrl}/semana/${semanaId}/archivo`,
						method: 'POST',
						payload: request,
						http$: () => this.api.registrarArchivo(semanaId, request),
						optimistic: {
							apply: () => this.store.setSaving(false),
							rollback: () => {},
						},
						onCommit: (archivo) => {
							this.store.addArchivoToSemana(semanaId, archivo);
						},
						onError: (err) => this.handleApiError(err, 'registrar archivo'),
					});
				},
				error: (err) => {
					logger.error('CursoContenidoFacade: Error al subir archivo', err);
					this.errorHandler.showError('Error', 'No se pudo subir el archivo');
					this.store.setSaving(false);
				},
			});
	}

	/**
	 * Delete an attachment with WAL and rollback on failure.
	 *
	 * @param semanaId Week id that owns the file.
	 * @param archivoId Attachment id.
	 *
	 * @example
	 * facade.eliminarArchivo(semanaId, archivoId);
	 */
	eliminarArchivo(semanaId: number, archivoId: number): void {
		const semana = this.store
			.vm()
			.contenido?.semanas?.find((s) => s.id === semanaId);
		const snapshot = semana?.archivos?.find((a) => a.id === archivoId);

		this.wal.execute({
			operation: 'DELETE',
			resourceType: 'CursoContenidoArchivo',
			resourceId: archivoId,
			endpoint: `${this.contenidoUrl}/archivo/${archivoId}`,
			method: 'DELETE',
			payload: null,
			http$: () => this.api.eliminarArchivo(archivoId),
			optimistic: {
				apply: () => {
					this.store.removeArchivoFromSemana(semanaId, archivoId);
					this.store.setSaving(false);
				},
				rollback: () => {
					if (snapshot) this.store.addArchivoToSemana(semanaId, snapshot);
				},
			},
			onCommit: () => {},
			onError: (err) => this.handleApiError(err, 'eliminar archivo'),
		});
	}

	// #endregion
	// #region Tareas

	/**
	 * Create a task with WAL and close dialog optimistically.
	 *
	 * @param semanaId Week id.
	 * @param request Task creation payload.
	 *
	 * @example
	 * facade.crearTarea(semanaId, { titulo: 'Task 1', descripcion: 'Solve', fechaLimite: '2026-03-10' });
	 */
	crearTarea(semanaId: number, request: CrearTareaRequest): void {
		this.wal.execute({
			operation: 'CREATE',
			resourceType: 'CursoContenidoTarea',
			endpoint: `${this.contenidoUrl}/semana/${semanaId}/tarea`,
			method: 'POST',
			payload: request,
			http$: () => this.api.crearTarea(semanaId, request),
			optimistic: {
				apply: () => {
					this.store.setSaving(false);
					this.store.closeTareaDialog();
				},
				rollback: () => {
					this.store.openTareaDialog(null);
				},
			},
			onCommit: (tarea) => {
				this.store.addTareaToSemana(semanaId, tarea);
			},
			onError: (err) => this.handleApiError(err, 'crear tarea'),
		});
	}

	/**
	 * Update a task with WAL and rollback on failure.
	 *
	 * @param semanaId Week id.
	 * @param tareaId Task id.
	 * @param request Task update payload.
	 *
	 * @example
	 * facade.actualizarTarea(semanaId, tareaId, { titulo: 'Task 1', descripcion: 'Update', fechaLimite: '2026-03-12' });
	 */
	actualizarTarea(semanaId: number, tareaId: number, request: ActualizarTareaRequest): void {
		const semana = this.store
			.vm()
			.contenido?.semanas?.find((s) => s.id === semanaId);
		const snapshot = semana?.tareas?.find((t) => t.id === tareaId);
		const requestWithVersion = { ...request, rowVersion: snapshot?.rowVersion };

		this.wal.execute({
			operation: 'UPDATE',
			resourceType: 'CursoContenidoTarea',
			resourceId: tareaId,
			endpoint: `${this.contenidoUrl}/tarea/${tareaId}`,
			method: 'PUT',
			payload: requestWithVersion,
			http$: () => this.api.actualizarTarea(tareaId, requestWithVersion),
			optimistic: {
				apply: () => {
					this.store.updateTareaInSemana(semanaId, tareaId, {
						titulo: request.titulo,
						descripcion: request.descripcion,
					} as CursoContenidoTareaDto);
					this.store.setSaving(false);
					this.store.closeTareaDialog();
				},
				rollback: () => {
					if (snapshot) this.store.updateTareaInSemana(semanaId, tareaId, snapshot);
				},
			},
			onCommit: (tarea) => {
				this.store.updateTareaInSemana(semanaId, tareaId, tarea);
			},
			onError: (err) => this.handleApiError(err, 'actualizar tarea'),
		});
	}

	/**
	 * Delete a task with WAL and rollback on failure.
	 *
	 * @param semanaId Week id.
	 * @param tareaId Task id.
	 *
	 * @example
	 * facade.eliminarTarea(semanaId, tareaId);
	 */
	eliminarTarea(semanaId: number, tareaId: number): void {
		const semana = this.store
			.vm()
			.contenido?.semanas?.find((s) => s.id === semanaId);
		const snapshot = semana?.tareas?.find((t) => t.id === tareaId);

		this.wal.execute({
			operation: 'DELETE',
			resourceType: 'CursoContenidoTarea',
			resourceId: tareaId,
			endpoint: `${this.contenidoUrl}/tarea/${tareaId}`,
			method: 'DELETE',
			payload: null,
			http$: () => this.api.eliminarTarea(tareaId),
			optimistic: {
				apply: () => {
					this.store.removeTareaFromSemana(semanaId, tareaId);
					this.store.setSaving(false);
				},
				rollback: () => {
					if (snapshot) this.store.addTareaToSemana(semanaId, snapshot);
				},
			},
			onCommit: () => {},
			onError: (err) => this.handleApiError(err, 'eliminar tarea'),
		});
	}

	// #endregion
	// #region Dialog commands
	/**
	 * Open the week edit dialog with a selected week.
	 *
	 * @param semana Week data to edit.
	 */
	openSemanaEditDialog(semana: CursoContenidoSemanaDto): void {
		this.store.openSemanaEditDialog(semana);
	}
	/**
	 * Close the week edit dialog and clear selection.
	 */
	closeSemanaEditDialog(): void {
		this.store.closeSemanaEditDialog();
	}
	/**
	 * Open the task dialog with an existing task or null for create.
	 *
	 * @param tarea Task to edit or null for new.
	 */
	openTareaDialog(tarea: CursoContenidoTareaDto | null): void {
		this.store.openTareaDialog(tarea);
	}
	/**
	 * Close the task dialog and clear selection.
	 */
	closeTareaDialog(): void {
		this.store.closeTareaDialog();
	}
	/**
	 * Close content dialog and clear content state.
	 */
	closeContentDialog(): void {
		this.store.closeContentDialog();
	}
	/**
	 * Close content builder dialog.
	 */
	closeBuilderDialog(): void {
		this.store.closeBuilderDialog();
	}
	// #endregion

	// #region Helpers privados
	/**
	 * Handle API errors consistently for this facade.
	 *
	 * @param err Error object from API or network.
	 * @param accion Action label for logs and UI.
	 */
	private handleApiError(err: unknown, accion: string): void {
		logger.error(`CursoContenidoFacade: Error al ${accion}`, err);
		this.errorHandler.showError('Error', `No se pudo ${accion}`);
		this.store.setSaving(false);
	}
	// #endregion
}
import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { logger } from '@core/helpers';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { environment } from '@config';
import { ProfesorApiService } from '../../services/profesor-api.service';
import { CursoContenidoStore } from './curso-contenido.store';
import {
	ActualizarSemanaRequest,
	RegistrarArchivoRequest,
	RegistrarTareaArchivoRequest,
	CrearTareaRequest,
	ActualizarTareaRequest,
	CursoContenidoSemanaDto,
	CursoContenidoTareaDto,
} from '../../models';

/**
 * Facade for CRUD operations on content items: semanas, archivos, tareas, tarea-archivos.
 *
 * @example
 * const facade = inject(CursoContenidoCrudFacade);
 * facade.crearTarea(semanaId, request);
 */
@Injectable({ providedIn: 'root' })
export class CursoContenidoCrudFacade {
	// #region Dependencias
	private readonly api = inject(ProfesorApiService);
	private readonly store = inject(CursoContenidoStore);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly wal = inject(WalFacadeHelper);
	private readonly destroyRef = inject(DestroyRef);
	private readonly contenidoUrl = `${environment.apiUrl}/api/CursoContenido`;
	// #endregion

	// #region Semanas

	/**
	 * Update a week with WAL and rollback on failure.
	 *
	 * @param semanaId Week id.
	 * @param request Update payload.
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
	 */
	uploadArchivo(semanaId: number, file: File): void {
		this.store.setSaving(true);

		this.api
			.uploadFile(file)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (blobResponse) => {
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
					logger.error('CursoContenidoCrudFacade: Error al subir archivo', err);
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
	// #region Tarea archivos

	/**
	 * Upload a blob then register teacher attachment metadata for a task with WAL.
	 */
	uploadTareaArchivo(semanaId: number, tareaId: number, file: File): void {
		this.store.setSaving(true);

		this.api
			.uploadFile(file)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (blobResponse) => {
					const request: RegistrarTareaArchivoRequest = {
						nombreArchivo: file.name,
						urlArchivo: blobResponse.url,
						tipoArchivo: file.type || null,
						tamanoBytes: file.size,
					};

					this.wal.execute({
						operation: 'CREATE',
						resourceType: 'TareaArchivo',
						endpoint: `${this.contenidoUrl}/tarea/${tareaId}/archivo`,
						method: 'POST',
						payload: request,
						http$: () => this.api.registrarTareaArchivo(tareaId, request),
						optimistic: {
							apply: () => this.store.setSaving(false),
							rollback: () => {},
						},
						onCommit: (archivo) => {
							this.store.addArchivoToTarea(semanaId, tareaId, archivo);
						},
						onError: (err) => this.handleApiError(err, 'registrar archivo de tarea'),
					});
				},
				error: (err) => {
					logger.error('CursoContenidoCrudFacade: Error al subir archivo de tarea', err);
					this.errorHandler.showError('Error', 'No se pudo subir el archivo');
					this.store.setSaving(false);
				},
			});
	}

	/**
	 * Delete a teacher attachment from a task with WAL and rollback.
	 */
	eliminarTareaArchivo(semanaId: number, tareaId: number, archivoId: number): void {
		const semana = this.store.vm().contenido?.semanas?.find((s) => s.id === semanaId);
		const tarea = semana?.tareas?.find((t) => t.id === tareaId);
		const snapshot = tarea?.archivos?.find((a) => a.id === archivoId);

		this.wal.execute({
			operation: 'DELETE',
			resourceType: 'TareaArchivo',
			resourceId: archivoId,
			endpoint: `${this.contenidoUrl}/tarea-archivo/${archivoId}`,
			method: 'DELETE',
			payload: null,
			http$: () => this.api.eliminarTareaArchivo(archivoId),
			optimistic: {
				apply: () => {
					this.store.removeArchivoFromTarea(semanaId, tareaId, archivoId);
					this.store.setSaving(false);
				},
				rollback: () => {
					if (snapshot) this.store.addArchivoToTarea(semanaId, tareaId, snapshot);
				},
			},
			onCommit: () => {},
			onError: (err) => this.handleApiError(err, 'eliminar archivo de tarea'),
		});
	}

	// #endregion
	// #region Tareas

	/**
	 * Create a task with WAL and close dialog optimistically.
	 *
	 * @param semanaId Week id.
	 * @param request Task creation payload.
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

	// #region Helpers privados
	private handleApiError(err: unknown, accion: string): void {
		logger.error(`CursoContenidoCrudFacade: Error al ${accion}`, err);
		this.errorHandler.showError('Error', `No se pudo ${accion}`);
		this.store.setSaving(false);
	}
	// #endregion
}

import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { logger, withRetry } from '@core/helpers';
import { ErrorHandlerService } from '@core/services';
import { EstudianteApiService } from './estudiante-api.service';
import { EstudianteCursosStore } from './estudiante-cursos.store';
import { RegistrarEstudianteArchivoRequest, RegistrarEstudianteTareaArchivoRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class EstudianteCursosFacade {
	// #region Dependencias
	private readonly api = inject(EstudianteApiService);
	private readonly store = inject(EstudianteCursosStore);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Comandos de carga

	loadHorarios(): void {
		this.store.setLoading(true);
		this.store.setError(null);

		this.api
			.getMisHorarios()
			.pipe(
				withRetry({ tag: 'EstudianteCursosFacade:loadHorarios' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (horarios) => {
					this.store.setHorarios(horarios);
					this.store.setLoading(false);
				},
				error: (err) => {
					logger.error('EstudianteCursosFacade: Error al cargar horarios', err);
					this.errorHandler.showError('Error', 'No se pudieron cargar los cursos');
					this.store.setError('No se pudieron cargar los cursos');
					this.store.setLoading(false);
				},
			});
	}

	loadContenido(horarioId: number): void {
		this.store.setContentLoading(true);

		this.api
			.getContenido(horarioId)
			.pipe(
				withRetry({ tag: 'EstudianteCursosFacade:loadContenido' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (contenido) => {
					this.store.setContenido(contenido);
					this.store.setContentLoading(false);
					if (contenido) {
						this.store.openContentDialog();
						// Pre-load student files for all weeks and tasks
						contenido.semanas.forEach((s) => {
							this.loadMisArchivos(s.id);
							s.tareas.forEach((t) => this.loadMisTareaArchivos(t.id));
						});
					}
				},
				error: (err) => {
					logger.error('EstudianteCursosFacade: Error al cargar contenido', err);
					this.errorHandler.showError('Error', 'No se pudo cargar el contenido del curso');
					this.store.setContentLoading(false);
				},
			});
	}

	/**
	 * Lazy-load student's own files for a week (only once).
	 */
	loadMisArchivos(semanaId: number): void {
		const loaded = this.store.loadedSemanas();
		if (loaded.includes(semanaId)) return;

		this.api
			.getMisArchivos(semanaId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (archivos) => this.store.setMisArchivos(semanaId, archivos),
				error: () => this.store.setMisArchivos(semanaId, []),
			});
	}

	// #endregion
	// #region Student file commands

	/**
	 * Upload file to blob storage then register metadata.
	 */
	uploadArchivo(semanaId: number, file: File): void {
		this.store.setSaving(true);

		this.api
			.uploadFile(file)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (blobResponse) => {
					const request: RegistrarEstudianteArchivoRequest = {
						nombreArchivo: file.name,
						urlArchivo: blobResponse.url,
						tipoArchivo: file.type || null,
						tamanoBytes: file.size,
					};

					this.api
						.registrarArchivo(semanaId, request)
						.pipe(takeUntilDestroyed(this.destroyRef))
						.subscribe({
							next: (archivo) => {
								this.store.addMiArchivo(semanaId, archivo);
								this.store.setSaving(false);
							},
							error: (err) => {
								logger.error('EstudianteCursosFacade: Error al registrar archivo', err);
								this.errorHandler.showError('Error', 'No se pudo registrar el archivo');
								this.store.setSaving(false);
							},
						});
				},
				error: (err) => {
					logger.error('EstudianteCursosFacade: Error al subir archivo', err);
					this.errorHandler.showError('Error', 'No se pudo subir el archivo');
					this.store.setSaving(false);
				},
			});
	}

	/**
	 * Delete student's own file with optimistic removal.
	 */
	eliminarArchivo(semanaId: number, archivoId: number): void {
		this.store.removeMiArchivo(semanaId, archivoId);

		this.api
			.eliminarArchivo(archivoId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				error: (err) => {
					logger.error('EstudianteCursosFacade: Error al eliminar archivo', err);
					this.errorHandler.showError('Error', 'No se pudo eliminar el archivo');
					// Re-load to restore state
					this.loadMisArchivosForce(semanaId);
				},
			});
	}

	/**
	 * Force reload of student files (used for rollback).
	 */
	private loadMisArchivosForce(semanaId: number): void {
		this.api
			.getMisArchivos(semanaId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (archivos) => this.store.setMisArchivos(semanaId, archivos),
			});
	}

	// #endregion
	// #region Student task file commands

	/**
	 * Lazy-load student's own task files (only once).
	 */
	loadMisTareaArchivos(tareaId: number): void {
		const loaded = this.store.loadedTareas();
		if (loaded.includes(tareaId)) return;

		this.api
			.getMisTareaArchivos(tareaId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (archivos) => this.store.setMisTareaArchivos(tareaId, archivos),
				error: () => this.store.setMisTareaArchivos(tareaId, []),
			});
	}

	/**
	 * Upload file to blob storage then register task file metadata.
	 */
	uploadTareaArchivo(tareaId: number, file: File): void {
		this.store.setSaving(true);

		this.api
			.uploadFile(file)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (blobResponse) => {
					const request: RegistrarEstudianteTareaArchivoRequest = {
						nombreArchivo: file.name,
						urlArchivo: blobResponse.url,
						tipoArchivo: file.type || null,
						tamanoBytes: file.size,
					};

					this.api
						.registrarTareaArchivo(tareaId, request)
						.pipe(takeUntilDestroyed(this.destroyRef))
						.subscribe({
							next: (archivo) => {
								this.store.addMiTareaArchivo(tareaId, archivo);
								this.store.setSaving(false);
							},
							error: (err) => {
								logger.error('EstudianteCursosFacade: Error al registrar archivo de tarea', err);
								this.errorHandler.showError('Error', 'No se pudo registrar el archivo');
								this.store.setSaving(false);
							},
						});
				},
				error: (err) => {
					logger.error('EstudianteCursosFacade: Error al subir archivo de tarea', err);
					this.errorHandler.showError('Error', 'No se pudo subir el archivo');
					this.store.setSaving(false);
				},
			});
	}

	/**
	 * Delete student's own task file with optimistic removal.
	 */
	eliminarTareaArchivo(tareaId: number, archivoId: number): void {
		this.store.removeMiTareaArchivo(tareaId, archivoId);

		this.api
			.eliminarTareaArchivo(archivoId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				error: (err) => {
					logger.error('EstudianteCursosFacade: Error al eliminar archivo de tarea', err);
					this.errorHandler.showError('Error', 'No se pudo eliminar el archivo');
					this.loadMisTareaArchivosForce(tareaId);
				},
			});
	}

	/**
	 * Force reload of student task files (used for rollback).
	 */
	private loadMisTareaArchivosForce(tareaId: number): void {
		this.api
			.getMisTareaArchivos(tareaId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (archivos) => this.store.setMisTareaArchivos(tareaId, archivos),
			});
	}

	// #endregion
	// #region Dialog commands

	closeContentDialog(): void {
		this.store.closeContentDialog();
	}

	openArchivosSummaryDialog(): void {
		this.store.openArchivosSummaryDialog();
	}

	closeArchivosSummaryDialog(): void {
		this.store.closeArchivosSummaryDialog();
	}

	openTareasSummaryDialog(): void {
		this.store.openTareasSummaryDialog();
	}

	closeTareasSummaryDialog(): void {
		this.store.closeTareasSummaryDialog();
	}

	// #endregion
}

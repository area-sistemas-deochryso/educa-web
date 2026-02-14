import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { logger } from '@core/helpers';
import { ErrorHandlerService } from '@core/services';
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

@Injectable({ providedIn: 'root' })
export class CursoContenidoFacade {
	private readonly api = inject(ProfesorApiService);
	private readonly store = inject(CursoContenidoStore);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly destroyRef = inject(DestroyRef);

	// #region Estado expuesto
	readonly vm = this.store.vm;

	// #endregion
	// #region Comandos de carga

	loadContenido(horarioId: number): void {
		this.store.setSelectedHorarioId(horarioId);
		this.store.setLoading(true);

		this.api
			.getContenido(horarioId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => {
					this.store.setContenido(response.data);
					this.store.setLoading(false);

					if (response.data) {
						this.store.openContentDialog();
					} else {
						// No existe contenido ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ abrir builder
						this.store.openBuilderDialog();
					}
				},
				error: (err) => {
					logger.error('CursoContenidoFacade: Error al cargar contenido', err);
					this.errorHandler.showError('Error', 'No se pudo cargar el contenido del curso');
					this.store.setLoading(false);
				},
			});
	}

	// #endregion
	// #region CRUD Contenido

	crearContenido(request: CrearCursoContenidoRequest): void {
		this.store.setSaving(true);

		this.api
			.crearContenido(request)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => {
					this.store.setContenido(response.data);
					this.store.setSaving(false);
					this.store.closeBuilderDialog();
					this.store.openContentDialog();
				},
				error: (err) => {
					logger.error('CursoContenidoFacade: Error al crear contenido', err);
					this.errorHandler.showError('Error', 'No se pudo crear el contenido');
					this.store.setSaving(false);
				},
			});
	}

	eliminarContenido(contenidoId: number): void {
		this.store.setSaving(true);

		this.api
			.eliminarContenido(contenidoId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					this.store.closeContentDialog();
					this.store.setSaving(false);
				},
				error: (err) => {
					logger.error('CursoContenidoFacade: Error al eliminar contenido', err);
					this.errorHandler.showError('Error', 'No se pudo eliminar el contenido');
					this.store.setSaving(false);
				},
			});
	}

	// #endregion
	// #region Semanas

	actualizarSemana(semanaId: number, request: ActualizarSemanaRequest): void {
		this.store.setSaving(true);

		this.api
			.actualizarSemana(semanaId, request)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => {
					// MutaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n quirÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºrgica
					this.store.updateSemana(semanaId, response.data);
					this.store.setSaving(false);
					this.store.closeSemanaEditDialog();
				},
				error: (err) => {
					logger.error('CursoContenidoFacade: Error al actualizar semana', err);
					this.errorHandler.showError('Error', 'No se pudo actualizar la semana');
					this.store.setSaving(false);
				},
			});
	}

	// #endregion
	// #region Archivos

	/**
	 * Flujo de 2 pasos: upload a blob ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ registrar metadata
	 */
	uploadArchivo(semanaId: number, file: File): void {
		this.store.setSaving(true);

		// Paso 1: Upload al BlobStorage
		this.api
			.uploadFile(file)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (blobResponse) => {
					// Paso 2: Registrar metadata en BD
					const request: RegistrarArchivoRequest = {
						nombreArchivo: file.name,
						urlArchivo: blobResponse.url,
						tipoArchivo: file.type || null,
						tamanoBytes: file.size,
					};

					this.api
						.registrarArchivo(semanaId, request)
						.pipe(takeUntilDestroyed(this.destroyRef))
						.subscribe({
							next: (response) => {
								// MutaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n quirÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºrgica
								this.store.addArchivoToSemana(semanaId, response.data);
								this.store.setSaving(false);
							},
							error: (err) => {
								logger.error('CursoContenidoFacade: Error al registrar archivo', err);
								this.errorHandler.showError('Error', 'Archivo subido pero no se pudo registrar');
								this.store.setSaving(false);
							},
						});
				},
				error: (err) => {
					logger.error('CursoContenidoFacade: Error al subir archivo', err);
					this.errorHandler.showError('Error', 'No se pudo subir el archivo');
					this.store.setSaving(false);
				},
			});
	}

	eliminarArchivo(semanaId: number, archivoId: number): void {
		this.store.setSaving(true);

		this.api
			.eliminarArchivo(archivoId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					// MutaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n quirÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºrgica
					this.store.removeArchivoFromSemana(semanaId, archivoId);
					this.store.setSaving(false);
				},
				error: (err) => {
					logger.error('CursoContenidoFacade: Error al eliminar archivo', err);
					this.errorHandler.showError('Error', 'No se pudo eliminar el archivo');
					this.store.setSaving(false);
				},
			});
	}

	// #endregion
	// #region Tareas

	crearTarea(semanaId: number, request: CrearTareaRequest): void {
		this.store.setSaving(true);

		this.api
			.crearTarea(semanaId, request)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => {
					// MutaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n quirÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºrgica
					this.store.addTareaToSemana(semanaId, response.data);
					this.store.setSaving(false);
					this.store.closeTareaDialog();
				},
				error: (err) => {
					logger.error('CursoContenidoFacade: Error al crear tarea', err);
					this.errorHandler.showError('Error', 'No se pudo crear la tarea');
					this.store.setSaving(false);
				},
			});
	}

	actualizarTarea(semanaId: number, tareaId: number, request: ActualizarTareaRequest): void {
		this.store.setSaving(true);

		this.api
			.actualizarTarea(tareaId, request)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => {
					// MutaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n quirÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºrgica
					this.store.updateTareaInSemana(semanaId, tareaId, response.data);
					this.store.setSaving(false);
					this.store.closeTareaDialog();
				},
				error: (err) => {
					logger.error('CursoContenidoFacade: Error al actualizar tarea', err);
					this.errorHandler.showError('Error', 'No se pudo actualizar la tarea');
					this.store.setSaving(false);
				},
			});
	}

	eliminarTarea(semanaId: number, tareaId: number): void {
		this.store.setSaving(true);

		this.api
			.eliminarTarea(tareaId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: () => {
					// MutaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n quirÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºrgica
					this.store.removeTareaFromSemana(semanaId, tareaId);
					this.store.setSaving(false);
				},
				error: (err) => {
					logger.error('CursoContenidoFacade: Error al eliminar tarea', err);
					this.errorHandler.showError('Error', 'No se pudo eliminar la tarea');
					this.store.setSaving(false);
				},
			});
	}

	// #endregion
	// #region Dialog commands
	openSemanaEditDialog(semana: CursoContenidoSemanaDto): void {
		this.store.openSemanaEditDialog(semana);
	}

	closeSemanaEditDialog(): void {
		this.store.closeSemanaEditDialog();
	}

	openTareaDialog(tarea: CursoContenidoTareaDto | null): void {
		this.store.openTareaDialog(tarea);
	}

	closeTareaDialog(): void {
		this.store.closeTareaDialog();
	}

	closeContentDialog(): void {
		this.store.closeContentDialog();
	}

	closeBuilderDialog(): void {
		this.store.closeBuilderDialog();
	}
	// #endregion
}

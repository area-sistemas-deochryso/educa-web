import { Injectable, inject } from '@angular/core';
import { facadeErrorHandler } from '@core/helpers';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { environment } from '@config';
import { ProfesorApiService } from '../../services/profesor-api.service';
import { CursoContenidoStore } from './curso-contenido.store';

/**
 * Publicar o pasar a borrador una semana, un archivo o una tarea. Un borrador no lo ven los estudiantes.
 *
 * Vive aparte de `CursoContenidoCrudFacade` porque no crea ni borra nada: solo cambia la visibilidad.
 */
// WAL cross-tab refetch: el `CursoContenidoDataFacade` ya está suscripto a estos resourceTypes (ver brief 091 §E).
@Injectable({ providedIn: 'root' })
export class CursoContenidoPublicacionFacade {
	// #region Dependencias
	private readonly api = inject(ProfesorApiService);
	private readonly store = inject(CursoContenidoStore);
	private readonly wal = inject(WalFacadeHelper);
	private readonly contenidoUrl = `${environment.apiUrl}/api/CursoContenido`;
	private readonly errHandler = facadeErrorHandler({
		tag: 'CursoContenidoPublicacionFacade',
		errorHandler: inject(ErrorHandlerService),
	});
	// #endregion

	// #region Publicación

	/**
	 * Publica o pasa a borrador una semana. Un borrador oculta la semana y todo su contenido a los estudiantes.
	 */
	cambiarPublicacionSemana(semanaId: number, publicado: boolean): void {
		const anterior = this.store.vm().contenido?.semanas?.find((s) => s.id === semanaId)?.publicado;
		const request = { publicado };
		this.wal.execute({
			operation: 'UPDATE',
			resourceType: 'cursoContenidoSemana',
			resourceId: semanaId,
			endpoint: `${this.contenidoUrl}/semana/${semanaId}/publicacion`,
			method: 'PATCH',
			payload: request,
			http$: () => this.api.cambiarPublicacionSemana(semanaId, request),
			optimistic: {
				apply: () => this.store.updateSemana(semanaId, { publicado }),
				rollback: () => this.store.updateSemana(semanaId, { publicado: anterior ?? true }),
			},
			onCommit: (semana) => this.store.updateSemana(semanaId, { publicado: semana.publicado }),
			onError: (err) => this.errHandler.handle(err, 'cambiar la publicación de la semana'),
		});
	}

	/** Publica o pasa a borrador un archivo de la semana. */
	cambiarPublicacionArchivo(semanaId: number, archivoId: number, publicado: boolean): void {
		const anterior = this.store
			.vm()
			.contenido?.semanas?.find((s) => s.id === semanaId)
			?.archivos.find((a) => a.id === archivoId)?.publicado;
		const request = { publicado };
		this.wal.execute({
			operation: 'UPDATE',
			resourceType: 'cursoContenidoArchivo',
			resourceId: archivoId,
			endpoint: `${this.contenidoUrl}/archivo/${archivoId}/publicacion`,
			method: 'PATCH',
			payload: request,
			http$: () => this.api.cambiarPublicacionArchivo(archivoId, request),
			optimistic: {
				apply: () => this.store.updateArchivoInSemana(semanaId, archivoId, { publicado }),
				rollback: () => this.store.updateArchivoInSemana(semanaId, archivoId, { publicado: anterior ?? true }),
			},
			onCommit: (archivo) => this.store.updateArchivoInSemana(semanaId, archivoId, { publicado: archivo.publicado }),
			onError: (err) => this.errHandler.handle(err, 'cambiar la publicación del archivo'),
		});
	}

	/** Publica o pasa a borrador una tarea, actividad o examen. */
	cambiarPublicacionTarea(semanaId: number, tareaId: number, publicado: boolean): void {
		const anterior = this.store
			.vm()
			.contenido?.semanas?.find((s) => s.id === semanaId)
			?.tareas.find((t) => t.id === tareaId)?.publicado;
		const request = { publicado };
		this.wal.execute({
			operation: 'UPDATE',
			resourceType: 'cursoContenidoTarea',
			resourceId: tareaId,
			endpoint: `${this.contenidoUrl}/tarea/${tareaId}/publicacion`,
			method: 'PATCH',
			payload: request,
			http$: () => this.api.cambiarPublicacionTarea(tareaId, request),
			optimistic: {
				apply: () => this.store.updateTareaInSemana(semanaId, tareaId, { publicado }),
				rollback: () => this.store.updateTareaInSemana(semanaId, tareaId, { publicado: anterior ?? true }),
			},
			onCommit: (tarea) => this.store.updateTareaInSemana(semanaId, tareaId, { publicado: tarea.publicado }),
			onError: (err) => this.errHandler.handle(err, 'cambiar la publicación de la tarea'),
		});
	}

	// #endregion
}

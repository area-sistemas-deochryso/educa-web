import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '@config/environment';
import { logger, withRetry } from '@core/helpers';
import { ErrorHandlerService, WalFacadeHelper } from '@core/services';
import { UI_SUMMARIES, UI_ESTUDIANTE_ERROR_DETAILS, UI_ATTACHMENT_MESSAGES } from '@shared/constants';
import { SmartNotificationService } from '@core/services/notifications/smart-notification.service';
import { ActividadSnapshot } from '@core/services/notifications/smart-notification.models';
import { EstudianteApiService } from './estudiante-api.service';
import { EstudianteCursosStore } from './estudiante-cursos.store';
import { RegistrarEstudianteArchivoRequest, RegistrarEstudianteTareaArchivoRequest } from '../models';

const ESTUDIANTE_CURSO_URL = `${environment.apiUrl}/api/EstudianteCurso`;

@Injectable({ providedIn: 'root' })
export class EstudianteCursosFacade {
	// #region Dependencias
	private readonly api = inject(EstudianteApiService);
	private readonly store = inject(EstudianteCursosStore);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly smartNotif = inject(SmartNotificationService);
	private readonly wal = inject(WalFacadeHelper);
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
					this.errorHandler.showError(UI_SUMMARIES.error, UI_ESTUDIANTE_ERROR_DETAILS.loadCursos);
					this.store.setError(UI_ESTUDIANTE_ERROR_DETAILS.loadCursos);
					this.store.setLoading(false);
				},
			});
	}

	loadContenido(horarioId: number): void {
		if (this.store.contentLoading()) return;
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
						this.saveTareaSnapshots(contenido);
					}
				},
				error: (err) => {
					logger.error('EstudianteCursosFacade: Error al cargar contenido', err);
					this.errorHandler.showError(UI_SUMMARIES.error, UI_ESTUDIANTE_ERROR_DETAILS.loadContenido);
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

	/**
	 * Load grades for the current course by matching cursoNombre + salonDescripcion.
	 */
	loadMisNotasCurso(): void {
		const contenido = this.store.contenido();
		if (!contenido) return;
		if (this.store.misNotasLoading()) return;

		this.store.setMisNotasLoading(true);

		this.api
			.getMisNotas()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (allNotas) => {
					const match = allNotas.find(
						(n) => n.cursoContenidoId === contenido.id,
					);
					this.store.setMisNotasCurso(match ?? null);
					this.store.setMisNotasLoading(false);
				},
				error: (err) => {
					logger.error('EstudianteCursosFacade: Error al cargar notas del curso', err);
					this.store.setMisNotasCurso(null);
					this.store.setMisNotasLoading(false);
				},
			});
	}

	/**
	 * Load attendance summary for the current course.
	 */
	loadMiAsistencia(): void {
		const contenido = this.store.contenido();
		if (!contenido) return;
		if (this.store.miAsistenciaLoading()) return;

		this.store.setMiAsistenciaLoading(true);

		this.api
			.getMiAsistencia(contenido.horarioId)
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (resumen) => {
					this.store.setMiAsistencia(resumen);
					this.store.setMiAsistenciaLoading(false);
				},
				error: (err) => {
					logger.error('EstudianteCursosFacade: Error al cargar asistencia', err);
					this.store.setMiAsistencia(null);
					this.store.setMiAsistenciaLoading(false);
				},
			});
	}

	/** Refresh content tab: clear caches and re-fetch contenido + files. */
	refreshContenido(): void {
		const contenido = this.store.contenido();
		if (!contenido) return;
		this.store.clearLoadedCaches();
		this.store.setContentLoading(true);

		this.api
			.getContenido(contenido.horarioId)
			.pipe(
				withRetry({ tag: 'EstudianteCursosFacade:refreshContenido' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (data) => {
					this.store.setContenido(data);
					this.store.setContentLoading(false);
					// Caches cleared above; files reload lazily via accordion
				},
				error: (err) => {
					logger.error('EstudianteCursosFacade: Error al refrescar contenido', err);
					this.store.setContentLoading(false);
				},
			});
	}

	/** Refresh notas for the current course (bypasses loaded flag). */
	refreshMisNotasCurso(): void {
		this.loadMisNotasCurso();
	}

	/** Refresh attendance for the current course (bypasses loaded flag). */
	refreshMiAsistencia(): void {
		const contenido = this.store.contenido();
		if (!contenido) return;
		this.store.setMiAsistenciaLoading(true);
		this.api.getMiAsistencia(contenido.horarioId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: (resumen) => { this.store.setMiAsistencia(resumen); this.store.setMiAsistenciaLoading(false); },
			error: (err) => { logger.error('EstudianteCursosFacade: Error al refrescar asistencia', err); this.store.setMiAsistenciaLoading(false); },
		});
	}

	// #endregion
	// #region Student file commands

	/**
	 * Upload file to blob storage then register metadata.
	 */
	uploadArchivo(semanaId: number, file: File): void {
		this.uploadAndRegister(
			file,
			(blob) => this.api.registrarArchivo(semanaId, this.buildArchivoRequest(file, blob.url)),
			(archivo) => this.store.addMiArchivo(semanaId, archivo),
		);
	}

	private buildArchivoRequest(file: File, url: string): RegistrarEstudianteArchivoRequest {
		return { nombreArchivo: file.name, urlArchivo: url, tipoArchivo: file.type || null, tamanoBytes: file.size };
	}

	private uploadAndRegister<T>(
		file: File,
		register: (blob: { url: string }) => import('rxjs').Observable<T>,
		onRegistered: (result: T) => void,
	): void {
		this.store.setSaving(true);
		this.api.uploadFile(file).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
			next: (blob) => {
				register(blob).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
					next: (result) => { onRegistered(result); this.store.setSaving(false); },
					error: (err) => {
						logger.error('EstudianteCursosFacade: Error al registrar', err);
						this.errorHandler.showError(UI_SUMMARIES.error, UI_ATTACHMENT_MESSAGES.registerFailed);
						this.store.setSaving(false);
					},
				});
			},
			error: (err) => {
				logger.error('EstudianteCursosFacade: Error al subir archivo', err);
				this.errorHandler.showError(UI_SUMMARIES.error, UI_ATTACHMENT_MESSAGES.uploadFailed);
				this.store.setSaving(false);
			},
		});
	}

	/**
	 * Delete student's own file with optimistic removal + deterministic rollback.
	 */
	eliminarArchivo(semanaId: number, archivoId: number): void {
		const snapshot = (this.store.vm().misArchivos[semanaId] ?? []).find(
			(a) => a.id === archivoId,
		);
		if (!snapshot) return;

		this.wal.execute({
			operation: 'DELETE',
			resourceType: 'EstudianteArchivo',
			resourceId: archivoId,
			endpoint: `${ESTUDIANTE_CURSO_URL}/archivo/${archivoId}`,
			method: 'DELETE',
			payload: null,
			http$: () => this.api.eliminarArchivo(archivoId),
			optimistic: {
				apply: () => this.store.removeMiArchivo(semanaId, archivoId),
				rollback: () => this.store.addMiArchivo(semanaId, snapshot),
			},
			onCommit: () => {},
			onError: (err) => {
				logger.error('EstudianteCursosFacade: Error al eliminar archivo', err);
				this.errorHandler.showError(UI_SUMMARIES.error, UI_ATTACHMENT_MESSAGES.deleteFailed);
			},
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
		this.uploadAndRegister(
			file,
			(blob) => this.api.registrarTareaArchivo(tareaId, this.buildTareaRequest(file, blob.url)),
			(archivo) => this.store.addMiTareaArchivo(tareaId, archivo),
		);
	}

	private buildTareaRequest(file: File, url: string): RegistrarEstudianteTareaArchivoRequest {
		return { nombreArchivo: file.name, urlArchivo: url, tipoArchivo: file.type || null, tamanoBytes: file.size };
	}

	/**
	 * Delete student's own task file with optimistic removal + deterministic rollback.
	 */
	eliminarTareaArchivo(tareaId: number, archivoId: number): void {
		const snapshot = (this.store.vm().misTareaArchivos[tareaId] ?? []).find(
			(a) => a.id === archivoId,
		);
		if (!snapshot) return;

		this.wal.execute({
			operation: 'DELETE',
			resourceType: 'EstudianteTareaArchivo',
			resourceId: archivoId,
			endpoint: `${ESTUDIANTE_CURSO_URL}/tarea-archivo/${archivoId}`,
			method: 'DELETE',
			payload: null,
			http$: () => this.api.eliminarTareaArchivo(archivoId),
			optimistic: {
				apply: () => this.store.removeMiTareaArchivo(tareaId, archivoId),
				rollback: () => this.store.addMiTareaArchivo(tareaId, snapshot),
			},
			onCommit: () => {},
			onError: (err) => {
				logger.error('EstudianteCursosFacade: Error al eliminar archivo de tarea', err);
				this.errorHandler.showError(UI_SUMMARIES.error, UI_ATTACHMENT_MESSAGES.deleteFailed);
			},
		});
	}

	// #endregion
	// #region Dialog commands

	closeContentDialog(): void { this.store.closeContentDialog(); }
	openArchivosSummaryDialog(): void { this.store.openArchivosSummaryDialog(); }
	closeArchivosSummaryDialog(): void { this.store.closeArchivosSummaryDialog(); }
	openTareasSummaryDialog(): void { this.store.openTareasSummaryDialog(); }
	closeTareasSummaryDialog(): void { this.store.closeTareasSummaryDialog(); }

	// #endregion

	// #region Smart notifications
	private saveTareaSnapshots(contenido: import('../models').CursoContenidoDetalleDto): void {
		// Extract tareas with fechaLimite as actividades
		const horarios = this.store.horarios();
		const horario = horarios.find((h) => h.id === contenido.horarioId);
		const cursoNombre = horario?.cursoNombre ?? 'Curso';

		const snapshots: ActividadSnapshot[] = contenido.semanas
			.flatMap((s) => s.tareas)
			.filter((t) => t.fechaLimite)
			.map((t) => ({
				cursoNombre,
				titulo: t.titulo,
				tipo: 'Tarea',
				fecha: t.fechaLimite!,
			}));

		if (snapshots.length > 0) {
			this.smartNotif.saveActividadSnapshot(snapshots);
		}
	}
	// #endregion
}

import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { logger, withRetry } from '@core/helpers';
import { ErrorHandlerService } from '@core/services';
import { ProfesorApiService } from '../../services/profesor-api.service';
import { CursoContenidoStore } from './curso-contenido.store';
import { CursoContenidoSemanaDto, CursoContenidoTareaDto } from '../../models';

/**
 * Facade for UI state: dialog visibility, student files/submissions data loading.
 *
 * @example
 * const facade = inject(CursoContenidoUiFacade);
 * facade.openSemanaEditDialog(semana);
 */
@Injectable({ providedIn: 'root' })
export class CursoContenidoUiFacade {
	// #region Dependencias
	private readonly api = inject(ProfesorApiService);
	private readonly store = inject(CursoContenidoStore);
	private readonly errorHandler = inject(ErrorHandlerService);
	private readonly destroyRef = inject(DestroyRef);
	// #endregion

	// #region Estado expuesto
	readonly vm = this.store.vm;
	// #endregion

	// #region Dialog commands

	/** Open the week edit dialog with a selected week. */
	openSemanaEditDialog(semana: CursoContenidoSemanaDto): void {
		this.store.openSemanaEditDialog(semana);
	}

	/** Close the week edit dialog and clear selection. */
	closeSemanaEditDialog(): void {
		this.store.closeSemanaEditDialog();
	}

	/** Open the task dialog with an existing task or null for create. */
	openTareaDialog(tarea: CursoContenidoTareaDto | null): void {
		this.store.openTareaDialog(tarea);
	}

	/** Close the task dialog and clear selection. */
	closeTareaDialog(): void {
		this.store.closeTareaDialog();
	}

	/** Close content dialog and clear content state. */
	closeContentDialog(): void {
		this.store.closeContentDialog();
	}

	/** Close content builder dialog. */
	closeBuilderDialog(): void {
		this.store.closeBuilderDialog();
	}

	/** Open archivos summary sub-modal. */
	openArchivosSummaryDialog(): void {
		this.store.openArchivosSummaryDialog();
	}

	/** Close archivos summary sub-modal. */
	closeArchivosSummaryDialog(): void {
		this.store.closeArchivosSummaryDialog();
	}

	/** Open tareas summary sub-modal. */
	openTareasSummaryDialog(): void {
		this.store.openTareasSummaryDialog();
	}

	/** Close tareas summary sub-modal. */
	closeTareasSummaryDialog(): void {
		this.store.closeTareasSummaryDialog();
	}

	// #endregion
	// #region Student files

	/**
	 * Load student files and open the sub-modal.
	 *
	 * @param contenidoId Content id.
	 */
	openStudentFilesDialog(contenidoId: number): void {
		if (this.store.studentFilesLoading()) return;
		this.store.openStudentFilesDialog();
		this.store.setStudentFilesLoading(true);

		this.api
			.getArchivosEstudiantes(contenidoId)
			.pipe(
				withRetry({ tag: 'CursoContenidoUiFacade:loadStudentFiles' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (data) => {
					this.store.setStudentFilesData(data);
					this.store.setStudentFilesLoading(false);
				},
				error: (err) => {
					logger.error('CursoContenidoUiFacade: Error al cargar archivos de estudiantes', err);
					this.errorHandler.showError('Error', 'No se pudo cargar los archivos de estudiantes');
					this.store.setStudentFilesLoading(false);
				},
			});
	}

	/** Close student files sub-modal. */
	closeStudentFilesDialog(): void {
		this.store.closeStudentFilesDialog();
	}

	// #endregion
	// #region Task submissions

	/**
	 * Load student submissions for a task and open the dialog.
	 *
	 * @param tarea Task to view submissions for.
	 */
	openTaskSubmissionsDialog(tarea: CursoContenidoTareaDto): void {
		if (this.store.taskSubmissionsLoading()) return;
		this.store.openTaskSubmissionsDialog(tarea);
		this.store.setTaskSubmissionsLoading(true);

		this.api
			.getArchivosTareaEstudiantes(tarea.id)
			.pipe(
				withRetry({ tag: 'CursoContenidoUiFacade:loadTaskSubmissions' }),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe({
				next: (data) => {
					this.store.setTaskSubmissionsData(data);
					this.store.setTaskSubmissionsLoading(false);
				},
				error: (err) => {
					logger.error('CursoContenidoUiFacade: Error al cargar entregas de tarea', err);
					this.errorHandler.showError('Error', 'No se pudo cargar las entregas de estudiantes');
					this.store.setTaskSubmissionsLoading(false);
				},
			});
	}

	/** Close student task submissions dialog. */
	closeTaskSubmissionsDialog(): void {
		this.store.closeTaskSubmissionsDialog();
	}

	// #endregion
	// #region Misc UI

	/** Clear the initial tab override after it has been consumed. */
	clearInitialTab(): void {
		this.store.setInitialTab(null);
	}

	// #endregion
}

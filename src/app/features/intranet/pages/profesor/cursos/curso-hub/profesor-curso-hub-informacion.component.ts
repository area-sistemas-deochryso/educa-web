import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EduConfirmDialog, EduConfirmationService, EduSpinner } from '@edu-ui';
import { CursoHubContextService, EmptyStateComponent } from '@intranet-shared/components';
import { CalificacionesFacade } from '../services/calificaciones.facade';
import { CursoContenidoDataFacade } from '../services/curso-contenido-data.facade';
import { CursoContenidoUiFacade } from '../services/curso-contenido-ui.facade';
import { ArchivosSummaryDialogComponent } from '../components/archivos-summary-dialog/archivos-summary-dialog.component';
import { TareasSummaryDialogComponent } from '../components/tareas-summary-dialog/tareas-summary-dialog.component';
import { StudentFilesDialogComponent } from '../components/student-files-dialog/student-files-dialog.component';
import { CursoHubCalificacionesLoader } from './curso-hub-calificaciones.loader';

/**
 * Pestaña Información del hub de curso del profesor (`…/informacion`): datos
 * del curso, contadores y resúmenes (archivos, tareas, adjuntos de estudiantes).
 *
 * Implementación propia del hub (decisión de F1b: duplicación temporal hasta F6).
 * Los estilos son los del modal: se referencian en lugar de copiarse; al
 * retirar el modal (F6) el scss debe moverse a esta carpeta. El contenido lo
 * carga el shell; esta pestaña solo pide las calificaciones para su contador.
 */
@Component({
	selector: 'app-profesor-curso-hub-informacion',
	standalone: true,
	imports: [
		RouterLink,
		EduConfirmDialog,
		EduSpinner,
		EmptyStateComponent,
		ArchivosSummaryDialogComponent,
		TareasSummaryDialogComponent,
		StudentFilesDialogComponent,
	],
	providers: [EduConfirmationService],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './profesor-curso-hub-informacion.component.html',
	styleUrl: '../components/curso-content-dialog/curso-content-dialog.component.scss',
})
export class ProfesorCursoHubInformacionComponent {
	// #region Dependencias
	private readonly hubContext = inject(CursoHubContextService);
	private readonly dataFacade = inject(CursoContenidoDataFacade);
	private readonly uiFacade = inject(CursoContenidoUiFacade);
	private readonly calFacade = inject(CalificacionesFacade);
	private readonly calLoader = inject(CursoHubCalificacionesLoader);
	private readonly confirmationService = inject(EduConfirmationService);
	private readonly router = inject(Router);
	// #endregion

	// #region Estado
	protected readonly vm = this.uiFacade.vm;
	protected readonly calVm = this.calFacade.vm;

	private readonly contenidoId = computed(() => this.vm().contenido?.id ?? null);
	// #endregion

	constructor() {
		// El shell cargó el contenido; acá solo se piden sus calificaciones (contador de la tarjeta).
		effect(() => {
			const id = this.contenidoId();
			if (id === null) return;
			untracked(() => this.calLoader.ensure(id));
		});
	}

	// #region Resúmenes
	protected onOpenArchivosSummary(): void {
		this.uiFacade.openArchivosSummaryDialog();
	}

	protected onArchivosSummaryVisibleChange(visible: boolean): void {
		if (!visible) this.uiFacade.closeArchivosSummaryDialog();
	}

	protected onOpenTareasSummary(): void {
		this.uiFacade.openTareasSummaryDialog();
	}

	protected onTareasSummaryVisibleChange(visible: boolean): void {
		if (!visible) this.uiFacade.closeTareasSummaryDialog();
	}

	protected onOpenStudentFiles(): void {
		const id = this.contenidoId();
		if (id !== null) this.uiFacade.openStudentFilesDialog(id);
	}

	protected onStudentFilesVisibleChange(visible: boolean): void {
		if (!visible) this.uiFacade.closeStudentFilesDialog();
	}
	// #endregion

	// #region Navegación
	/** Cierra el diálogo de adjuntos (si está abierto) y navega a Calificaciones conservando la franja. */
	protected onIrACalificaciones(): void {
		this.uiFacade.closeStudentFilesDialog();
		const target = this.hubContext.tabTarget('profesor', 'calificaciones');
		if (target) void this.router.navigate(target.commands, { queryParams: target.queryParams, replaceUrl: true });
	}
	// #endregion

	// #region Contenido de la franja
	protected onDeleteContenido(): void {
		const contenido = this.vm().contenido;
		if (!contenido) return;
		const { totalArchivos, totalTareas } = this.vm();
		this.confirmationService.confirm({
			message: `¿Eliminar todo el contenido de este curso? Esta acción no se puede deshacer. Se perderán ${totalArchivos} archivo${totalArchivos === 1 ? '' : 's'} y ${totalTareas} tarea${totalTareas === 1 ? '' : 's'}.`,
			header: 'Eliminar Contenido',
			icon: 'pi pi-exclamation-triangle',
			acceptLabel: 'Eliminar',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-danger',
			accept: () => {
				// Las calificaciones pertenecían a ese contenido: si la baja se revierte, `ensure` las recarga.
				this.calLoader.reset();
				this.dataFacade.eliminarContenidoEnHub(contenido.id);
			},
		});
	}
	// #endregion
}

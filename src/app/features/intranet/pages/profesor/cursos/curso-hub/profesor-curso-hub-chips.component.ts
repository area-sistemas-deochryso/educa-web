import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { CursoHubChip, CursoHubChipsComponent, CursoHubContextService } from '@intranet-shared/components';
import { CalificacionesFacade } from '../services/calificaciones.facade';
import { CursoContenidoUiFacade } from '../services/curso-contenido-ui.facade';
import { ArchivosSummaryDialogComponent } from '../components/archivos-summary-dialog/archivos-summary-dialog.component';
import { TareasSummaryDialogComponent } from '../components/tareas-summary-dialog/tareas-summary-dialog.component';
import { StudentFilesDialogComponent } from '../components/student-files-dialog/student-files-dialog.component';
import { CursoHubCalificacionesLoader } from './curso-hub-calificaciones.loader';

/**
 * Chips de resumen del hub de curso del profesor (reemplazan la pestaña Información):
 * archivos, tareas, adjuntos de estudiantes y calificaciones, cada uno con la acción
 * que tenía su botón. Viven en el encabezado del shell, así que sus diálogos también:
 * los chips se ven en todas las pestañas y el diálogo debe existir en cualquiera de ellas.
 *
 * El contenido lo carga el shell; acá solo se piden las calificaciones para su contador.
 */
@Component({
	selector: 'app-profesor-curso-hub-chips',
	standalone: true,
	imports: [CursoHubChipsComponent, ArchivosSummaryDialogComponent, TareasSummaryDialogComponent, StudentFilesDialogComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
		/* Los diálogos son overlays (se muestran fuera de este árbol): sus hosts no deben ocupar un hueco en el flex del encabezado. */
		app-archivos-summary-dialog,
		app-tareas-summary-dialog,
		app-student-files-dialog {
			display: none;
		}
	`,
	template: `
		@if (vm().loading || vm().contenido) {
			<app-curso-hub-chips [chips]="chips()" [loading]="vm().loading" [skeletonCount]="4" (chipClick)="onChip($event)" />
		}

		<!-- #region Diálogos (siempre en el DOM, nunca dentro de @if) -->
		<app-archivos-summary-dialog
			[visible]="vm().archivosSummaryDialogVisible"
			[semanas]="vm().semanas"
			(visibleChange)="onArchivosSummaryVisibleChange($event)"
		/>

		<app-tareas-summary-dialog
			[visible]="vm().tareasSummaryDialogVisible"
			[semanas]="vm().semanas"
			(visibleChange)="onTareasSummaryVisibleChange($event)"
		/>

		<app-student-files-dialog
			[visible]="vm().studentFilesDialogVisible"
			[data]="vm().studentFilesData"
			[loading]="vm().studentFilesLoading"
			[calificaciones]="calVm().calificaciones"
			(visibleChange)="onStudentFilesVisibleChange($event)"
			(irACalificaciones)="onIrACalificaciones()"
		/>
		<!-- #endregion -->
	`,
})
export class ProfesorCursoHubChipsComponent {
	// #region Dependencias
	private readonly hubContext = inject(CursoHubContextService);
	private readonly uiFacade = inject(CursoContenidoUiFacade);
	private readonly calFacade = inject(CalificacionesFacade);
	private readonly calLoader = inject(CursoHubCalificacionesLoader);
	private readonly router = inject(Router);
	// #endregion

	// #region Estado
	protected readonly vm = this.uiFacade.vm;
	protected readonly calVm = this.calFacade.vm;

	private readonly contenidoId = computed(() => this.vm().contenido?.id ?? null);

	protected readonly chips = computed<CursoHubChip[]>(() => {
		const { totalArchivos, totalTareas, totalArchivosEstudiantes } = this.vm();
		const cal = this.calVm();
		return [
			{ key: 'archivos', icon: 'pi pi-paperclip', label: 'Archivos', count: totalArchivos, ariaLabel: 'Ver todos los archivos' },
			{ key: 'tareas', icon: 'pi pi-file-edit', label: 'Tareas', count: totalTareas, ariaLabel: 'Ver todas las tareas' },
			{
				key: 'adjuntos',
				icon: 'pi pi-users',
				label: 'Adjuntos est.',
				count: totalArchivosEstudiantes,
				ariaLabel: 'Ver archivos de estudiantes',
			},
			{
				key: 'calificaciones',
				icon: 'pi pi-chart-bar',
				label: 'Calificaciones',
				count: cal.loading ? null : cal.totalEvaluaciones,
				ariaLabel: 'Ir a calificaciones',
			},
		];
	});
	// #endregion

	constructor() {
		// El shell cargó el contenido; acá solo se piden sus calificaciones (contador del chip).
		effect(() => {
			const id = this.contenidoId();
			if (id === null) return;
			untracked(() => this.calLoader.ensure(id));
		});
	}

	// #region Acciones
	protected onChip(key: string): void {
		switch (key) {
			case 'archivos':
				this.uiFacade.openArchivosSummaryDialog();
				break;
			case 'tareas':
				this.uiFacade.openTareasSummaryDialog();
				break;
			case 'adjuntos': {
				const id = this.contenidoId();
				if (id !== null) this.uiFacade.openStudentFilesDialog(id);
				break;
			}
			case 'calificaciones':
				this.onIrACalificaciones();
				break;
		}
	}

	protected onArchivosSummaryVisibleChange(visible: boolean): void {
		if (!visible) this.uiFacade.closeArchivosSummaryDialog();
	}

	protected onTareasSummaryVisibleChange(visible: boolean): void {
		if (!visible) this.uiFacade.closeTareasSummaryDialog();
	}

	protected onStudentFilesVisibleChange(visible: boolean): void {
		if (!visible) this.uiFacade.closeStudentFilesDialog();
	}

	/** Cierra el diálogo de adjuntos (si está abierto) y navega a Calificaciones conservando la franja. */
	protected onIrACalificaciones(): void {
		this.uiFacade.closeStudentFilesDialog();
		const target = this.hubContext.tabTarget('profesor', 'calificaciones');
		if (target) void this.router.navigate(target.commands, { queryParams: target.queryParams, replaceUrl: true });
	}
	// #endregion
}

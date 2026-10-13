import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject } from '@angular/core';
import { CursoHubChip, CursoHubChipsComponent } from '@intranet-shared/components';
// eslint-disable-next-line layer-enforcement/imports-error -- Razón: summary dialogs de archivos/tareas son vistas read-only cross-role (estudiante lee contenido que profesor publica); migración a @intranet-shared diferida (ver maestro F3.5.C).
import { ArchivosSummaryDialogComponent } from '@features/intranet/pages/profesor/cursos/components/archivos-summary-dialog/archivos-summary-dialog.component';
// eslint-disable-next-line layer-enforcement/imports-error -- Razón: ver import anterior — mismo dialog cross-role.
import { TareasSummaryDialogComponent } from '@features/intranet/pages/profesor/cursos/components/tareas-summary-dialog/tareas-summary-dialog.component';
import { EstudianteCursosFacade } from '../../services/estudiante-cursos.facade';

/**
 * Chips de resumen del hub de curso del estudiante (reemplazan la pestaña Información):
 * solo archivos y tareas, que abren sus resúmenes de solo lectura. Ir a calificaciones
 * ya no tiene chip: es la pestaña Calificaciones, a un click, en la misma barra.
 *
 * Viven en el encabezado del shell, así que sus diálogos también (los chips se ven en
 * todas las pestañas). El contenido lo carga el shell; acá solo se lee.
 */
@Component({
	selector: 'app-estudiante-curso-hub-chips',
	standalone: true,
	imports: [CursoHubChipsComponent, ArchivosSummaryDialogComponent, TareasSummaryDialogComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
		/* Los diálogos son overlays (se muestran fuera de este árbol): sus hosts no deben ocupar un hueco en el flex del encabezado. */
		app-archivos-summary-dialog,
		app-tareas-summary-dialog {
			display: none;
		}
	`,
	template: `
		@if (vm().contentLoading || vm().contenido) {
			<app-curso-hub-chips [chips]="chips()" [loading]="vm().contentLoading" [skeletonCount]="2" (chipClick)="onChip($event)" />
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
		<!-- #endregion -->
	`,
})
export class EstudianteCursoHubChipsComponent {
	private readonly facade = inject(EstudianteCursosFacade);

	protected readonly vm = this.facade.vm;

	protected readonly chips = computed<CursoHubChip[]>(() => {
		const { totalArchivos, totalTareas } = this.vm();
		return [
			{ key: 'archivos', icon: 'pi pi-paperclip', label: 'Archivos', count: totalArchivos, ariaLabel: 'Ver todos los archivos' },
			{ key: 'tareas', icon: 'pi pi-file-edit', label: 'Tareas', count: totalTareas, ariaLabel: 'Ver todas las tareas' },
		];
	});

	constructor() {
		// Los resúmenes viven en el store compartido con el modal: no dejarlos abiertos al salir del hub.
		inject(DestroyRef).onDestroy(() => {
			this.facade.closeArchivosSummaryDialog();
			this.facade.closeTareasSummaryDialog();
		});
	}

	protected onChip(key: string): void {
		if (key === 'archivos') this.facade.openArchivosSummaryDialog();
		else if (key === 'tareas') this.facade.openTareasSummaryDialog();
	}

	protected onArchivosSummaryVisibleChange(visible: boolean): void {
		if (!visible) this.facade.closeArchivosSummaryDialog();
	}

	protected onTareasSummaryVisibleChange(visible: boolean): void {
		if (!visible) this.facade.closeTareasSummaryDialog();
	}
}

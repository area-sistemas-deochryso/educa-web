import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EduSpinner } from '@edu-ui';
import { CursoHubContextService, EmptyStateComponent } from '@intranet-shared/components';
// eslint-disable-next-line layer-enforcement/imports-error -- Razón: summary dialogs de archivos/tareas son vistas read-only cross-role (estudiante lee contenido que profesor publica); migración a @intranet-shared diferida (ver maestro F3.5.C).
import { ArchivosSummaryDialogComponent } from '@features/intranet/pages/profesor/cursos/components/archivos-summary-dialog/archivos-summary-dialog.component';
// eslint-disable-next-line layer-enforcement/imports-error -- Razón: ver import anterior — mismo dialog cross-role.
import { TareasSummaryDialogComponent } from '@features/intranet/pages/profesor/cursos/components/tareas-summary-dialog/tareas-summary-dialog.component';
import { EstudianteCursosFacade } from '../../services/estudiante-cursos.facade';

/**
 * Pestaña Información del hub de curso del estudiante (`…/informacion`): datos
 * del curso, contadores y resúmenes de archivos y tareas.
 *
 * Implementación propia del hub (decisión de F1b: duplicación temporal hasta F6).
 * Los estilos son los del modal de solo lectura: se referencian en lugar de
 * copiarse; al retirar el modal (F6) el scss debe moverse a esta carpeta. El
 * contenido lo carga el shell; esta pestaña solo lo lee.
 */
@Component({
	selector: 'app-estudiante-curso-hub-informacion',
	standalone: true,
	imports: [RouterLink, EduSpinner, EmptyStateComponent, ArchivosSummaryDialogComponent, TareasSummaryDialogComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './estudiante-curso-hub-informacion.component.html',
	styleUrl: '../components/curso-content-readonly-dialog/curso-content-readonly-dialog.component.scss',
})
export class EstudianteCursoHubInformacionComponent {
	// #region Dependencias
	private readonly hubContext = inject(CursoHubContextService);
	private readonly facade = inject(EstudianteCursosFacade);
	private readonly router = inject(Router);
	// #endregion

	protected readonly vm = this.facade.vm;

	constructor() {
		// Los resúmenes viven en el store compartido con el modal: no dejarlos abiertos al cambiar de pestaña.
		inject(DestroyRef).onDestroy(() => {
			this.facade.closeArchivosSummaryDialog();
			this.facade.closeTareasSummaryDialog();
		});
	}

	// #region Resúmenes
	protected onOpenArchivosSummary(): void {
		this.facade.openArchivosSummaryDialog();
	}

	protected onArchivosSummaryVisibleChange(visible: boolean): void {
		if (!visible) this.facade.closeArchivosSummaryDialog();
	}

	protected onOpenTareasSummary(): void {
		this.facade.openTareasSummaryDialog();
	}

	protected onTareasSummaryVisibleChange(visible: boolean): void {
		if (!visible) this.facade.closeTareasSummaryDialog();
	}
	// #endregion

	// #region Navegación
	/** Navega a Mis Calificaciones conservando la franja (`horarioId`). */
	protected onIrACalificaciones(): void {
		const target = this.hubContext.tabTarget('estudiante', 'calificaciones');
		if (target) void this.router.navigate(target.commands, { queryParams: target.queryParams, replaceUrl: true });
	}
	// #endregion
}

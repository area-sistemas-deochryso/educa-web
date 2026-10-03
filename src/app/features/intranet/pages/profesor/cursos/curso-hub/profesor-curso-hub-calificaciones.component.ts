import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EduButton, EduConfirmDialog, EduConfirmationService, EduSpinner, EduTooltip } from '@edu-ui';
import { EmptyStateComponent } from '@intranet-shared/components';
import type {
	CalificacionConNotasDto,
	CalificacionDto,
	CalificarGruposLoteDto,
	CalificarLoteDto,
	CrearCalificacionDto,
	CrearPeriodoDto,
} from '@features/intranet/pages/profesor/models';
import { CalificacionesFacade } from '../services/calificaciones.facade';
import { CursoContenidoUiFacade } from '../services/curso-contenido-ui.facade';
import { CalificacionesPanelComponent } from '../components/calificaciones-panel/calificaciones-panel.component';
import { EvaluacionFormDialogComponent } from '../components/evaluacion-form-dialog/evaluacion-form-dialog.component';
import { CalificarDialogComponent } from '../components/calificar-dialog/calificar-dialog.component';
import { PeriodosConfigDialogComponent } from '../components/periodos-config-dialog/periodos-config-dialog.component';
import { CursoHubCalificacionesLoader } from './curso-hub-calificaciones.loader';

/**
 * Pestaña Calificaciones del hub de curso del profesor (`…/calificaciones`).
 *
 * Implementación propia del hub (paridad con la pestaña del modal, que no se
 * toca hasta F6). El contenido lo carga el shell; esta pestaña solo pide las
 * calificaciones del contenido ya cargado y nunca resetea los stores.
 */
@Component({
	selector: 'app-profesor-curso-hub-calificaciones',
	standalone: true,
	imports: [
		RouterLink,
		EduButton,
		EduConfirmDialog,
		EduSpinner,
		EduTooltip,
		EmptyStateComponent,
		CalificacionesPanelComponent,
		EvaluacionFormDialogComponent,
		CalificarDialogComponent,
		PeriodosConfigDialogComponent,
	],
	providers: [EduConfirmationService],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		.hub-calificaciones {
			padding: 1rem;
		}
		.hub-calificaciones__toolbar {
			display: flex;
			justify-content: flex-end;
			margin-bottom: 0.5rem;
		}
	`,
	template: `
		<div class="hub-calificaciones">
			@if (vm().loading) {
				<div class="flex justify-content-center p-5">
					<edu-spinner strokeWidth="4" />
				</div>
			} @else if (vm().contenido) {
				<div class="hub-calificaciones__toolbar">
					<edu-button
						icon="pi pi-refresh"
						[text]="true"
						[rounded]="true"
						size="small"
						data-info-anchor="profesor-curso-hub-refresh-calificaciones"
						(click)="onRefreshCalificaciones()"
						[disabled]="calVm().loading"
						eduTooltip="Refrescar"
						eduTooltipPosition="top"
						[pt]="{ root: { 'aria-label': 'Refrescar calificaciones' } }"
					/>
				</div>
				<app-calificaciones-panel
					[calificacionesPorSemana]="calVm().calificacionesPorSemana"
					[periodos]="calVm().periodos"
					[loading]="calVm().loading"
					[saving]="calVm().saving"
					[totalEvaluaciones]="calVm().totalEvaluaciones"
					[calificacionConfig]="calVm().calificacionConfig"
					(crearEvaluacion)="onCrearEvaluacion()"
					(editarEvaluacion)="onEditarEvaluacion($event)"
					(calificarEstudiantes)="onCalificarEstudiantes($event)"
					(eliminarEvaluacion)="onEliminarEvaluacion($event)"
					(cambiarTipo)="onCambiarTipo($event)"
					(configurarPeriodos)="onConfigurarPeriodos()"
				/>
			} @else if (vm().error) {
				<app-empty-state
					icon="pi pi-exclamation-triangle"
					title="Calificaciones"
					message="No se pudo cargar el contenido de esta franja. Intenta de nuevo más tarde."
				/>
			} @else {
				<div class="text-center p-4" data-info-anchor="profesor-curso-hub-calificaciones-sin-contenido">
					<p class="m-0 mb-2">Esta franja todavía no tiene contenido, por lo que no hay evaluaciones.</p>
					<a routerLink="../contenido" queryParamsHandling="merge" [replaceUrl]="true">Ir a Contenido</a>
				</div>
			}
		</div>

		<!-- #region Diálogos (siempre en el DOM, nunca dentro de @if) -->
		<app-evaluacion-form-dialog
			[visible]="calVm().calificacionDialogVisible"
			[saving]="calVm().saving"
			[editing]="calVm().editingCalificacion"
			[semanas]="vm().semanas"
			[contenidoId]="vm().contenido?.id ?? null"
			(visibleChange)="onCalificacionDialogVisibleChange($event)"
			(save)="onSaveEvaluacion($event)"
		/>

		<app-calificar-dialog
			[visible]="calVm().calificarDialogVisible"
			[saving]="calVm().saving"
			[calificacion]="calVm().selectedCalificacion"
			[estudiantes]="estudiantesList()"
			[grupos]="calVm().gruposForCalificar"
			[calificacionConfig]="calVm().calificacionConfig"
			(visibleChange)="onCalificarDialogVisibleChange($event)"
			(save)="onSaveCalificaciones($event)"
			(saveGrupos)="onSaveCalificacionesGrupos($event)"
		/>

		<app-periodos-config-dialog
			[visible]="calVm().periodosDialogVisible"
			[saving]="calVm().saving"
			[periodos]="calVm().periodos"
			[contenidoId]="vm().contenido?.id ?? null"
			[totalSemanas]="vm().contenido?.numeroSemanas ?? 16"
			(visibleChange)="onPeriodosDialogVisibleChange($event)"
			(crearPeriodo)="onCrearPeriodo($event)"
			(eliminarPeriodo)="onEliminarPeriodo($event)"
		/>

		<edu-confirm-dialog />
		<!-- #endregion -->
	`,
})
export class ProfesorCursoHubCalificacionesComponent {
	// #region Dependencias
	private readonly uiFacade = inject(CursoContenidoUiFacade);
	private readonly calFacade = inject(CalificacionesFacade);
	private readonly calLoader = inject(CursoHubCalificacionesLoader);
	private readonly confirmationService = inject(EduConfirmationService);
	// #endregion

	// #region Estado
	protected readonly vm = this.uiFacade.vm;
	protected readonly calVm = this.calFacade.vm;

	private readonly contenidoId = computed(() => this.vm().contenido?.id ?? null);

	/** Estudiantes del diálogo de calificar: los del salón o, si faltan, los de las notas existentes. */
	protected readonly estudiantesList = computed(() => {
		const salonEstudiantes = this.calVm().salonEstudiantes;
		if (salonEstudiantes.length > 0) {
			return salonEstudiantes.map((e) => ({ id: e.estudianteId, nombre: e.nombreCompleto }));
		}
		const cal = this.calVm().selectedCalificacion;
		if (!cal) return [];
		return cal.notas.map((n) => ({ id: n.estudianteId, nombre: n.estudianteNombre }));
	});
	// #endregion

	constructor() {
		// El shell cargó el contenido; acá solo se piden sus calificaciones (una vez por contenido).
		effect(() => {
			const id = this.contenidoId();
			if (id === null) return;
			untracked(() => this.calLoader.ensure(id));
		});
	}

	// #region Refresco
	protected onRefreshCalificaciones(): void {
		const id = this.contenidoId();
		if (id !== null) this.calLoader.refresh(id);
	}
	// #endregion

	// #region Evaluaciones
	protected onCrearEvaluacion(): void {
		this.calFacade.openCalificacionDialog();
	}

	protected onEditarEvaluacion(cal: CalificacionDto): void {
		this.calFacade.openCalificacionDialog(cal);
	}

	protected onCalificarEstudiantes(cal: CalificacionConNotasDto): void {
		this.calFacade.openCalificarDialog(cal);
	}

	protected onEliminarEvaluacion(cal: CalificacionConNotasDto): void {
		this.confirmationService.confirm({
			message: `¿Eliminar la evaluación "${cal.titulo}"? Se eliminarán todas las notas asociadas.`,
			header: 'Confirmar Eliminación',
			icon: 'pi pi-exclamation-triangle',
			acceptLabel: 'Eliminar',
			rejectLabel: 'Cancelar',
			acceptButtonStyleClass: 'p-button-danger',
			accept: () => this.calFacade.eliminarCalificacion(cal.id),
		});
	}

	protected onCambiarTipo(cal: CalificacionConNotasDto): void {
		const nuevoTipo = cal.esGrupal ? 'individual' : 'grupal';
		this.confirmationService.confirm({
			message: `¿Cambiar "${cal.titulo}" a ${nuevoTipo}? Las notas existentes se migrarán automáticamente.`,
			header: 'Cambiar tipo de evaluación',
			icon: 'pi pi-info-circle',
			acceptLabel: 'Cambiar',
			rejectLabel: 'Cancelar',
			accept: () => this.calFacade.cambiarTipo(cal.id, { esGrupal: !cal.esGrupal }),
		});
	}

	protected onCalificacionDialogVisibleChange(visible: boolean): void {
		if (!visible) this.calFacade.closeCalificacionDialog();
	}

	protected onSaveEvaluacion(dto: CrearCalificacionDto): void {
		this.calFacade.crearCalificacion(dto);
	}
	// #endregion

	// #region Calificar
	protected onCalificarDialogVisibleChange(visible: boolean): void {
		if (!visible) this.calFacade.closeCalificarDialog();
	}

	protected onSaveCalificaciones(dto: CalificarLoteDto): void {
		const cal = this.calVm().selectedCalificacion;
		const contenidoId = this.contenidoId();
		if (cal && contenidoId !== null) this.calFacade.calificarLote(cal.id, dto, contenidoId);
	}

	protected onSaveCalificacionesGrupos(dto: CalificarGruposLoteDto): void {
		const cal = this.calVm().selectedCalificacion;
		const contenidoId = this.contenidoId();
		if (cal && contenidoId !== null) this.calFacade.calificarGruposLote(cal.id, dto, contenidoId);
	}
	// #endregion

	// #region Periodos
	protected onConfigurarPeriodos(): void {
		this.calFacade.openPeriodosDialog();
	}

	protected onPeriodosDialogVisibleChange(visible: boolean): void {
		if (!visible) this.calFacade.closePeriodosDialog();
	}

	protected onCrearPeriodo(dto: CrearPeriodoDto): void {
		this.calFacade.crearPeriodo(dto);
	}

	protected onEliminarPeriodo(periodoId: number): void {
		this.calFacade.eliminarPeriodo(periodoId);
	}
	// #endregion
}

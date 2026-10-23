import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { EduButton, EduConfirmDialog, EduConfirmationService, EduMenu, EduSpinner, EduTooltip } from '@edu-ui';
import type { EduMenuItem } from '@edu-ui';
import { CursoHubContextService, EmptyStateComponent } from '@intranet-shared/components';
import { CursoContenidoCrudFacade } from '../services/curso-contenido-crud.facade';
import { CursoContenidoDataFacade } from '../services/curso-contenido-data.facade';
import { CursoContenidoUiFacade } from '../services/curso-contenido-ui.facade';
import { CalificacionesFacade } from '../services/calificaciones.facade';
import { CursoHubCalificacionesLoader } from './curso-hub-calificaciones.loader';
import { SemanasAccordionComponent } from '../components/semanas-accordion/semanas-accordion.component';
import { SemanaEditDialogComponent } from '../components/semana-edit-dialog/semana-edit-dialog.component';
import { TareaDialogComponent } from '../components/tarea-dialog/tarea-dialog.component';
import { EvaluacionFormDialogComponent } from '../components/evaluacion-form-dialog/evaluacion-form-dialog.component';
import { StudentTaskSubmissionsDialogComponent } from '../components/student-task-submissions-dialog/student-task-submissions-dialog.component';
import { CursoBuilderDialogComponent } from '../components/curso-builder-dialog/curso-builder-dialog.component';
import type { ActualizarTareaRequest, CalificacionDto, CrearCalificacionDto, CrearTareaRequest } from '@features/intranet/pages/profesor/models';

/**
 * Pestaña Contenido del hub de curso del profesor (`…/contenido`).
 *
 * Implementación propia del hub: no depende del antiguo modal de contenido
 * (decisión de F1b: duplicación temporal hasta F6). Comparte con el modal los
 * stores/facades root. La carga y el reset del store son del shell del hub
 * (`ProfesorCursoHubComponent`): esta pestaña solo lee.
 */
@Component({
	selector: 'app-profesor-curso-hub-contenido',
	standalone: true,
	imports: [
		EduButton,
		EduConfirmDialog,
		EduMenu,
		EduSpinner,
		EduTooltip,
		EmptyStateComponent,
		SemanasAccordionComponent,
		SemanaEditDialogComponent,
		TareaDialogComponent,
		EvaluacionFormDialogComponent,
		StudentTaskSubmissionsDialogComponent,
		CursoBuilderDialogComponent,
	],
	providers: [EduConfirmationService],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		.hub-contenido {
			padding: 1rem;
		}
		.hub-contenido__empty {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 0.75rem;
			padding: 2rem 1rem;
			text-align: center;
			color: var(--text-color-secondary);
		}
		.hub-contenido__empty i {
			font-size: 2rem;
		}
	`,
	template: `
		<div class="hub-contenido">
			@if (vm().loading) {
				<div class="flex justify-content-center p-5">
					<edu-spinner strokeWidth="4" />
				</div>
			} @else if (vm().contenido) {
				<app-semanas-accordion>
					<edu-button
						toolbarActions
						icon="pi pi-ellipsis-v"
						[text]="true"
						[rounded]="true"
						size="small"
						data-info-anchor="profesor-curso-hub-contenido-menu"
						eduTooltip="Más acciones"
						eduTooltipPosition="top"
						(click)="contenidoMenu.toggle($event)"
						[pt]="{ root: { 'aria-label': 'Más acciones del contenido', 'aria-haspopup': 'menu' } }"
					/>
				</app-semanas-accordion>
			} @else if (vm().error) {
				<app-empty-state
					icon="pi pi-exclamation-triangle"
					title="Contenido"
					message="No se pudo cargar el contenido de este curso. Intenta de nuevo más tarde."
				/>
			} @else {
				<div class="hub-contenido__empty" data-info-anchor="profesor-curso-hub-sin-contenido">
					<i class="pi pi-book"></i>
					<p class="m-0">Este curso todavía no tiene contenido.</p>
					<edu-button
						label="Crear contenido"
						icon="pi pi-plus"
						data-info-anchor="profesor-curso-hub-crear-contenido"
						(click)="onOpenBuilder()"
					/>
				</div>
			}
		</div>

		<!-- #region Diálogos (siempre en el DOM, nunca dentro de @if) -->
		<app-semana-edit-dialog
			[visible]="vm().semanaEditDialogVisible"
			[semana]="vm().selectedSemana"
			[saving]="vm().saving"
			(visibleChange)="onSemanaEditVisibleChange($event)"
			(save)="onSaveSemana($event)"
		/>

		<app-tarea-dialog
			[visible]="vm().tareaDialogVisible"
			[tarea]="vm().selectedTarea"
			[tipoInicial]="vm().tareaTipoInicial"
			[saving]="vm().saving"
			[evaluacionEnlazada]="evaluacionEnlazada()"
			[evaluacionesEnlazables]="evaluacionesEnlazables()"
			[calificacionesLoading]="calVm().loading"
			(visibleChange)="onTareaVisibleChange($event)"
			(createTarea)="onCreateTarea($event)"
			(updateTarea)="onUpdateTarea($event)"
			(crearEvaluacion)="onCrearEvaluacionEnlazada()"
			(enlazarEvaluacion)="onEnlazarEvaluacion($event)"
			(irAEvaluacion)="onIrAEvaluacion($event)"
		/>

		<app-evaluacion-form-dialog
			[visible]="calVm().calificacionDialogVisible"
			[saving]="calVm().saving"
			[editing]="calVm().editingCalificacion"
			[prefill]="calVm().calificacionPrefill"
			[semanas]="vm().semanas"
			[contenidoId]="vm().contenido?.id ?? null"
			(visibleChange)="onEvaluacionDialogVisibleChange($event)"
			(save)="onSaveEvaluacion($event)"
		/>

		<app-student-task-submissions-dialog
			[visible]="vm().taskSubmissionsDialogVisible"
			[data]="vm().taskSubmissionsData"
			[tarea]="vm().taskSubmissionsTarea"
			[loading]="vm().taskSubmissionsLoading"
			(visibleChange)="onTaskSubmissionsVisibleChange($event)"
			(irACalificaciones)="onIrACalificaciones()"
		/>

		<app-curso-builder-dialog
			[visible]="builderVisible()"
			[saving]="vm().saving"
			(visibleChange)="builderVisible.set($event)"
			(create)="onCreateContenido($event)"
		/>

		<edu-menu #contenidoMenu [model]="contenidoMenuItems" [popup]="true" appendTo="body" />
		<edu-confirm-dialog />
		<!-- #endregion -->
	`,
})
export class ProfesorCursoHubContenidoComponent {
	// #region Dependencias
	private readonly hubContext = inject(CursoHubContextService);
	private readonly dataFacade = inject(CursoContenidoDataFacade);
	private readonly crudFacade = inject(CursoContenidoCrudFacade);
	private readonly uiFacade = inject(CursoContenidoUiFacade);
	private readonly router = inject(Router);
	private readonly calLoader = inject(CursoHubCalificacionesLoader);
	private readonly calFacade = inject(CalificacionesFacade);
	private readonly confirmationService = inject(EduConfirmationService);
	// #endregion

	// #region Estado
	protected readonly vm = this.uiFacade.vm;
	protected readonly calVm = this.calFacade.vm;
	protected readonly builderVisible = signal(false);

	/** Menú ⋯ de la pestaña: hoy solo la zona destructiva (antes vivía en la pestaña Información). */
	protected readonly contenidoMenuItems: EduMenuItem[] = [
		{ label: 'Eliminar todo el contenido', icon: 'pi pi-trash', command: () => this.onDeleteContenido() },
	];

	private readonly slotId = computed(() => this.hubContext.slot()?.id ?? null);

	private readonly evaluaciones = computed(() => [...this.calVm().calificacionesPorSemana.values()].flat());

	/** Evaluación enlazada a la tarea abierta (`CalificacionDto.tareaId`, INV-C16). */
	protected readonly evaluacionEnlazada = computed<CalificacionDto | null>(() => {
		const tarea = this.vm().selectedTarea;
		return tarea ? (this.evaluaciones().find((c) => c.tareaId === tarea.id) ?? null) : null;
	});

	/** Evaluaciones del curso sin tarea: candidatas a enlazar (una evaluación enlaza a lo sumo una tarea). */
	protected readonly evaluacionesEnlazables = computed(() => this.evaluaciones().filter((c) => c.tareaId === null));
	// #endregion

	constructor() {
		// Las calificaciones se piden solo si el profesor abre una tarea ya guardada (la pestaña no las paga antes).
		effect(() => {
			const contenidoId = this.vm().contenido?.id ?? null;
			if (contenidoId === null || !this.vm().tareaDialogVisible || !this.vm().selectedTarea) return;
			untracked(() => this.calLoader.ensure(contenidoId));
		});
	}

	// #region Semana
	protected onSemanaEditVisibleChange(visible: boolean): void {
		if (!visible) this.uiFacade.closeSemanaEditDialog();
	}

	protected onSaveSemana(request: {
		titulo: string | null;
		descripcion: string | null;
		mensajeDocente: string | null;
	}): void {
		const semana = this.vm().selectedSemana;
		if (semana) this.crudFacade.actualizarSemana(semana.id, request);
	}
	// #endregion

	// #region Tarea
	protected onTareaVisibleChange(visible: boolean): void {
		if (!visible) this.uiFacade.closeTareaDialog();
	}

	protected onCreateTarea(request: CrearTareaRequest): void {
		const semanaId = this.vm().activeSemanaId;
		if (semanaId) this.crudFacade.crearTarea(semanaId, request);
	}

	protected onUpdateTarea(request: ActualizarTareaRequest): void {
		const semanaId = this.vm().activeSemanaId;
		const tarea = this.vm().selectedTarea;
		if (semanaId && tarea) this.crudFacade.actualizarTarea(semanaId, tarea.id, request);
	}

	// #region Tarea calificable (INV-C16)
	/** Abre «Nueva evaluación» con los datos de la tarea; el peso lo elige el profesor. */
	protected onCrearEvaluacionEnlazada(): void {
		const tarea = this.vm().selectedTarea;
		const semanaId = this.vm().activeSemanaId;
		if (!tarea || !semanaId) return;
		this.uiFacade.closeTareaDialog();
		this.calFacade.openCalificacionDialog(null, {
			titulo: tarea.titulo,
			semanaId,
			fechaEvaluacion: tarea.fechaLimite,
			tareaId: tarea.id,
			esGrupal: tarea.esGrupal,
		});
	}

	protected onEnlazarEvaluacion(evaluacionId: number): void {
		const tarea = this.vm().selectedTarea;
		if (tarea) this.calFacade.vincularTarea(evaluacionId, tarea.id);
	}

	/** Cierra el diálogo y va a Calificaciones ubicando la evaluación enlazada. */
	protected onIrAEvaluacion(evaluacionId: number): void {
		this.uiFacade.closeTareaDialog();
		const target = this.hubContext.tabTarget('profesor', 'calificaciones');
		if (target) {
			void this.router.navigate(target.commands, {
				queryParams: { ...target.queryParams, evaluacionId },
				replaceUrl: true,
			});
		}
	}

	protected onEvaluacionDialogVisibleChange(visible: boolean): void {
		if (!visible) this.calFacade.closeCalificacionDialog();
	}

	protected onSaveEvaluacion(dto: CrearCalificacionDto): void {
		this.calFacade.crearCalificacion(dto);
	}
	// #endregion

	protected onTaskSubmissionsVisibleChange(visible: boolean): void {
		if (!visible) this.uiFacade.closeTaskSubmissionsDialog();
	}

	/** Cierra el diálogo de entregas y navega a Calificaciones conservando la franja. */
	protected onIrACalificaciones(): void {
		this.uiFacade.closeTaskSubmissionsDialog();
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
			acceptButtonSeverity: 'danger',
			accept: () => {
				// Las calificaciones pertenecían a ese contenido: si la baja se revierte, `ensure` las recarga.
				this.calLoader.reset();
				this.dataFacade.eliminarContenidoEnHub(contenido.id);
			},
		});
	}

	protected onOpenBuilder(): void {
		this.builderVisible.set(true);
	}

	protected onCreateContenido(numeroSemanas: number): void {
		const horarioId = this.slotId();
		if (horarioId === null) return;
		this.dataFacade.crearContenidoEnHub(
			{ horarioId, numeroSemanas },
			{
				onApplied: () => this.builderVisible.set(false),
				onRolledBack: () => this.builderVisible.set(true),
			},
		);
	}
	// #endregion
}

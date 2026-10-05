import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EduButton, EduConfirmDialog, EduConfirmationService, EduSpinner } from '@edu-ui';
import { CursoHubContextService, EmptyStateComponent } from '@intranet-shared/components';
import { CursoContenidoCrudFacade } from '../services/curso-contenido-crud.facade';
import { CursoContenidoDataFacade } from '../services/curso-contenido-data.facade';
import { CursoContenidoUiFacade } from '../services/curso-contenido-ui.facade';
import { SemanasAccordionComponent } from '../components/semanas-accordion/semanas-accordion.component';
import { SemanaEditDialogComponent } from '../components/semana-edit-dialog/semana-edit-dialog.component';
import { TareaDialogComponent } from '../components/tarea-dialog/tarea-dialog.component';
import { StudentTaskSubmissionsDialogComponent } from '../components/student-task-submissions-dialog/student-task-submissions-dialog.component';
import { CursoBuilderDialogComponent } from '../components/curso-builder-dialog/curso-builder-dialog.component';
import type { ActualizarTareaRequest, CrearTareaRequest } from '@features/intranet/pages/profesor/models';

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
		EduSpinner,
		EmptyStateComponent,
		SemanasAccordionComponent,
		SemanaEditDialogComponent,
		TareaDialogComponent,
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
				<app-semanas-accordion />
			} @else if (vm().error) {
				<app-empty-state
					icon="pi pi-exclamation-triangle"
					title="Contenido"
					message="No se pudo cargar el contenido de esta franja. Intenta de nuevo más tarde."
				/>
			} @else {
				<div class="hub-contenido__empty" data-info-anchor="profesor-curso-hub-sin-contenido">
					<i class="pi pi-book"></i>
					<p class="m-0">Esta franja todavía no tiene contenido.</p>
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
			[saving]="vm().saving"
			(visibleChange)="onTareaVisibleChange($event)"
			(createTarea)="onCreateTarea($event)"
			(updateTarea)="onUpdateTarea($event)"
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
	// #endregion

	// #region Estado
	protected readonly vm = this.uiFacade.vm;
	protected readonly builderVisible = signal(false);

	private readonly slotId = computed(() => this.hubContext.slot()?.id ?? null);
	// #endregion

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

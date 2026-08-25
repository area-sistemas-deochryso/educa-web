import { Component, ChangeDetectionStrategy, inject, effect, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { PageHeaderComponent, PeriodToggleComponent, EmptyStateComponent } from '@intranet-shared/components';
import { StudentClassroomsFacade } from './services/estudiante-salones.facade';
import { EstudianteSalon, EstudianteSalonCurso, JustificarInasistenciaContext } from '../models';
import { EstudianteSalonDialogComponent } from './components/estudiante-salon-dialog/estudiante-salon-dialog.component';
import { EduSpinner, EduTag, EduTooltip } from '@edu-ui';

@Component({
	selector: 'app-student-classrooms',
	standalone: true,
	imports: [
		CommonModule,
		EduTag,
		EduTooltip,
		EduSpinner,
		PageHeaderComponent,
		PeriodToggleComponent,
		EmptyStateComponent,
		EstudianteSalonDialogComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		.salon-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
			gap: 1rem;
		}
		.salon-card {
			border-radius: 8px;
			border: 1px solid var(--surface-200);
			border-left: 4px solid var(--primary-accent);
			background: var(--surface-card, #fcfdfe);
			padding: 1rem 1.25rem;
			cursor: pointer;
			transition: box-shadow 0.15s, border-color 0.15s;
		}
		.salon-card:hover {
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
			border-color: var(--surface-300);
			border-left-color: var(--primary-accent);
		}
	`,
	template: `
		@if (vm().loading) {
			<div class="flex justify-content-center p-5">
				<edu-spinner strokeWidth="4" />
			</div>
		} @else if (vm().isEmpty) {
			<app-empty-state icon="pi pi-building" title="Mis Salones" message="No tienes salones asignados" />
		} @else {
			<app-page-header icon="pi pi-building" title="Mis Salones">
				<app-period-toggle
					[value]="vm().esVerano"
					(valueChange)="onPeriodoChange($event)"
				/>
			</app-page-header>

			<div class="p-4 pt-0">
				<div class="salon-grid">
					@for (salon of vm().salones; track salon.salonId) {
						<div class="salon-card" data-info-anchor="estudiante-salones-card" (click)="onVerSalon(salon)">
							<div class="flex align-items-center justify-content-between mb-2">
								<span class="font-bold text-lg">{{ salon.salonDescripcion }}</span>
								<edu-tag
									[value]="salon.cantidadEstudiantes + ' estudiantes'"
									styleClass="tag-neutral"
								/>
							</div>

							<div class="flex flex-wrap gap-1">
								@for (curso of salon.cursos; track curso.cursoId) {
									<edu-tag
										[value]="curso.cursoNombre"
										styleClass="tag-neutral cursor-pointer"
										data-info-anchor="estudiante-salones-card-curso-tag"
										(click)="onVerCurso(curso, $event)"
										eduTooltip="Ver contenido del curso"
										eduTooltipPosition="top"
									/>
								}
								@if (salon.cursos.length === 0) {
									<span class="text-color-secondary text-sm">Sin cursos asignados</span>
								}
							</div>
						</div>
					}
				</div>
			</div>
		}

		<app-estudiante-salon-dialog
			[visible]="vm().dialogVisible"
			[salon]="vm().selectedSalon"
			[cursosOptions]="vm().cursosForSelectedSalon"
			[gruposData]="vm().gruposData"
			[gruposLoading]="vm().gruposLoading"
			[gruposCursoId]="vm().gruposCursoId"
			[asistenciaData]="vm().asistenciaData"
			[asistenciaLoading]="vm().asistenciaLoading"
			[asistenciaError]="vm().asistenciaError"
			[asistenciaCursoId]="vm().asistenciaCursoId"
			[solicitudes]="vm().solicitudes"
			[justificarDialogVisible]="vm().justificarDialogVisible"
			[justificarContext]="vm().justificarContext"
			[solicitudSaving]="vm().solicitudSaving"
			(visibleChange)="onDialogVisibleChange($event)"
			(gruposChange)="onGruposChange($event)"
			(asistenciaChange)="onAsistenciaChange($event)"
			(abrirJustificar)="onAbrirJustificar($event)"
			(justificarDialogVisibleChange)="onJustificarDialogVisibleChange($event)"
			(guardarJustificacion)="onGuardarJustificacion($event)"
		/>
	`,
})
export class StudentClassroomsComponent implements OnInit {
	private readonly facade = inject(StudentClassroomsFacade);
	private readonly router = inject(Router);
	private readonly route = inject(ActivatedRoute);

	readonly vm = this.facade.vm;

	// #region Deep-link desde vista de curso
	private readonly pendingHorarioId = signal<number | null>(null);

	constructor() {
		const qpHorarioId = Number(this.route.snapshot.queryParamMap.get('horarioId'));
		if (qpHorarioId > 0) this.pendingHorarioId.set(qpHorarioId);

		effect(() => {
			const pending = this.pendingHorarioId();
			const salones = this.vm().salones;
			if (!pending || salones.length === 0) return;

			const salon = salones.find((s) => s.cursos.some((c) => c.horarioId === pending));
			this.pendingHorarioId.set(null);
			if (salon) this.onVerSalon(salon);
		});
	}
	// #endregion

	ngOnInit(): void {
		this.facade.loadData();
	}

	onPeriodoChange(esVerano: boolean): void {
		this.facade.setEsVerano(esVerano);
	}

	onVerSalon(salon: EstudianteSalon): void {
		this.facade.openDialog(salon.salonId);
	}

	onVerCurso(curso: EstudianteSalonCurso, event: Event): void {
		event.stopPropagation();
		this.router.navigate(['/intranet/estudiante/cursos'], {
			queryParams: { horarioId: curso.horarioId },
		});
	}

	onDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeDialog();
		}
	}

	onGruposChange(horarioId: number): void {
		this.facade.loadGrupos(horarioId);
	}

	onAsistenciaChange(horarioId: number): void {
		this.facade.loadAsistencia(horarioId);
	}

	onAbrirJustificar(context: JustificarInasistenciaContext): void {
		this.facade.openJustificarDialog(context);
	}

	onJustificarDialogVisibleChange(visible: boolean): void {
		if (!visible) this.facade.closeJustificarDialog();
	}

	onGuardarJustificacion(payload: { asistenciaCursoId: number; formData: FormData }): void {
		this.facade.crearSolicitudJustificacion(payload.formData);
	}
}

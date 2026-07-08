import { Component, ChangeDetectionStrategy, inject, effect, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PageHeaderComponent, PeriodToggleComponent } from '@intranet-shared/components';
import { StudentClassroomsFacade } from './services/estudiante-salones.facade';
import { EstudianteSalon, EstudianteSalonCurso } from '../models';
import { EstudianteSalonDialogComponent } from './components/estudiante-salon-dialog/estudiante-salon-dialog.component';

@Component({
	selector: 'app-student-classrooms',
	standalone: true,
	imports: [
		CommonModule,
		TagModule,
		TooltipModule,
		ProgressSpinnerModule,
		PageHeaderComponent,
		PeriodToggleComponent,
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
			border: 1px solid var(--p-surface-200);
			border-left: 4px solid var(--p-primary-color);
			background: var(--p-surface-0);
			padding: 1rem 1.25rem;
			cursor: pointer;
			transition: box-shadow 0.15s, border-color 0.15s;
		}
		.salon-card:hover {
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
			border-color: var(--p-surface-300);
			border-left-color: var(--p-primary-color);
		}
	`,
	template: `
		@if (vm().loading) {
			<div class="flex justify-content-center p-5">
				<p-progressSpinner strokeWidth="4" />
			</div>
		} @else if (vm().isEmpty) {
			<div class="flex flex-column align-items-center p-5 text-color-secondary">
				<i class="pi pi-building text-4xl mb-3"></i>
				<p>No tienes salones asignados</p>
			</div>
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
						<div class="salon-card" (click)="onVerSalon(salon)">
							<div class="flex align-items-center justify-content-between mb-2">
								<span class="font-bold text-lg">{{ salon.salonDescripcion }}</span>
								<p-tag
									[value]="salon.cantidadEstudiantes + ' estudiantes'"
									styleClass="tag-neutral"
								/>
							</div>

							<div class="flex flex-wrap gap-1">
								@for (curso of salon.cursos; track curso.cursoId) {
									<p-tag
										[value]="curso.cursoNombre"
										styleClass="tag-neutral cursor-pointer"
										(click)="onVerCurso(curso, $event)"
										pTooltip="Ver contenido del curso"
										tooltipPosition="top"
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
			[asistenciaCursoId]="vm().asistenciaCursoId"
			(visibleChange)="onDialogVisibleChange($event)"
			(gruposChange)="onGruposChange($event)"
			(asistenciaChange)="onAsistenciaChange($event)"
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
}

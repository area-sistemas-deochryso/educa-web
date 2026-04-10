import {
	Component,
	ChangeDetectionStrategy,
	computed,
	inject,
	signal,
	OnInit,
	OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { TabsModule } from 'primeng/tabs';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ProfesorFacade } from '../services/profesor.facade';
import { AttendanceCourseFacade } from '../cursos/services/attendance-course.facade';
import { AttendanceRegistrationPanelComponent } from '../cursos/components/attendance-registration-panel/attendance-registration-panel.component';
import { AttendanceSummaryPanelComponent } from '../cursos/components/attendance-summary-panel/attendance-summary-panel.component';
import { EstadoAsistenciaCurso } from '../models';

@Component({
	selector: 'app-teacher-attendance',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		Select,
		TabsModule,
		ProgressSpinnerModule,
		AttendanceRegistrationPanelComponent,
		AttendanceSummaryPanelComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
		}
		.asistencia-container {
			padding: 1.5rem;
			max-width: 1200px;
			margin: 0 auto;
		}
		.page-header {
			display: flex;
			align-items: center;
			gap: 0.75rem;
			margin-bottom: 1.25rem;
		}
		.page-header i {
			font-size: 1.5rem;
			color: var(--primary-color);
		}
		.page-header h2 {
			margin: 0;
			font-size: 1.35rem;
		}
		.filters-row {
			display: flex;
			align-items: center;
			gap: 1rem;
			flex-wrap: wrap;
			margin-bottom: 1rem;
		}
		.filters-row label {
			font-weight: 600;
			font-size: 0.85rem;
			color: var(--text-color-secondary);
		}
		.empty-page-state {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			padding: 4rem 1rem;
			text-align: center;
		}
		.empty-page-state i {
			font-size: 3rem;
			color: var(--text-color-secondary);
			opacity: 0.4;
			margin-bottom: 1rem;
		}
		.empty-page-state p {
			margin: 0;
			color: var(--text-color-secondary);
			font-size: 0.95rem;
		}
		:host ::ng-deep {
			.p-tabs,
			.p-tabpanels,
			.p-tabpanel {
				background: transparent;
			}
			.p-tablist {
				background: transparent;
			}
			.p-inputtext,
			.p-select {
				background: transparent;
			}
		}
		@media (max-width: 768px) {
			.asistencia-container {
				padding: 1rem;
			}
		}
	`,
	template: `
		<div class="asistencia-container">
			<div class="page-header">
				<i class="pi pi-check-square"></i>
				<h2>Asistencia</h2>
			</div>

			@if (pageLoading()) {
				<div class="flex justify-content-center p-5">
					<p-progressSpinner strokeWidth="4" />
				</div>
			} @else if (cursoOptions().length === 0) {
				<div class="empty-page-state">
					<i class="pi pi-check-square"></i>
					<p>No tienes cursos asignados</p>
				</div>
			} @else {
				<div class="filters-row">
					<label>Curso</label>
					<p-select
						[options]="cursoOptions()"
						[(ngModel)]="selectedHorarioId"
						placeholder="Seleccionar curso"
						appendTo="body"
						(ngModelChange)="onCursoChange($event)"
					/>
				</div>

				@if (selectedHorarioId()) {
					<p-tabs value="0">
						<p-tablist>
							<p-tab value="0">
								<i class="pi pi-check-square mr-2"></i>Registrar
							</p-tab>
							<p-tab value="1">
								<i class="pi pi-chart-line mr-2"></i>Resumen
							</p-tab>
						</p-tablist>
						<p-tabpanels>
							<p-tabpanel value="0">
								<app-attendance-registration-panel
									[estudiantes]="asistenciaVm().registroEstudiantes"
									[loading]="asistenciaVm().registroLoading"
									[saving]="asistenciaVm().registroSaving"
									[stats]="asistenciaVm().registroStats"
									(fechaChange)="onFechaChange($event)"
									(estadoChange)="onEstadoChange($event)"
									(justificacionChange)="onJustificacionChange($event)"
									(save)="onSaveAsistencia()"
								/>
							</p-tabpanel>
							<p-tabpanel value="1">
								<app-attendance-summary-panel
									[resumen]="asistenciaVm().resumen"
									[loading]="asistenciaVm().resumenLoading"
									(buscar)="onBuscarResumen($event)"
								/>
							</p-tabpanel>
						</p-tabpanels>
					</p-tabs>
				} @else {
					<div class="empty-page-state">
						<i class="pi pi-arrow-up"></i>
						<p>Selecciona un curso para gestionar la asistencia</p>
					</div>
				}
			}
		</div>
	`,
})
export class TeacherAttendanceComponent implements OnInit, OnDestroy {
	// #region Dependencias
	private readonly facade = inject(ProfesorFacade);
	private readonly asistenciaFacade = inject(AttendanceCourseFacade);
	// #endregion

	// #region Estado local
	selectedHorarioId = signal<number | null>(null);
	// #endregion

	// #region Computed
	readonly pageLoading = computed(() => this.facade.vm().loading);
	readonly asistenciaVm = this.asistenciaFacade.vm;

	readonly cursoOptions = computed(() => {
		const horarios = this.facade.vm().horarios;
		const seen = new Map<string, boolean>();
		const options: { label: string; value: number }[] = [];

		for (const h of horarios) {
			const key = `${h.cursoId}-${h.salonId}`;
			if (!seen.has(key)) {
				seen.set(key, true);
				options.push({
					label: `${h.cursoNombre} - ${h.salonDescripcion}`,
					value: h.id,
				});
			}
		}

		return options.sort((a, b) => a.label.localeCompare(b.label));
	});
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		if (this.facade.vm().horarios.length === 0) {
			this.facade.loadData();
		}
	}

	ngOnDestroy(): void {
		this.asistenciaFacade.resetAsistencia();
	}
	// #endregion

	// #region Handlers
	onCursoChange(horarioId: number): void {
		this.selectedHorarioId.set(horarioId);
		this.asistenciaFacade.resetAsistencia();
	}

	onFechaChange(fecha: string): void {
		const id = this.selectedHorarioId();
		if (id) this.asistenciaFacade.loadRegistro(fecha, id);
	}

	onEstadoChange(event: { estudianteId: number; estado: EstadoAsistenciaCurso }): void {
		this.asistenciaFacade.setEstudianteEstado(event.estudianteId, event.estado);
	}

	onJustificacionChange(event: { estudianteId: number; justificacion: string | null }): void {
		this.asistenciaFacade.setEstudianteJustificacion(
			event.estudianteId,
			event.justificacion,
		);
	}

	onSaveAsistencia(): void {
		this.asistenciaFacade.registrar(this.selectedHorarioId() ?? undefined);
	}

	onBuscarResumen(event: { fechaInicio: string; fechaFin: string }): void {
		const id = this.selectedHorarioId();
		if (id) this.asistenciaFacade.loadResumen(event.fechaInicio, event.fechaFin, id);
	}
	// #endregion
}

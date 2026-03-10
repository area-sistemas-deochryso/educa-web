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
import { AsistenciaCursoFacade } from '../cursos/services/asistencia-curso.facade';
import { AsistenciaRegistroPanelComponent } from '../cursos/components/asistencia-registro-panel/asistencia-registro-panel.component';
import { AsistenciaResumenPanelComponent } from '../cursos/components/asistencia-resumen-panel/asistencia-resumen-panel.component';
import { EstadoAsistenciaCurso } from '../models';

@Component({
	selector: 'app-profesor-asistencia',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		Select,
		TabsModule,
		ProgressSpinnerModule,
		AsistenciaRegistroPanelComponent,
		AsistenciaResumenPanelComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
		}
		.filters-row {
			display: flex;
			align-items: center;
			gap: 1rem;
			flex-wrap: wrap;
		}
	`,
	template: `
		<div class="p-4">
			<h2 class="mt-0 mb-3">Asistencia</h2>

			@if (pageLoading()) {
				<div class="flex justify-content-center p-5">
					<p-progressSpinner strokeWidth="4" />
				</div>
			} @else if (cursoOptions().length === 0) {
				<div class="flex flex-column align-items-center p-5 text-color-secondary">
					<i class="pi pi-check-square text-4xl mb-3"></i>
					<p>No tienes cursos asignados</p>
				</div>
			} @else {
				<div class="filters-row mb-3">
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
								<app-asistencia-registro-panel
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
								<app-asistencia-resumen-panel
									[resumen]="asistenciaVm().resumen"
									[loading]="asistenciaVm().resumenLoading"
									(buscar)="onBuscarResumen($event)"
								/>
							</p-tabpanel>
						</p-tabpanels>
					</p-tabs>
				}
			}
		</div>
	`,
})
export class ProfesorAsistenciaComponent implements OnInit, OnDestroy {
	// #region Dependencias
	private readonly facade = inject(ProfesorFacade);
	private readonly asistenciaFacade = inject(AsistenciaCursoFacade);
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

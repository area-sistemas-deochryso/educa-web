import { Component, ChangeDetectionStrategy, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ProfesorFacade } from '../services/profesor.facade';
import { HorarioProfesorDto } from '../models';

interface DiaHorarios {
	dia: string;
	horarios: HorarioProfesorDto[];
}

@Component({
	selector: 'app-profesor-horarios',
	standalone: true,
	imports: [CommonModule, TableModule, TagModule, ButtonModule, TooltipModule, ProgressSpinnerModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host ::ng-deep .p-datatable {
			--p-datatable-header-cell-background: transparent;
			--p-datatable-row-background: transparent;
		}
	`,
	template: `
		@if (vm().loading) {
			<div class="flex justify-content-center p-5">
				<p-progressSpinner strokeWidth="4" />
			</div>
		} @else if (vm().isEmpty) {
			<div class="flex flex-column align-items-center p-5 text-color-secondary">
				<i class="pi pi-calendar text-4xl mb-3"></i>
				<p>No tienes horarios asignados</p>
			</div>
		} @else {
			<div class="p-4">
				<h2 class="mt-0 mb-3">Mi Horario</h2>

				@for (grupo of diasHorarios(); track grupo.dia) {
					<h3 class="mt-3 mb-2">
						<i class="pi pi-calendar mr-2"></i>{{ grupo.dia }}
					</h3>

					<p-table
						[value]="grupo.horarios"
						styleClass="p-datatable-sm mb-3"
					>
						<ng-template #header>
							<tr>
								<th style="width: 150px">Hora</th>
								<th>Curso</th>
								<th>Salón</th>
								<th style="width: 100px" class="text-center">Estudiantes</th>
								<th style="width: 80px" class="text-center">Acciones</th>
							</tr>
						</ng-template>
						<ng-template #body let-horario>
							<tr>
								<td>
									<span class="font-semibold">{{ horario.horaInicio }}</span>
									<span class="text-color-secondary"> - {{ horario.horaFin }}</span>
								</td>
								<td>{{ horario.cursoNombre }}</td>
								<td>{{ horario.salonDescripcion }}</td>
								<td class="text-center">
									<p-tag
										[value]="horario.cantidadEstudiantes.toString()"
										severity="info"
										[rounded]="true"
									/>
								</td>
								<td class="text-center">
									<button
										pButton
										icon="pi pi-eye"
										class="p-button-rounded p-button-text"
										pTooltip="Ver asistencia"
										tooltipPosition="top"
										(click)="verAsistencia(horario)"
										[pt]="{
											root: {
												'aria-label': 'Ver asistencia',
											},
										}"
									></button>
								</td>
							</tr>
						</ng-template>
					</p-table>
				}
			</div>
		}
	`,
})
export class ProfesorHorariosComponent implements OnInit {
	private readonly facade = inject(ProfesorFacade);
	private readonly router = inject(Router);
	readonly vm = this.facade.vm;

	readonly diasHorarios = computed<DiaHorarios[]>(() => {
		const map = this.vm().horariosPorDia;
		const result: DiaHorarios[] = [];
		for (const [dia, horarios] of map) {
			result.push({ dia, horarios });
		}
		return result;
	});

	ngOnInit(): void {
		this.facade.loadData();
	}

	verAsistencia(horario: HorarioProfesorDto): void {
		this.router.navigate(['/intranet/asistencia'], {
			queryParams: { salonId: horario.salonId },
		});
	}
}

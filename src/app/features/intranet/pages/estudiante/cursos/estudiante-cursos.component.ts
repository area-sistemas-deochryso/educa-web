import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { EstudianteCursosFacade } from '../services/estudiante-cursos.facade';
import { CursoContentReadonlyDialogComponent } from './components/curso-content-readonly-dialog/curso-content-readonly-dialog.component';
import { HorarioProfesorDto } from '../models';

@Component({
	selector: 'app-estudiante-cursos',
	standalone: true,
	imports: [
		CommonModule,
		TableModule,
		TagModule,
		ButtonModule,
		TooltipModule,
		ProgressSpinnerModule,
		CursoContentReadonlyDialogComponent,
	],
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
		} @else if (vm().horarios.length === 0) {
			<div class="flex flex-column align-items-center p-5 text-color-secondary">
				<i class="pi pi-book text-4xl mb-3"></i>
				<p>No tienes cursos asignados</p>
			</div>
		} @else {
			<div class="p-4">
				<h2 class="mt-0 mb-3">Mis Cursos</h2>

				<p-table [value]="vm().horarios" [rows]="10" styleClass="p-datatable-sm">
					<ng-template #header>
						<tr>
							<th>Curso</th>
							<th>Salón</th>
							<th>Día</th>
							<th>Horario</th>
							<th>Profesor</th>
							<th style="width: 100px">Acciones</th>
						</tr>
					</ng-template>
					<ng-template #body let-horario>
						<tr>
							<td class="font-semibold">{{ horario.cursoNombre }}</td>
							<td>
								<p-tag [value]="horario.salonDescripcion" severity="info" />
							</td>
							<td>{{ horario.diaSemanaDescripcion }}</td>
							<td>{{ horario.horaInicio }} - {{ horario.horaFin }}</td>
							<td>{{ horario.profesorNombreCompleto ?? '-' }}</td>
							<td>
								<button
									pButton
									icon="pi pi-eye"
									class="p-button-rounded p-button-text"
									pTooltip="Ver Contenido"
									tooltipPosition="top"
									(click)="onVerContenido(horario)"
									[pt]="{
										root: {
											'aria-label': 'Ver Contenido',
										},
									}"
								></button>
							</td>
						</tr>
					</ng-template>
				</p-table>
			</div>
		}

		<app-curso-content-readonly-dialog />
	`,
})
export class EstudianteCursosComponent implements OnInit {
	private readonly facade = inject(EstudianteCursosFacade);

	readonly vm = this.facade.vm;

	ngOnInit(): void {
		this.facade.loadHorarios();
	}

	onVerContenido(horario: HorarioProfesorDto): void {
		this.facade.loadContenido(horario.id);
	}
}

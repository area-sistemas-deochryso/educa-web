// #region Imports
import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PageHeaderComponent } from '@shared/components';
import { EstudianteSalonesFacade } from './services/estudiante-salones.facade';
import { EstudianteSalon, EstudianteSalonCurso } from '../models';
import { EstudianteSalonDialogComponent } from './components/estudiante-salon-dialog/estudiante-salon-dialog.component';

// #endregion
@Component({
	selector: 'app-estudiante-salones',
	standalone: true,
	imports: [
		CommonModule,
		TableModule,
		TagModule,
		ButtonModule,
		TooltipModule,
		ProgressSpinnerModule,
		PageHeaderComponent,
		EstudianteSalonDialogComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host ::ng-deep .p-datatable {
			--p-datatable-header-cell-background: transparent;
			--p-datatable-row-background: transparent;
		}
		:host ::ng-deep .p-datatable .p-datatable-tbody > tr {
			cursor: pointer;
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
			<app-page-header icon="pi pi-building" title="Mis Salones" />

			<div class="p-4 pt-0">
				<p-table
					[value]="vm().salones"
					[rows]="10"
					styleClass="p-datatable-sm"
				>
					<ng-template #header>
						<tr>
							<th>Salón</th>
							<th>Cursos</th>
							<th style="width: 120px" class="text-center">Estudiantes</th>
							<th style="width: 80px" class="text-center">Acciones</th>
						</tr>
					</ng-template>
					<ng-template #body let-salon>
						<tr>
							<td>
								<span class="font-semibold">{{ salon.salonDescripcion }}</span>
							</td>
							<td>
								<div class="flex flex-wrap gap-1">
									@for (curso of salon.cursos; track curso.cursoId) {
										<p-tag
											[value]="curso.cursoNombre"
											severity="info"
											class="cursor-pointer"
											(click)="onVerCurso(curso, $event)"
											pTooltip="Ver contenido del curso"
											tooltipPosition="top"
										/>
									}
									@if (salon.cursos.length === 0) {
										<span class="text-color-secondary text-sm">Sin cursos asignados</span>
									}
								</div>
							</td>
							<td class="text-center">
								<p-tag
									[value]="salon.cantidadEstudiantes.toString()"
									severity="info"
									[rounded]="true"
								/>
							</td>
							<td class="text-center">
								<button
									pButton
									icon="pi pi-eye"
									class="p-button-rounded p-button-text"
									pTooltip="Ver detalle"
									tooltipPosition="top"
									(click)="onVerSalon(salon)"
									[pt]="{
										root: {
											'aria-label': 'Ver detalle del salon',
										},
									}"
								></button>
							</td>
						</tr>
					</ng-template>
				</p-table>
			</div>
		}

		<!-- Dialog de detalle -->
		<app-estudiante-salon-dialog
			[visible]="vm().dialogVisible"
			[salon]="vm().selectedSalon"
			[cursosOptions]="vm().cursosForSelectedSalon"
			[gruposData]="vm().gruposData"
			[gruposLoading]="vm().gruposLoading"
			[gruposCursoId]="vm().gruposCursoId"
			(visibleChange)="onDialogVisibleChange($event)"
			(gruposChange)="onGruposChange($event)"
		/>
	`,
})
export class EstudianteSalonesComponent implements OnInit {
	// #region Dependencias
	private readonly facade = inject(EstudianteSalonesFacade);
	private readonly router = inject(Router);
	// #endregion

	// #region Estado
	readonly vm = this.facade.vm;
	// #endregion

	// #region Lifecycle
	ngOnInit(): void {
		this.facade.loadData();
	}
	// #endregion

	// #region Event handlers
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
	// #endregion
}

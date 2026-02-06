import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ProfesorFacade } from '../services/profesor.facade';
import { ProfesorSalonConEstudiantes } from '../services/profesor.store';
import { SalonEstudiantesDialogComponent } from './components/salon-estudiantes-dialog/salon-estudiantes-dialog.component';

@Component({
	selector: 'app-profesor-salones',
	standalone: true,
	imports: [
		CommonModule,
		TableModule,
		TagModule,
		ButtonModule,
		TooltipModule,
		ProgressSpinnerModule,
		SalonEstudiantesDialogComponent,
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
		} @else if (vm().salonesConEstudiantes.length === 0) {
			<div class="flex flex-column align-items-center p-5 text-color-secondary">
				<i class="pi pi-building text-4xl mb-3"></i>
				<p>No tienes salones asignados</p>
			</div>
		} @else {
			<div class="p-4">
				<h2 class="mt-0 mb-3">Mis Salones</h2>

				<p-table
					[value]="vm().salonesConEstudiantes"
					[rows]="10"
					styleClass="p-datatable-sm"
				>
					<ng-template #header>
						<tr>
							<th>Salón</th>
							<th>Cursos que dicta</th>
							<th style="width: 120px" class="text-center">Estudiantes</th>
							<th style="width: 80px" class="text-center">Acciones</th>
						</tr>
					</ng-template>
					<ng-template #body let-salon>
						<tr>
							<td>
								<div class="flex align-items-center gap-2">
									<span class="font-semibold">{{ salon.salonDescripcion }}</span>
									@if (salon.esTutor) {
										<p-tag value="Tutor" severity="success" icon="pi pi-star-fill" />
									}
								</div>
							</td>
							<td>
								<div class="flex flex-wrap gap-1">
									@for (curso of salon.cursos; track curso) {
										<p-tag [value]="curso" severity="info" />
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
									pTooltip="Ver estudiantes"
									tooltipPosition="top"
									(click)="openSalonDialog(salon)"
									[pt]="{
										root: {
											'aria-label': 'Ver estudiantes',
										},
									}"
								></button>
							</td>
						</tr>
					</ng-template>
				</p-table>
			</div>
		}

		<!-- ============ Dialog de estudiantes ============ -->
		<app-salon-estudiantes-dialog
			[visible]="vm().salonDialogVisible"
			[salon]="vm().selectedSalon"
			[dialogLoading]="vm().salonDialogLoading"
			(visibleChange)="onDialogVisibleChange($event)"
		/>
	`,
})
export class ProfesorSalonesComponent implements OnInit {
	private readonly facade = inject(ProfesorFacade);
	readonly vm = this.facade.vm;

	ngOnInit(): void {
		this.facade.loadData();
	}

	openSalonDialog(salon: ProfesorSalonConEstudiantes): void {
		this.facade.openSalonDialog(salon);
	}

	onDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeSalonDialog();
		}
	}
}

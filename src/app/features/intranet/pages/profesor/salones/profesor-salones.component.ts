import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SalonCursoInfo, VistaPromedio, ActualizarGrupoDto } from '../models';
import { ProfesorFacade } from '../services/profesor.facade';
import { ProfesorSalonConEstudiantes } from '../services/profesor.store';
import { GruposFacade } from './services/grupos.facade';
import { SalonMensajeriaFacade } from './services/salon-mensajeria.facade';
import { SalonEstudiantesDialogComponent } from './components/salon-estudiantes-dialog/salon-estudiantes-dialog.component';
import { NotaSaveEvent } from './components/salon-notas-estudiante-tab/salon-notas-estudiante-tab.component';

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
									@for (curso of salon.cursos; track curso.horarioId) {
										<p-tag
											[value]="curso.nombre"
											severity="info"
											class="cursor-pointer"
											(click)="onVerCursoContenido(curso)"
											pTooltip="Ver contenido"
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

		<!-- Dialog de estudiantes -->
		<app-salon-estudiantes-dialog
			[visible]="vm().salonDialogVisible"
			[salon]="vm().selectedSalon"
			[dialogLoading]="vm().salonDialogLoading"
			[cursoOptions]="vm().cursosForSelectedSalon"
			[notasData]="vm().notasSalon"
			[notasLoading]="vm().notasSalonLoading"
			[selectedCurso]="vm().notasCursoId"
			[vistaActual]="vm().notasVistaActual"
			[gruposData]="gruposVm().grupos"
			[gruposEstudiantesSinGrupo]="gruposVm().estudiantesSinGrupo"
			[gruposMaxEstudiantes]="gruposVm().maxEstudiantesPorGrupo"
			[gruposLoading]="gruposVm().loading"
			[gruposSaving]="gruposVm().saving"
			[gruposNoContenido]="gruposVm().noContenido"
			[gruposContenidoId]="gruposVm().contenidoId"
			[gruposCursoId]="gruposCursoId"
			[gruposAsignarDialogVisible]="gruposVm().asignarDialogVisible"
			[gruposAsignarGrupo]="gruposVm().asignarGrupo"
			(visibleChange)="onDialogVisibleChange($event)"
			(notasTabActivated)="onNotasTabActivated()"
			(notasCursoChange)="onNotasCursoChange($event)"
			(notasVistaChange)="onNotasVistaChange($event)"
			(notaSave)="onNotaSave($event)"
			(gruposTabActivated)="onGruposTabActivated()"
			(gruposCursoChange)="onGruposCursoChange($event)"
			(gruposCrearGrupo)="onGruposCrearGrupo($event)"
			(gruposEliminarGrupo)="onGruposEliminarGrupo($event)"
			(gruposRenombrarGrupo)="onGruposRenombrarGrupo($event)"
			(gruposAsignarEstudiantes)="onGruposAsignarEstudiantes($event)"
			(gruposRemoverEstudiante)="onGruposRemoverEstudiante($event)"
			(gruposDropEstudiante)="onGruposDropEstudiante($event)"
			(gruposConfigurarMax)="onGruposConfigurarMax($event)"
			(gruposOpenAsignar)="onGruposOpenAsignar($event)"
			(gruposCloseAsignar)="gruposFacade.closeAsignarDialog()"
			(gruposConfirmDialogHide)="gruposFacade.closeConfirmDialog()"
			(gruposRefresh)="onGruposRefresh()"
			(notasRefresh)="onNotasRefresh()"
		/>
	`,
})
export class ProfesorSalonesComponent implements OnInit {
	// #region Dependencias
	private readonly facade = inject(ProfesorFacade);
	private readonly router = inject(Router);
	readonly gruposFacade = inject(GruposFacade);
	private readonly mensajeriaFacade = inject(SalonMensajeriaFacade);
	// #endregion

	// #region Estado
	readonly vm = this.facade.vm;
	readonly gruposVm = this.gruposFacade.vm;
	gruposCursoId: number | null = null;
	// #endregion

	ngOnInit(): void {
		this.facade.loadData();
	}

	// #region Salon table handlers
	onVerCursoContenido(curso: SalonCursoInfo): void {
		this.router.navigate(['/intranet/profesor/cursos'], {
			queryParams: { horarioId: curso.horarioId },
		});
	}

	openSalonDialog(salon: ProfesorSalonConEstudiantes): void {
		this.facade.openSalonDialog(salon);
		this.gruposCursoId = null;
		this.gruposFacade.resetGrupos();
	}

	onDialogVisibleChange(visible: boolean): void {
		if (!visible) {
			this.facade.closeSalonDialog();
			this.gruposFacade.resetGrupos();
			this.mensajeriaFacade.reset();
			this.gruposCursoId = null;
		}
	}
	// #endregion

	// #region Notas handlers
	onNotasTabActivated(): void {
		const salon = this.vm().selectedSalon;
		const cursos = this.vm().cursosForSelectedSalon;
		if (!salon || cursos.length === 0) return;

		if (!this.vm().notasCursoId) {
			this.facade.loadNotasSalon(salon.salonId, cursos[0].value);
		}
	}

	onNotasCursoChange(cursoId: number): void {
		const salon = this.vm().selectedSalon;
		if (!salon) return;
		this.facade.loadNotasSalon(salon.salonId, cursoId);
	}

	onNotasVistaChange(vista: VistaPromedio): void {
		this.facade.setNotasVista(vista);
	}

	onNotaSave(event: NotaSaveEvent): void {
		this.facade.saveNotaSalon(event.calificacionId, event.estudianteId, event.nota);
	}
	// #endregion

	// #region Grupos handlers
	onGruposTabActivated(): void {
		const salon = this.vm().selectedSalon;
		const cursos = this.vm().cursosForSelectedSalon;
		if (!salon || cursos.length === 0) return;

		if (!this.gruposCursoId) {
			this.gruposCursoId = cursos[0].value;
			this.gruposFacade.loadGruposForSalonCurso(salon.salonId, cursos[0].value);
		}
	}

	onGruposCursoChange(cursoId: number): void {
		const salon = this.vm().selectedSalon;
		if (!salon) return;
		this.gruposCursoId = cursoId;
		this.gruposFacade.loadGruposForSalonCurso(salon.salonId, cursoId);
	}

	onGruposCrearGrupo(nombre: string): void {
		this.gruposFacade.crearGrupo(nombre);
	}

	onGruposEliminarGrupo(grupoId: number): void {
		this.gruposFacade.eliminarGrupo(grupoId);
	}

	onGruposRenombrarGrupo(event: { grupoId: number; nombre: string }): void {
		const dto: ActualizarGrupoDto = { nombre: event.nombre };
		this.gruposFacade.actualizarGrupo(event.grupoId, dto);
	}

	onGruposAsignarEstudiantes(event: { grupoId: number; estudianteIds: number[] }): void {
		this.gruposFacade.asignarEstudiantes(event.grupoId, { estudianteIds: event.estudianteIds });
	}

	onGruposRemoverEstudiante(event: { grupoId: number; estudianteId: number }): void {
		this.gruposFacade.removerEstudiante(event.grupoId, event.estudianteId);
	}

	onGruposDropEstudiante(event: { estudianteId: number; fromGrupoId: number | null; toGrupoId: number | null }): void {
		this.gruposFacade.dropEstudiante(event);
	}

	onGruposOpenAsignar(grupoId: number): void {
		this.gruposFacade.openAsignarDialog(grupoId);
	}

	onGruposConfigurarMax(max: number | null): void {
		this.gruposFacade.configurarMaxEstudiantes(max);
	}

	onGruposRefresh(): void {
		const salon = this.vm().selectedSalon;
		if (!salon || !this.gruposCursoId) return;
		this.gruposFacade.loadGruposForSalonCurso(salon.salonId, this.gruposCursoId);
	}
	// #endregion

	// #region Refresh handlers
	onNotasRefresh(): void {
		const salon = this.vm().selectedSalon;
		const cursoId = this.vm().notasCursoId;
		if (!salon || !cursoId) return;
		this.facade.loadNotasSalon(salon.salonId, cursoId);
	}
	// #endregion
}

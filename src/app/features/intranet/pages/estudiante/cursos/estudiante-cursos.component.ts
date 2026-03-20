import { Component, ChangeDetectionStrategy, inject, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, take } from 'rxjs';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PageHeaderComponent } from '@shared/components';
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
		RouterLink,
		PageHeaderComponent,
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
			<app-page-header icon="pi pi-book" title="Mis Cursos" />

			<div class="p-4 pt-0">
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
								<a routerLink="/intranet/estudiante/salones" class="no-underline">
									<p-tag [value]="horario.salonDescripcion" severity="info" />
								</a>
							</td>
							<td>
								<a routerLink="/intranet/estudiante/horarios" class="text-color hover:text-primary no-underline">
									{{ horario.diaSemanaDescripcion }}
								</a>
							</td>
							<td>
								<a routerLink="/intranet/estudiante/horarios" class="text-color hover:text-primary no-underline">
									{{ horario.horaInicio }} - {{ horario.horaFin }}
								</a>
							</td>
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
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);

	readonly vm = this.facade.vm;

	ngOnInit(): void {
		this.facade.loadHorarios();
		this.handleHorarioQueryParam();
	}

	onVerContenido(horario: HorarioProfesorDto): void {
		this.facade.loadContenido(horario.id);
	}

	private handleHorarioQueryParam(): void {
		this.route.queryParams
			.pipe(
				filter((params) => !!params['horarioId']),
				take(1),
				takeUntilDestroyed(this.destroyRef),
			)
			.subscribe((params) => {
				const horarioId = Number(params['horarioId']);
				if (horarioId) {
					this.facade.loadContenido(horarioId);
					this.router.navigate([], { queryParams: {}, replaceUrl: true });
				}
			});
	}
}

import { Component, ChangeDetectionStrategy, inject, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { filter, take } from 'rxjs';
import { ProfesorFacade } from '../services/profesor.facade';
import { CursoContenidoFacade } from './services/curso-contenido.facade';
import { CursoContentDialogComponent } from './components/curso-content-dialog/curso-content-dialog.component';
import { CursoBuilderDialogComponent } from './components/curso-builder-dialog/curso-builder-dialog.component';
import { HorarioProfesorDto, CrearCursoContenidoRequest } from '../models';

@Component({
	selector: 'app-profesor-cursos',
	standalone: true,
	imports: [
		CommonModule,
		TableModule,
		TagModule,
		ButtonModule,
		TooltipModule,
		ProgressSpinnerModule,
		RouterLink,
		CursoContentDialogComponent,
		CursoBuilderDialogComponent,
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
							<th style="width: 100px">Acciones</th>
						</tr>
					</ng-template>
					<ng-template #body let-horario>
						<tr>
							<td class="font-semibold">{{ horario.cursoNombre }}</td>
							<td>
								<a routerLink="/intranet/profesor/salones" class="no-underline">
									<p-tag [value]="horario.salonDescripcion" severity="info" />
								</a>
							</td>
							<td>
								<a routerLink="/intranet/profesor/horarios" class="text-color hover:text-primary no-underline">
									{{ horario.diaSemanaDescripcion }}
								</a>
							</td>
							<td>
								<a routerLink="/intranet/profesor/horarios" class="text-color hover:text-primary no-underline">
									{{ horario.horaInicio }} - {{ horario.horaFin }}
								</a>
							</td>
							<td>
								<button
									pButton
									icon="pi pi-book"
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

		<!-- Dialogs de contenido -->
		<app-curso-content-dialog />

		<app-curso-builder-dialog
			[visible]="contenidoVm().builderDialogVisible"
			[saving]="contenidoVm().saving"
			(visibleChange)="onBuilderVisibleChange($event)"
			(create)="onCreateContenido($event)"
		/>
	`,
})
export class ProfesorCursosComponent implements OnInit {
	private readonly facade = inject(ProfesorFacade);
	private readonly contenidoFacade = inject(CursoContenidoFacade);
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);

	readonly vm = this.facade.vm;
	readonly contenidoVm = this.contenidoFacade.vm;

	ngOnInit(): void {
		this.facade.loadData();
		this.handleHorarioQueryParam();
	}

	/** Auto-open content dialog when navigating from salones/horarios with horarioId (and optional tab) params */
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
					const tab = params['tab'] || undefined;
					this.contenidoFacade.loadContenido(horarioId, tab);
					// Clean query params from URL without navigation
					this.router.navigate([], { queryParams: {}, replaceUrl: true });
				}
			});
	}

	onVerContenido(horario: HorarioProfesorDto): void {
		this.contenidoFacade.loadContenido(horario.id);
	}

	onBuilderVisibleChange(visible: boolean): void {
		if (!visible) {
			this.contenidoFacade.closeBuilderDialog();
		}
	}

	onCreateContenido(numeroSemanas: number): void {
		const horarioId = this.contenidoVm().selectedHorarioId;
		if (!horarioId) return;

		const request: CrearCursoContenidoRequest = { horarioId, numeroSemanas };
		this.contenidoFacade.crearContenido(request);
	}
}


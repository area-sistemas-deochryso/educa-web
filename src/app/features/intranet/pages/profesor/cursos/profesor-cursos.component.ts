import { Component, ChangeDetectionStrategy, inject, OnInit, DestroyRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { filter, take } from 'rxjs';
import { PageHeaderComponent } from '@intranet-shared/components';
import { PluralizePipe } from '@intranet-shared/pipes';
import { buildCursoColorMap } from '@intranet-shared/config/curso-colors';
import { ProfesorFacade } from '../services/profesor.facade';
import { CursoContenidoDataFacade } from './services/curso-contenido-data.facade';
import { CursoContenidoUiFacade } from './services/curso-contenido-ui.facade';
import { CursoContentDialogComponent } from './components/curso-content-dialog/curso-content-dialog.component';
import { CursoBuilderDialogComponent } from './components/curso-builder-dialog/curso-builder-dialog.component';
import { HorarioProfesorDto, CrearCursoContenidoRequest } from '../models';

@Component({
	selector: 'app-profesor-cursos',
	standalone: true,
	imports: [
		CommonModule,
		TagModule,
		TooltipModule,
		ProgressSpinnerModule,
		RouterLink,
		PageHeaderComponent,
		PluralizePipe,
		CursoContentDialogComponent,
		CursoBuilderDialogComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		.course-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
			gap: 1rem;
		}
		.course-card {
			border-radius: 8px;
			border: 1px solid var(--p-surface-200);
			border-left: 4px solid var(--card-accent, var(--p-primary-color));
			background: var(--surface-card, #fcfdfe);
			padding: 1rem 1.25rem;
			cursor: pointer;
			transition: box-shadow 0.15s, border-color 0.15s;
		}
		.course-card:hover {
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
			border-color: var(--p-surface-300);
			border-left-color: var(--card-accent, var(--p-primary-color));
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
			<app-page-header icon="pi pi-book" title="Mis Cursos">
				<a routerLink="/intranet/profesor/horarios" class="text-sm no-underline text-primary flex align-items-center gap-1">
					<i class="pi pi-calendar"></i> Ver horario
				</a>
			</app-page-header>

			<div class="p-4 pt-0">
				<div class="course-grid">
					@for (horario of vm().horarios; track horario.id) {
						<div
							class="course-card"
							[style.--card-accent]="colorMap().get(horario.cursoId)"
							(click)="onVerContenido(horario)"
							pTooltip="Ver contenido"
							tooltipPosition="top"
						>
							<div class="flex align-items-start justify-content-between mb-2">
								<span class="font-bold text-lg line-height-3">{{ horario.cursoNombre }}</span>
								<a routerLink="/intranet/profesor/salones" class="no-underline" (click)="$event.stopPropagation()">
									<p-tag [value]="horario.salonDescripcion" severity="info" />
								</a>
							</div>
							<div class="flex flex-column gap-1 text-sm text-color-secondary">
								<div class="flex align-items-center gap-2">
									<i class="pi pi-calendar text-xs"></i>
									<span>{{ horario.diaSemanaDescripcion }} · {{ horario.horaInicio }} - {{ horario.horaFin }}</span>
								</div>
								<div class="flex align-items-center gap-2">
									<i class="pi pi-users text-xs"></i>
									<span>{{ horario.cantidadEstudiantes | pluralize: 'estudiante' }}</span>
								</div>
							</div>
						</div>
					}
				</div>
			</div>
		}

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
	private readonly contenidoDataFacade = inject(CursoContenidoDataFacade);
	private readonly contenidoUiFacade = inject(CursoContenidoUiFacade);
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly destroyRef = inject(DestroyRef);

	readonly vm = this.facade.vm;
	readonly contenidoVm = this.contenidoDataFacade.vm;

	readonly colorMap = computed(() => buildCursoColorMap(this.vm().horarios));

	ngOnInit(): void {
		this.facade.loadData();
		this.handleHorarioQueryParam();
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
					const tab = params['tab'] || undefined;
					const horario = this.facade.vm().horarios.find((h) => h.id === horarioId);
					this.contenidoDataFacade.loadContenido(horarioId, {
						initialTab: tab,
						salonId: horario?.salonId,
					});
					this.router.navigate([], { queryParams: {}, replaceUrl: true });
				}
			});
	}

	onVerContenido(horario: HorarioProfesorDto): void {
		this.contenidoDataFacade.loadContenido(horario.id, { salonId: horario.salonId });
	}

	onBuilderVisibleChange(visible: boolean): void {
		if (!visible) {
			this.contenidoUiFacade.closeBuilderDialog();
		}
	}

	onCreateContenido(numeroSemanas: number): void {
		const horarioId = this.contenidoVm().selectedHorarioId;
		if (!horarioId) return;

		const request: CrearCursoContenidoRequest = { horarioId, numeroSemanas };
		this.contenidoDataFacade.crearContenido(request);
	}
}

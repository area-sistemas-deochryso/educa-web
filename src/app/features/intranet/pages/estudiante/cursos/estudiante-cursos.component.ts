import { Component, ChangeDetectionStrategy, inject, OnInit, DestroyRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, take } from 'rxjs';

import { PageHeaderComponent, EmptyStateComponent } from '@intranet-shared/components';
import { buildCursoColorMap } from '@intranet-shared/config/curso-colors';
import { EstudianteCursosFacade } from '../services/estudiante-cursos.facade';
import { CursoContentReadonlyDialogComponent } from './components/curso-content-readonly-dialog/curso-content-readonly-dialog.component';
import { HorarioProfesorDto } from '../models';
import { EduSpinner, EduTag, EduTooltip } from '@edu-ui';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

@Component({
	selector: 'app-estudiante-cursos',
	standalone: true,
	imports: [
		CommonModule,
		EduTag,
		EduTooltip,
		EduSpinner,
		RouterLink,
		PageHeaderComponent,
		EmptyStateComponent,
		CursoContentReadonlyDialogComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		.course-grid {
			// Flexbox, no CSS Grid: con pocos cursos, un grid (auto-fill o
			// auto-fit) deja las columnas sobrantes en blanco en vez de
			// estirar las tarjetas existentes (mismo hallazgo que app-kpi-stats,
			// Caso 1 — verificado en navegador, no solo en teoría de spec).
			display: flex;
			flex-wrap: wrap;
			gap: 1rem;
		}
		.course-card {
			flex: 1 1 320px;
			min-width: 0;
			max-width: 100%;
			border-radius: 8px;
			border: 1px solid var(--surface-200);
			border-left: 4px solid var(--card-accent, var(--primary-accent));
			background: var(--surface-card, #fcfdfe);
			padding: 1rem 1.25rem;
			cursor: pointer;
			transition: box-shadow 0.15s, border-color 0.15s;
		}
		.course-card:hover {
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
			border-color: var(--surface-300);
			border-left-color: var(--card-accent, var(--primary-accent));
		}
		.course-card-affordance {
			display: flex;
			align-items: center;
			justify-content: flex-end;
			gap: 0.35rem;
			margin-top: 0.75rem;
			font-size: 0.75rem;
			font-weight: 600;
			color: var(--primary-accent);
		}
		.course-card-affordance i {
			font-size: 0.7rem;
			transition: transform 0.15s;
		}
		.course-card:hover .course-card-affordance i {
			transform: translateX(3px);
		}
		.hoy-strip {
			background: var(--surface-50);
			border-radius: 8px;
			padding: 0.5rem 1rem;
			margin-bottom: 1rem;
		}
	`,
	template: `
		@if (vm().loading) {
			<div class="flex justify-content-center p-5">
				<edu-spinner strokeWidth="4" />
			</div>
		} @else if (vm().horarios.length === 0) {
			<app-empty-state icon="pi pi-book" title="Mis Cursos" message="No tienes cursos asignados" />
		} @else {
			<app-page-header icon="pi pi-book" title="Mis Cursos">
				<a routerLink="/intranet/estudiante/horarios" data-info-anchor="estudiante-cursos-ver-horario" class="text-sm no-underline text-primary flex align-items-center gap-1">
					<i class="pi pi-calendar"></i> Ver horario
				</a>
			</app-page-header>

			<div class="p-4 pt-0">
				@if (todayCourses().length > 0) {
					<div class="hoy-strip flex align-items-center gap-2 text-sm">
						<i class="pi pi-sun text-orange-500"></i>
						<span class="font-medium">Hoy:</span>
						@for (c of todayCourses(); track c.id) {
							<span>{{ c.cursoNombre }} ({{ c.horaInicio }} - {{ c.horaFin }})</span>
							@if (!$last) { <span class="text-color-secondary">·</span> }
						}
					</div>
				}

				<div class="course-grid">
					@for (horario of vm().horarios; track horario.id) {
						<div
							class="course-card"
							data-info-anchor="estudiante-cursos-card"
							[style.--card-accent]="colorMap().get(horario.cursoId)"
							(click)="onVerContenido(horario)"
							eduTooltip="Ver contenido"
							eduTooltipPosition="top"
						>
							<div class="flex align-items-start justify-content-between mb-2">
								<span class="font-bold text-lg line-height-3">{{ horario.cursoNombre }}</span>
								<a routerLink="/intranet/estudiante/salones" data-info-anchor="estudiante-cursos-card-salon-tag" class="no-underline" (click)="$event.stopPropagation()">
									<edu-tag [value]="horario.salonDescripcion" severity="info" />
								</a>
							</div>
							<div class="flex flex-column gap-1 text-sm text-color-secondary">
								<div class="flex align-items-center gap-2">
									<i class="pi pi-calendar text-xs"></i>
									<span>{{ horario.diaSemanaDescripcion }} · {{ horario.horaInicio }} - {{ horario.horaFin }}</span>
								</div>
								@if (horario.profesorNombreCompleto) {
									<div class="flex align-items-center gap-2">
										<i class="pi pi-user text-xs"></i>
										<span>{{ horario.profesorNombreCompleto }}</span>
									</div>
								}
							</div>
							<div class="course-card-affordance">
								<span>Ver curso</span>
								<i class="pi pi-arrow-right"></i>
							</div>
						</div>
					}
				</div>
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

	readonly colorMap = computed(() => buildCursoColorMap(this.vm().horarios));

	readonly todayCourses = computed(() => {
		const todayName = DAY_NAMES[new Date().getDay()];
		return this.vm().horarios.filter(h => h.diaSemanaDescripcion === todayName);
	});

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

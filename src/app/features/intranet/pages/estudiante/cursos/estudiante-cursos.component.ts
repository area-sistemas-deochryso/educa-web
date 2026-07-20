import { Component, ChangeDetectionStrategy, inject, OnInit, DestroyRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, take } from 'rxjs';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PageHeaderComponent } from '@intranet-shared/components';
import { buildCursoColorMap } from '@intranet-shared/config/curso-colors';
import { EstudianteCursosFacade } from '../services/estudiante-cursos.facade';
import { CursoContentReadonlyDialogComponent } from './components/curso-content-readonly-dialog/curso-content-readonly-dialog.component';
import { HorarioProfesorDto } from '../models';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

@Component({
	selector: 'app-estudiante-cursos',
	standalone: true,
	imports: [
		CommonModule,
		TagModule,
		TooltipModule,
		ProgressSpinnerModule,
		RouterLink,
		PageHeaderComponent,
		CursoContentReadonlyDialogComponent,
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
		.hoy-strip {
			background: var(--p-surface-50);
			border-radius: 8px;
			padding: 0.5rem 1rem;
			margin-bottom: 1rem;
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
				<a routerLink="/intranet/estudiante/horarios" class="text-sm no-underline text-primary flex align-items-center gap-1">
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
							[style.--card-accent]="colorMap().get(horario.cursoId)"
							(click)="onVerContenido(horario)"
							pTooltip="Ver contenido"
							tooltipPosition="top"
						>
							<div class="flex align-items-start justify-content-between mb-2">
								<span class="font-bold text-lg line-height-3">{{ horario.cursoNombre }}</span>
								<a routerLink="/intranet/estudiante/salones" class="no-underline" (click)="$event.stopPropagation()">
									<p-tag [value]="horario.salonDescripcion" severity="info" />
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

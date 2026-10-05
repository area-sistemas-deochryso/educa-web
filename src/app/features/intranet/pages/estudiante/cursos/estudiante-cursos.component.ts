import { Component, ChangeDetectionStrategy, inject, OnInit, computed } from '@angular/core';
import { Router } from '@angular/router';

import { PageHeaderComponent, EmptyStateComponent, CursoPairCardComponent } from '@intranet-shared/components';
import { buildCursoColorMap } from '@intranet-shared/config/curso-colors';
import { groupHorariosByPair, setupCursoHubLegacyRedirect } from '@intranet-shared/helpers';
import { ThemeService } from '@core/services/theme';
import { EstudianteCursosFacade } from '../services/estudiante-cursos.facade';
import { SkeletonLoaderComponent } from '@shared/components';
import { EduButton } from '@edu-ui';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

@Component({
	selector: 'app-estudiante-cursos',
	standalone: true,
	imports: [
		EduButton,
		SkeletonLoaderComponent,
		PageHeaderComponent,
		EmptyStateComponent,
		CursoPairCardComponent,
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
		app-curso-pair-card {
			flex: 1 1 320px;
			max-width: 100%;
		}
		.hoy-strip {
			background: var(--surface-50);
			border-radius: 8px;
			padding: 0.5rem 1rem;
			margin-bottom: 1rem;
		}
	`,
	template: `
		@if (vm().loading || legacyRedirect.pending()) {
			<div class="course-grid" style="min-height: 240px;">
				@for (i of [1, 2, 3, 4, 5, 6]; track i) {
					<app-skeleton-loader variant="card" height="140px" />
				}
			</div>
		} @else if (vm().horarios.length === 0) {
			<app-empty-state icon="pi pi-book" title="Mis Cursos" message="No tienes cursos asignados" />
		} @else {
			<app-page-header icon="pi pi-book" title="Mis Cursos">
				<edu-button label="Ver horario" icon="pi pi-calendar" size="small" [outlined]="true" data-info-anchor="estudiante-cursos-ver-horario" (click)="onVerHorario()" />
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
					@for (group of groups(); track group.key) {
						<app-curso-pair-card
							rol="estudiante"
							anchorPrefix="estudiante-cursos"
							salonLink="/intranet/estudiante/salones"
							[group]="group"
							[accent]="colorMap().get(group.cursoId)"
						>
							@if (group.profesores.length > 0) {
								<div class="flex align-items-center gap-2">
									<i class="pi pi-user text-xs"></i>
									<span>{{ group.profesores.join(', ') }}</span>
								</div>
							}
						</app-curso-pair-card>
					}
				</div>
			</div>
		}
	`,
})
export class EstudianteCursosComponent implements OnInit {
	private readonly facade = inject(EstudianteCursosFacade);
	private readonly router = inject(Router);
	private readonly theme = inject(ThemeService);

	readonly vm = this.facade.vm;

	readonly groups = computed(() => groupHorariosByPair(this.vm().horarios));
	readonly colorMap = computed(() => buildCursoColorMap(this.vm().horarios, this.theme.isDarkMode()));

	readonly todayCourses = computed(() => {
		const todayName = DAY_NAMES[new Date().getDay()];
		return this.vm().horarios.filter(h => h.diaSemanaDescripcion === todayName);
	});

	/** Los enlaces viejos `?horarioId=N` (antes abrían el modal) ahora redirigen al hub del par. */
	protected readonly legacyRedirect = setupCursoHubLegacyRedirect({
		rol: 'estudiante',
		horarios: computed(() => this.vm().horarios),
		loading: computed(() => this.vm().loading),
		loadError: computed(() => this.vm().error),
	});

	ngOnInit(): void {
		this.facade.loadHorarios();
	}

	onVerHorario(): void {
		this.router.navigate(['/intranet/estudiante/horarios']);
	}
}

import { Component, ChangeDetectionStrategy, inject, OnInit, computed } from '@angular/core';
import { Router } from '@angular/router';
import { PageHeaderComponent, EmptyStateComponent, CursoPairCardComponent } from '@intranet-shared/components';
import { PluralizePipe } from '@intranet-shared/pipes';
import { buildCursoColorMap } from '@intranet-shared/config/curso-colors';
import { groupHorariosByPair, setupCursoHubLegacyRedirect } from '@intranet-shared/helpers';
import { ThemeService } from '@core/services/theme';
import { ProfesorFacade } from '../services/profesor.facade';
import { EduButton, EduSpinner } from '@edu-ui';

@Component({
	selector: 'app-profesor-cursos',
	standalone: true,
	imports: [
		EduButton,
		EduSpinner,
		PageHeaderComponent,
		EmptyStateComponent,
		CursoPairCardComponent,
		PluralizePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		.card-meta { display: flex; align-items: center; gap: 0.5rem; }
		.card-meta i { font-size: 0.875rem; }
		.course-grid {
			// Flexbox, no CSS Grid: con pocos cursos las tarjetas se estiran
			// en vez de dejar columnas vacías (igual que estudiante-cursos).
			display: flex;
			flex-wrap: wrap;
			gap: 1rem;
		}
		app-curso-pair-card {
			flex: 1 1 320px;
			max-width: 100%;
		}
	`,
	template: `
		@if (vm().loading || legacyRedirect.pending()) {
			<div class="flex justify-content-center p-5">
				<edu-spinner strokeWidth="4" />
			</div>
		} @else if (vm().horarios.length === 0) {
			<app-empty-state icon="pi pi-book" title="Mis Cursos" message="No tienes cursos asignados" />
		} @else {
			<app-page-header icon="pi pi-book" title="Mis Cursos">
				<edu-button label="Ver horario" icon="pi pi-calendar" size="small" [outlined]="true" data-info-anchor="profesor-cursos-ver-horario" (click)="onVerHorario()" />
			</app-page-header>

			<div class="p-4 pt-0">
				<div class="course-grid">
					@for (group of groups(); track group.key) {
						<app-curso-pair-card
							rol="profesor"
							anchorPrefix="profesor-cursos"
							salonLink="/intranet/profesor/salones"
							[group]="group"
							[accent]="colorMap().get(group.cursoId)"
						>
							<div class="card-meta">
								<i class="pi pi-users"></i>
								<span>{{ group.cantidadEstudiantes | pluralize: 'estudiante' }}</span>
							</div>
						</app-curso-pair-card>
					}
				</div>
			</div>
		}
	`,
})
export class ProfesorCursosComponent implements OnInit {
	private readonly facade = inject(ProfesorFacade);
	private readonly theme = inject(ThemeService);
	private readonly router = inject(Router);

	readonly vm = this.facade.vm;

	readonly groups = computed(() => groupHorariosByPair(this.vm().horarios));
	readonly colorMap = computed(() => buildCursoColorMap(this.vm().horarios, this.theme.isDarkMode()));

	/** Los enlaces viejos `?horarioId=N` (antes abrían el modal) ahora redirigen al hub del par. */
	protected readonly legacyRedirect = setupCursoHubLegacyRedirect({
		rol: 'profesor',
		horarios: computed(() => this.vm().horarios),
		loading: computed(() => this.vm().loading),
		loadError: computed(() => this.vm().error),
	});

	ngOnInit(): void {
		this.facade.loadData();
	}

	onVerHorario(): void {
		this.router.navigate(['/intranet/profesor/horarios']);
	}
}

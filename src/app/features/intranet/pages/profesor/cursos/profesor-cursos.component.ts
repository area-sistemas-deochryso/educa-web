import { Component, ChangeDetectionStrategy, inject, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent, EmptyStateComponent, CursoPairCardComponent } from '@intranet-shared/components';
import { PluralizePipe } from '@intranet-shared/pipes';
import { buildCursoColorMap } from '@intranet-shared/config/curso-colors';
import { groupHorariosByPair, setupCursoHubLegacyRedirect } from '@intranet-shared/helpers';
import { ThemeService } from '@core/services/theme';
import { ProfesorFacade } from '../services/profesor.facade';
import { EduSpinner } from '@edu-ui';

@Component({
	selector: 'app-profesor-cursos',
	standalone: true,
	imports: [
		EduSpinner,
		RouterLink,
		PageHeaderComponent,
		EmptyStateComponent,
		CursoPairCardComponent,
		PluralizePipe],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		.course-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
			gap: 1rem;
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
				<a routerLink="/intranet/profesor/horarios" data-info-anchor="profesor-cursos-ver-horario" class="text-sm no-underline text-primary flex align-items-center gap-1">
					<i class="pi pi-calendar"></i> Ver horario
				</a>
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
							<div class="flex align-items-center gap-2">
								<i class="pi pi-users text-xs"></i>
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
}

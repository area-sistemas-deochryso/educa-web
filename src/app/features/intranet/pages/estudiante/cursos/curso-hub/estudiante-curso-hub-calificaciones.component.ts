import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EduButton, EduSpinner, EduTooltip } from '@edu-ui';
import { EmptyStateComponent } from '@intranet-shared/components';
import { NotasCursoCardComponent } from '@features/intranet/pages/estudiante/notas/components/notas-curso-card/notas-curso-card.component';
import { EstudianteCursosFacade } from '../../services/estudiante-cursos.facade';

/**
 * Pestaña Mis Calificaciones del hub de curso del estudiante (`…/calificaciones`).
 *
 * El shell carga el contenido y limpia el store; esta pestaña solo pide las
 * notas del contenido ya cargado (si todavía no están en el store) y nunca
 * resetea el store.
 */
@Component({
	selector: 'app-estudiante-curso-hub-calificaciones',
	standalone: true,
	imports: [RouterLink, EduButton, EduSpinner, EduTooltip, EmptyStateComponent, NotasCursoCardComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		.hub-calificaciones {
			padding: 1rem;
		}
		.hub-calificaciones__toolbar {
			display: flex;
			justify-content: flex-end;
			margin-bottom: 0.5rem;
		}
	`,
	template: `
		<div class="hub-calificaciones">
			@if (vm().contentLoading) {
				<div class="flex justify-content-center p-5">
					<edu-spinner strokeWidth="4" />
				</div>
			} @else if (vm().contenido) {
				<div class="hub-calificaciones__toolbar">
					<edu-button
						icon="pi pi-refresh"
						[text]="true"
						[rounded]="true"
						size="small"
						data-info-anchor="estudiante-curso-hub-refresh-notas"
						(click)="onRefreshNotas()"
						[disabled]="vm().misNotasLoading"
						eduTooltip="Refrescar"
						eduTooltipPosition="top"
						[pt]="{ root: { 'aria-label': 'Refrescar calificaciones' } }"
					/>
				</div>
				@if (vm().misNotasLoading) {
					<div class="flex justify-content-center p-5">
						<edu-spinner strokeWidth="4" />
					</div>
				} @else if (vm().misNotasCurso; as notas) {
					<app-notas-curso-card [curso]="notas" />
				} @else {
					<app-empty-state
						icon="pi pi-chart-bar"
						title="Mis calificaciones"
						message="No hay calificaciones registradas para este curso."
					/>
				}
			} @else {
				<div class="text-center p-4" data-info-anchor="estudiante-curso-hub-calificaciones-sin-contenido">
					<p class="m-0 mb-2">Esta franja todavía no tiene contenido, por lo que no hay calificaciones.</p>
					<a routerLink="../contenido" queryParamsHandling="merge" [replaceUrl]="true">Ir a Contenido</a>
				</div>
			}
		</div>
	`,
})
export class EstudianteCursoHubCalificacionesComponent {
	private readonly facade = inject(EstudianteCursosFacade);

	protected readonly vm = this.facade.vm;
	private readonly contenidoId = computed(() => this.vm().contenido?.id ?? null);

	constructor() {
		// El shell cargó el contenido; acá solo se piden sus notas, sin repetir si ya están en el store.
		effect(() => {
			if (this.contenidoId() === null) return;
			untracked(() => {
				const { misNotasCurso, misNotasLoading } = this.vm();
				if (!misNotasCurso && !misNotasLoading) this.facade.loadMisNotasCurso();
			});
		});
	}

	protected onRefreshNotas(): void {
		this.facade.refreshMisNotasCurso();
	}
}

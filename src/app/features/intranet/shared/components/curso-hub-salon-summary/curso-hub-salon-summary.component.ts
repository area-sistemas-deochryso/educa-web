import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
	buildCursoHubLink,
	type CursoHubRol,
	type CursoHubTarget,
} from '../../helpers/curso-hub-link.helpers';
import type { CursoHubSalonSummary } from '../../helpers/curso-hub-salon.helpers';
import { CursoChipComponent } from '../curso-chip';
import { KpiStatsComponent, type KpiStatItem } from '../kpi-stats';

/**
 * Resumen del salón de un par (curso, salón) para la pestaña Salón del hub.
 * Presentacional: no carga nada, el contenedor de cada rol le pasa el resumen
 * ya derivado de los horarios que el shell cargó. `esTutor` es opcional porque
 * solo el profesor tiene ese dato (`null` oculta la tarjeta). `salonesTarget`
 * `null` oculta el enlace (el usuario no tiene la página de Salones).
 */
@Component({
	selector: 'app-curso-hub-salon-summary',
	standalone: true,
	imports: [RouterLink, CursoChipComponent, KpiStatsComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		.salon-summary {
			display: flex;
			flex-direction: column;
			gap: 1rem;
			padding: 1rem;
		}
		.salon-block {
			border: 1px solid var(--surface-300);
			border-radius: 12px;
			padding: 1rem;
		}
		.salon-block__title {
			margin: 0 0 0.75rem;
			font-size: 0.8125rem;
			font-weight: 600;
			color: var(--text-color-secondary);
		}
		.salon-cursos {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
			margin: 0;
			padding: 0;
			list-style: none;
		}
		.salon-cursos__item--current {
			cursor: default;
		}
		.salon-cursos__link {
			text-decoration: none;
		}
		.salon-cursos__link:focus-visible {
			outline: 2px solid var(--accent-interactive);
			outline-offset: 2px;
			border-radius: 999px;
		}
		.salon-link {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
			align-self: flex-start;
			font-weight: 600;
			font-size: 0.875rem;
			color: var(--accent-interactive);
			text-decoration: none;
		}
		.salon-link:hover {
			color: var(--accent-interactive-hover);
			text-decoration: underline;
		}
	`,
	template: `
		<section class="salon-summary" data-info-anchor="curso-hub-salon-resumen">
			<app-kpi-stats [items]="stats()" />

			<div class="salon-block">
				<p class="salon-block__title">Tus cursos en {{ summary().salonDescripcion }}</p>
				<ul class="salon-cursos">
					@for (curso of cursos(); track curso.cursoId) {
						<li>
							@if (curso.isCurrent) {
								<span class="salon-cursos__item--current" aria-current="true">
									<app-curso-chip [cursoId]="curso.cursoId" [nombre]="curso.nombre" />
								</span>
							} @else {
								<a
									class="salon-cursos__link"
									[routerLink]="curso.commands"
									[attr.aria-label]="'Ir al curso ' + curso.nombre"
									data-info-anchor="curso-hub-salon-curso-link"
								>
									<app-curso-chip [cursoId]="curso.cursoId" [nombre]="curso.nombre" />
								</a>
							}
						</li>
					}
				</ul>
			</div>

			@if (salonesTarget(); as target) {
				<a
					class="salon-link"
					[routerLink]="target.commands"
					[queryParams]="target.queryParams"
					data-info-anchor="curso-hub-salon-ir-salones"
				>
					Ir a Mis Salones
					<i class="pi pi-arrow-right" aria-hidden="true"></i>
				</a>
			}
		</section>
	`,
})
export class CursoHubSalonSummaryComponent {
	readonly rol = input.required<CursoHubRol>();
	readonly summary = input.required<CursoHubSalonSummary>();
	/** Curso del par que se está viendo: se marca y no es enlace. */
	readonly currentCursoId = input.required<number>();
	/** `null` si el rol no tiene este dato (estudiante). */
	readonly esTutor = input<boolean | null>(null);
	/** Destino de la página de Salones; `null` oculta el enlace. */
	readonly salonesTarget = input<CursoHubTarget | null>(null);

	protected readonly stats = computed<KpiStatItem[]>(() => {
		const items: KpiStatItem[] = [
			{
				icon: 'pi pi-users',
				label: 'Estudiantes',
				value: this.summary().cantidadEstudiantes,
				sublabel: 'matriculados en el salón',
			},
		];
		const tutor = this.esTutor();
		if (tutor !== null) {
			items.push({
				icon: 'pi pi-id-card',
				label: 'Tutoría',
				value: tutor ? 'Sí' : 'No',
				sublabel: tutor ? 'Eres tutor de este salón' : 'No eres tutor de este salón',
			});
		}
		return items;
	});

	protected readonly cursos = computed(() => {
		const { salonId, cursos } = this.summary();
		return cursos.map((curso) => ({
			...curso,
			isCurrent: curso.cursoId === this.currentCursoId(),
			// Sin franja: el hub de ese curso resuelve la suya (`withSlot: false`), así que el `id` no se usa.
			commands: buildCursoHubLink(this.rol(), { id: 0, cursoId: curso.cursoId, salonId }, { withSlot: false }).commands,
		}));
	});
}

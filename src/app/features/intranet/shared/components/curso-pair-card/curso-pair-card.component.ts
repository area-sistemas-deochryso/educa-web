import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EduTag } from '@edu-ui';

import { buildCursoHubLink, type CursoHubRol } from '../../helpers/curso-hub-link.helpers';
import type { ContenidoResumenDto } from '@features/intranet/pages/profesor/models';
import type { CursoHubPairGroup } from '../../helpers/curso-hub-pair.helpers';

interface SlotProgress {
	done: number;
	total: number;
	percent: number;
	label: string;
}

/** Ausente → `null` («sin contenido»); presente con `done = 0` sigue siendo «0/N». */
function buildProgress(resumen: ContenidoResumenDto | undefined): SlotProgress | null {
	if (!resumen) return null;
	const { semanasConMaterial: done, numeroSemanas: total } = resumen;
	return {
		done,
		total,
		percent: total > 0 ? Math.min(100, (done / total) * 100) : 0,
		label: `${done} de ${total} semanas con material`,
	};
}

/**
 * Tarjeta de «Mis Cursos»: un par (curso, salón) que entra al hub.
 *
 * - El título es el enlace principal y se estira sobre toda la tarjeta (`::after`),
 *   así el cuerpo es clicable sin anidar enlaces ni usar `stopPropagation`.
 *   Entra al par sin `horarioId`: el hub resuelve la franja (con contenido → en curso → siguiente).
 * - Cada franja es un chip-enlace elevado que entra al hub con esa franja.
 * - Cada chip muestra `n/N` semanas con material (barra `role="progressbar"`); sin `contenidoResumen` → «Sin contenido».
 * - La etiqueta de salón es un enlace hermano elevado a la lista de Salones.
 * - El contenido proyectado es la línea de datos propia del rol (estudiantes / profesor).
 */
@Component({
	selector: 'app-curso-pair-card',
	standalone: true,
	imports: [RouterLink, EduTag],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
			min-width: 0;
		}
		.pair-card {
			position: relative;
			height: 100%;
			border-radius: 8px;
			border: 1px solid var(--surface-200);
			border-left: 4px solid var(--card-accent, var(--primary-accent));
			background: var(--surface-card, #fcfdfe);
			padding: 1rem 1.25rem;
			transition:
				box-shadow 0.15s,
				border-color 0.15s;
		}
		.pair-card:hover {
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
			border-color: var(--surface-300);
			border-left-color: var(--card-accent, var(--primary-accent));
		}
		.pair-card__title {
			margin: 0;
			font-size: 1.125rem;
			line-height: 1.4;
		}
		.pair-card__link {
			color: inherit;
			text-decoration: none;
		}
		.pair-card__link::after {
			content: '';
			position: absolute;
			inset: 0;
			border-radius: 8px;
		}
		.pair-card__link:focus-visible {
			outline: none;
		}
		.pair-card__link:focus-visible::after {
			outline: 2px solid var(--accent-interactive, var(--primary-accent));
			outline-offset: 2px;
		}
		.pair-card__salon,
		.pair-card__slot {
			position: relative;
			z-index: 1;
		}
		.pair-card__salon {
			text-decoration: none;
		}
		.pair-card__slots {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
			margin: 0.75rem 0 0;
			padding: 0;
			list-style: none;
		}
		.pair-card__slot {
			display: inline-flex;
			align-items: center;
			gap: 0.4rem;
			padding: 0.25rem 0.6rem;
			border: 1px solid var(--surface-300);
			border-radius: 999px;
			background: var(--surface-50);
			color: var(--text-color);
			font-size: 0.8125rem;
			text-decoration: none;
			transition:
				border-color 0.15s,
				background-color 0.15s;
		}
		.pair-card__slot:hover,
		.pair-card__slot:focus-visible {
			border-color: var(--accent-interactive, var(--primary-accent));
			background: var(--surface-100);
		}
		.pair-card__slot i {
			font-size: 0.7rem;
		}
		.pair-card__progress {
			display: inline-flex;
			align-items: center;
			gap: 0.35rem;
			padding-left: 0.4rem;
			border-left: 1px solid var(--surface-300);
			font-size: 0.75rem;
			font-variant-numeric: tabular-nums;
		}
		.pair-card__progress-bar {
			position: relative;
			width: 2.5rem;
			height: 0.35rem;
			border-radius: 999px;
			background: var(--surface-200);
			overflow: hidden;
		}
		.pair-card__progress-fill {
			position: absolute;
			inset: 0 auto 0 0;
			border-radius: 999px;
			background: var(--card-accent, var(--primary-accent));
		}
		.pair-card__progress--empty {
			color: var(--text-color-secondary);
		}
		.pair-card__affordance {
			display: flex;
			align-items: center;
			justify-content: flex-end;
			gap: 0.35rem;
			margin-top: 0.75rem;
			font-size: 0.75rem;
			font-weight: 600;
			color: var(--primary-accent);
		}
		.pair-card__affordance i {
			font-size: 0.7rem;
			transition: transform 0.15s;
		}
		.pair-card:hover .pair-card__affordance i {
			transform: translateX(3px);
		}
	`,
	template: `
		<article
			class="pair-card"
			[attr.data-info-anchor]="anchorPrefix() + '-card'"
			[style.--card-accent]="accent()"
		>
			<div class="flex align-items-start justify-content-between gap-2 mb-2">
				<h3 class="pair-card__title font-bold">
					<a class="pair-card__link" [routerLink]="body().commands">{{
						group().cursoNombre
					}}</a>
				</h3>
				<a
					class="pair-card__salon"
					[routerLink]="salonLink()"
					[attr.data-info-anchor]="anchorPrefix() + '-card-salon-tag'"
					[attr.aria-label]="'Ver salón ' + group().salonDescripcion"
				>
					<edu-tag [value]="group().salonDescripcion" severity="info" />
				</a>
			</div>
			<div class="text-sm text-color-secondary">
				<ng-content />
			</div>
			<ul class="pair-card__slots" aria-label="Franjas del curso">
				@for (item of slotLinks(); track item.slot.id) {
					<li>
						<a
							class="pair-card__slot"
							[routerLink]="item.target.commands"
							[queryParams]="item.target.queryParams"
							[attr.data-info-anchor]="anchorPrefix() + '-card-franja'"
						>
							<i class="pi pi-calendar" aria-hidden="true"></i>
							<span class="pair-card__when">
								{{ item.slot.diaSemanaDescripcion }} · {{ item.slot.horaInicio }} -
								{{ item.slot.horaFin }}
							</span>
							@if (item.progress; as progress) {
								<span
									class="pair-card__progress"
									role="progressbar"
									aria-valuemin="0"
									[attr.aria-valuemax]="progress.total"
									[attr.aria-valuenow]="progress.done"
									[attr.aria-valuetext]="progress.label"
									[attr.aria-label]="
										'Semanas con material de ' + item.slot.diaSemanaDescripcion
									"
									[attr.data-info-anchor]="anchorPrefix() + '-card-progreso'"
								>
									<span class="pair-card__progress-bar" aria-hidden="true">
										<span
											class="pair-card__progress-fill"
											[style.width.%]="progress.percent"
										></span>
									</span>
									<span aria-hidden="true"
										>{{ progress.done }}/{{ progress.total }}</span
									>
								</span>
							} @else {
								<span class="pair-card__progress pair-card__progress--empty"
									>Sin contenido</span
								>
							}
						</a>
					</li>
				}
			</ul>
			<div class="pair-card__affordance" aria-hidden="true">
				<span>Ver curso</span>
				<i class="pi pi-arrow-right"></i>
			</div>
		</article>
	`,
})
export class CursoPairCardComponent {
	readonly group = input.required<CursoHubPairGroup>();
	readonly rol = input.required<CursoHubRol>();
	/** Color del curso (`--card-accent`); sin él la tarjeta usa el acento primario. */
	readonly accent = input<string | undefined>(undefined);
	/** Destino de la etiqueta de salón. */
	readonly salonLink = input.required<string>();
	/** Prefijo de los `data-info-anchor` (ej. `profesor-cursos`). */
	readonly anchorPrefix = input.required<string>();

	/** Destino del cuerpo: el par sin franja (el hub la resuelve por preselección). */
	protected readonly body = computed(() =>
		buildCursoHubLink(this.rol(), this.group().slots[0], { withSlot: false }),
	);

	/** Un enlace por franja, con `horarioId` y su progreso de contenido (por franja, nunca agregado por par). */
	protected readonly slotLinks = computed(() =>
		this.group().slots.map((slot) => ({
			slot,
			target: buildCursoHubLink(this.rol(), slot),
			progress: buildProgress(slot.contenidoResumen),
		})),
	);
}

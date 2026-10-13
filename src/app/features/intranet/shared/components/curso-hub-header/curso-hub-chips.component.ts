import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { SkeletonLoaderComponent } from '@shared/components';

export interface CursoHubChip {
	/** Identificador estable que el padre usa para decidir qué acción ejecutar. */
	key: string;
	icon: string;
	label: string;
	/** `null` mientras el dato todavía carga: se muestra «—». */
	count: number | null;
	/** Lo que anuncia el lector de pantalla: el contador solo no dice qué hace el botón. */
	ariaLabel: string;
}

/**
 * Chips de resumen del curso (archivos, tareas, …) junto al título del hub.
 * Cada chip es un botón: emite su `key` y el padre decide la acción. Presentacional:
 * no conoce stores ni diálogos.
 */
@Component({
	selector: 'app-curso-hub-chips',
	standalone: true,
	imports: [SkeletonLoaderComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
		.hub-chips {
			display: flex;
			align-items: center;
			flex-wrap: wrap;
			gap: 0.5rem;
		}
		.hub-chip {
			display: inline-flex;
			align-items: center;
			gap: 0.375rem;
			min-height: 2rem;
			padding: 0 0.75rem;
			font: inherit;
			font-size: 0.8125rem;
			color: var(--text-color);
			background: transparent;
			border: 1px solid var(--surface-300);
			border-radius: 999px;
			cursor: pointer;
			white-space: nowrap;
		}
		.hub-chip i {
			font-size: 0.8125rem;
			color: var(--text-color-secondary);
		}
		.hub-chip__count {
			font-weight: 700;
			font-variant-numeric: tabular-nums;
		}
		/* --text-color, no --text-color-secondary: sobre el fondo claro de la intranet este último queda en ~4.2:1 (< AA). */
		.hub-chip__label {
			color: var(--text-color);
		}
		.hub-chip:hover {
			border-color: var(--accent-interactive);
		}
		.hub-chip:focus-visible {
			outline: 2px solid var(--accent-interactive);
			outline-offset: 2px;
		}
	`,
	template: `
		<div class="hub-chips" role="group" aria-label="Resumen del curso" data-info-anchor="curso-hub-chips">
			@if (loading()) {
				@for (n of skeletons(); track n) {
					<app-skeleton-loader variant="rect" width="6.5rem" height="2rem" />
				}
			} @else {
				@for (chip of chips(); track chip.key) {
					<button
						type="button"
						class="hub-chip"
						[attr.aria-label]="chip.ariaLabel"
						[attr.data-info-anchor]="'curso-hub-chip-' + chip.key"
						(click)="chipClick.emit(chip.key)"
					>
						<i [class]="chip.icon" aria-hidden="true"></i>
						<span class="hub-chip__count">{{ chip.count ?? '—' }}</span>
						<span class="hub-chip__label">{{ chip.label }}</span>
					</button>
				}
			}
		</div>
	`,
})
export class CursoHubChipsComponent {
	readonly chips = input.required<readonly CursoHubChip[]>();
	/** Mientras el contenido carga: reserva el espacio con skeletons para no mover el título. */
	readonly loading = input(false);
	readonly skeletonCount = input(2);
	readonly chipClick = output<string>();

	protected readonly skeletons = computed(() => Array.from({ length: this.skeletonCount() }, (_, i) => i));
}

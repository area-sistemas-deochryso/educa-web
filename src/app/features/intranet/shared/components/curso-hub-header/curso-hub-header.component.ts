import { ChangeDetectionStrategy, Component, computed, effect, input, output, untracked, viewChild } from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';
import { EduSelectButton } from '@edu-ui';
import type { HorarioProfesorDto } from '@features/intranet/pages/profesor/models';

interface SlotOption {
	label: string;
	value: number;
}

/**
 * Encabezado compacto del hub de curso, de una línea: Curso y Salón (son del par),
 * los chips de resumen que el shell proyecta junto al título y, solo si el par
 * tiene más de una franja, el selector de franja.
 */
@Component({
	selector: 'app-curso-hub-header',
	standalone: true,
	imports: [FormsModule, EduSelectButton],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		.hub-header {
			display: flex;
			align-items: center;
			flex-wrap: wrap;
			gap: 0.5rem 1rem;
			padding: 0.75rem 1rem;
		}
		.hub-header__title {
			display: flex;
			align-items: center;
			gap: 0.625rem;
			min-width: 0;
		}
		.hub-header__title > i {
			font-size: 1.25rem;
			color: var(--intranet-default-text-color);
		}
		.hub-header__heading {
			display: flex;
			align-items: baseline;
			flex-wrap: wrap;
			gap: 0 0.5rem;
			min-width: 0;
		}
		.hub-header__heading h2 {
			margin: 0;
			font-size: 1.25rem;
			font-weight: 600;
			color: var(--intranet-default-text-color);
		}
		.hub-header__subtitle {
			font-size: 0.875rem;
			color: var(--intranet-soft-text-color, var(--text-color-secondary));
		}
		/* Los chips (proyectados) quedan junto al título; la franja, al borde derecho.
		   con display: contents, si no hay chips (curso sin contenido) no dejan un hueco en el gap. */
		.hub-header__chips {
			display: contents;
		}
		.slot-selector {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			flex-wrap: wrap;
			margin-left: auto;
		}
		.slot-selector__label {
			font-size: 0.8125rem;
			color: var(--text-color-secondary);
		}
	`,
	template: `
		<header class="hub-header">
			<div class="hub-header__title">
				<i class="pi pi-book" aria-hidden="true"></i>
				<div class="hub-header__heading">
					<h2>{{ cursoNombre() }}</h2>
					<span class="hub-header__subtitle">{{ subtitle() }}</span>
				</div>
			</div>
			<div class="hub-header__chips">
				<ng-content />
			</div>
			@if (showSelector()) {
				<div class="slot-selector" data-info-anchor="curso-hub-franja-selector">
					<span class="slot-selector__label">Clase:</span>
					<edu-select-button
						[options]="options()"
						optionLabel="label"
						optionValue="value"
						[allowEmpty]="false"
						[ngModel]="selectedSlotId()"
						(ngModelChange)="onSelect($event)"
					/>
				</div>
			}
		</header>
	`,
})
export class CursoHubHeaderComponent {
	readonly cursoNombre = input.required<string>();
	readonly salonDescripcion = input.required<string>();
	readonly slots = input.required<readonly HorarioProfesorDto[]>();
	readonly selectedSlotId = input<number | null>(null);
	/** El padre lo incrementa cuando bloquea un cambio de franja: el selector vuelve a mostrar `selectedSlotId`. */
	readonly resetKey = input(0);
	private readonly slotModel = viewChild(NgModel);

	readonly slotChange = output<number>();

	readonly subtitle = computed(() => `Salón ${this.salonDescripcion()}`);
	readonly showSelector = computed(() => this.slots().length > 1);
	constructor() {
		// Un `ngModel` con el mismo valor no se re-escribe, así que el control se devuelve a mano a la franja vigente.
		effect(() => {
			this.resetKey();
			untracked(() => this.slotModel()?.control.setValue(this.selectedSlotId(), { emitEvent: false }));
		});
	}

	readonly options = computed<SlotOption[]>(() =>
		this.slots().map((s) => ({
			label: `${s.diaSemanaDescripcion} ${s.horaInicio} - ${s.horaFin}`,
			value: s.id,
		})),
	);

	onSelect(slotId: number | null): void {
		if (slotId !== null && slotId !== this.selectedSlotId()) {
			this.slotChange.emit(slotId);
		}
	}
}

import { ChangeDetectionStrategy, Component, computed, effect, input, output, untracked, viewChild } from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';
import { EduSelectButton } from '@edu-ui';
import type { HorarioProfesorDto } from '@features/intranet/pages/profesor/models';

import { PageHeaderComponent } from '../page-header';

interface SlotOption {
	label: string;
	value: number;
}

/**
 * Encabezado del hub de curso: Curso y Salón (son del par) y, solo si el par
 * tiene más de una franja, el selector de franja.
 */
@Component({
	selector: 'app-curso-hub-header',
	standalone: true,
	imports: [FormsModule, EduSelectButton, PageHeaderComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		.slot-selector {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			flex-wrap: wrap;
		}
		.slot-selector__label {
			font-size: 0.8125rem;
			color: var(--text-color-secondary);
		}
	`,
	template: `
		<app-page-header icon="pi pi-book" [title]="cursoNombre()" [subtitle]="subtitle()">
			@if (showSelector()) {
				<div class="slot-selector" data-info-anchor="curso-hub-franja-selector">
					<span class="slot-selector__label">Franja:</span>
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
		</app-page-header>
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

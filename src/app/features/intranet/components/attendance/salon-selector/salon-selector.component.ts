import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { SalonProfesor } from '@core/services';

/**
 * Componente presentacional (Dumb) para la selección de salón.
 * No tiene lógica de negocio, solo recibe datos y emite eventos.
 */
@Component({
	selector: 'app-salon-selector',
	standalone: true,
	imports: [FormsModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './salon-selector.component.html',
	styleUrls: ['./salon-selector.component.scss'],
})
export class SalonSelectorComponent {
	salones = input.required<SalonProfesor[]>();
	selectedSalonId = input.required<number | null>();
	nombreProfesor = input<string | null>(null);

	salonChange = output<number>();

	onSalonChange(event: Event): void {
		const select = event.target as HTMLSelectElement;
		this.salonChange.emit(+select.value);
	}
}

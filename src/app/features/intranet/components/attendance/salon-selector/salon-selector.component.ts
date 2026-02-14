// #region Imports
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { SalonProfesor } from '@core/services';

/**
 * Componente presentacional (Dumb) para la selecciÃƒÂ³n de salÃƒÂ³n.
 * No tiene lÃƒÂ³gica de negocio, solo recibe datos y emite eventos.
 */
// #endregion
// #region Implementation
@Component({
	selector: 'app-salon-selector',
	standalone: true,
	imports: [FormsModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './salon-selector.component.html',
	styleUrls: ['./salon-selector.component.scss'],
})
export class SalonSelectorComponent {
	// * Inputs drive the select options + current selection.
	salones = input.required<SalonProfesor[]>();
	selectedSalonId = input.required<number | null>();
	nombreProfesor = input<string | null>(null);

	// * Emits selected salon id to parent.
	salonChange = output<number>();

	onSalonChange(event: Event): void {
		// * Cast to number since native select values are strings.
		const select = event.target as HTMLSelectElement;
		this.salonChange.emit(+select.value);
	}
}
// #endregion

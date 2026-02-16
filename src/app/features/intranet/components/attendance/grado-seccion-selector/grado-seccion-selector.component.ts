// #region Imports
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { GradoSeccion } from '@core/services';

/**
 * Componente presentacional para la selección de grado/sección.
 * Usado por el Director para filtrar estudiantes.
 */
// #endregion
// #region Implementation
@Component({
	selector: 'app-grado-seccion-selector',
	standalone: true,
	imports: [FormsModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './grado-seccion-selector.component.html',
	styleUrls: ['./grado-seccion-selector.component.scss'],
})
export class GradoSeccionSelectorComponent {
	// * Inputs drive the select options + current selection.
	gradosSecciones = input.required<GradoSeccion[]>();
	selectedGradoSeccion = input.required<GradoSeccion | null>();

	// * Emits the selected grade/section object.
	gradoSeccionChange = output<GradoSeccion>();

	onGradoSeccionChange(event: Event): void {
		// * Select value is "grado|seccion" for quick lookup.
		const select = event.target as HTMLSelectElement;
		const [grado, seccion] = select.value.split('|');
		const gradoSeccion = this.gradosSecciones().find(
			(gs) => gs.grado === grado && gs.seccion === seccion
		);
		if (gradoSeccion) {
			this.gradoSeccionChange.emit(gradoSeccion);
		}
	}
}
// #endregion

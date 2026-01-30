import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { GradoSeccion } from '@core/services';

/**
 * Componente presentacional para la selección de grado/sección.
 * Usado por el Director para filtrar estudiantes.
 */
@Component({
	selector: 'app-grado-seccion-selector',
	standalone: true,
	imports: [FormsModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './grado-seccion-selector.component.html',
	styleUrls: ['./grado-seccion-selector.component.scss'],
})
export class GradoSeccionSelectorComponent {
	gradosSecciones = input.required<GradoSeccion[]>();
	selectedGradoSeccion = input.required<GradoSeccion | null>();

	gradoSeccionChange = output<GradoSeccion>();

	onGradoSeccionChange(event: Event): void {
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

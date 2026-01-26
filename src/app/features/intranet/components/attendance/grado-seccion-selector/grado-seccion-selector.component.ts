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
	template: `
		<div class="grado-seccion-selector">
			<label>Grado/Sección:</label>
			<select (change)="onGradoSeccionChange($event)">
				@for (gs of gradosSecciones(); track gs.grado + gs.seccion) {
					<option
						[value]="gs.grado + '|' + gs.seccion"
						[selected]="
							gs.grado === selectedGradoSeccion()?.grado &&
							gs.seccion === selectedGradoSeccion()?.seccion
						"
					>
						{{ gs.grado }}° - Sección {{ gs.seccion }}
					</option>
				}
			</select>
		</div>
	`,
	styles: [
		`
			.grado-seccion-selector {
				display: inline-flex;
				align-items: center;
				gap: 0.75rem;
				margin: 0 1rem 1rem 1rem;
				padding: 0.75rem 1.25rem;
				background: var(--surface-card);
				border-radius: var(--border-radius);

				label {
					font-weight: 600;
					color: var(--text-color);
					white-space: nowrap;
				}

				select {
					min-width: 180px;
					max-width: 280px;
					padding: 0.5rem 0.75rem;
					border: 1px solid var(--surface-border);
					border-radius: var(--border-radius);
					background: var(--surface-ground);
					color: var(--text-color);
					font-size: 1rem;
					cursor: pointer;

					&:focus {
						outline: none;
						border-color: var(--primary-color);
						box-shadow: 0 0 0 2px var(--primary-100);
					}
				}
			}
		`,
	],
})
export class GradoSeccionSelectorComponent {
	gradosSecciones = input.required<GradoSeccion[]>();
	selectedGradoSeccion = input.required<GradoSeccion | null>();

	gradoSeccionChange = output<GradoSeccion>();

	onGradoSeccionChange(event: Event): void {
		const select = event.target as HTMLSelectElement;
		const [grado, seccion] = select.value.split('|');
		this.gradoSeccionChange.emit({ grado, seccion });
	}
}

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
	template: `
		<div class="salon-selector">
			<label>Salón:</label>
			<select (change)="onSalonChange($event)">
				@for (salon of salones(); track salon.salonId) {
					<option
						[value]="salon.salonId"
						[selected]="salon.salonId === selectedSalonId()"
					>
						{{ salon.nombreSalon }}
						@if (salon.esTutor) {
							(Tutor {{ nombreProfesor() }})
						} @else {
							(Profesor {{ nombreProfesor() }})
						}
					</option>
				}
			</select>
		</div>
	`,
	styles: [
		`
			.salon-selector {
				display: inline-flex;
				align-items: center;
				gap: 0.5rem;
				margin-bottom: 1rem;
				padding: 0.75rem;
				background: var(--surface-card);
				border-radius: var(--border-radius);

				label {
					font-weight: 600;
					color: var(--text-color);
					white-space: nowrap;
				}

				select {
					min-width: 200px;
					max-width: 350px;
					padding: 0.5rem;
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

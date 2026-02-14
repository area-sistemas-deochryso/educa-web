// #region Imports
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';

// #endregion
// #region Implementation
interface SelectOption {
	label: string;
	value: string;
}

@Component({
	selector: 'app-location-selector',
	standalone: true,
	imports: [FormsModule, Select, ButtonModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="location-selector">
			<!-- Punto de inicio -->
			<div class="selector-field">
				<label>Estoy en:</label>
				<p-select
					[options]="startOptions()"
					[ngModel]="startNodeId()"
					(ngModelChange)="startChange.emit($event)"
					optionLabel="label"
					optionValue="value"
					placeholder="Selecciona tu ubicaciÃƒÂ³n"
					appendTo="body"
					[filter]="true"
					filterPlaceholder="Buscar..."
				/>
			</div>

			<!-- Destino -->
			<div class="selector-field">
				<label>Ir a:</label>
				<p-select
					[options]="destinationOptions()"
					[ngModel]="destinationNodeId()"
					(ngModelChange)="destinationChange.emit($event)"
					optionLabel="label"
					optionValue="value"
					placeholder="Selecciona destino"
					appendTo="body"
					[filter]="true"
					filterPlaceholder="Buscar..."
				/>
			</div>

			<!-- Limpiar -->
			@if (hasPath()) {
				<button
					pButton
					icon="pi pi-times"
					class="p-button-sm p-button-outlined p-button-secondary clear-btn"
					label="Limpiar"
					(click)="clear.emit()"
					[pt]="{
						root: {
							'aria-label': 'Limpiar ruta',
						},
					}"
				></button>
			}
		</div>
	`,
	styles: `
		.location-selector {
			display: flex;
			align-items: flex-end;
			gap: 1rem;
			flex-wrap: wrap;
		}

		.selector-field {
			display: flex;
			flex-direction: column;
			gap: 0.25rem;
			min-width: 200px;
			flex: 1;

			label {
				font-size: 0.8rem;
				font-weight: 600;
				color: var(--text-color-secondary);
			}
		}

		.clear-btn {
			flex-shrink: 0;
		}
	`,
})
export class LocationSelectorComponent {
	readonly startOptions = input.required<SelectOption[]>();
	readonly destinationOptions = input.required<SelectOption[]>();
	readonly startNodeId = input<string | null>(null);
	readonly destinationNodeId = input<string | null>(null);
	readonly hasPath = input(false);

	readonly startChange = output<string>();
	readonly destinationChange = output<string>();
	readonly clear = output<void>();
}
// #endregion

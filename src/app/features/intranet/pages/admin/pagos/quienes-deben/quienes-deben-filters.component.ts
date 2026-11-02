// #region Imports
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { PagosSalonOpcion } from '@data/models';
import { EduSelect } from '@edu-ui';
// #endregion

const ALL_SALONES = { salonId: null, nombre: 'Todos los salones' };

/** Búsqueda por texto + filtro por salón. Presentacional: el debounce vive en el facade. */
@Component({
	selector: 'app-quienes-deben-filters',
	standalone: true,
	imports: [FormsModule, EduSelect],
	template: `
		<div class="filters">
			<label class="filters__field">
				<span class="filters__label">Buscar alumno</span>
				<input
					type="search"
					class="filters__input"
					placeholder="Nombre o DNI"
					[value]="buscar()"
					(input)="onInput($event)"
				/>
			</label>
			<div class="filters__field">
				<span class="filters__label">Salón</span>
				<edu-select
					[options]="options()"
					[ngModel]="salonId()"
					(ngModelChange)="salonChange.emit($event)"
					optionLabel="nombre"
					optionValue="salonId"
					placeholder="Todos los salones"
					appendTo="body"
					class="filters__select"
				/>
			</div>
		</div>
	`,
	styleUrl: './quienes-deben-filters.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuienesDebenFiltersComponent {
	readonly buscar = input('');
	readonly salonId = input<number | null>(null);
	readonly salones = input<PagosSalonOpcion[]>([]);

	readonly searchChange = output<string>();
	readonly salonChange = output<number | null>();

	protected readonly options = computed(() => [ALL_SALONES, ...this.salones()]);

	protected onInput(event: Event): void {
		this.searchChange.emit((event.target as HTMLInputElement).value);
	}
}

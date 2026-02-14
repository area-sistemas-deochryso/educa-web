// #region Imports
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

import type { SalonOption } from '../../models/salon.interface';

// #endregion
// #region Implementation
@Component({
	selector: 'app-horarios-filters',
	standalone: true,
	imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, SelectModule, TooltipModule],
	templateUrl: './horarios-filters.component.html',
	styleUrl: './horarios-filters.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HorariosFiltersComponent {
	// * Inputs reflect current filter state.
	readonly salonesOptions = input.required<SalonOption[]>();
	readonly filtroSalonId = input<number | null>(null);
	readonly filtroDiaSemana = input<number | null>(null);
	readonly filtroEstadoActivo = input<boolean | null>(null);
	readonly filtroDiaSemanaHabilitado = input<boolean>(true);
	readonly hasFilters = input<boolean>(false);

	// * Outputs bubble filter changes.
	readonly filtroSalonChange = output<number | null>();
	readonly filtroDiaSemanaChange = output<number | null>();
	readonly filtroEstadoChange = output<boolean | null>();
	readonly clearFiltros = output<void>();

	// * Static options for selects.
	readonly diasOptions = [
		{ label: 'Lunes', value: 1 },
		{ label: 'Martes', value: 2 },
		{ label: 'MiÃƒÆ’Ã‚Â©rcoles', value: 3 },
		{ label: 'Jueves', value: 4 },
		{ label: 'Viernes', value: 5 },
	];

	readonly estadoOptions = [
		{ label: 'Activos', value: true },
		{ label: 'Inactivos', value: false },
	];

	// * Event handlers
	onSalonChange(salonId: number | null): void {
		this.filtroSalonChange.emit(salonId);
	}

	onDiaChange(diaSemana: number | null): void {
		this.filtroDiaSemanaChange.emit(diaSemana);
	}

	onEstadoChange(estadoActivo: boolean | null): void {
		this.filtroEstadoChange.emit(estadoActivo);
	}

	onClearFilters(): void {
		this.clearFiltros.emit();
	}
}
// #endregion

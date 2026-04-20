import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MultiSelectModule } from 'primeng/multiselect';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import {
	ESTADO_OPTIONS,
	RANGO_OPTIONS,
	TIPO_PERSONA_OPTIONS,
} from '../../config/attendance-reports.config';
import type { EstadoFiltro, RangoTipo, SalonOption, TipoPersonaReporte } from '../../models';

@Component({
	selector: 'app-reports-filters',
	standalone: true,
	imports: [
		FormsModule,
		SelectModule,
		SelectButtonModule,
		MultiSelectModule,
		DatePickerModule,
		ButtonModule,
	],
	templateUrl: './reports-filters.component.html',
	styleUrl: './reports-filters.component.scss',
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsFiltersComponent {
	// #region Inputs/Outputs
	readonly salonOptions = input.required<SalonOption[]>();
	readonly loading = input(false);
	readonly loadingSalones = input(false);
	readonly selectedEstado = input.required<EstadoFiltro>();
	readonly selectedRango = input.required<RangoTipo>();
	readonly selectedFecha = input.required<Date>();
	readonly selectedSalones = input.required<string[]>();
	readonly selectedTipoPersona = input.required<TipoPersonaReporte>();

	readonly estadoChange = output<EstadoFiltro>();
	readonly rangoChange = output<RangoTipo>();
	readonly fechaChange = output<Date>();
	readonly salonesChange = output<string[]>();
	readonly tipoPersonaChange = output<TipoPersonaReporte>();
	readonly generar = output<void>();
	// #endregion

	// #region Config
	readonly estadoOptions = ESTADO_OPTIONS;
	readonly rangoOptions = RANGO_OPTIONS;
	readonly tipoPersonaOptions = TIPO_PERSONA_OPTIONS;
	// #endregion

	// #region Computed
	readonly showSalones = computed(() => this.selectedTipoPersona() !== 'P');
	readonly disableGenerar = computed(
		() => this.selectedTipoPersona() !== 'P' && this.selectedSalones().length === 0,
	);
	// #endregion
}

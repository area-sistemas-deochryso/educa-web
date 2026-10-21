import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
	ESTADO_OPTIONS,
	RANGO_OPTIONS,
	TIPO_PERSONA_OPTIONS,
} from '../../config/attendance-reports.config';
import { isoToCorto, type BimestreAsistencia, type EstadoFiltro, type RangoTipo, type SalonOption, type TipoPersonaReporte } from '../../models';
import { EduButton, EduDatePicker, EduMultiSelect, EduSelect, EduSelectButton } from '@edu-ui';

@Component({
	selector: 'app-reports-filters',
	standalone: true,
	imports: [FormsModule, EduSelect, EduSelectButton, EduMultiSelect, EduDatePicker, EduButton],
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
	readonly bimestres = input<BimestreAsistencia[]>([]);
	readonly selectedBimestreId = input<number | null>(null);

	readonly estadoChange = output<EstadoFiltro>();
	readonly rangoChange = output<RangoTipo>();
	readonly fechaChange = output<Date>();
	readonly salonesChange = output<string[]>();
	readonly tipoPersonaChange = output<TipoPersonaReporte>();
	readonly bimestreChange = output<number | null>();
	readonly configurarBimestres = output<void>();
	readonly generar = output<void>();
	// #endregion

	// #region Config
	readonly estadoOptions = ESTADO_OPTIONS;
	readonly rangoOptions = RANGO_OPTIONS;
	readonly tipoPersonaOptions = TIPO_PERSONA_OPTIONS;
	// #endregion

	// #region Computed
	/** El rango bimestre solo existe para estudiantes (INV-RE04); para otros tipos no se ofrece. */
	readonly rangoOptionsVisibles = computed(() =>
		this.selectedTipoPersona() === 'E' ? this.rangoOptions : this.rangoOptions.filter((o) => o.value !== 'bimestre'),
	);
	readonly esBimestre = computed(() => this.selectedRango() === 'bimestre');
	readonly bimestreOptions = computed(() =>
		this.bimestres().map((b) => ({
			label: `${b.nombre} · ${isoToCorto(b.fechaInicio)} al ${isoToCorto(b.fechaFin)}`,
			value: b.id,
		})),
	);
	readonly showSalones = computed(() => {
		const t = this.selectedTipoPersona();
		return t !== 'P' && t !== 'A' && t !== 'C' && t !== 'M';
	});
	readonly disableGenerar = computed(() => {
		if (this.esBimestre() && this.selectedBimestreId() === null) return true;
		const t = this.selectedTipoPersona();
		if (t === 'P' || t === 'A' || t === 'C' || t === 'M') return false;
		return this.selectedSalones().length === 0;
	});
	// #endregion
}

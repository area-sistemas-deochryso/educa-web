import { Injectable, computed, signal } from '@angular/core';

import { EstadisticasAsistenciaDia } from '@core/services';

type MonthSubMode = 'mes' | 'periodo';

const MONTH_NAMES = [
	'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
	'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MONTH_SUB_MODE_OPTIONS = [
	{ label: 'Mes', value: 'mes' as MonthSubMode },
	{ label: 'Periodo', value: 'periodo' as MonthSubMode },
];

const MONTH_OPTIONS = MONTH_NAMES.map((label, i) => ({ label, value: i + 1 }));

const EMPTY_ESTADISTICAS: EstadisticasAsistenciaDia = {
	total: 0,
	tardanza: 0,
	asistio: 0,
	falta: 0,
	noAsistio: 0,
	justificado: 0,
	pendiente: 0,
};

/**
 * Servicio scoped que gestiona las estadísticas de asistencia diaria
 * y la configuración del sub-modo periodo (rango de meses, validación,
 * opciones de selección).
 */
@Injectable()
export class AttendanceStatsService {
	// #region Estadísticas día
	readonly estadisticasDia = signal<EstadisticasAsistenciaDia>({ ...EMPTY_ESTADISTICAS });

	setEstadisticasDia(stats: EstadisticasAsistenciaDia): void {
		this.estadisticasDia.set(stats);
	}
	// #endregion

	// #region Periodo (sub-modo dentro de mes)
	readonly monthSubMode = signal<MonthSubMode>('mes');
	readonly periodoInicio = signal(1);
	readonly periodoFin = signal(new Date().getMonth() + 1);

	/** Opciones estáticas para el toggle mes/periodo */
	readonly monthSubModeOptions = MONTH_SUB_MODE_OPTIONS;

	/**
	 * Signal externo: año seleccionado en la tabla de ingresos.
	 * Debe ser actualizado por el controller cuando cambie la tabla.
	 */
	readonly selectedYear = signal(new Date().getFullYear());

	/** Año del periodo — siempre el año seleccionado en la tabla */
	readonly periodoYear = computed(() => this.selectedYear());

	/** Mes máximo disponible: si es el año actual, hasta el mes actual; si es año pasado, todos */
	readonly maxPeriodoMonth = computed(() => {
		const year = this.selectedYear();
		const now = new Date();
		return year >= now.getFullYear() ? now.getMonth() + 1 : 12;
	});

	/** Opciones de mes para INICIO: 1 hasta maxPeriodoMonth */
	readonly mesOptionsInicio = computed(() => {
		const max = this.maxPeriodoMonth();
		return MONTH_OPTIONS.filter((m) => m.value <= max);
	});

	/** Opciones de mes para FIN: desde periodoInicio hasta maxPeriodoMonth */
	readonly mesOptionsFin = computed(() => {
		const start = this.periodoInicio();
		const max = this.maxPeriodoMonth();
		return MONTH_OPTIONS.filter((m) => m.value >= start && m.value <= max);
	});

	/** Valida que el rango de periodo sea correcto */
	readonly isPeriodoValid = computed(() => this.periodoInicio() <= this.periodoFin());

	/** Label descriptivo para la sección PDF en modo periodo */
	readonly pdfLabel = computed(() => {
		const inicio = this.periodoInicio();
		const fin = this.periodoFin();
		const year = this.selectedYear();
		return `Periodo: ${MONTH_NAMES[inicio - 1]} – ${MONTH_NAMES[fin - 1]} ${year}`;
	});

	setMonthSubMode(mode: MonthSubMode): void {
		this.monthSubMode.set(mode);
	}

	setPeriodoInicio(mes: number): void {
		this.periodoInicio.set(mes);
		// Auto-ajustar fin si queda por debajo del inicio
		if (this.periodoFin() < mes) {
			this.periodoFin.set(mes);
		}
	}

	setPeriodoFin(mes: number): void {
		this.periodoFin.set(mes);
	}

	setSelectedYear(year: number): void {
		this.selectedYear.set(year);
	}
	// #endregion
}

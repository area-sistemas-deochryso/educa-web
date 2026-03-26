import { computed, Injectable, signal } from '@angular/core';

import {
	type DiaSemana,
	type HorarioResponseDto,
	type HorarioVistaType,
} from '../models/horario.interface';
import { buildWeeklyBlocks } from '../helpers/horario-time.utils';

/**
 * Sub-store para filtros, paginación y vista de horarios.
 * Recibe los horarios fuente via setHorariosSource() y calcula derivados filtrados.
 */
@Injectable({ providedIn: 'root' })
export class HorariosFilterStore {
	// #region Estado privado
	private readonly _filtroSalonId = signal<number | null>(null);
	private readonly _filtroProfesorId = signal<number | null>(null);
	private readonly _filtroDiaSemana = signal<DiaSemana | null>(null);
	private readonly _filtroEstadoActivo = signal<boolean | null>(null);
	private readonly _vistaActual = signal<HorarioVistaType>('lista');
	private readonly _page = signal(1);
	private readonly _pageSize = signal(10);
	private readonly _totalRecords = signal(0);

	/**
	 * Referencia a los horarios fuente (inyectada por el store principal).
	 * Es un signal para que los computed dependan de él reactivamente.
	 */
	private readonly _horariosSource = signal<HorarioResponseDto[]>([]);
	// #endregion

	// #region Lecturas públicas (readonly)
	readonly filtroSalonId = this._filtroSalonId.asReadonly();
	readonly filtroProfesorId = this._filtroProfesorId.asReadonly();
	readonly filtroDiaSemana = this._filtroDiaSemana.asReadonly();
	readonly filtroEstadoActivo = this._filtroEstadoActivo.asReadonly();
	readonly vistaActual = this._vistaActual.asReadonly();
	readonly page = this._page.asReadonly();
	readonly pageSize = this._pageSize.asReadonly();
	readonly totalRecords = this._totalRecords.asReadonly();
	// #endregion

	// #region Computed - Filtros
	readonly horariosFiltrados = computed(() => {
		const horarios = this._horariosSource();
		const salonId = this._filtroSalonId();
		const profesorId = this._filtroProfesorId();
		const diaSemana = this._filtroDiaSemana();
		const estadoActivo = this._filtroEstadoActivo();
		const vistaActual = this._vistaActual();

		return horarios.filter((h) => {
			if (salonId !== null && h.salonId !== salonId) return false;
			if (profesorId !== null && h.profesorId !== profesorId) return false;
			// Si está en vista semanal, no filtrar por día
			if (vistaActual !== 'semanal' && diaSemana !== null && h.diaSemana !== diaSemana) return false;
			if (estadoActivo !== null && h.estado !== estadoActivo) return false;
			return true;
		});
	});

	/** La vista semanal solo está disponible cuando hay un salón o profesor seleccionado */
	readonly vistaSemanalHabilitada = computed(() => {
		return this._filtroSalonId() !== null || this._filtroProfesorId() !== null;
	});

	/** El filtro de día está habilitado solo en vista lista */
	readonly filtroDiaSemanaHabilitado = computed(() => this._vistaActual() === 'lista');

	readonly hasFilters = computed(() =>
		this._filtroSalonId() !== null ||
		this._filtroProfesorId() !== null ||
		this._filtroDiaSemana() !== null ||
		this._filtroEstadoActivo() !== null,
	);
	// #endregion

	// #region Computed - Vista Semanal
	readonly horariosSemanales = computed(() => buildWeeklyBlocks(this.horariosFiltrados()));
	// #endregion

	// #region Comandos - Fuente de datos
	setHorariosSource(horarios: HorarioResponseDto[]): void {
		this._horariosSource.set(horarios);
	}
	// #endregion

	// #region Comandos - Filtros
	setFiltroSalon(salonId: number | null): void {
		this._filtroSalonId.set(salonId);
	}

	setFiltroProfesor(profesorId: number | null): void {
		this._filtroProfesorId.set(profesorId);
	}

	setFiltroDiaSemana(diaSemana: DiaSemana | null): void {
		this._filtroDiaSemana.set(diaSemana);
	}

	setFiltroEstadoActivo(estadoActivo: boolean | null): void {
		this._filtroEstadoActivo.set(estadoActivo);
	}

	clearFiltros(): void {
		this._filtroSalonId.set(null);
		this._filtroProfesorId.set(null);
		this._filtroDiaSemana.set(null);
		this._filtroEstadoActivo.set(null);
		this._page.set(1);
	}
	// #endregion

	// #region Comandos - Vista
	setVistaActual(vista: HorarioVistaType): void {
		this._vistaActual.set(vista);
		// Si cambia a vista semanal, limpiar filtro de día
		if (vista === 'semanal') {
			this._filtroDiaSemana.set(null);
		}
	}
	// #endregion

	// #region Comandos - Paginación
	setPaginationData(page: number, pageSize: number, totalRecords: number): void {
		this._page.set(page);
		this._pageSize.set(pageSize);
		this._totalRecords.set(totalRecords);
	}
	// #endregion
}

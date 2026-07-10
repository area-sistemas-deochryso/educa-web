import { computed, Injectable, signal } from '@angular/core';

import {
	type DiaSemana,
	type HorarioCompletitudFiltro,
	type HorarioResponseDto,
	type HorarioVistaType,
	type ScheduleEntityItem,
} from '../models/horario.interface';
import { buildWeeklyBlocks } from '../helpers/horario-time.utils';

@Injectable({ providedIn: 'root' })
export class SchedulesFilterStore {
	// #region Estado privado
	private readonly _filtroSalonId = signal<number | null>(null);
	private readonly _filtroProfesorId = signal<number | null>(null);
	private readonly _filtroDiaSemana = signal<DiaSemana | null>(null);
	private readonly _filtroEstadoActivo = signal<boolean | null>(null);
	private readonly _filtroCompletitud = signal<HorarioCompletitudFiltro | null>(null);
	private readonly _vistaActual = signal<HorarioVistaType>('salon');
	private readonly _selectedEntityId = signal<number | null>(null);
	private readonly _page = signal(1);
	private readonly _pageSize = signal(10);
	private readonly _totalRecords = signal(0);

	private readonly _horariosSource = signal<HorarioResponseDto[]>([]);
	// #endregion

	// #region Lecturas públicas (readonly)
	readonly filtroSalonId = this._filtroSalonId.asReadonly();
	readonly filtroProfesorId = this._filtroProfesorId.asReadonly();
	readonly filtroDiaSemana = this._filtroDiaSemana.asReadonly();
	readonly filtroEstadoActivo = this._filtroEstadoActivo.asReadonly();
	readonly filtroCompletitud = this._filtroCompletitud.asReadonly();
	readonly vistaActual = this._vistaActual.asReadonly();
	readonly selectedEntityId = this._selectedEntityId.asReadonly();
	readonly page = this._page.asReadonly();
	readonly pageSize = this._pageSize.asReadonly();
	readonly totalRecords = this._totalRecords.asReadonly();
	// #endregion

	// #region Computed - Filtros
	readonly horariosFiltrados = computed(() => {
		const horarios = this._horariosSource();
		const estadoActivo = this._filtroEstadoActivo();
		const completitud = this._filtroCompletitud();

		return horarios.filter((h) => {
			if (estadoActivo !== null && h.estado !== estadoActivo) return false;
			if (completitud === 'sinProfesor' && h.profesorId !== null) return false;
			if (completitud === 'sinEstudiantes' && h.cantidadEstudiantes !== 0) return false;
			return true;
		});
	});

	readonly hasFilters = computed(
		() => this._filtroEstadoActivo() !== null || this._filtroCompletitud() !== null,
	);
	// #endregion

	// #region Computed - Entity lists
	readonly salonEntities = computed<ScheduleEntityItem[]>(() => {
		const horarios = this.horariosFiltrados();
		const salonMap = new Map<number, { label: string; items: HorarioResponseDto[] }>();

		for (const h of horarios) {
			const existing = salonMap.get(h.salonId);
			if (existing) {
				existing.items.push(h);
			} else {
				salonMap.set(h.salonId, { label: h.salonDescripcion, items: [h] });
			}
		}

		return Array.from(salonMap.entries()).map(([id, data]) => ({
			id,
			label: data.label,
			totalSchedules: data.items.length,
			withProfesor: data.items.filter((h) => h.profesorId !== null).length,
			hasConflicts: this.hasSalonConflicts(data.items),
		}));
	});

	readonly profesorEntities = computed<ScheduleEntityItem[]>(() => {
		const horarios = this.horariosFiltrados();
		const profMap = new Map<number, { label: string; items: HorarioResponseDto[] }>();

		for (const h of horarios) {
			if (h.profesorId === null) continue;
			const existing = profMap.get(h.profesorId);
			if (existing) {
				existing.items.push(h);
			} else {
				profMap.set(h.profesorId, { label: h.profesorNombreCompleto || 'Sin nombre', items: [h] });
			}
		}

		return Array.from(profMap.entries()).map(([id, data]) => ({
			id,
			label: data.label,
			totalSchedules: data.items.length,
			withProfesor: data.items.length,
			hasConflicts: this.hasProfesorConflicts(data.items),
		}));
	});
	// #endregion

	// #region Computed - Entity-filtered blocks
	readonly entityFilteredHorarios = computed(() => {
		const vista = this._vistaActual();
		const entityId = this._selectedEntityId();
		const horarios = this.horariosFiltrados();

		if (entityId === null) return [];
		if (vista === 'salon') return horarios.filter((h) => h.salonId === entityId);
		if (vista === 'profesor') return horarios.filter((h) => h.profesorId === entityId);
		return horarios;
	});

	readonly entityWeeklyBlocks = computed(() => buildWeeklyBlocks(this.entityFilteredHorarios()));

	/** Context salon ID for pre-filling creation form from empty slot clicks. */
	readonly contextSalonId = computed(() => {
		if (this._vistaActual() === 'salon') return this._selectedEntityId();
		return null;
	});
	// #endregion

	// #region Computed - Legacy compatibility
	readonly horariosSemanales = computed(() => buildWeeklyBlocks(this.horariosFiltrados()));

	readonly vistaSemanalHabilitada = computed(() => this._selectedEntityId() !== null);

	readonly filtroDiaSemanaHabilitado = computed(() => false);
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

	setFiltroCompletitud(completitud: HorarioCompletitudFiltro | null): void {
		this._filtroCompletitud.set(completitud);
	}

	clearFiltros(): void {
		this._filtroEstadoActivo.set(null);
		this._filtroCompletitud.set(null);
		this._page.set(1);
	}
	// #endregion

	// #region Comandos - Vista
	setVistaActual(vista: HorarioVistaType): void {
		this._vistaActual.set(vista);
		this._selectedEntityId.set(null);
	}

	selectEntity(entityId: number): void {
		this._selectedEntityId.set(entityId);
	}
	// #endregion

	// #region Comandos - Paginación
	setPaginationData(page: number, pageSize: number, totalRecords: number): void {
		this._page.set(page);
		this._pageSize.set(pageSize);
		this._totalRecords.set(totalRecords);
	}
	// #endregion

	// #region Helpers privados
	private hasSalonConflicts(salonHorarios: HorarioResponseDto[]): boolean {
		const active = salonHorarios.filter((h) => h.estado);
		for (let i = 0; i < active.length; i++) {
			for (let j = i + 1; j < active.length; j++) {
				if (active[i].diaSemana !== active[j].diaSemana) continue;
				if (active[i].horaInicio < active[j].horaFin && active[j].horaInicio < active[i].horaFin) {
					return true;
				}
			}
		}
		return false;
	}

	private hasProfesorConflicts(profHorarios: HorarioResponseDto[]): boolean {
		const active = profHorarios.filter((h) => h.estado);
		for (let i = 0; i < active.length; i++) {
			for (let j = i + 1; j < active.length; j++) {
				if (active[i].diaSemana !== active[j].diaSemana) continue;
				if (active[i].horaInicio < active[j].horaFin && active[j].horaInicio < active[i].horaFin) {
					return true;
				}
			}
		}
		return false;
	}
	// #endregion
}

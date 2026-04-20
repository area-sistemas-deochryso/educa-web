import { Injectable, computed, signal } from '@angular/core';

import { AsistenciaProfesorDto, AttendanceStatus } from '@data/models/attendance.models';
import { VIEW_MODE, ViewMode } from '@features/intranet/components/attendance/attendance-header/attendance-header.component';

/**
 * Conteo de estados de asistencia para el rango mostrado.
 */
export interface AsistenciaPropiaConteo {
	total: number;
	asistio: number;
	tardanza: number;
	falta: number;
	justificado: number;
	pendiente: number;
}

/**
 * Store de lectura para la vista self-service "Mi asistencia"
 * del profesor autenticado (Plan 21 Chat 4 + Chat 6 modo día/mes).
 *
 * Soporta dos modos:
 * - `mes`: lista del mes completo (default).
 * - `dia`: detalle de un solo día — la colección `asistencias` trae 0 o 1 items.
 *
 * Root-scoped: el estado persiste mientras el profesor está autenticado; al
 * logout se recarga la app (AuthStore + SessionCoordinator) y el store se resetea.
 */
@Injectable({ providedIn: 'root' })
export class AsistenciaPropiaStore {
	// #region Estado privado

	private readonly _detalle = signal<AsistenciaProfesorDto | null>(null);
	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);
	private readonly _viewMode = signal<ViewMode>(VIEW_MODE.Mes);
	private readonly _selectedMes = signal<number>(new Date().getMonth() + 1);
	private readonly _selectedAnio = signal<number>(new Date().getFullYear());
	private readonly _selectedDate = signal<Date>(new Date());

	// #endregion
	// #region Lecturas públicas

	readonly detalle = this._detalle.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly viewMode = this._viewMode.asReadonly();
	readonly selectedMes = this._selectedMes.asReadonly();
	readonly selectedAnio = this._selectedAnio.asReadonly();
	readonly selectedDate = this._selectedDate.asReadonly();

	// #endregion
	// #region Computed

	readonly asistencias = computed(() => this._detalle()?.asistencias ?? []);

	readonly hasData = computed(() => this.asistencias().length > 0);

	readonly conteo = computed<AsistenciaPropiaConteo>(() => {
		const items = this.asistencias();
		const acc: AsistenciaPropiaConteo = {
			total: items.length,
			asistio: 0,
			tardanza: 0,
			falta: 0,
			justificado: 0,
			pendiente: 0,
		};
		for (const a of items) {
			switch (a.estadoCodigo as AttendanceStatus) {
				case 'A':
					acc.asistio++;
					break;
				case 'T':
					acc.tardanza++;
					break;
				case 'F':
					acc.falta++;
					break;
				case 'J':
					acc.justificado++;
					break;
				case '-':
					acc.pendiente++;
					break;
				// 'X' (antes de registro) no suma a ningún contador
			}
		}
		return acc;
	});

	/**
	 * Etiqueta legible del periodo visible.
	 * - Modo mes: "Abril 2026".
	 * - Modo día: "15 de abril de 2026".
	 */
	readonly selectedLabel = computed(() => {
		if (this._viewMode() === VIEW_MODE.Dia) {
			const d = this._selectedDate();
			return `${d.getDate()} de ${MES_LABELS[d.getMonth()]?.toLowerCase()} de ${d.getFullYear()}`;
		}
		const mes = this._selectedMes();
		const anio = this._selectedAnio();
		const nombre = MES_LABELS[mes - 1] ?? '';
		return `${nombre} ${anio}`;
	});

	// #endregion
	// #region Mutaciones

	setDetalle(detalle: AsistenciaProfesorDto | null): void {
		this._detalle.set(detalle);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setError(error: string | null): void {
		this._error.set(error);
	}

	setViewMode(mode: ViewMode): void {
		this._viewMode.set(mode);
	}

	setMes(mes: number): void {
		this._selectedMes.set(mes);
	}

	setAnio(anio: number): void {
		this._selectedAnio.set(anio);
	}

	setDate(date: Date): void {
		this._selectedDate.set(date);
	}

	// #endregion
}

const MES_LABELS = [
	'Enero',
	'Febrero',
	'Marzo',
	'Abril',
	'Mayo',
	'Junio',
	'Julio',
	'Agosto',
	'Septiembre',
	'Octubre',
	'Noviembre',
	'Diciembre',
];

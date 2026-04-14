import { computed, inject, Injectable, signal } from '@angular/core';

import { CursoListaDto, CursoOption, CursosPorNivel } from '../models/curso.interface';
import { filterSalonesDisponibles } from '../helpers/horario-conflict.utils';
import {
	mapSalonesToOptions,
	mapCursosToOptions,
	groupCursosByNivel,
	mapProfesToOptions,
} from '../helpers/horario-mapping.utils';
import { type HorarioResponseDto } from '../models/horario.interface';
import { ProfesorListDto, ProfesorOption } from '../models/profesor.interface';
import { SalonListDto, SalonOption } from '../models/salon.interface';
import { SchedulesFormStore } from './horarios-form.store';

/**
 * Sub-store: opciones para dropdowns del formulario de horarios.
 * Encapsula salones/cursos/profesores disponibles y sus computed memoizados.
 * Recibe los horarios (para detección de conflictos de salón) vía setter.
 */
@Injectable({ providedIn: 'root' })
export class SchedulesOptionsStore {
	private readonly formStore = inject(SchedulesFormStore);

	// #region Estado privado
	private readonly _salonesDisponibles = signal<SalonListDto[]>([]);
	private readonly _cursosDisponibles = signal<CursoListaDto[]>([]);
	private readonly _profesoresDisponibles = signal<ProfesorListDto[]>([]);
	private readonly _horariosForConflict = signal<HorarioResponseDto[]>([]);
	private readonly _optionsLoading = signal(false);
	// #endregion

	// #region Lecturas públicas
	readonly optionsLoading = this._optionsLoading.asReadonly();
	// #endregion

	// #region Computed - Salones
	private readonly activeSalones = computed(() =>
		this._salonesDisponibles().filter((s) => s.estado),
	);

	private readonly activeSalonesAsOptions = computed<SalonOption[]>(() =>
		mapSalonesToOptions(this.activeSalones()),
	);

	/**
	 * Opciones de salones disponibles (sin conflicto de horario).
	 * Si no hay día/hora seleccionados, devuelve todos los activos (memoizado).
	 * Si hay día/hora, filtra por conflicto de horario.
	 */
	readonly salonesOptions = computed<SalonOption[]>(() => {
		const formData = this.formStore.formData();

		if (!formData.diaSemana || !formData.horaInicio || !formData.horaFin) {
			return this.activeSalonesAsOptions();
		}

		const disponibles = filterSalonesDisponibles(
			this.activeSalones(),
			this._horariosForConflict(),
			formData,
			this.formStore.editingId(),
		);

		return mapSalonesToOptions(disponibles);
	});
	// #endregion

	// #region Computed - Cursos
	private readonly activeCursos = computed(() =>
		this._cursosDisponibles().filter((c) => c.estado),
	);

	readonly cursosOptions = computed<CursoOption[]>(() => mapCursosToOptions(this.activeCursos()));

	readonly cursosPorNivel = computed<CursosPorNivel>(() =>
		groupCursosByNivel(this.cursosOptions()),
	);
	// #endregion

	// #region Computed - Profesores
	private readonly activeProfesores = computed(() =>
		this._profesoresDisponibles().filter((p) => p.estado),
	);

	readonly profesoresOptions = computed<ProfesorOption[]>(() =>
		mapProfesToOptions(this.activeProfesores()),
	);
	// #endregion

	// #region Comandos
	setSalonesDisponibles(salones: SalonListDto[]): void {
		this._salonesDisponibles.set(salones);
	}

	setCursosDisponibles(cursos: CursoListaDto[]): void {
		this._cursosDisponibles.set(cursos);
	}

	setProfesoresDisponibles(profesores: ProfesorListDto[]): void {
		this._profesoresDisponibles.set(profesores);
	}

	setOptionsLoading(loading: boolean): void {
		this._optionsLoading.set(loading);
	}

	/** Sincroniza la fuente de horarios para el cálculo de conflictos de salón */
	setHorariosSource(horarios: HorarioResponseDto[]): void {
		this._horariosForConflict.set(horarios);
	}
	// #endregion
}

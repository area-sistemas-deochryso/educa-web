import { computed, inject, Injectable, signal } from '@angular/core';

import { type ModoAsignacion, type ProfesorCursoListaDto, resolveModoAsignacion } from '@data/models';
import { esVerano, filtrarPorPeriodoAcademico, periodoActual } from '@shared/models';
import { CursoListaDto, CursoOption, CursosPorNivel } from '../models/curso.interface';
import {
	mapSalonesToOptions,
	mapCursosToOptions,
	groupCursosByNivel,
	mapProfesToOptions,
} from '../helpers/horario-mapping.utils';
import { ProfesorListDto, ProfesorOption } from '../models/profesor.interface';
import { SalonListDto, SalonOption } from '../models/salon.interface';
import { SchedulesFormStore } from './horarios-form.store';

/**
 * Sub-store: opciones para dropdowns del formulario de horarios.
 * Encapsula salones/cursos/profesores disponibles y sus computed memoizados.
 */
@Injectable({ providedIn: 'root' })
export class SchedulesOptionsStore {
	private readonly formStore = inject(SchedulesFormStore);

	// #region Estado privado
	private readonly _salonesDisponibles = signal<SalonListDto[]>([]);
	private readonly _cursosDisponibles = signal<CursoListaDto[]>([]);
	private readonly _profesoresDisponibles = signal<ProfesorListDto[]>([]);
	private readonly _optionsLoading = signal(false);
	private readonly _esVerano = signal(esVerano(periodoActual()));
	/** Asignaciones ProfesorCurso activas para el curso seleccionado en el form. */
	private readonly _profesoresCurso = signal<ProfesorCursoListaDto[]>([]);
	// #endregion

	// #region Lecturas públicas
	readonly optionsLoading = this._optionsLoading.asReadonly();
	readonly esVerano = this._esVerano.asReadonly();
	// #endregion

	// #region Computed - Salones
	private readonly activeSalones = computed(() =>
		this._salonesDisponibles().filter((s) => s.estado),
	);

	private readonly periodFilteredSalones = computed(() =>
		filtrarPorPeriodoAcademico(
			this.activeSalones(),
			{ tipo: this._esVerano() ? 'verano' : 'regular', anio: new Date().getFullYear() },
			(s) => s.seccion,
		),
	);

	private readonly activeSalonesAsOptions = computed<SalonOption[]>(() =>
		mapSalonesToOptions(this.periodFilteredSalones()),
	);

	readonly salonesOptions = computed<SalonOption[]>(() => this.activeSalonesAsOptions());
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

	// #region Computed - Modo de asignación
	/** Salón seleccionado en el formulario (con gradoOrden para resolver modo). */
	private readonly salonSeleccionado = computed<SalonOption | null>(() => {
		const salonId = this.formStore.formData().salonId;
		if (!salonId) return null;
		return this.salonesOptions().find((s) => s.value === salonId) ?? null;
	});

	/** Modo de asignación del salón seleccionado en el formulario. */
	readonly modoAsignacion = computed<ModoAsignacion | null>(() => {
		const salon = this.salonSeleccionado();
		if (!salon) return null;
		return resolveModoAsignacion(salon.gradoOrden, salon.seccion);
	});

	/**
	 * Profesores filtrados según el modo de asignación:
	 * - TutorPleno: solo el tutor del salón
	 * - PorCurso: profesores con ProfesorCurso activo para el curso seleccionado
	 * - Flexible: todos los profesores activos
	 * - null (sin salón): todos los profesores activos
	 */
	readonly profesoresParaAsignacion = computed<ProfesorOption[]>(() => {
		const modo = this.modoAsignacion();
		const allProfesores = this.profesoresOptions();

		if (!modo || modo === 'Flexible') return allProfesores;

		if (modo === 'TutorPleno') {
			const salon = this.salonSeleccionado();
			if (!salon?.tutorNombre) return [];
			// Filtrar por nombre del tutor (match parcial por nombre completo)
			return allProfesores.filter((p) => p.label === salon.tutorNombre);
		}

		// PorCurso: filtrar por profesores asignados al curso
		const profesoresCurso = this._profesoresCurso();
		if (profesoresCurso.length === 0) return [];
		const profesorIds = new Set(profesoresCurso.map((pc) => pc.profesorId));
		return allProfesores.filter((p) => profesorIds.has(p.value));
	});

	/** Resuelve el modo de asignación para un salonId arbitrario (usado por el drawer). */
	resolveModoForSalon(salonId: number): ModoAsignacion | null {
		const salon = this._salonesDisponibles().find((s) => s.salonId === salonId);
		if (!salon) return null;
		return resolveModoAsignacion(salon.gradoOrden, salon.seccion);
	}
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

	setEsVerano(value: boolean): void {
		this._esVerano.set(value);
	}

	/** Establece los ProfesorCurso activos para el curso seleccionado (modo PorCurso). */
	setProfesoresCurso(profesoresCurso: ProfesorCursoListaDto[]): void {
		this._profesoresCurso.set(profesoresCurso);
	}

	clearProfesoresCurso(): void {
		this._profesoresCurso.set([]);
	}
	// #endregion
}

import { Injectable, computed, signal } from '@angular/core';
import {
	HorarioProfesorDto,
	SalonTutoriaDto,
	ProfesorCurso,
	ProfesorSalon,
	SalonCursoInfo,
	ProfesorMisSalonesConEstudiantesDto,
	ProfesorSalonConEstudiantesDto,
	ProfesorEstudianteSalonDto,
	SalonNotasResumenDto,
	VistaPromedio,
	recalcularPromedios,
} from '../models';

/** Salón enriquecido con datos de estudiantes */
export interface ProfesorSalonConEstudiantes extends ProfesorSalon {
	cantidadEstudiantes: number;
	estudiantes: ProfesorEstudianteSalonDto[];
}

interface ProfesorStoreState {
	horarios: HorarioProfesorDto[];
	salonTutoria: SalonTutoriaDto | null;
	misEstudiantes: ProfesorMisSalonesConEstudiantesDto | null;
	loading: boolean;
	error: string | null;
	// #region Dialog state
	salonDialogVisible: boolean;
	salonDialogLoading: boolean;
	selectedSalon: ProfesorSalonConEstudiantes | null;
	// #endregion
	// #region Notas salón state
	notasSalon: SalonNotasResumenDto | null;
	notasSalonLoading: boolean;
	notasCursoId: number | null;
	notasVistaActual: VistaPromedio;
	// #endregion
}

const initialState: ProfesorStoreState = {
	horarios: [],
	salonTutoria: null,
	misEstudiantes: null,
	loading: false,
	error: null,
	salonDialogVisible: false,
	salonDialogLoading: false,
	selectedSalon: null,
	notasSalon: null,
	notasSalonLoading: false,
	notasCursoId: null,
	notasVistaActual: 'semana',
};

@Injectable({ providedIn: 'root' })
export class ProfesorStore {
	// #region Estado privado
	private readonly _state = signal<ProfesorStoreState>(initialState);

	// #endregion
	// #region Lecturas públicas
	readonly horarios = computed(() => this._state().horarios);
	readonly salonTutoria = computed(() => this._state().salonTutoria);
	readonly misEstudiantes = computed(() => this._state().misEstudiantes);
	readonly loading = computed(() => this._state().loading);
	readonly error = computed(() => this._state().error);
	readonly salonDialogVisible = computed(() => this._state().salonDialogVisible);
	readonly salonDialogLoading = computed(() => this._state().salonDialogLoading);
	readonly selectedSalon = computed(() => this._state().selectedSalon);
	readonly notasSalon = computed(() => this._state().notasSalon);
	readonly notasSalonLoading = computed(() => this._state().notasSalonLoading);
	readonly notasCursoId = computed(() => this._state().notasCursoId);
	readonly notasVistaActual = computed(() => this._state().notasVistaActual);

	// #endregion
	// #region Computed - Cursos únicos
	readonly cursos = computed<ProfesorCurso[]>(() => {
		const horarios = this.horarios();
		const cursosMap = new Map<number, ProfesorCurso>();

		for (const h of horarios) {
			const existing = cursosMap.get(h.cursoId);
			if (existing) {
				if (!existing.salones.includes(h.salonDescripcion)) {
					existing.salones.push(h.salonDescripcion);
				}
			} else {
				cursosMap.set(h.cursoId, {
					cursoId: h.cursoId,
					cursoNombre: h.cursoNombre,
					salones: [h.salonDescripcion],
				});
			}
		}

		return Array.from(cursosMap.values());
	});

	// #endregion
	// #region Computed - Salones únicos (tutoría primero, sin duplicados)
	readonly salones = computed<ProfesorSalon[]>(() => {
		const horarios = this.horarios();
		const tutoria = this.salonTutoria();
		const salonesMap = new Map<number, ProfesorSalon>();

		// Agregar salón de tutoría primero (si existe)
		if (tutoria) {
			salonesMap.set(tutoria.salonId, {
				salonId: tutoria.salonId,
				salonDescripcion: `${tutoria.grado} - ${tutoria.seccion}`,
				cursos: [],
				esTutor: true,
			});
		}

		// Agregar salones de horarios (sin duplicar cursos)
		for (const h of horarios) {
			const existing = salonesMap.get(h.salonId);
			const cursoInfo: SalonCursoInfo = { nombre: h.cursoNombre, horarioId: h.id };

			if (existing) {
				if (!existing.cursos.some((c) => c.nombre === h.cursoNombre)) {
					existing.cursos.push(cursoInfo);
				}
			} else {
				salonesMap.set(h.salonId, {
					salonId: h.salonId,
					salonDescripcion: h.salonDescripcion,
					cursos: [cursoInfo],
					esTutor: false,
				});
			}
		}

		// Tutoría primero, luego el resto
		const all = Array.from(salonesMap.values());
		return all.sort((a, b) => (a.esTutor === b.esTutor ? 0 : a.esTutor ? -1 : 1));
	});

	// #endregion
	// #region Computed - Salones con estudiantes (merge)
	readonly salonesConEstudiantes = computed<ProfesorSalonConEstudiantes[]>(() => {
		const salones = this.salones();
		const misEst = this.misEstudiantes();
		if (!misEst) return salones.map((s) => ({ ...s, cantidadEstudiantes: 0, estudiantes: [] }));

		const estudiantesMap = new Map<number, ProfesorSalonConEstudiantesDto>();
		for (const salon of misEst.salones) {
			estudiantesMap.set(salon.salonId, salon);
		}

		return salones.map((s) => {
			const data = estudiantesMap.get(s.salonId);
			return {
				...s,
				cantidadEstudiantes: data?.cantidadEstudiantes ?? 0,
				estudiantes: data?.estudiantes ?? [],
			};
		});
	});

	// #endregion
	// #region Computed - Horarios agrupados por día
	readonly horariosPorDia = computed(() => {
		const horarios = this.horarios();
		const grouped = new Map<string, HorarioProfesorDto[]>();

		for (const h of horarios) {
			const dia = h.diaSemanaDescripcion;
			const list = grouped.get(dia) ?? [];
			list.push(h);
			grouped.set(dia, list);
		}

		// Ordenar por horaInicio dentro de cada día
		for (const [, items] of grouped) {
			items.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
		}

		return grouped;
	});

	// #endregion
	// #region Computed - Cursos por salón seleccionado (con IDs)
	readonly cursosForSelectedSalon = computed<{ label: string; value: number }[]>(() => {
		const salon = this.selectedSalon();
		if (!salon) return [];
		const horarios = this.horarios();
		const map = new Map<number, string>();
		for (const h of horarios) {
			if (h.salonId === salon.salonId && !map.has(h.cursoId)) {
				map.set(h.cursoId, h.cursoNombre);
			}
		}
		return Array.from(map.entries()).map(([value, label]) => ({ label, value }));
	});

	// #endregion
	// #region ViewModel
	readonly vm = computed(() => ({
		horarios: this.horarios(),
		horariosPorDia: this.horariosPorDia(),
		salonTutoria: this.salonTutoria(),
		cursos: this.cursos(),
		salones: this.salones(),
		salonesConEstudiantes: this.salonesConEstudiantes(),
		loading: this.loading(),
		error: this.error(),
		isEmpty: this.horarios().length === 0,
		salonDialogVisible: this.salonDialogVisible(),
		salonDialogLoading: this.salonDialogLoading(),
		selectedSalon: this.selectedSalon(),
		notasSalon: this.notasSalon(),
		notasSalonLoading: this.notasSalonLoading(),
		notasCursoId: this.notasCursoId(),
		notasVistaActual: this.notasVistaActual(),
		cursosForSelectedSalon: this.cursosForSelectedSalon(),
	}));

	// #endregion
	// #region Comandos de mutación
	setHorarios(horarios: HorarioProfesorDto[]): void {
		this._state.update((s) => ({ ...s, horarios }));
	}

	setSalonTutoria(salonTutoria: SalonTutoriaDto | null): void {
		this._state.update((s) => ({ ...s, salonTutoria }));
	}

	setMisEstudiantes(misEstudiantes: ProfesorMisSalonesConEstudiantesDto): void {
		this._state.update((s) => ({ ...s, misEstudiantes }));
	}

	setLoading(loading: boolean): void {
		this._state.update((s) => ({ ...s, loading }));
	}

	setError(error: string | null): void {
		this._state.update((s) => ({ ...s, error }));
	}

	clearError(): void {
		this._state.update((s) => ({ ...s, error: null }));
	}

	// #endregion
	// #region Dialog commands
	openSalonDialog(salon: ProfesorSalonConEstudiantes): void {
		this._state.update((s) => ({ ...s, salonDialogVisible: true, salonDialogLoading: true, selectedSalon: salon }));
	}

	setSalonDialogLoading(loading: boolean): void {
		this._state.update((s) => ({ ...s, salonDialogLoading: loading }));
	}

	setSelectedSalonEstudiantes(salon: ProfesorSalonConEstudiantes): void {
		this._state.update((s) => ({ ...s, selectedSalon: salon, salonDialogLoading: false }));
	}

	closeSalonDialog(): void {
		this._state.update((s) => ({
			...s,
			salonDialogVisible: false,
			salonDialogLoading: false,
			selectedSalon: null,
			notasSalon: null,
			notasSalonLoading: false,
			notasCursoId: null,
		}));
	}

	// #endregion
	// #region Notas salón commands
	setNotasSalon(data: SalonNotasResumenDto | null): void {
		this._state.update((s) => ({ ...s, notasSalon: data }));
	}

	setNotasSalonLoading(loading: boolean): void {
		this._state.update((s) => ({ ...s, notasSalonLoading: loading }));
	}

	setNotasCursoId(cursoId: number | null): void {
		this._state.update((s) => ({ ...s, notasCursoId: cursoId }));
	}

	setNotasVistaActual(vista: VistaPromedio): void {
		this._state.update((s) => ({ ...s, notasVistaActual: vista }));
	}

	/** Quirurgical update: update/delete a single nota and recalculate promedios */
	updateNotaEstudiante(estudianteId: number, calificacionId: number, nota: number | null): void {
		this._state.update((s) => {
			if (!s.notasSalon) return s;
			const { evaluaciones, periodos } = s.notasSalon;

			return {
				...s,
				notasSalon: {
					...s.notasSalon,
					estudiantes: s.notasSalon.estudiantes.map((est) => {
						if (est.estudianteId !== estudianteId) return est;

						// Update notas array
						let updatedNotas;
						if (nota === null) {
							updatedNotas = est.notas.filter((n) => n.calificacionId !== calificacionId);
						} else {
							const exists = est.notas.some((n) => n.calificacionId === calificacionId);
							updatedNotas = exists
								? est.notas.map((n) => (n.calificacionId === calificacionId ? { ...n, nota } : n))
								: [...est.notas, { calificacionId, nota }];
						}

						return {
							...est,
							notas: updatedNotas,
							promedios: recalcularPromedios(updatedNotas, evaluaciones, periodos),
						};
					}),
				},
			};
		});
	}

	reset(): void {
		this._state.set(initialState);
	}
	// #endregion
}

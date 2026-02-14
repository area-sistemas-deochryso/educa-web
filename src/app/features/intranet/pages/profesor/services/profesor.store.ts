import { Injectable, computed, signal } from '@angular/core';
import {
	HorarioProfesorDto,
	SalonTutoriaDto,
	ProfesorCurso,
	ProfesorSalon,
	ProfesorMisSalonesConEstudiantesDto,
	ProfesorSalonConEstudiantesDto,
	ProfesorEstudianteSalonDto,
} from '../models';

/** SalÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n enriquecido con datos de estudiantes */
export interface ProfesorSalonConEstudiantes extends ProfesorSalon {
	cantidadEstudiantes: number;
	estudiantes: ProfesorEstudianteSalonDto[];
}

interface ProfesorStoreState {
	horarios: HorarioProfesorDto[];
	salonTutoria: SalonTutoriaDto | null;
	misEstudiantes: ProfesorMisSalonesConEstudiantesDto | null;
	loading: boolean;
	// #region Dialog state
	salonDialogVisible: boolean;
	salonDialogLoading: boolean;
	selectedSalon: ProfesorSalonConEstudiantes | null;
	// #endregion
}

const initialState: ProfesorStoreState = {
	horarios: [],
	salonTutoria: null,
	misEstudiantes: null,
	loading: false,
	salonDialogVisible: false,
	salonDialogLoading: false,
	selectedSalon: null,
};

@Injectable({ providedIn: 'root' })
export class ProfesorStore {
	// #region Estado privado
	private readonly _state = signal<ProfesorStoreState>(initialState);

	// #endregion
	// #region Lecturas pÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºblicas
	readonly horarios = computed(() => this._state().horarios);
	readonly salonTutoria = computed(() => this._state().salonTutoria);
	readonly misEstudiantes = computed(() => this._state().misEstudiantes);
	readonly loading = computed(() => this._state().loading);
	readonly salonDialogVisible = computed(() => this._state().salonDialogVisible);
	readonly salonDialogLoading = computed(() => this._state().salonDialogLoading);
	readonly selectedSalon = computed(() => this._state().selectedSalon);

	// #endregion
	// #region Computed - Cursos ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºnicos
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
	// #region Computed - Salones ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºnicos (tutorÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­a primero, sin duplicados)
	readonly salones = computed<ProfesorSalon[]>(() => {
		const horarios = this.horarios();
		const tutoria = this.salonTutoria();
		const salonesMap = new Map<number, ProfesorSalon>();

		// Agregar salÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n de tutorÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­a primero (si existe)
		if (tutoria) {
			salonesMap.set(tutoria.salonId, {
				salonId: tutoria.salonId,
				salonDescripcion: `${tutoria.grado} - ${tutoria.seccion}`,
				cursos: [],
				esTutor: true,
			});
		}

		// Agregar salones de horarios (sin duplicar)
		for (const h of horarios) {
			const existing = salonesMap.get(h.salonId);
			if (existing) {
				if (!existing.cursos.includes(h.cursoNombre)) {
					existing.cursos.push(h.cursoNombre);
				}
			} else {
				salonesMap.set(h.salonId, {
					salonId: h.salonId,
					salonDescripcion: h.salonDescripcion,
					cursos: [h.cursoNombre],
					esTutor: false,
				});
			}
		}

		// TutorÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­a primero, luego el resto
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
	// #region Computed - Horarios agrupados por dÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­a
	readonly horariosPorDia = computed(() => {
		const horarios = this.horarios();
		const grouped = new Map<string, HorarioProfesorDto[]>();

		for (const h of horarios) {
			const dia = h.diaSemanaDescripcion;
			const list = grouped.get(dia) ?? [];
			list.push(h);
			grouped.set(dia, list);
		}

		// Ordenar por horaInicio dentro de cada dÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­a
		for (const [, items] of grouped) {
			items.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
		}

		return grouped;
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
		isEmpty: this.horarios().length === 0,
		salonDialogVisible: this.salonDialogVisible(),
		salonDialogLoading: this.salonDialogLoading(),
		selectedSalon: this.selectedSalon(),
	}));

	// #endregion
	// #region Comandos de mutaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n
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
		this._state.update((s) => ({ ...s, salonDialogVisible: false, salonDialogLoading: false, selectedSalon: null }));
	}

	reset(): void {
		this._state.set(initialState);
	}
	// #endregion
}

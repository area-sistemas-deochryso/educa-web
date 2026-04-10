import { Injectable, signal, computed } from '@angular/core';
import {
	HorarioProfesorDto,
	EstudianteSalon,
	MiAsistenciaCursoResumenDto,
	EstudianteMisNotasDto,
	GruposResumenDto,
} from '../../models';

@Injectable({ providedIn: 'root' })
export class StudentClassroomsStore {
	// #region Estado privado
	private readonly _horarios = signal<HorarioProfesorDto[]>([]);
	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);

	// Dialog
	private readonly _dialogVisible = signal(false);
	private readonly _selectedSalonId = signal<number | null>(null);

	// Asistencia tab
	private readonly _asistenciaData = signal<MiAsistenciaCursoResumenDto | null>(null);
	private readonly _asistenciaLoading = signal(false);
	private readonly _asistenciaCursoId = signal<number | null>(null);

	// Grupos tab
	private readonly _gruposData = signal<GruposResumenDto | null>(null);
	private readonly _gruposLoading = signal(false);
	private readonly _gruposCursoId = signal<number | null>(null);

	// Notas tab
	private readonly _notasData = signal<EstudianteMisNotasDto[]>([]);
	private readonly _notasLoading = signal(false);
	// #endregion

	// #region Computed — Salones derivados de horarios
	readonly salones = computed<EstudianteSalon[]>(() => {
		const horarios = this._horarios();
		const map = new Map<number, EstudianteSalon>();

		for (const h of horarios) {
			if (!map.has(h.salonId)) {
				map.set(h.salonId, {
					salonId: h.salonId,
					salonDescripcion: h.salonDescripcion,
					cantidadEstudiantes: h.cantidadEstudiantes,
					cursos: [],
				});
			}
			const salon = map.get(h.salonId)!;
			const cursoExists = salon.cursos.some((c) => c.cursoId === h.cursoId);
			if (!cursoExists) {
				salon.cursos.push({
					cursoId: h.cursoId,
					cursoNombre: h.cursoNombre,
					horarioId: h.id,
				});
			}
		}

		return [...map.values()];
	});

	readonly selectedSalon = computed<EstudianteSalon | null>(() => {
		const id = this._selectedSalonId();
		if (!id) return null;
		return this.salones().find((s) => s.salonId === id) ?? null;
	});

	readonly cursosForSelectedSalon = computed(() => {
		const salon = this.selectedSalon();
		if (!salon) return [];
		return salon.cursos.map((c) => ({
			label: c.cursoNombre,
			value: c.horarioId,
		}));
	});
	// #endregion

	// #region Lecturas publicas
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly dialogVisible = this._dialogVisible.asReadonly();
	readonly asistenciaData = this._asistenciaData.asReadonly();
	readonly asistenciaLoading = this._asistenciaLoading.asReadonly();
	readonly asistenciaCursoId = this._asistenciaCursoId.asReadonly();
	readonly gruposData = this._gruposData.asReadonly();
	readonly gruposLoading = this._gruposLoading.asReadonly();
	readonly gruposCursoId = this._gruposCursoId.asReadonly();
	readonly notasData = this._notasData.asReadonly();
	readonly notasLoading = this._notasLoading.asReadonly();
	readonly isEmpty = computed(() => this.salones().length === 0);
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		salones: this.salones(),
		loading: this.loading(),
		error: this.error(),
		isEmpty: this.isEmpty(),
		dialogVisible: this.dialogVisible(),
		selectedSalon: this.selectedSalon(),
		cursosForSelectedSalon: this.cursosForSelectedSalon(),
		asistenciaData: this.asistenciaData(),
		asistenciaLoading: this.asistenciaLoading(),
		asistenciaCursoId: this.asistenciaCursoId(),
		gruposData: this.gruposData(),
		gruposLoading: this.gruposLoading(),
		gruposCursoId: this.gruposCursoId(),
		notasData: this.notasData(),
		notasLoading: this.notasLoading(),
	}));
	// #endregion

	// #region Comandos de datos
	setHorarios(horarios: HorarioProfesorDto[]): void {
		this._horarios.set(horarios);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setError(error: string | null): void {
		this._error.set(error);
	}

	setNotasData(notas: EstudianteMisNotasDto[]): void {
		this._notasData.set(notas);
	}

	setNotasLoading(loading: boolean): void {
		this._notasLoading.set(loading);
	}
	// #endregion

	// #region Comandos de asistencia
	setAsistenciaData(data: MiAsistenciaCursoResumenDto | null): void {
		this._asistenciaData.set(data);
	}

	setAsistenciaLoading(loading: boolean): void {
		this._asistenciaLoading.set(loading);
	}

	setAsistenciaCursoId(id: number | null): void {
		this._asistenciaCursoId.set(id);
	}
	// #endregion

	// #region Comandos de grupos
	setGruposData(data: GruposResumenDto | null): void {
		this._gruposData.set(data);
	}

	setGruposLoading(loading: boolean): void {
		this._gruposLoading.set(loading);
	}

	setGruposCursoId(id: number | null): void {
		this._gruposCursoId.set(id);
	}
	// #endregion

	// #region Comandos de UI
	openDialog(salonId: number): void {
		this._selectedSalonId.set(salonId);
		this._dialogVisible.set(true);
	}

	closeDialog(): void {
		this._dialogVisible.set(false);
		this._selectedSalonId.set(null);
		// Clear tab data
		this._asistenciaData.set(null);
		this._asistenciaCursoId.set(null);
		this._gruposData.set(null);
		this._gruposCursoId.set(null);
	}
	// #endregion
}

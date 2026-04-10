import { Injectable, computed, signal } from '@angular/core';
import { GrupoContenidoDto, GrupoEstudianteDto, EstudianteSinGrupoDto } from '../../models';

interface GruposState {
	contenidoId: number | null;
	grupos: GrupoContenidoDto[];
	estudiantesSinGrupo: EstudianteSinGrupoDto[];
	maxEstudiantesPorGrupo: number | null;
	loading: boolean;
	saving: boolean;
	noContenido: boolean;
	// #region Dialog state
	asignarDialogVisible: boolean;
	asignarGrupoId: number | null;
	confirmDialogVisible: boolean;
	// #endregion
}

const initialState: GruposState = {
	contenidoId: null,
	grupos: [],
	estudiantesSinGrupo: [],
	maxEstudiantesPorGrupo: null,
	loading: false,
	saving: false,
	noContenido: false,
	asignarDialogVisible: false,
	asignarGrupoId: null,
	confirmDialogVisible: false,
};

@Injectable({ providedIn: 'root' })
export class GruposStore {
	// #region Estado privado
	private readonly _state = signal<GruposState>(initialState);
	// #endregion

	// #region Lecturas publicas
	readonly contenidoId = computed(() => this._state().contenidoId);
	readonly grupos = computed(() => this._state().grupos);
	readonly estudiantesSinGrupo = computed(() => this._state().estudiantesSinGrupo);
	readonly maxEstudiantesPorGrupo = computed(() => this._state().maxEstudiantesPorGrupo);
	readonly loading = computed(() => this._state().loading);
	readonly saving = computed(() => this._state().saving);
	readonly noContenido = computed(() => this._state().noContenido);
	readonly asignarDialogVisible = computed(() => this._state().asignarDialogVisible);
	readonly asignarGrupoId = computed(() => this._state().asignarGrupoId);
	readonly confirmDialogVisible = computed(() => this._state().confirmDialogVisible);
	// #endregion

	// #region Computed
	readonly totalGrupos = computed(() => this.grupos().length);

	readonly totalEstudiantesEnGrupos = computed(() =>
		this.grupos().reduce((sum, g) => sum + g.estudiantes.length, 0),
	);

	readonly asignarGrupo = computed(() => {
		const id = this.asignarGrupoId();
		return id ? this.grupos().find((g) => g.id === id) ?? null : null;
	});
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		contenidoId: this.contenidoId(),
		grupos: this.grupos(),
		estudiantesSinGrupo: this.estudiantesSinGrupo(),
		maxEstudiantesPorGrupo: this.maxEstudiantesPorGrupo(),
		loading: this.loading(),
		saving: this.saving(),
		noContenido: this.noContenido(),
		totalGrupos: this.totalGrupos(),
		totalEstudiantesEnGrupos: this.totalEstudiantesEnGrupos(),
		asignarDialogVisible: this.asignarDialogVisible(),
		asignarGrupo: this.asignarGrupo(),
		confirmDialogVisible: this.confirmDialogVisible(),
	}));
	// #endregion

	// #region Comandos de mutacion
	setContenidoId(contenidoId: number | null): void {
		this._state.update((s) => ({ ...s, contenidoId }));
	}

	setGruposData(
		grupos: GrupoContenidoDto[],
		estudiantesSinGrupo: EstudianteSinGrupoDto[],
		maxEstudiantesPorGrupo: number | null,
	): void {
		this._state.update((s) => ({
			...s,
			grupos,
			estudiantesSinGrupo,
			maxEstudiantesPorGrupo,
			loading: false,
			noContenido: false,
		}));
	}

	setNoContenido(): void {
		this._state.update((s) => ({
			...s,
			contenidoId: null,
			grupos: [],
			estudiantesSinGrupo: [],
			maxEstudiantesPorGrupo: null,
			loading: false,
			noContenido: true,
		}));
	}

	setLoading(loading: boolean): void {
		this._state.update((s) => ({ ...s, loading }));
	}

	setSaving(saving: boolean): void {
		this._state.update((s) => ({ ...s, saving }));
	}

	addGrupo(grupo: GrupoContenidoDto): void {
		this._state.update((s) => ({
			...s,
			grupos: [...s.grupos, grupo],
		}));
	}

	updateGrupoNombre(grupoId: number, nombre: string): void {
		this._state.update((s) => ({
			...s,
			grupos: s.grupos.map((g) => (g.id === grupoId ? { ...g, nombre } : g)),
		}));
	}

	removeGrupo(grupoId: number): void {
		this._state.update((s) => {
			const grupo = s.grupos.find((g) => g.id === grupoId);
			if (!grupo) return s;
			// Move students back to sin-grupo list
			const freed: EstudianteSinGrupoDto[] = grupo.estudiantes.map((e) => ({
				estudianteId: e.estudianteId,
				estudianteNombre: e.estudianteNombre,
				estudianteDni: e.estudianteDni,
			}));
			return {
				...s,
				grupos: s.grupos.filter((g) => g.id !== grupoId),
				estudiantesSinGrupo: [...s.estudiantesSinGrupo, ...freed].sort((a, b) =>
					a.estudianteNombre.localeCompare(b.estudianteNombre),
				),
			};
		});
	}

	/** Optimistic: move student from sin-grupo to a group. */
	assignEstudianteOptimistic(estudianteId: number, toGrupoId: number): void {
		this._state.update((s) => {
			const est = s.estudiantesSinGrupo.find((e) => e.estudianteId === estudianteId);
			if (!est) return s;

			const newMiembro: GrupoEstudianteDto = {
				id: -Date.now(), // Temporary ID until refetch
				estudianteId: est.estudianteId,
				estudianteNombre: est.estudianteNombre,
				estudianteDni: est.estudianteDni,
			};

			return {
				...s,
				grupos: s.grupos.map((g) =>
					g.id === toGrupoId ? { ...g, estudiantes: [...g.estudiantes, newMiembro] } : g,
				),
				estudiantesSinGrupo: s.estudiantesSinGrupo.filter((e) => e.estudianteId !== estudianteId),
			};
		});
	}

	/** Optimistic: move student from a group to sin-grupo. */
	removeEstudianteOptimistic(estudianteId: number, fromGrupoId: number): void {
		this._state.update((s) => {
			const grupo = s.grupos.find((g) => g.id === fromGrupoId);
			const est = grupo?.estudiantes.find((e) => e.estudianteId === estudianteId);
			if (!est) return s;

			const freed: EstudianteSinGrupoDto = {
				estudianteId: est.estudianteId,
				estudianteNombre: est.estudianteNombre,
				estudianteDni: est.estudianteDni,
			};

			return {
				...s,
				grupos: s.grupos.map((g) =>
					g.id === fromGrupoId
						? { ...g, estudiantes: g.estudiantes.filter((e) => e.estudianteId !== estudianteId) }
						: g,
				),
				estudiantesSinGrupo: [...s.estudiantesSinGrupo, freed].sort((a, b) =>
					a.estudianteNombre.localeCompare(b.estudianteNombre),
				),
			};
		});
	}

	/** Optimistic: move student from one group to another. */
	moveEstudianteOptimistic(estudianteId: number, fromGrupoId: number, toGrupoId: number): void {
		this._state.update((s) => {
			const sourceGrupo = s.grupos.find((g) => g.id === fromGrupoId);
			const est = sourceGrupo?.estudiantes.find((e) => e.estudianteId === estudianteId);
			if (!est) return s;

			return {
				...s,
				grupos: s.grupos.map((g) => {
					if (g.id === fromGrupoId) {
						return { ...g, estudiantes: g.estudiantes.filter((e) => e.estudianteId !== estudianteId) };
					}
					if (g.id === toGrupoId) {
						return { ...g, estudiantes: [...g.estudiantes, est] };
					}
					return g;
				}),
			};
		});
	}

	setMaxEstudiantes(max: number | null): void {
		this._state.update((s) => ({ ...s, maxEstudiantesPorGrupo: max }));
	}
	// #endregion

	// #region Comandos de UI
	openAsignarDialog(grupoId: number): void {
		this._state.update((s) => ({
			...s,
			asignarDialogVisible: true,
			asignarGrupoId: grupoId,
		}));
	}

	closeAsignarDialog(): void {
		this._state.update((s) => ({
			...s,
			asignarDialogVisible: false,
			asignarGrupoId: null,
		}));
	}

	openConfirmDialog(): void {
		this._state.update((s) => ({ ...s, confirmDialogVisible: true }));
	}

	closeConfirmDialog(): void {
		this._state.update((s) => ({ ...s, confirmDialogVisible: false }));
	}

	reset(): void {
		this._state.set(initialState);
	}
	// #endregion
}

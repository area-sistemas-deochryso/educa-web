import { Injectable, computed, signal } from '@angular/core';
import {
	CursoContenidoDetalleDto,
	CursoContenidoSemanaDto,
	CursoContenidoArchivoDto,
	CursoContenidoTareaDto,
} from '../../models';

interface CursoContenidoState {
	contenido: CursoContenidoDetalleDto | null;
	loading: boolean;
	saving: boolean;
	// #region Dialog state
	contentDialogVisible: boolean;
	builderDialogVisible: boolean;
	semanaEditDialogVisible: boolean;
	tareaDialogVisible: boolean;
	selectedSemana: CursoContenidoSemanaDto | null;
	selectedTarea: CursoContenidoTareaDto | null;
	// Horario seleccionado para crear contenido
	selectedHorarioId: number | null;
	// #endregion
}

const initialState: CursoContenidoState = {
	contenido: null,
	loading: false,
	saving: false,
	contentDialogVisible: false,
	builderDialogVisible: false,
	semanaEditDialogVisible: false,
	tareaDialogVisible: false,
	selectedSemana: null,
	selectedTarea: null,
	selectedHorarioId: null,
};

@Injectable({ providedIn: 'root' })
export class CursoContenidoStore {
	// #region Estado privado
	private readonly _state = signal<CursoContenidoState>(initialState);

	// #endregion
	// #region Lecturas pÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºblicas
	readonly contenido = computed(() => this._state().contenido);
	readonly loading = computed(() => this._state().loading);
	readonly saving = computed(() => this._state().saving);
	readonly contentDialogVisible = computed(() => this._state().contentDialogVisible);
	readonly builderDialogVisible = computed(() => this._state().builderDialogVisible);
	readonly semanaEditDialogVisible = computed(() => this._state().semanaEditDialogVisible);
	readonly tareaDialogVisible = computed(() => this._state().tareaDialogVisible);
	readonly selectedSemana = computed(() => this._state().selectedSemana);
	readonly selectedTarea = computed(() => this._state().selectedTarea);
	readonly selectedHorarioId = computed(() => this._state().selectedHorarioId);

	// #endregion
	// #region Computed derivados
	readonly semanas = computed(() => this.contenido()?.semanas ?? []);

	readonly totalArchivos = computed(() =>
		this.semanas().reduce((sum, s) => sum + s.archivos.length, 0),
	);

	readonly totalTareas = computed(() =>
		this.semanas().reduce((sum, s) => sum + s.tareas.length, 0),
	);

	// #endregion
	// #region ViewModel
	readonly vm = computed(() => ({
		contenido: this.contenido(),
		semanas: this.semanas(),
		loading: this.loading(),
		saving: this.saving(),
		totalArchivos: this.totalArchivos(),
		totalTareas: this.totalTareas(),
		contentDialogVisible: this.contentDialogVisible(),
		builderDialogVisible: this.builderDialogVisible(),
		semanaEditDialogVisible: this.semanaEditDialogVisible(),
		tareaDialogVisible: this.tareaDialogVisible(),
		selectedSemana: this.selectedSemana(),
		selectedTarea: this.selectedTarea(),
		selectedHorarioId: this.selectedHorarioId(),
	}));

	// #endregion
	// #region Comandos de mutaciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n
	setContenido(contenido: CursoContenidoDetalleDto | null): void {
		this._state.update((s) => ({ ...s, contenido }));
	}

	setLoading(loading: boolean): void {
		this._state.update((s) => ({ ...s, loading }));
	}

	setSaving(saving: boolean): void {
		this._state.update((s) => ({ ...s, saving }));
	}

	setSelectedHorarioId(id: number | null): void {
		this._state.update((s) => ({ ...s, selectedHorarioId: id }));
	}

	// #endregion
	// #region Mutaciones quirÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºrgicas

	/** Actualizar una semana sin refetch */
	updateSemana(semanaId: number, updates: Partial<CursoContenidoSemanaDto>): void {
		this._state.update((s) => {
			if (!s.contenido) return s;
			return {
				...s,
				contenido: {
					...s.contenido,
					semanas: s.contenido.semanas.map((sem) =>
						sem.id === semanaId ? { ...sem, ...updates } : sem,
					),
				},
			};
		});
	}

	/** Agregar archivo a una semana */
	addArchivoToSemana(semanaId: number, archivo: CursoContenidoArchivoDto): void {
		this._state.update((s) => {
			if (!s.contenido) return s;
			return {
				...s,
				contenido: {
					...s.contenido,
					semanas: s.contenido.semanas.map((sem) =>
						sem.id === semanaId ? { ...sem, archivos: [...sem.archivos, archivo] } : sem,
					),
				},
			};
		});
	}

	/** Eliminar archivo de una semana */
	removeArchivoFromSemana(semanaId: number, archivoId: number): void {
		this._state.update((s) => {
			if (!s.contenido) return s;
			return {
				...s,
				contenido: {
					...s.contenido,
					semanas: s.contenido.semanas.map((sem) =>
						sem.id === semanaId
							? { ...sem, archivos: sem.archivos.filter((a) => a.id !== archivoId) }
							: sem,
					),
				},
			};
		});
	}

	/** Agregar tarea a una semana */
	addTareaToSemana(semanaId: number, tarea: CursoContenidoTareaDto): void {
		this._state.update((s) => {
			if (!s.contenido) return s;
			return {
				...s,
				contenido: {
					...s.contenido,
					semanas: s.contenido.semanas.map((sem) =>
						sem.id === semanaId ? { ...sem, tareas: [...sem.tareas, tarea] } : sem,
					),
				},
			};
		});
	}

	/** Actualizar tarea en una semana */
	updateTareaInSemana(semanaId: number, tareaId: number, updates: Partial<CursoContenidoTareaDto>): void {
		this._state.update((s) => {
			if (!s.contenido) return s;
			return {
				...s,
				contenido: {
					...s.contenido,
					semanas: s.contenido.semanas.map((sem) =>
						sem.id === semanaId
							? {
									...sem,
									tareas: sem.tareas.map((t) => (t.id === tareaId ? { ...t, ...updates } : t)),
								}
							: sem,
					),
				},
			};
		});
	}

	/** Eliminar tarea de una semana */
	removeTareaFromSemana(semanaId: number, tareaId: number): void {
		this._state.update((s) => {
			if (!s.contenido) return s;
			return {
				...s,
				contenido: {
					...s.contenido,
					semanas: s.contenido.semanas.map((sem) =>
						sem.id === semanaId
							? { ...sem, tareas: sem.tareas.filter((t) => t.id !== tareaId) }
							: sem,
					),
				},
			};
		});
	}

	// #endregion
	// #region Dialog commands
	openContentDialog(): void {
		this._state.update((s) => ({ ...s, contentDialogVisible: true }));
	}

	closeContentDialog(): void {
		this._state.update((s) => ({
			...s,
			contentDialogVisible: false,
			contenido: null,
			selectedHorarioId: null,
		}));
	}

	openBuilderDialog(): void {
		this._state.update((s) => ({ ...s, builderDialogVisible: true }));
	}

	closeBuilderDialog(): void {
		this._state.update((s) => ({ ...s, builderDialogVisible: false }));
	}

	openSemanaEditDialog(semana: CursoContenidoSemanaDto): void {
		this._state.update((s) => ({ ...s, semanaEditDialogVisible: true, selectedSemana: semana }));
	}

	closeSemanaEditDialog(): void {
		this._state.update((s) => ({ ...s, semanaEditDialogVisible: false, selectedSemana: null }));
	}

	openTareaDialog(tarea: CursoContenidoTareaDto | null): void {
		this._state.update((s) => ({ ...s, tareaDialogVisible: true, selectedTarea: tarea }));
	}

	closeTareaDialog(): void {
		this._state.update((s) => ({ ...s, tareaDialogVisible: false, selectedTarea: null }));
	}

	reset(): void {
		this._state.set(initialState);
	}
	// #endregion
}

import { Injectable, computed, signal } from '@angular/core';
import {
	CursoContenidoDetalleDto,
	CursoContenidoSemanaDto,
	CursoContenidoArchivoDto,
	CursoContenidoTareaDto,
} from '../../models';

/**
 * Internal state for course content UI.
 */
interface CursoContenidoState {
	/** Current content detail or null when not loaded. */
	contenido: CursoContenidoDetalleDto | null;
	/** True while initial load is running. */
	loading: boolean;
	/** True while save operations are running. */
	saving: boolean;
	/** Last error message, if any. */
	error: string | null;
	// #region Dialog state
	/** Content dialog visibility. */
	contentDialogVisible: boolean;
	/** Builder dialog visibility when content does not exist. */
	builderDialogVisible: boolean;
	/** Week edit dialog visibility. */
	semanaEditDialogVisible: boolean;
	/** Task dialog visibility. */
	tareaDialogVisible: boolean;
	/** Selected week for edit dialog. */
	selectedSemana: CursoContenidoSemanaDto | null;
	/** Selected task for edit dialog. */
	selectedTarea: CursoContenidoTareaDto | null;
	/** Selected schedule id for content builder. */
	selectedHorarioId: number | null;
	// #endregion
}

const initialState: CursoContenidoState = {
	contenido: null,
	loading: false,
	saving: false,
	error: null,
	contentDialogVisible: false,
	builderDialogVisible: false,
	semanaEditDialogVisible: false,
	tareaDialogVisible: false,
	selectedSemana: null,
	selectedTarea: null,
	selectedHorarioId: null,
};

/**
 * Store for course content state and UI dialogs.
 *
 * @example
 * const store = inject(CursoContenidoStore);
 * store.setLoading(true);
 */
@Injectable({ providedIn: 'root' })
export class CursoContenidoStore {
	// #region Estado privado
	/** Internal mutable state signal. */
	private readonly _state = signal<CursoContenidoState>(initialState);

	// #endregion
	// #region Lecturas publicas
	/** Current content detail. */
	readonly contenido = computed(() => this._state().contenido);
	/** True while initial load is running. */
	readonly loading = computed(() => this._state().loading);
	/** True while save operations are running. */
	readonly saving = computed(() => this._state().saving);
	/** Last error message, if any. */
	readonly error = computed(() => this._state().error);
	/** Content dialog visibility. */
	readonly contentDialogVisible = computed(() => this._state().contentDialogVisible);
	/** Builder dialog visibility. */
	readonly builderDialogVisible = computed(() => this._state().builderDialogVisible);
	/** Week edit dialog visibility. */
	readonly semanaEditDialogVisible = computed(() => this._state().semanaEditDialogVisible);
	/** Task dialog visibility. */
	readonly tareaDialogVisible = computed(() => this._state().tareaDialogVisible);
	/** Selected week for edit dialog. */
	readonly selectedSemana = computed(() => this._state().selectedSemana);
	/** Selected task for edit dialog. */
	readonly selectedTarea = computed(() => this._state().selectedTarea);
	/** Selected schedule id for content builder. */
	readonly selectedHorarioId = computed(() => this._state().selectedHorarioId);

	// #endregion
	// #region Computed derivados
	/** List of weeks from the current content detail. */
	readonly semanas = computed(() => this.contenido()?.semanas ?? []);
	/** Total attachments across all weeks. */
	readonly totalArchivos = computed(() =>
		this.semanas().reduce((sum, s) => sum + s.archivos.length, 0),
	);
	/** Total tasks across all weeks. */
	readonly totalTareas = computed(() =>
		this.semanas().reduce((sum, s) => sum + s.tareas.length, 0),
	);

	// #endregion
	// #region ViewModel
	/** Aggregated view model for UI binding. */
	readonly vm = computed(() => ({
		contenido: this.contenido(),
		semanas: this.semanas(),
		loading: this.loading(),
		saving: this.saving(),
		error: this.error(),
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
	// #region Comandos de mutacion
	/**
	 * Set current content detail.
	 *
	 * @param contenido Content detail or null.
	 *
	 * @example
	 * store.setContenido(detalle);
	 */
	setContenido(contenido: CursoContenidoDetalleDto | null): void {
		this._state.update((s) => ({ ...s, contenido }));
	}
	/**
	 * Set loading flag.
	 *
	 * @param loading True while loading.
	 *
	 * @example
	 * store.setLoading(true);
	 */
	setLoading(loading: boolean): void {
		this._state.update((s) => ({ ...s, loading }));
	}
	/**
	 * Set saving flag.
	 *
	 * @param saving True while saving.
	 *
	 * @example
	 * store.setSaving(true);
	 */
	setSaving(saving: boolean): void {
		this._state.update((s) => ({ ...s, saving }));
	}
	/**
	 * Set error message.
	 *
	 * @param error Error message or null.
	 *
	 * @example
	 * store.setError('Failed to load');
	 */
	setError(error: string | null): void {
		this._state.update((s) => ({ ...s, error }));
	}
	/**
	 * Clear error message.
	 *
	 * @example
	 * store.clearError();
	 */
	clearError(): void {
		this._state.update((s) => ({ ...s, error: null }));
	}
	/**
	 * Set selected schedule id for content builder.
	 *
	 * @param id Schedule id or null.
	 *
	 * @example
	 * store.setSelectedHorarioId(120);
	 */
	setSelectedHorarioId(id: number | null): void {
		this._state.update((s) => ({ ...s, selectedHorarioId: id }));
	}

	// #endregion
	// #region Mutaciones quirurgicas

	/**
	 * Update a week in place without refetch.
	 *
	 * @param semanaId Week id.
	 * @param updates Partial week updates.
	 */
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

	/**
	 * Add an attachment to a week.
	 *
	 * @param semanaId Week id.
	 * @param archivo Attachment to add.
	 */
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

	/**
	 * Remove an attachment from a week.
	 *
	 * @param semanaId Week id.
	 * @param archivoId Attachment id.
	 */
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

	/**
	 * Add a task to a week.
	 *
	 * @param semanaId Week id.
	 * @param tarea Task to add.
	 */
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

	/**
	 * Update a task in a week.
	 *
	 * @param semanaId Week id.
	 * @param tareaId Task id.
	 * @param updates Partial task updates.
	 */
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

	/**
	 * Remove a task from a week.
	 *
	 * @param semanaId Week id.
	 * @param tareaId Task id.
	 */
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
	/**
	 * Open content dialog.
	 */
	openContentDialog(): void {
		this._state.update((s) => ({ ...s, contentDialogVisible: true }));
	}
	/**
	 * Close content dialog and clear content state.
	 */
	closeContentDialog(): void {
		this._state.update((s) => ({
			...s,
			contentDialogVisible: false,
			contenido: null,
			selectedHorarioId: null,
		}));
	}
	/**
	 * Open content builder dialog.
	 */
	openBuilderDialog(): void {
		this._state.update((s) => ({ ...s, builderDialogVisible: true }));
	}
	/**
	 * Close content builder dialog.
	 */
	closeBuilderDialog(): void {
		this._state.update((s) => ({ ...s, builderDialogVisible: false }));
	}
	/**
	 * Open week edit dialog with selection.
	 *
	 * @param semana Week data to edit.
	 */
	openSemanaEditDialog(semana: CursoContenidoSemanaDto): void {
		this._state.update((s) => ({ ...s, semanaEditDialogVisible: true, selectedSemana: semana }));
	}
	/**
	 * Close week edit dialog and clear selection.
	 */
	closeSemanaEditDialog(): void {
		this._state.update((s) => ({ ...s, semanaEditDialogVisible: false, selectedSemana: null }));
	}
	/**
	 * Open task dialog with selection or null for create.
	 *
	 * @param tarea Task to edit or null for new.
	 */
	openTareaDialog(tarea: CursoContenidoTareaDto | null): void {
		this._state.update((s) => ({ ...s, tareaDialogVisible: true, selectedTarea: tarea }));
	}
	/**
	 * Close task dialog and clear selection.
	 */
	closeTareaDialog(): void {
		this._state.update((s) => ({ ...s, tareaDialogVisible: false, selectedTarea: null }));
	}
	/**
	 * Reset state to initial values.
	 *
	 * @example
	 * store.reset();
	 */
	reset(): void {
		this._state.set(initialState);
	}
	// #endregion
}
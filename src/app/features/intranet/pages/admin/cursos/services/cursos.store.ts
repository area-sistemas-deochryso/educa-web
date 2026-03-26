import { Injectable, signal, computed } from '@angular/core';

import { BaseCrudStore } from '@core/store';
import { detectarNivel, removeNivelPrefix, NIVEL_VISUAL_CONFIGS } from '@core/helpers';

import { Curso, CursosEstadisticas, Grado, NivelGradoConfig } from '../models';

// #region Interfaces
interface GradoOption {
	id: number;
	nombre: string;
}

interface CursoFormData {
	nombre: string;
	estado: boolean;
}
// #endregion

@Injectable({ providedIn: 'root' })
export class CursosStore extends BaseCrudStore<Curso, CursoFormData, CursosEstadisticas> {
	constructor() {
		super({ nombre: '', estado: true }, { totalCursos: 0, cursosActivos: 0, cursosInactivos: 0 });
	}

	protected override getDefaultFormData(): CursoFormData {
		return { nombre: '', estado: true };
	}

	// #region Estado específico — Grados y selección
	private readonly _grados = signal<Grado[]>([]);
	private readonly _selectedCursoForGrados = signal<Curso | null>(null);
	private readonly _gradosDialogVisible = signal(false);
	private readonly _selectedInicial = signal<number[]>([]);
	private readonly _selectedPrimaria = signal<number[]>([]);
	private readonly _selectedSecundaria = signal<number[]>([]);

	readonly grados = this._grados.asReadonly();
	readonly selectedCursoForGrados = this._selectedCursoForGrados.asReadonly();
	readonly gradosDialogVisible = this._gradosDialogVisible.asReadonly();
	readonly selectedInicial = this._selectedInicial.asReadonly();
	readonly selectedPrimaria = this._selectedPrimaria.asReadonly();
	readonly selectedSecundaria = this._selectedSecundaria.asReadonly();
	// #endregion

	// #region Estado específico — Filtro nivel
	private readonly _filterNivel = signal<string | null>(null);
	readonly filterNivel = this._filterNivel.asReadonly();

	setFilterNivel(nivel: string | null): void {
		this._filterNivel.set(nivel);
	}

	protected override onClearFiltros(): void {
		this._filterNivel.set(null);
	}
	// #endregion

	/**
	 * Grados por nivel: el backend devuelve grados con prefijo ("Inicial - 3 Años"),
	 * se filtran por nivel y se les quita el prefijo para mostrar solo "3 Años" en la UI.
	 * Se necesitan versiones separadas porque el dialog de cursos muestra 3 secciones independientes.
	 */
	// #region Computed — grados por nivel (con prefijo de nivel removido)
	readonly gradosInicial = computed<GradoOption[]>(() =>
		this._grados()
			.filter((g) => detectarNivel(g.nombre) === 'Inicial')
			.map((g) => ({ id: g.id, nombre: removeNivelPrefix(g.nombre) })),
	);

	readonly gradosPrimaria = computed<GradoOption[]>(() =>
		this._grados()
			.filter((g) => detectarNivel(g.nombre) === 'Primaria')
			.map((g) => ({ id: g.id, nombre: removeNivelPrefix(g.nombre) })),
	);

	readonly gradosSecundaria = computed<GradoOption[]>(() =>
		this._grados()
			.filter((g) => detectarNivel(g.nombre) === 'Secundaria')
			.map((g) => ({ id: g.id, nombre: removeNivelPrefix(g.nombre) })),
	);
	// #endregion

	// #region Computed — grados seleccionados y disponibles
	readonly allGradosIds = computed(() => [
		...this._selectedInicial(),
		...this._selectedPrimaria(),
		...this._selectedSecundaria(),
	]);

	readonly selectedGradosInicial = computed(() =>
		this.gradosInicial().filter((g) => this._selectedInicial().includes(g.id)),
	);

	readonly selectedGradosPrimaria = computed(() =>
		this.gradosPrimaria().filter((g) => this._selectedPrimaria().includes(g.id)),
	);

	readonly selectedGradosSecundaria = computed(() =>
		this.gradosSecundaria().filter((g) => this._selectedSecundaria().includes(g.id)),
	);

	readonly availableInicial = computed(() =>
		this.gradosInicial().filter((g) => !this._selectedInicial().includes(g.id)),
	);

	readonly availablePrimaria = computed(() =>
		this.gradosPrimaria().filter((g) => !this._selectedPrimaria().includes(g.id)),
	);

	readonly availableSecundaria = computed(() =>
		this.gradosSecundaria().filter((g) => !this._selectedSecundaria().includes(g.id)),
	);

	/** Full Grado objects for selected IDs (for surgical mutation payloads) */
	readonly selectedGradosFull = computed(() =>
		this._grados().filter((g) => this.allGradosIds().includes(g.id)),
	);

	/** Unified config per nivel for data-driven rendering (edit dialog) */
	readonly niveles = computed<NivelGradoConfig[]>(() => {
		const gradosByNivel = {
			Inicial: { all: this.gradosInicial(), selected: this.selectedGradosInicial(), available: this.availableInicial() },
			Primaria: { all: this.gradosPrimaria(), selected: this.selectedGradosPrimaria(), available: this.availablePrimaria() },
			Secundaria: { all: this.gradosSecundaria(), selected: this.selectedGradosSecundaria(), available: this.availableSecundaria() },
		} as const;

		return (['Inicial', 'Primaria', 'Secundaria'] as const).map((nivel) => ({
			...NIVEL_VISUAL_CONFIGS[nivel],
			allGrados: gradosByNivel[nivel].all,
			selectedGrados: gradosByNivel[nivel].selected,
			availableGrados: gradosByNivel[nivel].available,
		}));
	});
	// #endregion

	// #region Computed — grados del curso seleccionado (dialog "ver grados")
	readonly cursoGradosInicial = computed(() => {
		const curso = this._selectedCursoForGrados();
		if (!curso?.grados) return [];
		return curso.grados.filter((g) => detectarNivel(g.nombre) === 'Inicial');
	});

	readonly cursoGradosPrimaria = computed(() => {
		const curso = this._selectedCursoForGrados();
		if (!curso?.grados) return [];
		return curso.grados.filter((g) => detectarNivel(g.nombre) === 'Primaria');
	});

	readonly cursoGradosSecundaria = computed(() => {
		const curso = this._selectedCursoForGrados();
		if (!curso?.grados) return [];
		return curso.grados.filter((g) => detectarNivel(g.nombre) === 'Secundaria');
	});

	/** Unified config per nivel for view dialog */
	readonly cursoGradosNiveles = computed(() => {
		const gradosByNivel = {
			Inicial: this.cursoGradosInicial(),
			Primaria: this.cursoGradosPrimaria(),
			Secundaria: this.cursoGradosSecundaria(),
		} as const;

		return (['Inicial', 'Primaria', 'Secundaria'] as const)
			.map((nivel) => ({ ...NIVEL_VISUAL_CONFIGS[nivel], grados: gradosByNivel[nivel] }))
			.filter((n) => n.grados.length > 0);
	});
	// #endregion

	// #region Computed — validación
	readonly isFormValid = computed(() => !!this.formData().nombre?.trim());
	// #endregion

	// #region Mutaciones específicas
	/** Toggle boolean estado */
	toggleCursoEstado(id: number): void {
		const curso = this.items().find((c) => c.id === id);
		if (curso) this.updateItem(id, { estado: !curso.estado });
	}
	// #endregion

	// #region Comandos específicos — Grados
	setGrados(grados: Grado[]): void {
		this._grados.set(grados);
	}

	setGradeSelections(inicial: number[], primaria: number[], secundaria: number[]): void {
		this._selectedInicial.set(inicial);
		this._selectedPrimaria.set(primaria);
		this._selectedSecundaria.set(secundaria);
	}

	addGrado(gradoId: number): void {
		const isInicial = this.gradosInicial().some((g) => g.id === gradoId);
		const isPrimaria = this.gradosPrimaria().some((g) => g.id === gradoId);

		if (isInicial) {
			this._selectedInicial.update((ids) => [...ids, gradoId]);
		} else if (isPrimaria) {
			this._selectedPrimaria.update((ids) => [...ids, gradoId]);
		} else {
			this._selectedSecundaria.update((ids) => [...ids, gradoId]);
		}
	}

	removeGrado(gradoId: number): void {
		if (this._selectedInicial().includes(gradoId)) {
			this._selectedInicial.update((ids) => ids.filter((id) => id !== gradoId));
		} else if (this._selectedPrimaria().includes(gradoId)) {
			this._selectedPrimaria.update((ids) => ids.filter((id) => id !== gradoId));
		} else {
			this._selectedSecundaria.update((ids) => ids.filter((id) => id !== gradoId));
		}
	}

	openGradosDialog(curso: Curso): void {
		this._selectedCursoForGrados.set(curso);
		this._gradosDialogVisible.set(true);
	}

	closeGradosDialog(): void {
		this._gradosDialogVisible.set(false);
		this._selectedCursoForGrados.set(null);
	}

	override closeDialog(): void {
		super.closeDialog();
		this._selectedInicial.set([]);
		this._selectedPrimaria.set([]);
		this._selectedSecundaria.set([]);
	}
	// #endregion

	// #region Sub-ViewModels
	readonly dataVm = computed(() => ({
		cursos: this.items(),
		estadisticas: this.estadisticas()!,
		page: this.page(),
		pageSize: this.pageSize(),
		totalRecords: this.totalRecords(),
	}));

	readonly uiVm = computed(() => ({
		loading: this.loading(),
		error: this.error(),
		dialogVisible: this.dialogVisible(),
		isEditing: this.isEditing(),
		gradosDialogVisible: this.gradosDialogVisible(),
		confirmDialogVisible: this.confirmDialogVisible(),
		selectedCursoForGrados: this.selectedCursoForGrados(),
		searchTerm: this.searchTerm(),
		filterEstado: this.filterEstado(),
		filterNivel: this.filterNivel(),
	}));

	readonly formVm = computed(() => ({
		formData: this.formData(),
		isFormValid: this.isFormValid(),
		niveles: this.niveles(),
		cursoGradosNiveles: this.cursoGradosNiveles(),
	}));
	// #endregion

	// #region ViewModel consolidado
	readonly vm = computed(() => ({
		...this.dataVm(),
		...this.uiVm(),
		...this.formVm(),
	}));
	// #endregion
}

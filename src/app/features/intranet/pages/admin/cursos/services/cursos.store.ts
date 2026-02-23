import { Injectable, signal, computed } from '@angular/core';

import { Curso, CursosEstadisticas, Grado } from '@core/services/cursos';
import { detectarNivel, removeNivelPrefix } from '@core/helpers';

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
export class CursosStore {
	// #region Estado privado
	private readonly _cursos = signal<Curso[]>([]);
	private readonly _grados = signal<Grado[]>([]);
	private readonly _loading = signal(false);

	private readonly _dialogVisible = signal(false);
	private readonly _isEditing = signal(false);
	private readonly _gradosDialogVisible = signal(false);
	private readonly _confirmDialogVisible = signal(false);
	private readonly _selectedCursoForGrados = signal<Curso | null>(null);

	private readonly _selectedCurso = signal<Curso | null>(null);
	private readonly _formData = signal<CursoFormData>({ nombre: '', estado: true });

	private readonly _selectedInicial = signal<number[]>([]);
	private readonly _selectedPrimaria = signal<number[]>([]);
	private readonly _selectedSecundaria = signal<number[]>([]);

	// Pagination
	private readonly _page = signal(1);
	private readonly _pageSize = signal(10);
	private readonly _totalRecords = signal(0);

	// Estadísticas (loaded from API, not computed from paginated array)
	private readonly _estadisticas = signal<CursosEstadisticas>({
		totalCursos: 0,
		cursosActivos: 0,
		cursosInactivos: 0,
	});

	private readonly _searchTerm = signal('');
	private readonly _filterEstado = signal<boolean | null>(null);
	private readonly _filterNivel = signal<string | null>(null);
	// #endregion

	// #region Lecturas públicas (readonly)
	readonly cursos = this._cursos.asReadonly();
	readonly grados = this._grados.asReadonly();
	readonly loading = this._loading.asReadonly();

	readonly dialogVisible = this._dialogVisible.asReadonly();
	readonly isEditing = this._isEditing.asReadonly();
	readonly gradosDialogVisible = this._gradosDialogVisible.asReadonly();
	readonly confirmDialogVisible = this._confirmDialogVisible.asReadonly();
	readonly selectedCursoForGrados = this._selectedCursoForGrados.asReadonly();

	readonly selectedCurso = this._selectedCurso.asReadonly();
	readonly formData = this._formData.asReadonly();

	readonly selectedInicial = this._selectedInicial.asReadonly();
	readonly selectedPrimaria = this._selectedPrimaria.asReadonly();
	readonly selectedSecundaria = this._selectedSecundaria.asReadonly();

	readonly page = this._page.asReadonly();
	readonly pageSize = this._pageSize.asReadonly();
	readonly totalRecords = this._totalRecords.asReadonly();

	readonly estadisticas = this._estadisticas.asReadonly();

	readonly searchTerm = this._searchTerm.asReadonly();
	readonly filterEstado = this._filterEstado.asReadonly();
	readonly filterNivel = this._filterNivel.asReadonly();
	// #endregion

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
	// #endregion

	// #region Computed — validación de formulario
	readonly isFormValid = computed(() => !!this._formData().nombre?.trim());
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		cursos: this._cursos(),
		loading: this.loading(),
		estadisticas: this._estadisticas(),

		// Pagination
		page: this._page(),
		pageSize: this._pageSize(),
		totalRecords: this._totalRecords(),

		dialogVisible: this.dialogVisible(),
		isEditing: this.isEditing(),
		gradosDialogVisible: this.gradosDialogVisible(),
		confirmDialogVisible: this.confirmDialogVisible(),
		selectedCursoForGrados: this.selectedCursoForGrados(),

		formData: this.formData(),
		isFormValid: this.isFormValid(),

		gradosInicial: this.gradosInicial(),
		gradosPrimaria: this.gradosPrimaria(),
		gradosSecundaria: this.gradosSecundaria(),

		selectedGradosInicial: this.selectedGradosInicial(),
		selectedGradosPrimaria: this.selectedGradosPrimaria(),
		selectedGradosSecundaria: this.selectedGradosSecundaria(),

		availableInicial: this.availableInicial(),
		availablePrimaria: this.availablePrimaria(),
		availableSecundaria: this.availableSecundaria(),

		cursoGradosInicial: this.cursoGradosInicial(),
		cursoGradosPrimaria: this.cursoGradosPrimaria(),
		cursoGradosSecundaria: this.cursoGradosSecundaria(),

		searchTerm: this.searchTerm(),
		filterEstado: this.filterEstado(),
		filterNivel: this.filterNivel(),
	}));
	// #endregion

	// #region Comandos de datos
	setCursos(cursos: Curso[]): void {
		this._cursos.set(cursos);
	}

	setGrados(grados: Grado[]): void {
		this._grados.set(grados);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	/** Mutación quirúrgica: actualizar 1 curso */
	updateCurso(id: number, updates: Partial<Curso>): void {
		this._cursos.update((list) =>
			list.map((c) => (c.id === id ? { ...c, ...updates } : c)),
		);
	}

	/** Mutación quirúrgica: toggle estado de 1 curso */
	toggleCursoEstado(id: number): void {
		this._cursos.update((list) =>
			list.map((c) => (c.id === id ? { ...c, estado: !c.estado } : c)),
		);
	}

	/** Mutación quirúrgica: eliminar 1 curso */
	removeCurso(id: number): void {
		this._cursos.update((list) => list.filter((c) => c.id !== id));
	}

	setEstadisticas(stats: CursosEstadisticas): void {
		this._estadisticas.set(stats);
	}

	/** Actualización incremental de estadísticas */
	incrementarEstadistica(campo: keyof CursosEstadisticas, delta: number): void {
		this._estadisticas.update((stats) => ({
			...stats,
			[campo]: Math.max(0, stats[campo] + delta),
		}));
	}

	// Pagination setters
	setPaginationData(page: number, pageSize: number, total: number): void {
		this._page.set(page);
		this._pageSize.set(pageSize);
		this._totalRecords.set(total);
	}

	setPage(page: number): void {
		this._page.set(page);
	}

	setPageSize(pageSize: number): void {
		this._pageSize.set(pageSize);
	}
	// #endregion

	// #region Comandos de UI — Diálogos
	openDialog(): void {
		this._dialogVisible.set(true);
	}

	closeDialog(): void {
		this._dialogVisible.set(false);
		this._selectedCurso.set(null);
		this._formData.set({ nombre: '', estado: true });
		this._selectedInicial.set([]);
		this._selectedPrimaria.set([]);
		this._selectedSecundaria.set([]);
		this._isEditing.set(false);
	}

	openGradosDialog(curso: Curso): void {
		this._selectedCursoForGrados.set(curso);
		this._gradosDialogVisible.set(true);
	}

	closeGradosDialog(): void {
		this._gradosDialogVisible.set(false);
		this._selectedCursoForGrados.set(null);
	}

	openConfirmDialog(): void {
		this._confirmDialogVisible.set(true);
	}

	closeConfirmDialog(): void {
		this._confirmDialogVisible.set(false);
	}
	// #endregion

	// #region Comandos de formulario
	setFormData(data: CursoFormData): void {
		this._formData.set(data);
	}

	updateFormField(field: keyof CursoFormData, value: unknown): void {
		this._formData.update((current) => ({ ...current, [field]: value }));
	}

	setSelectedCurso(curso: Curso): void {
		this._selectedCurso.set(curso);
	}

	setIsEditing(editing: boolean): void {
		this._isEditing.set(editing);
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
	// #endregion

	// #region Comandos de filtros
	setSearchTerm(term: string): void {
		this._searchTerm.set(term);
	}

	setFilterEstado(estado: boolean | null): void {
		this._filterEstado.set(estado);
	}

	setFilterNivel(nivel: string | null): void {
		this._filterNivel.set(nivel);
	}

	clearFiltros(): void {
		this._searchTerm.set('');
		this._filterEstado.set(null);
		this._filterNivel.set(null);
		this._page.set(1);
	}
	// #endregion
}

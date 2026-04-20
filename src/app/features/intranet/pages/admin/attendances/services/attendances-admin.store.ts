import { Injectable, computed, signal } from '@angular/core';

import {
	AsistenciaAdminEstadisticas,
	AsistenciaAdminLista,
	AsistenciaFormData,
	CierreMensualLista,
	PersonaParaSeleccion,
	TipoOperacionAsistencia,
	TipoPersonaAsistencia,
	TipoPersonaFilter,
} from '../models';

@Injectable({ providedIn: 'root' })
export class AttendancesAdminStore {
	// #region Estado privado
	private readonly _items = signal<AsistenciaAdminLista[]>([]);
	private readonly _estadisticas = signal<AsistenciaAdminEstadisticas | null>(null);
	private readonly _personas = signal<PersonaParaSeleccion[]>([]);
	private readonly _cierres = signal<CierreMensualLista[]>([]);
	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);

	private readonly _statsReady = signal(false);
	private readonly _tableReady = signal(false);

	// Filtros
	private readonly _fecha = signal<string>(new Date().toISOString().split('T')[0]);
	private readonly _sedeId = signal<number | null>(null);
	private readonly _searchTerm = signal('');
	// Default 'E' por retrocompatibilidad visual: admin venía acostumbrado a ver solo estudiantes.
	private readonly _tipoPersonaFilter = signal<TipoPersonaFilter>('E');

	// Sync
	private readonly _syncing = signal(false);

	// Selección para envío de correos
	private readonly _selectedIds = signal<Set<number>>(new Set());
	private readonly _enviandoCorreos = signal(false);

	// UI
	private readonly _dialogVisible = signal(false);
	private readonly _cierreDialogVisible = signal(false);
	private readonly _confirmDialogVisible = signal(false);
	private readonly _isEditing = signal(false);
	private readonly _selectedItem = signal<AsistenciaAdminLista | null>(null);

	// Form
	private readonly _formData = signal<AsistenciaFormData>({
		tipoOperacion: 'entrada',
		estudianteId: null,
		sedeId: null,
		horaEntrada: null,
		horaSalida: null,
		observacion: '',
		asistenciaId: null,
		tipoPersona: 'E',
	});
	// #endregion

	// #region Lecturas publicas (readonly)
	readonly items = this._items.asReadonly();
	readonly estadisticas = this._estadisticas.asReadonly();
	readonly personas = this._personas.asReadonly();
	/** Alias retrocompat — los consumidores viejos usan `estudiantes`. */
	readonly estudiantes = this._personas.asReadonly();
	readonly cierres = this._cierres.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly statsReady = this._statsReady.asReadonly();
	readonly tableReady = this._tableReady.asReadonly();

	readonly syncing = this._syncing.asReadonly();
	readonly selectedIds = this._selectedIds.asReadonly();
	readonly enviandoCorreos = this._enviandoCorreos.asReadonly();
	readonly fecha = this._fecha.asReadonly();
	readonly sedeId = this._sedeId.asReadonly();
	readonly searchTerm = this._searchTerm.asReadonly();
	readonly tipoPersonaFilter = this._tipoPersonaFilter.asReadonly();

	readonly dialogVisible = this._dialogVisible.asReadonly();
	readonly cierreDialogVisible = this._cierreDialogVisible.asReadonly();
	readonly confirmDialogVisible = this._confirmDialogVisible.asReadonly();
	readonly isEditing = this._isEditing.asReadonly();
	readonly selectedItem = this._selectedItem.asReadonly();
	readonly formData = this._formData.asReadonly();
	// #endregion

	// #region Computed
	readonly filteredItems = computed(() => {
		const items = this._items();
		const search = this._searchTerm().toLowerCase().trim();
		if (!search) return items;
		return items.filter(
			(i) =>
				i.nombreCompleto.toLowerCase().includes(search) ||
				i.dni.includes(search),
		);
	});

	readonly selectedCount = computed(() => this._selectedIds().size);

	readonly allSelected = computed(() => {
		const items = this.filteredItems();
		const selected = this._selectedIds();
		return items.length > 0 && items.every((i) => selected.has(i.asistenciaId));
	});

	readonly isFormValid = computed(() => {
		const fd = this._formData();
		if (fd.tipoOperacion === 'salida') {
			return fd.asistenciaId !== null && fd.horaSalida !== null;
		}
		const baseValid = fd.estudianteId !== null && fd.sedeId !== null && fd.horaEntrada !== null;
		if (fd.tipoOperacion === 'completa') {
			// En edición se permite quitar la salida (horaSalida null)
			return this._isEditing() ? baseValid : baseValid && fd.horaSalida !== null;
		}
		return baseValid;
	});
	// #endregion

	// #region Sub-ViewModels
	readonly dataVm = computed(() => ({
		items: this.filteredItems(),
		allItems: this._items(),
		estadisticas: this._estadisticas(),
		personas: this._personas(),
		estudiantes: this._personas(),
		cierres: this._cierres(),
		isEmpty: this._items().length === 0,
	}));

	readonly uiVm = computed(() => ({
		loading: this._loading(),
		error: this._error(),
		statsReady: this._statsReady(),
		tableReady: this._tableReady(),
		syncing: this._syncing(),
		selectedIds: this._selectedIds(),
		selectedCount: this.selectedCount(),
		allSelected: this.allSelected(),
		enviandoCorreos: this._enviandoCorreos(),
		dialogVisible: this._dialogVisible(),
		cierreDialogVisible: this._cierreDialogVisible(),
		confirmDialogVisible: this._confirmDialogVisible(),
		fecha: this._fecha(),
		sedeId: this._sedeId(),
		searchTerm: this._searchTerm(),
		tipoPersonaFilter: this._tipoPersonaFilter(),
	}));

	readonly formVm = computed(() => ({
		formData: this._formData(),
		isEditing: this._isEditing(),
		selectedItem: this._selectedItem(),
		isFormValid: this.isFormValid(),
	}));

	readonly vm = computed(() => ({
		...this.dataVm(),
		...this.uiVm(),
		...this.formVm(),
	}));
	// #endregion

	// #region Comandos de mutacion — datos
	setItems(items: AsistenciaAdminLista[]): void {
		this._items.set(items);
	}

	addItem(item: AsistenciaAdminLista): void {
		this._items.update((list) => [item, ...list]);
	}

	updateItem(id: number, updates: Partial<AsistenciaAdminLista>): void {
		this._items.update((list) =>
			list.map((i) => (i.asistenciaId === id ? { ...i, ...updates } : i)),
		);
	}

	removeItem(id: number): void {
		this._items.update((list) => list.filter((i) => i.asistenciaId !== id));
	}

	setEstadisticas(stats: AsistenciaAdminEstadisticas): void {
		this._estadisticas.set(stats);
	}

	incrementarEstadistica(campo: keyof AsistenciaAdminEstadisticas, delta: number): void {
		this._estadisticas.update((s) => (s ? { ...s, [campo]: (s[campo] as number) + delta } : s));
	}

	setPersonas(personas: PersonaParaSeleccion[]): void {
		this._personas.set(personas);
	}

	/** Alias retrocompat. */
	setEstudiantes(personas: PersonaParaSeleccion[]): void {
		this._personas.set(personas);
	}

	setCierres(cierres: CierreMensualLista[]): void {
		this._cierres.set(cierres);
	}

	addCierre(cierre: CierreMensualLista): void {
		this._cierres.update((list) => [cierre, ...list]);
	}

	updateCierre(id: number, updates: Partial<CierreMensualLista>): void {
		this._cierres.update((list) =>
			list.map((c) => (c.cierreId === id ? { ...c, ...updates } : c)),
		);
	}

	setLoading(v: boolean): void {
		this._loading.set(v);
	}

	setError(v: string | null): void {
		this._error.set(v);
	}

	setStatsReady(v: boolean): void {
		this._statsReady.set(v);
	}

	setTableReady(v: boolean): void {
		this._tableReady.set(v);
	}

	setSyncing(v: boolean): void {
		this._syncing.set(v);
	}

	setEnviandoCorreos(v: boolean): void {
		this._enviandoCorreos.set(v);
	}

	toggleSelection(id: number): void {
		this._selectedIds.update((set) => {
			const next = new Set(set);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	toggleSelectAll(): void {
		const items = this.filteredItems();
		const selected = this._selectedIds();
		const allSelected = items.every((i) => selected.has(i.asistenciaId));

		if (allSelected) {
			this._selectedIds.set(new Set());
		} else {
			this._selectedIds.set(new Set(items.map((i) => i.asistenciaId)));
		}
	}

	clearSelection(): void {
		this._selectedIds.set(new Set());
	}
	// #endregion

	// #region Comandos de mutacion — filtros
	setFecha(fecha: string): void {
		this._fecha.set(fecha);
	}

	setSedeId(sedeId: number | null): void {
		this._sedeId.set(sedeId);
	}

	setSearchTerm(term: string): void {
		this._searchTerm.set(term);
	}

	setTipoPersonaFilter(tipo: TipoPersonaFilter): void {
		this._tipoPersonaFilter.set(tipo);
	}
	// #endregion

	// #region Comandos de mutacion — UI
	openNewDialog(tipo: TipoOperacionAsistencia = 'entrada'): void {
		const filter = this._tipoPersonaFilter();
		// El form por defecto toma el tipo del filtro; 'todos' cae en 'E' como default seguro.
		const tipoPersona: TipoPersonaAsistencia = filter === 'P' ? 'P' : 'E';
		this._selectedItem.set(null);
		this._formData.set({
			tipoOperacion: tipo,
			estudianteId: null,
			sedeId: this._sedeId(),
			horaEntrada: null,
			horaSalida: null,
			observacion: '',
			asistenciaId: null,
			tipoPersona,
		});
		this._isEditing.set(false);
		this._dialogVisible.set(true);
	}

	openSalidaDialog(item: AsistenciaAdminLista): void {
		this._selectedItem.set(item);
		this._formData.set({
			tipoOperacion: 'salida',
			estudianteId: item.estudianteId,
			sedeId: item.sedeId,
			horaEntrada: null,
			horaSalida: null,
			observacion: '',
			asistenciaId: item.asistenciaId,
			tipoPersona: item.tipoPersona,
		});
		this._isEditing.set(false);
		this._dialogVisible.set(true);
	}

	openEditDialog(item: AsistenciaAdminLista): void {
		this._selectedItem.set(item);
		this._formData.set({
			tipoOperacion: 'completa',
			estudianteId: item.estudianteId,
			sedeId: item.sedeId,
			horaEntrada: item.horaEntrada ? new Date(item.horaEntrada) : null,
			horaSalida: item.horaSalida ? new Date(item.horaSalida) : null,
			observacion: item.observacion ?? '',
			asistenciaId: item.asistenciaId,
			tipoPersona: item.tipoPersona,
		});
		this._isEditing.set(true);
		this._dialogVisible.set(true);
	}

	closeDialog(): void {
		this._dialogVisible.set(false);
	}

	openCierreDialog(): void {
		this._cierreDialogVisible.set(true);
	}

	closeCierreDialog(): void {
		this._cierreDialogVisible.set(false);
	}

	openConfirmDialog(): void {
		this._confirmDialogVisible.set(true);
	}

	closeConfirmDialog(): void {
		this._confirmDialogVisible.set(false);
	}

	setSelectedItem(item: AsistenciaAdminLista | null): void {
		this._selectedItem.set(item);
	}

	updateFormData(updates: Partial<AsistenciaFormData>): void {
		this._formData.update((fd) => ({ ...fd, ...updates }));
	}
	// #endregion
}

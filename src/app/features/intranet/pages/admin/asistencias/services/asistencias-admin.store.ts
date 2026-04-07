import { Injectable, computed, signal } from '@angular/core';

import {
	AsistenciaAdminEstadisticas,
	AsistenciaAdminLista,
	AsistenciaFormData,
	CierreMensualLista,
	EstudianteParaSeleccion,
	TipoOperacionAsistencia,
} from '../models';

@Injectable({ providedIn: 'root' })
export class AsistenciasAdminStore {
	// #region Estado privado
	private readonly _items = signal<AsistenciaAdminLista[]>([]);
	private readonly _estadisticas = signal<AsistenciaAdminEstadisticas | null>(null);
	private readonly _estudiantes = signal<EstudianteParaSeleccion[]>([]);
	private readonly _cierres = signal<CierreMensualLista[]>([]);
	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);

	private readonly _statsReady = signal(false);
	private readonly _tableReady = signal(false);

	// Filtros
	private readonly _fecha = signal<string>(new Date().toISOString().split('T')[0]);
	private readonly _sedeId = signal<number | null>(null);
	private readonly _searchTerm = signal('');

	// Sync
	private readonly _syncing = signal(false);

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
	});
	// #endregion

	// #region Lecturas publicas (readonly)
	readonly items = this._items.asReadonly();
	readonly estadisticas = this._estadisticas.asReadonly();
	readonly estudiantes = this._estudiantes.asReadonly();
	readonly cierres = this._cierres.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly statsReady = this._statsReady.asReadonly();
	readonly tableReady = this._tableReady.asReadonly();

	readonly syncing = this._syncing.asReadonly();
	readonly fecha = this._fecha.asReadonly();
	readonly sedeId = this._sedeId.asReadonly();
	readonly searchTerm = this._searchTerm.asReadonly();

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
		estudiantes: this._estudiantes(),
		cierres: this._cierres(),
		isEmpty: this._items().length === 0,
	}));

	readonly uiVm = computed(() => ({
		loading: this._loading(),
		error: this._error(),
		statsReady: this._statsReady(),
		tableReady: this._tableReady(),
		syncing: this._syncing(),
		dialogVisible: this._dialogVisible(),
		cierreDialogVisible: this._cierreDialogVisible(),
		confirmDialogVisible: this._confirmDialogVisible(),
		fecha: this._fecha(),
		sedeId: this._sedeId(),
		searchTerm: this._searchTerm(),
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

	setEstudiantes(estudiantes: EstudianteParaSeleccion[]): void {
		this._estudiantes.set(estudiantes);
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
	// #endregion

	// #region Comandos de mutacion — UI
	openNewDialog(tipo: TipoOperacionAsistencia = 'entrada'): void {
		this._selectedItem.set(null);
		this._formData.set({
			tipoOperacion: tipo,
			estudianteId: null,
			sedeId: this._sedeId(),
			horaEntrada: null,
			horaSalida: null,
			observacion: '',
			asistenciaId: null,
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

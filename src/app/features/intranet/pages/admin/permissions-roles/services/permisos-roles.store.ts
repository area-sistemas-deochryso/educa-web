import { Injectable, signal, computed } from '@angular/core';

import { searchMatchAny } from '@core/helpers';
import { CapabilityCatalogItem, RolCapabilityMatrixRow } from '@core/services';
import { buildModuloCapabilitiesForDetail, type ModuloCapabilities } from '../helpers/permisos-modulos.utils';

export type { ModuloCapabilities } from '../helpers/permisos-modulos.utils';

// #region Interfaces
interface RolesCapabilityStats {
	totalRoles: number;
	totalCapabilities: number;
	totalModulos: number;
}
// #endregion

@Injectable({ providedIn: 'root' })
export class PermissionsRolesStore {
	// #region Private state
	private readonly _matrixRows = signal<RolCapabilityMatrixRow[]>([]);
	private readonly _catalog = signal<CapabilityCatalogItem[]>([]);
	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);

	private readonly _dialogVisible = signal(false);
	private readonly _detailDrawerVisible = signal(false);
	private readonly _isEditing = signal(false);

	private readonly _selectedRow = signal<RolCapabilityMatrixRow | null>(null);
	private readonly _selectedCapIds = signal<number[]>([]);

	private readonly _modulosCapabilities = signal<ModuloCapabilities[]>([]);
	private readonly _activeModuloIndex = signal(0);
	private readonly _capBusqueda = signal('');
	private readonly _confirmDialogVisible = signal(false);
	// #endregion

	// #region Public readonly
	readonly matrixRows = this._matrixRows.asReadonly();
	readonly catalog = this._catalog.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();

	readonly dialogVisible = this._dialogVisible.asReadonly();
	readonly detailDrawerVisible = this._detailDrawerVisible.asReadonly();
	readonly isEditing = this._isEditing.asReadonly();

	readonly selectedRow = this._selectedRow.asReadonly();
	readonly selectedCapIds = this._selectedCapIds.asReadonly();

	readonly modulosCapabilities = this._modulosCapabilities.asReadonly();
	readonly activeModuloIndex = this._activeModuloIndex.asReadonly();
	readonly capBusqueda = this._capBusqueda.asReadonly();
	readonly confirmDialogVisible = this._confirmDialogVisible.asReadonly();
	// #endregion

	// #region Computed
	readonly estadisticas = computed<RolesCapabilityStats>(() => {
		const catalog = this._catalog();
		const modulos = new Set(catalog.map((c) => c.modulo));
		return {
			totalRoles: this._matrixRows().length,
			totalCapabilities: catalog.length,
			totalModulos: modulos.size,
		};
	});

	readonly capsFiltradas = computed(() => {
		const modulos = this._modulosCapabilities();
		const busqueda = this._capBusqueda();
		const activeIndex = this._activeModuloIndex();

		if (activeIndex >= modulos.length) return [];
		const modulo = modulos[activeIndex];
		if (!busqueda) return modulo.capabilities;

		return modulo.capabilities.filter((c) =>
			searchMatchAny([c.nombre, c.codigo, c.descripcion ?? ''], busqueda),
		);
	});

	readonly isAllModuloSelected = computed(() => {
		const modulos = this._modulosCapabilities();
		const activeIndex = this._activeModuloIndex();
		if (activeIndex >= modulos.length) return false;

		const modulo = modulos[activeIndex];
		const current = this._selectedCapIds();
		return modulo.capabilities.every((c) => current.includes(c.id));
	});

	readonly capsCountLabel = computed(() => {
		const count = this._selectedCapIds().length;
		return `${count} capability${count !== 1 ? 's' : ''} seleccionada${count !== 1 ? 's' : ''}`;
	});

	readonly moduloCapabilitiesForDetail = computed(() => {
		const row = this._selectedRow();
		if (!row) return [];
		return buildModuloCapabilitiesForDetail(row.capabilityIds, this._catalog());
	});
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		matrixRows: this._matrixRows(),
		catalog: this._catalog(),
		estadisticas: this.estadisticas(),
		loading: this._loading(),
		error: this._error(),
		dialogVisible: this._dialogVisible(),
		detailDrawerVisible: this._detailDrawerVisible(),
		isEditing: this._isEditing(),
		confirmDialogVisible: this._confirmDialogVisible(),
		selectedRow: this._selectedRow(),
		selectedCapIds: this._selectedCapIds(),
		modulosCapabilities: this._modulosCapabilities(),
		activeModuloIndex: this._activeModuloIndex(),
		capBusqueda: this._capBusqueda(),
		capsFiltradas: this.capsFiltradas(),
		isAllModuloSelected: this.isAllModuloSelected(),
		capsCountLabel: this.capsCountLabel(),
		moduloCapabilitiesForDetail: this.moduloCapabilitiesForDetail(),
	}));
	// #endregion

	// #region Data commands
	setMatrixRows(rows: RolCapabilityMatrixRow[]): void {
		this._matrixRows.set(rows);
	}

	setCatalog(catalog: CapabilityCatalogItem[]): void {
		this._catalog.set(catalog);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setError(error: string | null): void {
		this._error.set(error);
	}

	clearError(): void {
		this._error.set(null);
	}

	updateRowCapabilities(rolId: number, capabilityIds: number[]): void {
		this._matrixRows.update((rows) =>
			rows.map((r) => (r.rolId === rolId ? { ...r, capabilityIds } : r)),
		);
	}
	// #endregion

	// #region UI commands
	openDialog(): void {
		this._dialogVisible.set(true);
	}

	closeDialog(): void {
		this._dialogVisible.set(false);
		this._capBusqueda.set('');
		this._activeModuloIndex.set(0);
	}

	openDetailDrawer(row: RolCapabilityMatrixRow): void {
		this._selectedRow.set(row);
		this._detailDrawerVisible.set(true);
	}

	closeDetailDrawer(): void {
		this._detailDrawerVisible.set(false);
	}

	openConfirmDialog(): void {
		this._confirmDialogVisible.set(true);
	}

	closeConfirmDialog(): void {
		this._confirmDialogVisible.set(false);
	}
	// #endregion

	// #region Form commands
	setSelectedRow(row: RolCapabilityMatrixRow | null): void {
		this._selectedRow.set(row);
	}

	setSelectedCapIds(ids: number[]): void {
		this._selectedCapIds.set(ids);
	}

	setIsEditing(editing: boolean): void {
		this._isEditing.set(editing);
	}

	setModulosCapabilities(modulos: ModuloCapabilities[]): void {
		this._modulosCapabilities.set(modulos);
	}

	setActiveModuloIndex(index: number): void {
		this._activeModuloIndex.set(index);
	}

	setCapBusqueda(term: string): void {
		this._capBusqueda.set(term);
	}

	toggleCapability(capId: number): void {
		const current = this._selectedCapIds();
		if (current.includes(capId)) {
			this._selectedCapIds.set(current.filter((id) => id !== capId));
		} else {
			this._selectedCapIds.set([...current, capId]);
		}
		this.updateModuloCount();
	}

	toggleAllCapabilitiesModulo(): void {
		const modulos = this._modulosCapabilities();
		const activeIndex = this._activeModuloIndex();
		if (activeIndex >= modulos.length) return;

		const modulo = modulos[activeIndex];
		const moduloIds = modulo.capabilities.map((c) => c.id);
		const current = this._selectedCapIds();

		const allSelected = moduloIds.every((id) => current.includes(id));

		if (allSelected) {
			this._selectedCapIds.set(current.filter((id) => !moduloIds.includes(id)));
		} else {
			const nuevas = moduloIds.filter((id) => !current.includes(id));
			this._selectedCapIds.set([...current, ...nuevas]);
		}
		this.updateModuloCount();
	}

	private updateModuloCount(): void {
		const modulos = this._modulosCapabilities();
		const selected = this._selectedCapIds();

		const updated = modulos.map((m) => ({
			...m,
			seleccionadas: m.capabilities.filter((c) => selected.includes(c.id)).length,
		}));

		this._modulosCapabilities.set(updated);
	}
	// #endregion
}

import { Injectable, signal, computed, inject } from '@angular/core';

import { PermisoRol, Vista, ROLES_DISPONIBLES_ADMIN, RolTipoAdmin } from '@core/services';
import { AdminUtilsService } from '@shared/services';

// #region Interfaces
export interface ModuloVistas {
	nombre: string;
	vistas: Vista[];
	seleccionadas: number;
	total: number;
}

interface PermisosRolesEstadisticas {
	totalRoles: number;
	totalVistas: number;
	totalModulos: number;
	rolesConfigurados: number;
}
// #endregion

@Injectable({ providedIn: 'root' })
export class PermisosRolesStore {
	private adminUtils = inject(AdminUtilsService);

	// #region Estado privado
	private readonly _permisosRol = signal<PermisoRol[]>([]);
	private readonly _vistas = signal<Vista[]>([]);
	private readonly _loading = signal(false);

	private readonly _dialogVisible = signal(false);
	private readonly _detailDrawerVisible = signal(false);
	private readonly _isEditing = signal(false);

	private readonly _selectedPermiso = signal<PermisoRol | null>(null);
	private readonly _selectedRol = signal<RolTipoAdmin | null>(null);
	private readonly _selectedVistas = signal<string[]>([]);

	private readonly _modulosVistas = signal<ModuloVistas[]>([]);
	private readonly _activeModuloIndex = signal(0);
	private readonly _vistasBusqueda = signal('');
	private readonly _confirmDialogVisible = signal(false);

	private readonly _page = signal(1);
	private readonly _pageSize = signal(10);
	private readonly _totalRecords = signal(0);
	// #endregion

	// #region Lecturas públicas (readonly)
	readonly permisosRol = this._permisosRol.asReadonly();
	readonly vistas = this._vistas.asReadonly();
	readonly loading = this._loading.asReadonly();

	readonly dialogVisible = this._dialogVisible.asReadonly();
	readonly detailDrawerVisible = this._detailDrawerVisible.asReadonly();
	readonly isEditing = this._isEditing.asReadonly();

	readonly selectedPermiso = this._selectedPermiso.asReadonly();
	readonly selectedRol = this._selectedRol.asReadonly();
	readonly selectedVistas = this._selectedVistas.asReadonly();

	readonly modulosVistas = this._modulosVistas.asReadonly();
	readonly activeModuloIndex = this._activeModuloIndex.asReadonly();
	readonly vistasBusqueda = this._vistasBusqueda.asReadonly();
	readonly confirmDialogVisible = this._confirmDialogVisible.asReadonly();

	readonly page = this._page.asReadonly();
	readonly pageSize = this._pageSize.asReadonly();
	readonly totalRecords = this._totalRecords.asReadonly();
	// #endregion

	// #region Computed — estadísticas
	readonly estadisticas = computed<PermisosRolesEstadisticas>(() => {
		const vistas = this._vistas();
		const modulos = new Set<string>();
		vistas.forEach((v) => modulos.add(this.adminUtils.getModuloFromRuta(v.ruta)));

		return {
			totalRoles: this._totalRecords(),
			totalVistas: vistas.length,
			totalModulos: modulos.size,
			rolesConfigurados: this._totalRecords(),
		};
	});

	readonly rolesNoConfigurados = computed<RolTipoAdmin[]>(() => {
		const rolesConfigurados = this._permisosRol().map((p) => p.rol);
		return ROLES_DISPONIBLES_ADMIN.filter((r) => !rolesConfigurados.includes(r));
	});

	readonly rolesSelectOptions = computed(() =>
		this.rolesNoConfigurados().map((r) => ({ label: r, value: r })),
	);
	// #endregion

	// #region Computed — filtrado de vistas en diálogo
	readonly vistasFiltradas = computed(() => {
		const modulos = this._modulosVistas();
		const busqueda = this._vistasBusqueda().toLowerCase();
		const activeIndex = this._activeModuloIndex();

		if (activeIndex >= modulos.length) return [];

		const modulo = modulos[activeIndex];
		if (!busqueda) return modulo.vistas;

		return modulo.vistas.filter(
			(v) =>
				v.nombre.toLowerCase().includes(busqueda) ||
				v.ruta.toLowerCase().includes(busqueda),
		);
	});

	readonly isAllModuloSelected = computed(() => {
		const modulos = this._modulosVistas();
		const activeIndex = this._activeModuloIndex();
		if (activeIndex >= modulos.length) return false;

		const modulo = modulos[activeIndex];
		const current = this._selectedVistas();
		return modulo.vistas.every((v) => current.includes(v.ruta));
	});

	readonly vistasCountLabel = computed(() => {
		const count = this._selectedVistas().length;
		return this.adminUtils.getVistasCountLabel(count);
	});

	/** Detalle del drawer: agrupar vistas del permiso por módulo */
	readonly moduloVistasForDetail = computed(() => {
		const permiso = this._selectedPermiso();
		if (!permiso) return [];

		const vistasActivas = this._vistas();
		const modulosMap = new Map<string, Vista[]>();

		permiso.vistas.forEach((ruta) => {
			const modulo = this.adminUtils.getModuloFromRuta(ruta);
			const moduloCapitalized = modulo.charAt(0).toUpperCase() + modulo.slice(1);
			const vista = vistasActivas.find((v) => v.ruta === ruta);

			if (!modulosMap.has(moduloCapitalized)) {
				modulosMap.set(moduloCapitalized, []);
			}
			if (vista) {
				modulosMap.get(moduloCapitalized)!.push(vista);
			}
		});

		return Array.from(modulosMap.entries())
			.sort((a, b) => a[0].localeCompare(b[0]))
			.map(([nombre, vistas]) => ({
				nombre,
				vistas,
				seleccionadas: vistas.length,
				total: vistas.length,
			}));
	});
	// #endregion

	// #region ViewModel
	readonly vm = computed(() => ({
		permisosRol: this.permisosRol(),
		loading: this.loading(),
		estadisticas: this.estadisticas(),

		dialogVisible: this.dialogVisible(),
		detailDrawerVisible: this.detailDrawerVisible(),
		isEditing: this.isEditing(),

		selectedPermiso: this.selectedPermiso(),
		selectedRol: this.selectedRol(),
		selectedVistas: this.selectedVistas(),

		modulosVistas: this.modulosVistas(),
		activeModuloIndex: this.activeModuloIndex(),
		vistasBusqueda: this.vistasBusqueda(),
		vistasFiltradas: this.vistasFiltradas(),
		isAllModuloSelected: this.isAllModuloSelected(),

		rolesNoConfigurados: this.rolesNoConfigurados(),
		rolesSelectOptions: this.rolesSelectOptions(),
		moduloVistasForDetail: this.moduloVistasForDetail(),
		vistasCountLabel: this.vistasCountLabel(),
		confirmDialogVisible: this.confirmDialogVisible(),

		page: this.page(),
		pageSize: this.pageSize(),
		totalRecords: this.totalRecords(),
	}));
	// #endregion

	// #region Comandos de datos
	setPermisosRol(permisos: PermisoRol[]): void {
		this._permisosRol.set(permisos);
	}

	setVistas(vistas: Vista[]): void {
		this._vistas.set(vistas);
	}

	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	/** Mutación quirúrgica: eliminar 1 permiso */
	removePermiso(id: number): void {
		this._permisosRol.update((list) => list.filter((p) => p.id !== id));
		this._totalRecords.update((t) => Math.max(0, t - 1));
	}

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
		this._vistasBusqueda.set('');
		this._activeModuloIndex.set(0);
	}

	openDetailDrawer(permiso: PermisoRol): void {
		this._selectedPermiso.set(permiso);
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

	// #region Comandos de formulario
	setSelectedPermiso(permiso: PermisoRol | null): void {
		this._selectedPermiso.set(permiso);
	}

	setSelectedRol(rol: RolTipoAdmin | null): void {
		this._selectedRol.set(rol);
	}

	setSelectedVistas(vistas: string[]): void {
		this._selectedVistas.set(vistas);
	}

	setIsEditing(editing: boolean): void {
		this._isEditing.set(editing);
	}

	setModulosVistas(modulos: ModuloVistas[]): void {
		this._modulosVistas.set(modulos);
	}

	setActiveModuloIndex(index: number): void {
		this._activeModuloIndex.set(index);
	}

	setVistasBusqueda(term: string): void {
		this._vistasBusqueda.set(term);
	}

	toggleVista(ruta: string): void {
		const current = this._selectedVistas();
		if (current.includes(ruta)) {
			this._selectedVistas.set(current.filter((v) => v !== ruta));
		} else {
			this._selectedVistas.set([...current, ruta]);
		}
		this.updateModuloCount();
	}

	toggleAllVistasModulo(): void {
		const modulos = this._modulosVistas();
		const activeIndex = this._activeModuloIndex();
		if (activeIndex >= modulos.length) return;

		const modulo = modulos[activeIndex];
		const moduloRutas = modulo.vistas.map((v) => v.ruta);
		const current = this._selectedVistas();

		const allSelected = moduloRutas.every((r) => current.includes(r));

		if (allSelected) {
			this._selectedVistas.set(current.filter((r) => !moduloRutas.includes(r)));
		} else {
			const nuevas = moduloRutas.filter((r) => !current.includes(r));
			this._selectedVistas.set([...current, ...nuevas]);
		}
		this.updateModuloCount();
	}

	private updateModuloCount(): void {
		const modulos = this._modulosVistas();
		const selected = this._selectedVistas();

		const updated = modulos.map((m) => ({
			...m,
			seleccionadas: m.vistas.filter((v) => selected.includes(v.ruta)).length,
		}));

		this._modulosVistas.set(updated);
	}
	// #endregion

	// #region Helpers — construir módulos de vistas
	buildModulosVistas(vistasSeleccionadas: string[]): void {
		const vistasActivas = this._vistas();
		const modulosMap = new Map<string, Vista[]>();

		vistasActivas.forEach((vista) => {
			const modulo = this.adminUtils.getModuloFromRuta(vista.ruta);
			const moduloCapitalized = modulo.charAt(0).toUpperCase() + modulo.slice(1);

			if (!modulosMap.has(moduloCapitalized)) {
				modulosMap.set(moduloCapitalized, []);
			}
			modulosMap.get(moduloCapitalized)!.push(vista);
		});

		const modulos: ModuloVistas[] = Array.from(modulosMap.entries())
			.sort((a, b) => a[0].localeCompare(b[0]))
			.map(([nombre, vistas]) => ({
				nombre,
				vistas: vistas.sort((a, b) => a.nombre.localeCompare(b.nombre)),
				seleccionadas: vistas.filter((v) => vistasSeleccionadas.includes(v.ruta)).length,
				total: vistas.length,
			}));

		this._modulosVistas.set(modulos);
	}
	// #endregion
}

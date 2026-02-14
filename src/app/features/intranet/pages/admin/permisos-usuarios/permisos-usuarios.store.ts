// #region Imports
import { Injectable, computed, signal } from '@angular/core';
import { PermisoUsuario, PermisoRol, Vista, RolTipoAdmin } from '@core/services';

// #endregion
// #region Implementation
export interface ModuloVistas {
	nombre: string;
	vistas: Vista[];
	seleccionadas: number;
	total: number;
}

@Injectable({ providedIn: 'root' })
export class PermisosUsuariosStore {
	// Estado privado - Data
	private readonly _permisosUsuario = signal<PermisoUsuario[]>([]);
	private readonly _permisosRol = signal<PermisoRol[]>([]);
	private readonly _vistas = signal<Vista[]>([]);

	// Estado privado - UI
	private readonly _loading = signal(false);
	private readonly _searchTerm = signal('');
	private readonly _filterRol = signal<RolTipoAdmin | null>(null);

	// Estado privado - Dialogs
	private readonly _dialogVisible = signal(false);
	private readonly _detailDrawerVisible = signal(false);
	private readonly _isEditing = signal(false);

	// Estado privado - Form
	private readonly _selectedPermiso = signal<PermisoUsuario | null>(null);
	private readonly _selectedUsuarioId = signal<number | null>(null);
	private readonly _selectedRol = signal<RolTipoAdmin | null>(null);
	private readonly _selectedVistas = signal<string[]>([]);

	// Estado privado - Module tabs
	private readonly _modulosVistas = signal<ModuloVistas[]>([]);
	private readonly _activeModuloIndex = signal(0);
	private readonly _vistasBusqueda = signal('');

	// Estado pÃƒÂºblico readonly - Data
	readonly permisosUsuario = this._permisosUsuario.asReadonly();
	readonly permisosRol = this._permisosRol.asReadonly();
	readonly vistas = this._vistas.asReadonly();

	// Estado pÃƒÂºblico readonly - UI
	readonly loading = this._loading.asReadonly();
	readonly searchTerm = this._searchTerm.asReadonly();
	readonly filterRol = this._filterRol.asReadonly();

	// Estado pÃƒÂºblico readonly - Dialogs
	readonly dialogVisible = this._dialogVisible.asReadonly();
	readonly detailDrawerVisible = this._detailDrawerVisible.asReadonly();
	readonly isEditing = this._isEditing.asReadonly();

	// Estado pÃƒÂºblico readonly - Form
	readonly selectedPermiso = this._selectedPermiso.asReadonly();
	readonly selectedUsuarioId = this._selectedUsuarioId.asReadonly();
	readonly selectedRol = this._selectedRol.asReadonly();
	readonly selectedVistas = this._selectedVistas.asReadonly();

	// Estado pÃƒÂºblico readonly - Module tabs
	readonly modulosVistas = this._modulosVistas.asReadonly();
	readonly activeModuloIndex = this._activeModuloIndex.asReadonly();
	readonly vistasBusqueda = this._vistasBusqueda.asReadonly();

	// Computed - Filtered data
	readonly filteredPermisos = computed(() => {
		let permisos = this._permisosUsuario();
		const search = this._searchTerm().toLowerCase();
		const filtroRol = this._filterRol();

		if (search) {
			permisos = permisos.filter(
				(p) =>
					p.nombreUsuario?.toLowerCase().includes(search) ||
					p.usuarioId.toString().includes(search),
			);
		}

		if (filtroRol) {
			permisos = permisos.filter((p) => p.rol === filtroRol);
		}

		return permisos;
	});

	// Computed - Vistas filtradas por bÃƒÂºsqueda en modal de ediciÃƒÂ³n
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

	// Computed - Check if all module vistas are selected
	readonly isAllModuloSelected = computed(() => {
		const modulos = this._modulosVistas();
		const activeIndex = this._activeModuloIndex();
		if (activeIndex >= modulos.length) return false;

		const modulo = modulos[activeIndex];
		const current = this._selectedVistas();
		return modulo.vistas.every((v) => current.includes(v.ruta));
	});

	// Comandos - Data
	setPermisosUsuario(permisos: PermisoUsuario[]): void {
		this._permisosUsuario.set(permisos);
	}

	setPermisosRol(permisos: PermisoRol[]): void {
		this._permisosRol.set(permisos);
	}

	setVistas(vistas: Vista[]): void {
		this._vistas.set(vistas);
	}

	// Comandos - UI
	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setSearchTerm(term: string): void {
		this._searchTerm.set(term);
	}

	setFilterRol(rol: RolTipoAdmin | null): void {
		this._filterRol.set(rol);
	}

	clearFilters(): void {
		this._searchTerm.set('');
		this._filterRol.set(null);
	}

	// Comandos - Dialogs
	setDialogVisible(visible: boolean): void {
		this._dialogVisible.set(visible);
	}

	setDetailDrawerVisible(visible: boolean): void {
		this._detailDrawerVisible.set(visible);
	}

	setIsEditing(editing: boolean): void {
		this._isEditing.set(editing);
	}

	// Comandos - Form
	setSelectedPermiso(permiso: PermisoUsuario | null): void {
		this._selectedPermiso.set(permiso);
	}

	setSelectedUsuarioId(id: number | null): void {
		this._selectedUsuarioId.set(id);
	}

	setSelectedRol(rol: RolTipoAdmin | null): void {
		this._selectedRol.set(rol);
	}

	setSelectedVistas(vistas: string[]): void {
		this._selectedVistas.set(vistas);
	}

	toggleVista(ruta: string): void {
		const current = this._selectedVistas();
		if (current.includes(ruta)) {
			this._selectedVistas.set(current.filter((v) => v !== ruta));
		} else {
			this._selectedVistas.set([...current, ruta]);
		}
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
			// Deseleccionar todas
			this._selectedVistas.set(current.filter((r) => !moduloRutas.includes(r)));
		} else {
			// Seleccionar todas
			const nuevas = moduloRutas.filter((r) => !current.includes(r));
			this._selectedVistas.set([...current, ...nuevas]);
		}
	}

	// Comandos - Module tabs
	setModulosVistas(modulos: ModuloVistas[]): void {
		this._modulosVistas.set(modulos);
	}

	updateModuloCount(): void {
		const modulos = this._modulosVistas();
		const selected = this._selectedVistas();

		const updated = modulos.map((m) => ({
			...m,
			seleccionadas: m.vistas.filter((v) => selected.includes(v.ruta)).length,
		}));

		this._modulosVistas.set(updated);
	}

	setActiveModuloIndex(index: number): void {
		this._activeModuloIndex.set(index);
	}

	setVistasBusqueda(term: string): void {
		this._vistasBusqueda.set(term);
	}

	// Resetear estado de diÃƒÂ¡logos
	resetDialogState(): void {
		this._selectedPermiso.set(null);
		this._selectedUsuarioId.set(null);
		this._selectedRol.set(null);
		this._selectedVistas.set([]);
		this._modulosVistas.set([]);
		this._activeModuloIndex.set(0);
		this._vistasBusqueda.set('');
		this._isEditing.set(false);
	}
}
// #endregion

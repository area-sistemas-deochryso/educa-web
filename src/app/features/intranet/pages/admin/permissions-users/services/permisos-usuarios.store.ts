import { Injectable, computed, signal } from '@angular/core';
import { searchMatchAny } from '@core/helpers';
import { PermisoUsuario, PermisoRol, Vista, RolTipoAdmin, UsuarioBusqueda } from '@core/services';

export interface ModuloVistas {
	nombre: string;
	vistas: Vista[];
	seleccionadas: number;
	total: number;
}

@Injectable({ providedIn: 'root' })
export class PermissionsUsersStore {
	// #region Estado privado
	private readonly _permisosUsuario = signal<PermisoUsuario[]>([]);
	private readonly _permisosRol = signal<PermisoRol[]>([]);
	private readonly _vistas = signal<Vista[]>([]);

	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);
	private readonly _searchTerm = signal('');
	private readonly _filterRol = signal<RolTipoAdmin | null>(null);

	private readonly _dialogVisible = signal(false);
	private readonly _detailDrawerVisible = signal(false);
	private readonly _isEditing = signal(false);

	private readonly _selectedPermiso = signal<PermisoUsuario | null>(null);
	private readonly _selectedUsuarioId = signal<number | null>(null);
	private readonly _selectedRol = signal<RolTipoAdmin | null>(null);
	private readonly _selectedVistas = signal<string[]>([]);

	private readonly _usuariosSugeridos = signal<UsuarioBusqueda[]>([]);

	private readonly _modulosVistas = signal<ModuloVistas[]>([]);
	private readonly _activeModuloIndex = signal(0);
	private readonly _vistasBusqueda = signal('');
	// #endregion

	// #region Lecturas públicas (readonly)
	readonly permisosUsuario = this._permisosUsuario.asReadonly();
	readonly permisosRol = this._permisosRol.asReadonly();
	readonly vistas = this._vistas.asReadonly();

	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly searchTerm = this._searchTerm.asReadonly();
	readonly filterRol = this._filterRol.asReadonly();

	readonly dialogVisible = this._dialogVisible.asReadonly();
	readonly detailDrawerVisible = this._detailDrawerVisible.asReadonly();
	readonly isEditing = this._isEditing.asReadonly();

	readonly selectedPermiso = this._selectedPermiso.asReadonly();
	readonly selectedUsuarioId = this._selectedUsuarioId.asReadonly();
	readonly selectedRol = this._selectedRol.asReadonly();
	readonly selectedVistas = this._selectedVistas.asReadonly();

	readonly usuariosSugeridos = this._usuariosSugeridos.asReadonly();

	readonly modulosVistas = this._modulosVistas.asReadonly();
	readonly activeModuloIndex = this._activeModuloIndex.asReadonly();
	readonly vistasBusqueda = this._vistasBusqueda.asReadonly();
	// #endregion

	// #region Computed
	readonly vm = computed(() => ({
		permisosUsuario: this._permisosUsuario(),
		loading: this._loading(),
		error: this._error(),
		searchTerm: this._searchTerm(),
		filterRol: this._filterRol(),
		dialogVisible: this._dialogVisible(),
		detailDrawerVisible: this._detailDrawerVisible(),
		isEditing: this._isEditing(),
		selectedPermiso: this._selectedPermiso(),
		filteredPermisos: this.filteredPermisos(),
	}));

	readonly filteredPermisos = computed(() => {
		let permisos = this._permisosUsuario();
		const search = this._searchTerm();
		const filtroRol = this._filterRol();

		if (search) {
			permisos = permisos.filter((p) =>
				searchMatchAny([p.nombreUsuario, p.usuarioId.toString()], search),
			);
		}

		if (filtroRol) {
			permisos = permisos.filter((p) => p.rol === filtroRol);
		}

		return permisos;
	});

	// Computed - Vistas filtradas por búsqueda en modal de edición
	readonly vistasFiltradas = computed(() => {
		const modulos = this._modulosVistas();
		const busqueda = this._vistasBusqueda();
		const activeIndex = this._activeModuloIndex();

		if (activeIndex >= modulos.length) return [];

		const modulo = modulos[activeIndex];
		if (!busqueda) return modulo.vistas;

		return modulo.vistas.filter((v) => searchMatchAny([v.nombre, v.ruta], busqueda));
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
	// #endregion

	// #region Comandos de mutación
	setPermisosUsuario(permisos: PermisoUsuario[]): void {
		this._permisosUsuario.set(permisos);
	}

	/** Mutación quirúrgica: eliminar 1 permiso usuario */
	removePermisoUsuario(id: number): void {
		this._permisosUsuario.update((list) => list.filter((p) => p.id !== id));
	}

	/** Mutación quirúrgica: re-agregar 1 permiso usuario (rollback de delete) */
	addPermisoUsuario(permiso: PermisoUsuario): void {
		this._permisosUsuario.update((list) => [permiso, ...list]);
	}

	setPermisosRol(permisos: PermisoRol[]): void {
		this._permisosRol.set(permisos);
	}

	setVistas(vistas: Vista[]): void {
		this._vistas.set(vistas);
	}
	// #endregion

	// #region Comandos de UI
	setLoading(loading: boolean): void {
		this._loading.set(loading);
	}

	setError(error: string | null): void {
		this._error.set(error);
	}

	clearError(): void {
		this._error.set(null);
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
	// #endregion

	// #region Comandos de diálogos
	setDialogVisible(visible: boolean): void {
		this._dialogVisible.set(visible);
	}

	setDetailDrawerVisible(visible: boolean): void {
		this._detailDrawerVisible.set(visible);
	}

	setIsEditing(editing: boolean): void {
		this._isEditing.set(editing);
	}
	// #endregion

	// #region Comandos de formulario
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
	// #endregion

	// #region Comandos de autocompletado y módulos
	setUsuariosSugeridos(usuarios: UsuarioBusqueda[]): void {
		this._usuariosSugeridos.set(usuarios);
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
	// #endregion

	// #region Reset
	resetDialogState(): void {
		this._selectedPermiso.set(null);
		this._selectedUsuarioId.set(null);
		this._selectedRol.set(null);
		this._selectedVistas.set([]);
		this._usuariosSugeridos.set([]);
		this._modulosVistas.set([]);
		this._activeModuloIndex.set(0);
		this._vistasBusqueda.set('');
		this._isEditing.set(false);
	}
	// #endregion
}

import { Injectable, computed, signal } from '@angular/core';
import { searchMatchAny } from '@core/helpers';
import {
	CapabilityCatalogItem,
	RolCapabilityMatrixRow,
	UsuarioBusqueda,
	UsuarioCapabilityOverview,
} from '@core/services';
import { capitalize, groupBy, sortedEntries } from '@core/helpers';
import type { ModuloCapabilities } from './permisos-usuarios.models';

@Injectable({ providedIn: 'root' })
export class PermissionsUsersStore {
	// #region Private state
	private readonly _catalog = signal<CapabilityCatalogItem[]>([]);
	private readonly _matrixRows = signal<RolCapabilityMatrixRow[]>([]);

	private readonly _loading = signal(false);
	private readonly _error = signal<string | null>(null);

	private readonly _usuariosSugeridos = signal<UsuarioBusqueda[]>([]);
	private readonly _selectedUsuario = signal<UsuarioBusqueda | null>(null);
	private readonly _selectedRolId = signal<number | null>(null);
	private readonly _overview = signal<UsuarioCapabilityOverview | null>(null);

	private readonly _dialogVisible = signal(false);
	private readonly _grantIds = signal<number[]>([]);
	private readonly _denyIds = signal<number[]>([]);

	private readonly _activeModuloIndex = signal(0);
	private readonly _capBusqueda = signal('');
	// #endregion

	// #region Public readonly
	readonly catalog = this._catalog.asReadonly();
	readonly matrixRows = this._matrixRows.asReadonly();
	readonly loading = this._loading.asReadonly();
	readonly error = this._error.asReadonly();
	readonly usuariosSugeridos = this._usuariosSugeridos.asReadonly();
	readonly selectedUsuario = this._selectedUsuario.asReadonly();
	readonly selectedRolId = this._selectedRolId.asReadonly();
	readonly overview = this._overview.asReadonly();
	readonly dialogVisible = this._dialogVisible.asReadonly();
	readonly grantIds = this._grantIds.asReadonly();
	readonly denyIds = this._denyIds.asReadonly();
	readonly activeModuloIndex = this._activeModuloIndex.asReadonly();
	readonly capBusqueda = this._capBusqueda.asReadonly();
	// #endregion

	// #region Computed
	readonly roles = computed(() =>
		this._matrixRows().map((r) => ({ label: r.rolNombre, value: r.rolId })),
	);

	readonly moduloCapabilities = computed<ModuloCapabilities[]>(() => {
		const catalog = this._catalog();
		if (!catalog.length) return [];

		const grouped = groupBy(catalog, (c) => capitalize(c.modulo));
		return sortedEntries(grouped).map(([nombre, caps]) => ({
			nombre,
			capabilities: caps.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre)),
			total: caps.length,
		}));
	});

	readonly capsFiltradas = computed(() => {
		const modulos = this.moduloCapabilities();
		const busqueda = this._capBusqueda();
		const activeIndex = this._activeModuloIndex();

		if (activeIndex >= modulos.length) return [];
		const modulo = modulos[activeIndex];
		if (!busqueda) return modulo.capabilities;

		return modulo.capabilities.filter((c) =>
			searchMatchAny([c.nombre, c.codigo, c.descripcion ?? ''], busqueda),
		);
	});

	readonly effectiveCaps = computed(() => {
		const overview = this._overview();
		if (!overview) return new Set<number>();
		const effective = new Set(overview.inheritedCapabilityIds);
		for (const id of this._grantIds()) effective.add(id);
		for (const id of this._denyIds()) effective.delete(id);
		return effective;
	});

	readonly overrideSummary = computed(() => ({
		inherited: this._overview()?.inheritedCapabilityIds.length ?? 0,
		grants: this._grantIds().length,
		denies: this._denyIds().length,
		effective: this.effectiveCaps().size,
	}));

	readonly vm = computed(() => ({
		catalog: this._catalog(),
		loading: this._loading(),
		error: this._error(),
		usuariosSugeridos: this._usuariosSugeridos(),
		selectedUsuario: this._selectedUsuario(),
		selectedRolId: this._selectedRolId(),
		overview: this._overview(),
		dialogVisible: this._dialogVisible(),
		grantIds: this._grantIds(),
		denyIds: this._denyIds(),
		roles: this.roles(),
		moduloCapabilities: this.moduloCapabilities(),
		activeModuloIndex: this._activeModuloIndex(),
		capBusqueda: this._capBusqueda(),
		capsFiltradas: this.capsFiltradas(),
		effectiveCaps: this.effectiveCaps(),
		overrideSummary: this.overrideSummary(),
	}));
	// #endregion

	// #region Data commands
	setCatalog(catalog: CapabilityCatalogItem[]): void {
		this._catalog.set(catalog);
	}

	setMatrixRows(rows: RolCapabilityMatrixRow[]): void {
		this._matrixRows.set(rows);
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

	setUsuariosSugeridos(usuarios: UsuarioBusqueda[]): void {
		this._usuariosSugeridos.set(usuarios);
	}

	setSelectedUsuario(usuario: UsuarioBusqueda | null): void {
		this._selectedUsuario.set(usuario);
	}

	setSelectedRolId(rolId: number | null): void {
		this._selectedRolId.set(rolId);
	}

	setOverview(overview: UsuarioCapabilityOverview | null): void {
		this._overview.set(overview);
		if (overview) {
			this._grantIds.set([...overview.grantIds]);
			this._denyIds.set([...overview.denyIds]);
		}
	}
	// #endregion

	// #region Dialog commands
	openDialog(): void {
		this._dialogVisible.set(true);
	}

	closeDialog(): void {
		this._dialogVisible.set(false);
		this._activeModuloIndex.set(0);
		this._capBusqueda.set('');
	}

	setActiveModuloIndex(index: number): void {
		this._activeModuloIndex.set(index);
	}

	setCapBusqueda(term: string): void {
		this._capBusqueda.set(term);
	}
	// #endregion

	// #region Grant/Deny toggle
	toggleGrant(capId: number): void {
		const grants = this._grantIds();
		if (grants.includes(capId)) {
			this._grantIds.set(grants.filter((id) => id !== capId));
		} else {
			this._grantIds.set([...grants, capId]);
			this._denyIds.update((d) => d.filter((id) => id !== capId));
		}
	}

	toggleDeny(capId: number): void {
		const denies = this._denyIds();
		if (denies.includes(capId)) {
			this._denyIds.set(denies.filter((id) => id !== capId));
		} else {
			this._denyIds.set([...denies, capId]);
			this._grantIds.update((g) => g.filter((id) => id !== capId));
		}
	}
	// #endregion

	// #region Reset
	resetSelection(): void {
		this._selectedUsuario.set(null);
		this._selectedRolId.set(null);
		this._overview.set(null);
		this._grantIds.set([]);
		this._denyIds.set([]);
		this._usuariosSugeridos.set([]);
	}
	// #endregion
}

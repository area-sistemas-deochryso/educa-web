import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { PermissionsUsersStore } from './permisos-usuarios.store';
import {
	CapabilityCatalogItem,
	RolCapabilityMatrixRow,
	UsuarioBusqueda,
	UsuarioCapabilityOverview,
} from '@core/services';

// #region Fixtures
const mockCatalog: CapabilityCatalogItem[] = [
	{ id: 1, codigo: 'USR_CREATE', nombre: 'Crear usuario', modulo: 'usuarios', orden: 1 },
	{ id: 2, codigo: 'USR_READ', nombre: 'Ver usuario', modulo: 'usuarios', orden: 2 },
	{ id: 3, codigo: 'CRS_CREATE', nombre: 'Crear curso', modulo: 'cursos', orden: 1 },
	{ id: 4, codigo: 'CRS_READ', nombre: 'Ver curso', modulo: 'cursos', descripcion: 'Lectura de cursos', orden: 2 },
];

const mockMatrixRows: RolCapabilityMatrixRow[] = [
	{ rolId: 1, rolNombre: 'Director', capabilityIds: [1, 2, 3] },
	{ rolId: 2, rolNombre: 'Profesor', capabilityIds: [2, 4] },
];

const mockUsuario: UsuarioBusqueda = {
	id: 10,
	nombreCompleto: 'Juan Pérez',
	rol: 'Director' as any,
};

const mockUsuarios: UsuarioBusqueda[] = [
	mockUsuario,
	{ id: 20, nombreCompleto: 'María García', rol: 'Profesor' as any },
];

const mockOverview: UsuarioCapabilityOverview = {
	entityId: 10,
	rolId: 1,
	inheritedCapabilityIds: [1, 2, 3],
	grantIds: [4],
	denyIds: [3],
};
// #endregion

describe('PermissionsUsersStore', () => {
	let store: PermissionsUsersStore;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [PermissionsUsersStore],
		});
		store = TestBed.inject(PermissionsUsersStore);
	});

	// #region Estado inicial
	describe('estado inicial', () => {
		it('debería tener datos vacíos', () => {
			expect(store.catalog()).toEqual([]);
			expect(store.matrixRows()).toEqual([]);
			expect(store.loading()).toBe(false);
			expect(store.error()).toBeNull();
		});

		it('debería tener selección vacía', () => {
			expect(store.selectedUsuario()).toBeNull();
			expect(store.selectedRolId()).toBeNull();
			expect(store.overview()).toBeNull();
			expect(store.usuariosSugeridos()).toEqual([]);
		});

		it('debería tener diálogo cerrado', () => {
			expect(store.dialogVisible()).toBe(false);
			expect(store.grantIds()).toEqual([]);
			expect(store.denyIds()).toEqual([]);
			expect(store.activeModuloIndex()).toBe(0);
			expect(store.capBusqueda()).toBe('');
		});
	});
	// #endregion

	// #region Comandos de datos
	describe('comandos de datos', () => {
		it('setCatalog debería actualizar el catálogo', () => {
			store.setCatalog(mockCatalog);
			expect(store.catalog()).toEqual(mockCatalog);
		});

		it('setMatrixRows debería actualizar las filas de matriz', () => {
			store.setMatrixRows(mockMatrixRows);
			expect(store.matrixRows()).toEqual(mockMatrixRows);
		});

		it('setLoading debería cambiar el estado de carga', () => {
			store.setLoading(true);
			expect(store.loading()).toBe(true);
		});

		it('setError debería asignar el mensaje de error', () => {
			store.setError('Falló la carga');
			expect(store.error()).toBe('Falló la carga');
		});

		it('clearError debería limpiar el error', () => {
			store.setError('error');
			store.clearError();
			expect(store.error()).toBeNull();
		});

		it('setUsuariosSugeridos debería actualizar sugerencias', () => {
			store.setUsuariosSugeridos(mockUsuarios);
			expect(store.usuariosSugeridos()).toEqual(mockUsuarios);
		});

		it('setSelectedUsuario debería seleccionar un usuario', () => {
			store.setSelectedUsuario(mockUsuario);
			expect(store.selectedUsuario()).toEqual(mockUsuario);
		});

		it('setSelectedRolId debería seleccionar un rol', () => {
			store.setSelectedRolId(2);
			expect(store.selectedRolId()).toBe(2);
		});

		it('setOverview debería asignar overview y copiar grants/denies', () => {
			store.setOverview(mockOverview);

			expect(store.overview()).toEqual(mockOverview);
			expect(store.grantIds()).toEqual([4]);
			expect(store.denyIds()).toEqual([3]);
		});

		it('setOverview con null no debería modificar grants/denies', () => {
			store.setOverview(mockOverview);
			store.setOverview(null);

			expect(store.overview()).toBeNull();
			expect(store.grantIds()).toEqual([4]);
			expect(store.denyIds()).toEqual([3]);
		});
	});
	// #endregion

	// #region Comandos de diálogo
	describe('comandos de diálogo', () => {
		it('openDialog debería abrir el diálogo', () => {
			store.openDialog();
			expect(store.dialogVisible()).toBe(true);
		});

		it('closeDialog debería cerrar y resetear índice y búsqueda', () => {
			store.openDialog();
			store.setActiveModuloIndex(2);
			store.setCapBusqueda('test');

			store.closeDialog();

			expect(store.dialogVisible()).toBe(false);
			expect(store.activeModuloIndex()).toBe(0);
			expect(store.capBusqueda()).toBe('');
		});

		it('setActiveModuloIndex debería cambiar el índice activo', () => {
			store.setActiveModuloIndex(3);
			expect(store.activeModuloIndex()).toBe(3);
		});

		it('setCapBusqueda debería cambiar el término de búsqueda', () => {
			store.setCapBusqueda('crear');
			expect(store.capBusqueda()).toBe('crear');
		});
	});
	// #endregion

	// #region Computed — roles
	describe('computed: roles', () => {
		it('debería derivar roles desde matrixRows', () => {
			store.setMatrixRows(mockMatrixRows);
			expect(store.roles()).toEqual([
				{ label: 'Director', value: 1 },
				{ label: 'Profesor', value: 2 },
			]);
		});

		it('debería retornar vacío sin matrixRows', () => {
			expect(store.roles()).toEqual([]);
		});
	});
	// #endregion

	// #region Computed — moduloCapabilities
	describe('computed: moduloCapabilities', () => {
		it('debería agrupar y ordenar por módulo', () => {
			store.setCatalog(mockCatalog);
			const modulos = store.moduloCapabilities();

			expect(modulos).toHaveLength(2);
			expect(modulos[0].nombre).toBe('Cursos');
			expect(modulos[1].nombre).toBe('Usuarios');
		});

		it('debería ordenar capabilities por orden dentro del módulo', () => {
			store.setCatalog(mockCatalog);
			const usuarios = store.moduloCapabilities().find((m) => m.nombre === 'Usuarios')!;

			expect(usuarios.capabilities[0].codigo).toBe('USR_CREATE');
			expect(usuarios.capabilities[1].codigo).toBe('USR_READ');
		});

		it('debería tener total correcto', () => {
			store.setCatalog(mockCatalog);
			const cursos = store.moduloCapabilities().find((m) => m.nombre === 'Cursos')!;
			expect(cursos.total).toBe(2);
		});

		it('debería retornar vacío sin catálogo', () => {
			expect(store.moduloCapabilities()).toEqual([]);
		});
	});
	// #endregion

	// #region Computed — capsFiltradas
	describe('computed: capsFiltradas', () => {
		beforeEach(() => {
			store.setCatalog(mockCatalog);
		});

		it('debería retornar todas las caps del módulo activo sin filtro', () => {
			store.setActiveModuloIndex(0);
			const caps = store.capsFiltradas();
			expect(caps).toHaveLength(2);
		});

		it('debería filtrar por término de búsqueda', () => {
			store.setActiveModuloIndex(0);
			store.setCapBusqueda('crear');
			expect(store.capsFiltradas()).toHaveLength(1);
		});

		it('debería retornar vacío para índice fuera de rango', () => {
			store.setActiveModuloIndex(99);
			expect(store.capsFiltradas()).toEqual([]);
		});
	});
	// #endregion

	// #region Computed — effectiveCaps
	describe('computed: effectiveCaps', () => {
		it('debería combinar inherited + grants - denies', () => {
			store.setOverview(mockOverview);
			const effective = store.effectiveCaps();

			expect(effective.has(1)).toBe(true);
			expect(effective.has(2)).toBe(true);
			expect(effective.has(3)).toBe(false);
			expect(effective.has(4)).toBe(true);
		});

		it('debería retornar Set vacío sin overview', () => {
			expect(store.effectiveCaps().size).toBe(0);
		});
	});
	// #endregion

	// #region Computed — overrideSummary
	describe('computed: overrideSummary', () => {
		it('debería calcular resumen con overview activo', () => {
			store.setOverview(mockOverview);
			const summary = store.overrideSummary();

			expect(summary.inherited).toBe(3);
			expect(summary.grants).toBe(1);
			expect(summary.denies).toBe(1);
			expect(summary.effective).toBe(3);
		});

		it('debería retornar ceros sin overview', () => {
			const summary = store.overrideSummary();
			expect(summary).toEqual({ inherited: 0, grants: 0, denies: 0, effective: 0 });
		});
	});
	// #endregion

	// #region Computed — vm
	describe('computed: vm', () => {
		it('debería agregar todos los campos del viewmodel', () => {
			const vm = store.vm();

			expect(vm).toHaveProperty('catalog');
			expect(vm).toHaveProperty('loading');
			expect(vm).toHaveProperty('error');
			expect(vm).toHaveProperty('roles');
			expect(vm).toHaveProperty('moduloCapabilities');
			expect(vm).toHaveProperty('capsFiltradas');
			expect(vm).toHaveProperty('effectiveCaps');
			expect(vm).toHaveProperty('overrideSummary');
			expect(vm).toHaveProperty('dialogVisible');
			expect(vm).toHaveProperty('grantIds');
			expect(vm).toHaveProperty('denyIds');
		});
	});
	// #endregion

	// #region Toggle grant/deny
	describe('toggleGrant', () => {
		beforeEach(() => {
			store.setOverview(mockOverview);
		});

		it('debería agregar un grant nuevo', () => {
			store.toggleGrant(5);
			expect(store.grantIds()).toContain(5);
		});

		it('debería remover un grant existente', () => {
			expect(store.grantIds()).toContain(4);
			store.toggleGrant(4);
			expect(store.grantIds()).not.toContain(4);
		});

		it('debería remover de denies al agregar a grants', () => {
			expect(store.denyIds()).toContain(3);
			store.toggleGrant(3);
			expect(store.grantIds()).toContain(3);
			expect(store.denyIds()).not.toContain(3);
		});
	});

	describe('toggleDeny', () => {
		beforeEach(() => {
			store.setOverview(mockOverview);
		});

		it('debería agregar un deny nuevo', () => {
			store.toggleDeny(5);
			expect(store.denyIds()).toContain(5);
		});

		it('debería remover un deny existente', () => {
			expect(store.denyIds()).toContain(3);
			store.toggleDeny(3);
			expect(store.denyIds()).not.toContain(3);
		});

		it('debería remover de grants al agregar a denies', () => {
			expect(store.grantIds()).toContain(4);
			store.toggleDeny(4);
			expect(store.denyIds()).toContain(4);
			expect(store.grantIds()).not.toContain(4);
		});
	});
	// #endregion

	// #region Reset
	describe('resetSelection', () => {
		it('debería limpiar toda la selección', () => {
			store.setSelectedUsuario(mockUsuario);
			store.setSelectedRolId(1);
			store.setOverview(mockOverview);
			store.setUsuariosSugeridos(mockUsuarios);

			store.resetSelection();

			expect(store.selectedUsuario()).toBeNull();
			expect(store.selectedRolId()).toBeNull();
			expect(store.overview()).toBeNull();
			expect(store.grantIds()).toEqual([]);
			expect(store.denyIds()).toEqual([]);
			expect(store.usuariosSugeridos()).toEqual([]);
		});
	});
	// #endregion
});

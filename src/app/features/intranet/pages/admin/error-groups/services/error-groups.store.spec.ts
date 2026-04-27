import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ErrorGroupLista } from '../models';
import { ErrorGroupsStore } from './error-groups.store';

function makeGroup(overrides: Partial<ErrorGroupLista> = {}): ErrorGroupLista {
	return {
		id: 1,
		fingerprintCorto: 'abc123',
		severidad: 'ERROR',
		mensajeRepresentativo: 'msg',
		url: '/api/test',
		httpStatus: 500,
		errorCode: null,
		origen: 'BACKEND',
		estado: 'NUEVO',
		primeraFecha: '2026-04-25T10:00:00',
		ultimaFecha: '2026-04-25T11:00:00',
		contadorTotal: 5,
		contadorPostResolucion: 0,
		rowVersion: 'AAAAAAAAB9E=',
		...overrides,
	};
}

describe('ErrorGroupsStore', () => {
	let store: ErrorGroupsStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [ErrorGroupsStore] });
		store = TestBed.inject(ErrorGroupsStore);
	});

	it('setGroups actualiza el array de items', () => {
		const groups = [makeGroup({ id: 1 }), makeGroup({ id: 2 })];
		store.setGroups(groups);
		expect(store.items()).toEqual(groups);
	});

	it('setTotalCount(N) deja el count en N', () => {
		store.setTotalCount(42);
		expect(store.totalCount()).toBe(42);
	});

	it('updateGroupEstado cambia el estado y mantiene el resto', () => {
		store.setGroups([makeGroup({ id: 1, estado: 'NUEVO', severidad: 'ERROR' })]);
		store.updateGroupEstado(1, 'VISTO');
		const item = store.items()[0];
		expect(item.estado).toBe('VISTO');
		expect(item.severidad).toBe('ERROR');
	});

	it('updateGroupEstado para id no existente es no-op', () => {
		const groups = [makeGroup({ id: 1 })];
		store.setGroups(groups);
		store.updateGroupEstado(999, 'VISTO');
		expect(store.items()[0].estado).toBe('NUEVO');
	});

	it('removeGroup elimina el item y decrementa totalCount', () => {
		store.setGroups([makeGroup({ id: 1 }), makeGroup({ id: 2 })]);
		store.setTotalCount(2);
		store.removeGroup(1);
		expect(store.items().map((g) => g.id)).toEqual([2]);
		expect(store.totalCount()).toBe(1);
	});

	it('setFilters actualiza signals correspondientes', () => {
		store.setFilterEstado('NUEVO');
		store.setFilterSeveridad('CRITICAL');
		store.setFilterOrigen('FRONTEND');
		store.setSearchTerm('error');
		expect(store.filterEstado()).toBe('NUEVO');
		expect(store.filterSeveridad()).toBe('CRITICAL');
		expect(store.filterOrigen()).toBe('FRONTEND');
		expect(store.searchTerm()).toBe('error');
	});

	it('clearFilters resetea los filtros al default', () => {
		store.setFilterEstado('NUEVO');
		store.setFilterSeveridad('CRITICAL');
		store.setSearchTerm('hola');
		store.setHideResolvedIgnored(false);
		store.clearFilters();
		expect(store.filterEstado()).toBeNull();
		expect(store.filterSeveridad()).toBeNull();
		expect(store.searchTerm()).toBe('');
		expect(store.hideResolvedIgnored()).toBe(true);
	});

	it('openDrawer + closeDrawer sincronizan visibility y selectedGroup', () => {
		const grp = makeGroup({ id: 7 });
		store.openDrawer(grp);
		expect(store.drawerVisible()).toBe(true);
		expect(store.selectedGroup()?.id).toBe(7);
		store.closeDrawer();
		expect(store.drawerVisible()).toBe(false);
		expect(store.selectedGroup()).toBeNull();
	});

	it('visibleItems filtra resueltos/ignorados cuando toggle ON sin filtro estado', () => {
		store.setGroups([
			makeGroup({ id: 1, estado: 'NUEVO' }),
			makeGroup({ id: 2, estado: 'RESUELTO' }),
			makeGroup({ id: 3, estado: 'IGNORADO' }),
			makeGroup({ id: 4, estado: 'EN_PROGRESO' }),
		]);
		expect(store.visibleItems().map((g) => g.id)).toEqual([1, 4]);
	});

	it('visibleItems no filtra cuando hay filtro estado explícito', () => {
		store.setGroups([
			makeGroup({ id: 1, estado: 'RESUELTO' }),
			makeGroup({ id: 2, estado: 'RESUELTO' }),
		]);
		store.setFilterEstado('RESUELTO');
		expect(store.visibleItems().map((g) => g.id)).toEqual([1, 2]);
	});

	it('visibleItems devuelve todos cuando hideResolvedIgnored OFF', () => {
		store.setGroups([
			makeGroup({ id: 1, estado: 'NUEVO' }),
			makeGroup({ id: 2, estado: 'RESUELTO' }),
		]);
		store.setHideResolvedIgnored(false);
		expect(store.visibleItems()).toHaveLength(2);
	});

	it('stats cuenta correctamente por severidad', () => {
		store.setGroups([
			makeGroup({ id: 1, severidad: 'CRITICAL' }),
			makeGroup({ id: 2, severidad: 'CRITICAL' }),
			makeGroup({ id: 3, severidad: 'ERROR' }),
			makeGroup({ id: 4, severidad: 'WARNING' }),
		]);
		const stats = store.stats();
		expect(stats.total).toBe(4);
		expect(stats.critical).toBe(2);
		expect(stats.error).toBe(1);
		expect(stats.warning).toBe(1);
	});
});

import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import type {
	ReporteUsuarioDetalleDto,
	ReporteUsuarioEstadisticasDto,
	ReporteUsuarioListaDto,
} from '@core/services/feedback';

import { FeedbackReportsStore } from './feedback-reports.store';

function makeItem(overrides: Partial<ReporteUsuarioListaDto> = {}): ReporteUsuarioListaDto {
	return {
		id: 1,
		tipo: 'BUG',
		descripcionResumen: 'Algo falló',
		tienePropuesta: false,
		url: '/intranet/admin',
		usuarioDni: '12345678',
		usuarioRol: 'ADMIN',
		usuarioNombre: 'Juan',
		estado: 'NUEVO',
		fechaReg: '2026-05-20T10:00:00',
		...overrides,
	};
}

function makeDetalle(overrides: Partial<ReporteUsuarioDetalleDto> = {}): ReporteUsuarioDetalleDto {
	return {
		id: 1,
		tipo: 'BUG',
		descripcion: 'Detalle completo',
		propuesta: null,
		url: '/intranet/admin',
		userAgent: 'Mozilla/5.0',
		correlationId: null,
		plataforma: 'WEB',
		usuarioDni: '12345678',
		usuarioRol: 'ADMIN',
		usuarioNombre: 'Juan',
		estado: 'NUEVO',
		observacion: null,
		fechaReg: '2026-05-20T10:00:00',
		fechaMod: null,
		usuarioMod: null,
		rowVersion: 'AAAAAAAAB9E=',
		...overrides,
	};
}

function makeStats(overrides: Partial<ReporteUsuarioEstadisticasDto> = {}): ReporteUsuarioEstadisticasDto {
	return { total: 10, nuevos: 5, enProgreso: 2, resueltos: 2, descartados: 1, ...overrides };
}

describe('FeedbackReportsStore', () => {
	let store: FeedbackReportsStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [FeedbackReportsStore] });
		store = TestBed.inject(FeedbackReportsStore);
	});

	it('setItems actualiza items y totalItems', () => {
		const items = [makeItem({ id: 1 }), makeItem({ id: 2 })];
		store.setItems(items);
		expect(store.items()).toEqual(items);
		expect(store.totalItems()).toBe(2);
	});

	it('setEstadisticas actualiza las estadísticas', () => {
		const stats = makeStats();
		store.setEstadisticas(stats);
		expect(store.estadisticas()).toEqual(stats);
	});

	it('setLoading / setStatsReady / setTableReady cambian flags', () => {
		store.setLoading(true);
		expect(store.loading()).toBe(true);
		store.setStatsReady(true);
		expect(store.statsReady()).toBe(true);
		store.setTableReady(true);
		expect(store.tableReady()).toBe(true);
	});

	it('setFilterTipo / setFilterEstado / setFilterDesde / setFilterHasta / setFilterCorrelationId', () => {
		store.setFilterTipo('BUG');
		store.setFilterEstado('NUEVO');
		const desde = new Date('2026-01-01');
		const hasta = new Date('2026-12-31');
		store.setFilterDesde(desde);
		store.setFilterHasta(hasta);
		store.setFilterCorrelationId('abc-123');
		expect(store.filterTipo()).toBe('BUG');
		expect(store.filterEstado()).toBe('NUEVO');
		expect(store.filterDesde()).toEqual(desde);
		expect(store.filterHasta()).toEqual(hasta);
		expect(store.filterCorrelationId()).toBe('abc-123');
	});

	it('clearFilters resetea todos los filtros', () => {
		store.setFilterTipo('BUG');
		store.setFilterEstado('NUEVO');
		store.setFilterDesde(new Date());
		store.setFilterHasta(new Date());
		store.setFilterCorrelationId('x');
		store.setSearchQuery('algo');
		store.setPage(3);
		store.clearFilters();
		expect(store.filterTipo()).toBeNull();
		expect(store.filterEstado()).toBeNull();
		expect(store.filterDesde()).toBeNull();
		expect(store.filterHasta()).toBeNull();
		expect(store.filterCorrelationId()).toBeNull();
		expect(store.searchQuery()).toBe('');
		expect(store.page()).toBe(1);
	});

	it('setSearchQuery actualiza el término de búsqueda', () => {
		store.setSearchQuery('bug crítico');
		expect(store.searchQuery()).toBe('bug crítico');
	});

	it('setPage / setPageSize / setPaginationData actualizan la paginación', () => {
		store.setPage(2);
		store.setPageSize(50);
		expect(store.page()).toBe(2);
		expect(store.pageSize()).toBe(50);

		store.setPaginationData(3, 10, 25);
		expect(store.page()).toBe(3);
		expect(store.pageSize()).toBe(10);
		expect(store.total()).toBe(25);
	});

	it('openDrawer + closeDrawer sincronizan visibility y selectedItem', () => {
		const item = makeItem({ id: 7 });
		store.openDrawer(item);
		expect(store.drawerVisible()).toBe(true);
		expect(store.selectedItem()?.id).toBe(7);
		expect(store.detalle()).toBeNull();
		store.closeDrawer();
		expect(store.drawerVisible()).toBe(false);
		expect(store.selectedItem()).toBeNull();
		expect(store.detalle()).toBeNull();
	});

	it('setDetalle / setDetalleLoading / setEstadoUpdating', () => {
		const detalle = makeDetalle();
		store.setDetalle(detalle);
		expect(store.detalle()).toEqual(detalle);
		store.setDetalleLoading(true);
		expect(store.detalleLoading()).toBe(true);
		store.setEstadoUpdating(true);
		expect(store.estadoUpdating()).toBe(true);
	});

	it('updateItemEstado cambia el estado de un ítem', () => {
		store.setItems([makeItem({ id: 1, estado: 'NUEVO' })]);
		store.updateItemEstado(1, 'RESUELTO');
		expect(store.items()[0].estado).toBe('RESUELTO');
	});

	it('updateItemEstado para id no existente es no-op', () => {
		store.setItems([makeItem({ id: 1, estado: 'NUEVO' })]);
		store.updateItemEstado(999, 'RESUELTO');
		expect(store.items()[0].estado).toBe('NUEVO');
	});

	it('removeItem elimina el ítem del listado', () => {
		store.setItems([makeItem({ id: 1 }), makeItem({ id: 2 })]);
		store.removeItem(1);
		expect(store.items().map((i) => i.id)).toEqual([2]);
	});

	it('vm contiene todo el estado consolidado', () => {
		store.setItems([makeItem()]);
		store.setEstadisticas(makeStats());
		store.setLoading(true);
		const vm = store.vm();
		expect(vm.items).toHaveLength(1);
		expect(vm.estadisticas?.total).toBe(10);
		expect(vm.loading).toBe(true);
		expect(vm.totalItems).toBe(1);
	});
});

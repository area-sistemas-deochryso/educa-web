import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService } from '@core/services/error';
import { FeedbackReportService } from '@core/services/feedback';
import type {
	ReporteUsuarioDetalleDto,
	ReporteUsuarioEstadisticasDto,
	ReporteUsuarioListaDto,
} from '@core/services/feedback';
import { WalCrossTabRefetchService, WalFacadeHelper } from '@core/services/wal';

import { FeedbackReportsFacade } from './feedback-reports.facade';
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

function makeStats(): ReporteUsuarioEstadisticasDto {
	return { total: 10, nuevos: 5, enProgreso: 2, resueltos: 2, descartados: 1 };
}

function makePage(items: ReporteUsuarioListaDto[], overrides: Partial<{
	page: number;
	pageSize: number;
	total: number;
}> = {}) {
	return {
		data: items,
		page: overrides.page ?? 1,
		pageSize: overrides.pageSize ?? 20,
		total: overrides.total ?? items.length,
	};
}

describe('FeedbackReportsFacade', () => {
	let facade: FeedbackReportsFacade;
	let store: FeedbackReportsStore;
	let service: {
		listar: ReturnType<typeof vi.fn>;
		obtenerEstadisticas: ReturnType<typeof vi.fn>;
		obtenerDetalle: ReturnType<typeof vi.fn>;
		actualizarEstado: ReturnType<typeof vi.fn>;
		eliminar: ReturnType<typeof vi.fn>;
	};
	let walHelper: { execute: ReturnType<typeof vi.fn> };
	let errorHandler: {
		showSuccess: ReturnType<typeof vi.fn>;
		showError: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		service = {
			listar: vi.fn().mockReturnValue(of(makePage([]))),
			obtenerEstadisticas: vi.fn().mockReturnValue(of(makeStats())),
			obtenerDetalle: vi.fn().mockReturnValue(of(makeDetalle())),
			actualizarEstado: vi.fn().mockReturnValue(of('OK')),
			eliminar: vi.fn().mockReturnValue(of(undefined)),
		};
		walHelper = { execute: vi.fn() };
		errorHandler = { showSuccess: vi.fn(), showError: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				FeedbackReportsFacade,
				FeedbackReportsStore,
				{ provide: FeedbackReportService, useValue: service },
				{ provide: WalFacadeHelper, useValue: walHelper },
				{ provide: WalCrossTabRefetchService, useValue: { subscribe: vi.fn() } },
				{ provide: ErrorHandlerService, useValue: errorHandler },
			],
		});
		store = TestBed.inject(FeedbackReportsStore);
		facade = TestBed.inject(FeedbackReportsFacade);
	});

	describe('loadAll', () => {
		it('carga estadísticas e items en paralelo', () => {
			service.obtenerEstadisticas.mockReturnValue(of(makeStats()));
			service.listar.mockReturnValue(of(makePage([makeItem()])));

			facade.loadAll();

			expect(service.obtenerEstadisticas).toHaveBeenCalled();
			expect(service.listar).toHaveBeenCalled();
			expect(store.statsReady()).toBe(true);
			expect(store.tableReady()).toBe(true);
			expect(store.items()).toHaveLength(1);
		});
	});

	describe('loadItems', () => {
		it('setea loading y popula items', () => {
			const items = [makeItem({ id: 1 }), makeItem({ id: 2 })];
			service.listar.mockReturnValue(of(makePage(items)));

			facade.loadItems();

			expect(store.loading()).toBe(false);
			expect(store.items()).toEqual(items);
			expect(store.tableReady()).toBe(true);
			expect(store.total()).toBe(items.length);
		});

		it('en error setea loading=false y tableReady=true', () => {
			service.listar.mockReturnValue(throwError(() => new Error('fail')));

			facade.loadItems();

			expect(store.loading()).toBe(false);
			expect(store.tableReady()).toBe(true);
		});

		it('no recarga si ya está loading', () => {
			store.setLoading(true);
			facade.loadItems();
			expect(service.listar).not.toHaveBeenCalled();
		});
	});

	describe('loadEstadisticas', () => {
		it('popula estadísticas y marca statsReady', () => {
			const stats = makeStats();
			service.obtenerEstadisticas.mockReturnValue(of(stats));

			facade.loadEstadisticas();

			expect(store.estadisticas()).toEqual(stats);
			expect(store.statsReady()).toBe(true);
		});

		it('en error marca statsReady sin crash', () => {
			service.obtenerEstadisticas.mockReturnValue(throwError(() => new Error('fail')));

			facade.loadEstadisticas();

			expect(store.statsReady()).toBe(true);
		});
	});

	describe('filtros', () => {
		it('setFilterTipo actualiza store y recarga items', () => {
			service.listar.mockReturnValue(of(makePage([])));
			facade.setFilterTipo('BUG');
			expect(store.filterTipo()).toBe('BUG');
			expect(service.listar).toHaveBeenCalled();
		});

		it('setFilterEstado actualiza store y recarga', () => {
			service.listar.mockReturnValue(of(makePage([])));
			facade.setFilterEstado('RESUELTO');
			expect(store.filterEstado()).toBe('RESUELTO');
			expect(service.listar).toHaveBeenCalled();
		});

		it('clearFilters resetea filtros y recarga', () => {
			store.setFilterTipo('BUG');
			store.setFilterEstado('NUEVO');
			service.listar.mockReturnValue(of(makePage([])));
			facade.clearFilters();
			expect(store.filterTipo()).toBeNull();
			expect(store.filterEstado()).toBeNull();
			expect(service.listar).toHaveBeenCalled();
		});
	});

	describe('openDetalle / closeDetalle', () => {
		it('abre drawer y carga detalle', () => {
			const item = makeItem({ id: 5 });
			const detalle = makeDetalle({ id: 5 });
			service.obtenerDetalle.mockReturnValue(of(detalle));

			facade.openDetalle(item);

			expect(store.drawerVisible()).toBe(true);
			expect(store.selectedItem()?.id).toBe(5);
			expect(store.detalle()).toEqual(detalle);
			expect(store.detalleLoading()).toBe(false);
		});

		it('closeDetalle cierra drawer', () => {
			store.openDrawer(makeItem());
			facade.closeDetalle();
			expect(store.drawerVisible()).toBe(false);
		});
	});

	describe('cambiarEstado (WAL)', () => {
		interface CapturedConfig {
			optimistic: { apply: () => void; rollback: () => void };
			onCommit: (result: unknown) => void;
			onError: (err: unknown) => void;
		}

		function setupCambiarEstado(): CapturedConfig {
			const detalle = makeDetalle({ id: 1, estado: 'NUEVO' });
			store.setItems([makeItem({ id: 1, estado: 'NUEVO' })]);
			store.openDrawer(makeItem({ id: 1 }));
			store.setDetalle(detalle);

			facade.cambiarEstado('RESUELTO', 'Corregido');

			expect(walHelper.execute).toHaveBeenCalled();
			return walHelper.execute.mock.calls[0][0] as CapturedConfig;
		}

		it('apply actualiza estado en store y detalle', () => {
			const cfg = setupCambiarEstado();
			cfg.optimistic.apply();
			expect(store.items()[0].estado).toBe('RESUELTO');
			expect(store.estadoUpdating()).toBe(true);
		});

		it('rollback restaura estado previo', () => {
			const cfg = setupCambiarEstado();
			cfg.optimistic.apply();
			cfg.optimistic.rollback();
			expect(store.items()[0].estado).toBe('NUEVO');
			expect(store.estadoUpdating()).toBe(false);
		});

		it('onCommit refresca detalle y estadísticas', () => {
			service.obtenerDetalle.mockReturnValue(of(makeDetalle({ estado: 'RESUELTO' })));
			service.obtenerEstadisticas.mockReturnValue(of(makeStats()));
			const cfg = setupCambiarEstado();
			cfg.onCommit('OK');
			expect(store.estadoUpdating()).toBe(false);
			expect(service.obtenerDetalle).toHaveBeenCalledWith(1);
			expect(service.obtenerEstadisticas).toHaveBeenCalled();
		});

		it('no ejecuta si no hay detalle', () => {
			store.setItems([makeItem({ id: 1 })]);
			facade.cambiarEstado('RESUELTO', null);
			expect(walHelper.execute).not.toHaveBeenCalled();
		});

		it('no ejecuta si estadoUpdating=true', () => {
			store.openDrawer(makeItem({ id: 1 }));
			store.setDetalle(makeDetalle({ id: 1 }));
			store.setEstadoUpdating(true);
			facade.cambiarEstado('RESUELTO', null);
			expect(walHelper.execute).not.toHaveBeenCalled();
		});
	});

	describe('deleteReporte', () => {
		it('cierra drawer y remueve optimistamente', () => {
			store.setItems([makeItem({ id: 1 }), makeItem({ id: 2 })]);
			store.openDrawer(makeItem({ id: 1 }));
			service.eliminar.mockReturnValue(of(undefined));

			facade.deleteReporte(1);

			expect(store.drawerVisible()).toBe(false);
			expect(store.items().map((i) => i.id)).toEqual([2]);
		});

		it('en error restaura snapshot', () => {
			const items = [makeItem({ id: 1 })];
			store.setItems(items);
			service.eliminar.mockReturnValue(throwError(() => new Error('fail')));

			facade.deleteReporte(1);

			expect(store.items()).toEqual(items);
			expect(errorHandler.showError).toHaveBeenCalled();
		});
	});
});

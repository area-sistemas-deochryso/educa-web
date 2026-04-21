import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { RateLimitEventListaDto, RateLimitStats } from '../models';
import { RateLimitEventsFacade } from './rate-limit-events.facade';
import { RateLimitEventsService } from './rate-limit-events.service';
import { RateLimitEventsStore } from './rate-limit-events.store';

const mockItems: RateLimitEventListaDto[] = [
	{
		id: 1,
		correlationId: 'corr-1',
		endpoint: '/api/reports/heavy',
		httpMethod: 'GET',
		policy: 'heavy',
		usuarioDniMasked: '***5678',
		usuarioRol: 'Director',
		limiteEfectivo: null,
		tokensConsumidos: null,
		fueRechazado: true,
		ipAddress: '10.0.0.1',
		fecha: '2026-04-21T10:00:00',
	},
];

const mockStats: RateLimitStats = {
	horas: 24,
	desde: '2026-04-20T10:00:00',
	total: 42,
	totalRechazados: 40,
	topRoles: [{ key: 'Estudiante', total: 30, rechazados: 28 }],
	topEndpoints: [{ key: '/api/reports/heavy', total: 20, rechazados: 20 }],
};

function createApi() {
	return {
		listar: vi.fn().mockReturnValue(of(mockItems)),
		getStats: vi.fn().mockReturnValue(of(mockStats)),
	};
}

describe('RateLimitEventsFacade', () => {
	let facade: RateLimitEventsFacade;
	let store: RateLimitEventsStore;
	let api: ReturnType<typeof createApi>;

	beforeEach(() => {
		api = createApi();
		TestBed.configureTestingModule({
			providers: [
				RateLimitEventsFacade,
				RateLimitEventsStore,
				{ provide: RateLimitEventsService, useValue: api },
			],
		});
		facade = TestBed.inject(RateLimitEventsFacade);
		store = TestBed.inject(RateLimitEventsStore);
	});

	it('loadData carga stats y eventos y marca tableReady', () => {
		facade.loadData();

		expect(api.getStats).toHaveBeenCalledWith(24);
		expect(api.listar).toHaveBeenCalledTimes(1);
		expect(store.items()).toEqual(mockItems);
		expect(store.stats()).toEqual(mockStats);
		expect(store.tableReady()).toBe(true);
		expect(store.loading()).toBe(false);
		expect(store.loadingStats()).toBe(false);
	});

	it('loadData con error en listar setea error y no propaga', () => {
		api.listar.mockReturnValueOnce(throwError(() => new Error('429 Too Many Requests')));

		facade.loadData();

		expect(store.error()).toBe('No se pudieron cargar los eventos');
		expect(store.loading()).toBe(false);
		expect(store.tableReady()).toBe(true);
	});

	it('loadData con error en getStats no rompe la lista', () => {
		api.getStats.mockReturnValueOnce(throwError(() => new Error('boom')));

		facade.loadData();

		expect(store.stats()).toBeNull();
		expect(store.items()).toEqual(mockItems); // lista sigue funcionando
	});

	it('updateFilter mergea filtro y redispara listar', () => {
		facade.loadData();
		api.listar.mockClear();

		facade.updateFilter({ rol: 'Director' });

		expect(store.filter().rol).toBe('Director');
		expect(api.listar).toHaveBeenCalledWith(
			expect.objectContaining({ rol: 'Director', take: 200 }),
		);
	});

	it('clearFilters resetea a default y redispara listar', () => {
		facade.updateFilter({ rol: 'Profesor', soloRechazados: true });
		api.listar.mockClear();

		facade.clearFilters();

		expect(store.filter().rol).toBeNull();
		expect(store.filter().soloRechazados).toBe(false);
		expect(api.listar).toHaveBeenCalledTimes(1);
	});

	it('openDetail abre el drawer con el item seleccionado', () => {
		facade.openDetail(mockItems[0]);

		expect(store.drawerVisible()).toBe(true);
		expect(store.selectedItem()).toEqual(mockItems[0]);
	});

	it('closeDrawer limpia el estado del drawer', () => {
		facade.openDetail(mockItems[0]);
		facade.closeDrawer();

		expect(store.drawerVisible()).toBe(false);
		expect(store.selectedItem()).toBeNull();
	});
});

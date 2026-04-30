import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { BlacklistDataFacade } from './blacklist-data.facade';
import { BlacklistService } from './blacklist.service';
import { BlacklistStore } from './blacklist.store';

const mockResult = {
	data: [
		{
			id: 1,
			correo: 'a@x.com',
			motivo: 'BOUNCE_5XX' as const,
			motivoLabel: 'Bounce permanente 5.x.x',
			intentosFallidos: 3,
			ultimoError: null,
			estado: true,
			fechaPrimerFallo: null,
			fechaUltimoFallo: null,
			fechaReg: '2026-04-29T12:00:00',
			fechaMod: null,
			usuarioReg: 'admin',
			usuarioMod: null,
		},
		{
			id: 2,
			correo: 'b@x.com',
			motivo: 'BOUNCE_MAILBOX_FULL' as const,
			motivoLabel: 'Buzón lleno crónico (4.2.2)',
			intentosFallidos: 2,
			ultimoError: null,
			estado: false,
			fechaPrimerFallo: null,
			fechaUltimoFallo: null,
			fechaReg: '2026-04-29T12:00:00',
			fechaMod: null,
			usuarioReg: 'admin',
			usuarioMod: 'blacklist-auto-cleanup',
		},
	],
	page: 1,
	pageSize: 20,
	total: 100,
};

function createMockApi() {
	return {
		getPaginado: vi.fn().mockReturnValue(of(mockResult)),
		crear: vi.fn(),
		despejar: vi.fn(),
	};
}

describe('BlacklistDataFacade', () => {
	let facade: BlacklistDataFacade;
	let api: ReturnType<typeof createMockApi>;
	let store: BlacklistStore;

	beforeEach(() => {
		vi.useFakeTimers();
		api = createMockApi();
		TestBed.configureTestingModule({
			providers: [
				BlacklistStore,
				{ provide: BlacklistService, useValue: api },
				BlacklistDataFacade,
			],
		});
		facade = TestBed.inject(BlacklistDataFacade);
		store = TestBed.inject(BlacklistStore);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('loadData llama getPaginado con filtros vacíos por default', () => {
		facade.loadData();
		expect(api.getPaginado).toHaveBeenCalledWith(
			{ estado: null, motivo: null, q: null },
			1,
			10,
		);
		expect(store.items()).toHaveLength(2);
		expect(store.totalRecords()).toBe(100);
		expect(store.tableReady()).toBe(true);
	});

	it('onFilterMotivoChange resetea page y dispara loadData con motivo', () => {
		store.setPage(5);
		facade.onFilterMotivoChange('MANUAL');
		expect(store.page()).toBe(1);
		expect(api.getPaginado).toHaveBeenCalledWith(
			{ estado: null, motivo: 'MANUAL', q: null },
			1,
			10,
		);
	});

	it('onSearchChange debounce 300ms antes de llamar BE', () => {
		facade.onSearchChange('foo');
		facade.onSearchChange('foob');
		facade.onSearchChange('fooba');
		expect(api.getPaginado).not.toHaveBeenCalled();
		vi.advanceTimersByTime(300);
		expect(api.getPaginado).toHaveBeenCalledTimes(1);
		expect(api.getPaginado).toHaveBeenCalledWith(
			{ estado: null, motivo: null, q: 'fooba' },
			1,
			10,
		);
	});

	it('loadPage llama getPaginado con page/pageSize nuevos', () => {
		facade.loadPage(3, 50);
		// Después del response, store.page se sincroniza con result.page (1)
		// — el assert relevante es la llamada al BE.
		expect(api.getPaginado).toHaveBeenCalledWith(
			{ estado: null, motivo: null, q: null },
			3,
			50,
		);
	});

	it('error en getPaginado deja loading=false y tableReady=true (fail-safe)', () => {
		api.getPaginado.mockReturnValueOnce(throwError(() => new Error('boom')));
		facade.loadData();
		expect(store.loading()).toBe(false);
		expect(store.tableReady()).toBe(true);
	});

	it('deriveStats con filterEstado=activa hace activas=total inactivas=0', () => {
		store.setFilterEstadoBlacklist('activa');
		facade.loadData();
		expect(store.estadisticas()).toEqual({ total: 100, activas: 100, inactivas: 0 });
	});

	it('deriveStats con filterEstado=inactiva hace activas=0 inactivas=total', () => {
		store.setFilterEstadoBlacklist('inactiva');
		facade.loadData();
		expect(store.estadisticas()).toEqual({ total: 100, activas: 0, inactivas: 100 });
	});
});

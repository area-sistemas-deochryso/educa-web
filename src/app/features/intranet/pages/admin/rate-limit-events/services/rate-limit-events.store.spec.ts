import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { RateLimitEventListaDto, RateLimitStats } from '../models';
import { RateLimitEventsStore } from './rate-limit-events.store';

describe('RateLimitEventsStore', () => {
	let store: RateLimitEventsStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [RateLimitEventsStore] });
		store = TestBed.inject(RateLimitEventsStore);
	});

	it('inicializa con estado vacío y filtro default', () => {
		expect(store.items()).toEqual([]);
		expect(store.stats()).toBeNull();
		expect(store.loading()).toBe(false);
		expect(store.error()).toBeNull();
		expect(store.drawerVisible()).toBe(false);
		expect(store.filter().take).toBe(200);
		expect(store.filter().rol).toBeNull();
		expect(store.filter().correlationId).toBeNull();
	});

	it('Plan 32 Chat 4 — setFilter acepta correlationId y se preserva en merge', () => {
		store.setFilter({ correlationId: 'abc-123' });
		expect(store.filter().correlationId).toBe('abc-123');

		store.setFilter({ rol: 'Director' });
		expect(store.filter().correlationId).toBe('abc-123');
		expect(store.filter().rol).toBe('Director');

		store.resetFilter();
		expect(store.filter().correlationId).toBeNull();
	});

	it('setItems actualiza la lista', () => {
		const items: RateLimitEventListaDto[] = [
			{
				id: 1,
				correlationId: 'corr-1',
				endpoint: '/api/x',
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
		store.setItems(items);
		expect(store.items()).toEqual(items);
	});

	it('setStats actualiza stats', () => {
		const stats: RateLimitStats = {
			horas: 24,
			desde: '2026-04-20T10:00:00',
			total: 100,
			totalRechazados: 60,
			topRoles: [{ key: 'Estudiante', total: 50, rechazados: 30 }],
			topEndpoints: [{ key: '/api/reports/heavy', total: 40, rechazados: 25 }],
		};
		store.setStats(stats);
		expect(store.stats()).toEqual(stats);
	});

	it('setFilter merge parcial preserva otros campos', () => {
		store.setFilter({ rol: 'Director' });
		store.setFilter({ soloRechazados: true });

		expect(store.filter().rol).toBe('Director');
		expect(store.filter().soloRechazados).toBe(true);
		expect(store.filter().take).toBe(200); // preservado
	});

	it('resetFilter restaura defaults', () => {
		store.setFilter({ rol: 'Director', soloRechazados: true, endpoint: '/api/x' });
		store.resetFilter();

		expect(store.filter().rol).toBeNull();
		expect(store.filter().soloRechazados).toBe(false);
		expect(store.filter().endpoint).toBeUndefined();
		expect(store.filter().take).toBe(200);
	});

	it('openDrawer setea selectedItem y visibilidad true', () => {
		const item: RateLimitEventListaDto = {
			id: 1,
			correlationId: null,
			endpoint: '/api/x',
			httpMethod: 'POST',
			policy: null,
			usuarioDniMasked: null,
			usuarioRol: 'Anónimo',
			limiteEfectivo: null,
			tokensConsumidos: null,
			fueRechazado: true,
			ipAddress: null,
			fecha: '2026-04-21T10:00:00',
		};
		store.openDrawer(item);

		expect(store.drawerVisible()).toBe(true);
		expect(store.selectedItem()).toEqual(item);
	});

	it('closeDrawer limpia visibilidad e item', () => {
		const item: RateLimitEventListaDto = {
			id: 1,
			correlationId: null,
			endpoint: '/api/x',
			httpMethod: 'POST',
			policy: null,
			usuarioDniMasked: null,
			usuarioRol: null,
			limiteEfectivo: null,
			tokensConsumidos: null,
			fueRechazado: true,
			ipAddress: null,
			fecha: '2026-04-21T10:00:00',
		};
		store.openDrawer(item);
		store.closeDrawer();

		expect(store.drawerVisible()).toBe(false);
		expect(store.selectedItem()).toBeNull();
	});
});

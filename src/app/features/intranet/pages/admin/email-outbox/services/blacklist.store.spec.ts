import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { EmailBlacklistEntry } from '@data/models/email-blacklist.models';

import { BlacklistStore } from './blacklist.store';

const mockEntry = (overrides: Partial<EmailBlacklistEntry> = {}): EmailBlacklistEntry => ({
	id: 1,
	correo: 'a@x.com',
	motivo: 'BOUNCE_5XX',
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
	...overrides,
});

describe('BlacklistStore', () => {
	let store: BlacklistStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [BlacklistStore] });
		store = TestBed.inject(BlacklistStore);
	});

	it('inicia con form data default y sin items', () => {
		expect(store.items()).toEqual([]);
		expect(store.formData()).toEqual({ correo: '', motivo: null, observacion: '' });
		expect(store.tableReady()).toBe(false);
	});

	it('addItem prepend nuevos al listado', () => {
		store.setItems([mockEntry({ id: 1 })]);
		store.addItem(mockEntry({ id: 2, correo: 'b@x.com' }));
		expect(store.items().map((i) => i.id)).toEqual([2, 1]);
	});

	it('updateItem es quirúrgico (mantiene los demás intactos)', () => {
		store.setItems([mockEntry({ id: 1, intentosFallidos: 3 }), mockEntry({ id: 2 })]);
		store.updateItem(1, { intentosFallidos: 5 });
		expect(store.items()[0].intentosFallidos).toBe(5);
		expect(store.items()[1].intentosFallidos).toBe(3);
	});

	it('removeItem decrementa total via incrementarEstadistica externo', () => {
		store.setItems([mockEntry({ id: 1 }), mockEntry({ id: 2 })]);
		store.setEstadisticas({ total: 2, activas: 2, inactivas: 0 });
		store.removeItem(1);
		expect(store.items().map((i) => i.id)).toEqual([2]);
	});

	it('onCreado incrementa total y activas en 1', () => {
		store.setEstadisticas({ total: 5, activas: 5, inactivas: 0 });
		store.onCreado();
		expect(store.estadisticas()).toEqual({ total: 6, activas: 6, inactivas: 0 });
	});

	it('onDespejado mueve 1 de activas a inactivas', () => {
		store.setEstadisticas({ total: 10, activas: 8, inactivas: 2 });
		store.onDespejado();
		expect(store.estadisticas()).toEqual({ total: 10, activas: 7, inactivas: 3 });
	});

	it('hasActiveFilters refleja search/estado/motivo', () => {
		expect(store.hasActiveFilters()).toBe(false);
		store.setSearchTerm('foo');
		expect(store.hasActiveFilters()).toBe(true);
		store.clearFiltros();
		expect(store.hasActiveFilters()).toBe(false);
		store.setFilterMotivo('MANUAL');
		expect(store.hasActiveFilters()).toBe(true);
	});

	it('openDrawer setea visible + item; closeDrawer limpia ambos', () => {
		const entry = mockEntry({ id: 99 });
		store.openDrawer(entry);
		expect(store.drawerVisible()).toBe(true);
		expect(store.drawerItem()?.id).toBe(99);
		store.closeDrawer();
		expect(store.drawerVisible()).toBe(false);
		expect(store.drawerItem()).toBeNull();
	});

	it('clearFiltros resetea todo (search + estado + motivo + page)', () => {
		store.setSearchTerm('foo');
		store.setFilterMotivo('BOUNCE_5XX');
		store.setFilterEstadoBlacklist('activa');
		store.setPage(5);
		store.clearFiltros();
		expect(store.searchTerm()).toBe('');
		expect(store.filterMotivo()).toBeNull();
		expect(store.filterEstadoBlacklist()).toBeNull();
		expect(store.page()).toBe(1);
	});
});

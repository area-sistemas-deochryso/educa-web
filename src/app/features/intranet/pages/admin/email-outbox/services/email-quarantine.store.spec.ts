import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { EmailQuarantineListaDto } from '@data/models';

import { EmailQuarantineStore } from './email-quarantine.store';

const mockEntry = (
	overrides: Partial<EmailQuarantineListaDto> = {},
): EmailQuarantineListaDto => ({
	id: 1,
	destinatario: 'a@x.com',
	motivo: 'MAILBOX_FULL',
	quarantineCount: 1,
	retryAfter: '2026-05-01T12:00:00',
	estado: true,
	observacion: null,
	fechaReg: '2026-04-29T12:00:00',
	fechaMod: null,
	usuarioReg: 'admin',
	usuarioMod: null,
	rowVersion: 'AAAA',
	...overrides,
});

describe('EmailQuarantineStore', () => {
	let store: EmailQuarantineStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [EmailQuarantineStore] });
		store = TestBed.inject(EmailQuarantineStore);
	});

	it('inicia con form data default y sin items', () => {
		expect(store.items()).toEqual([]);
		expect(store.formData().motivo).toBe('MANUAL');
		expect(store.formData().durationHours).toBe(24);
		expect(store.tableReady()).toBe(false);
	});

	it('setItems hidrata el listado', () => {
		const items = [mockEntry({ id: 1 }), mockEntry({ id: 2 })];
		store.setItems(items);
		expect(store.items()).toEqual(items);
	});

	it('addItem prepend nuevo al listado', () => {
		store.setItems([mockEntry({ id: 1 })]);
		store.addItem(mockEntry({ id: 99 }));
		expect(store.items().map((i) => i.id)).toEqual([99, 1]);
	});

	it('updateItem mutación quirúrgica', () => {
		store.setItems([
			mockEntry({ id: 1, quarantineCount: 1 }),
			mockEntry({ id: 2, quarantineCount: 2 }),
		]);
		store.updateItem(1, { quarantineCount: 3 });
		expect(store.items()[0].quarantineCount).toBe(3);
		expect(store.items()[1].quarantineCount).toBe(2);
	});

	it('removeItem quita por id', () => {
		store.setItems([mockEntry({ id: 1 }), mockEntry({ id: 2 })]);
		store.removeItem(1);
		expect(store.items().map((i) => i.id)).toEqual([2]);
	});

	it('onCreada incrementa total y activas', () => {
		store.setEstadisticas({ total: 5, activas: 5, liberadas: 0 });
		store.onCreada();
		expect(store.estadisticas()).toEqual({ total: 6, activas: 6, liberadas: 0 });
	});

	it('onLiberada mueve 1 de activas a liberadas', () => {
		store.setEstadisticas({ total: 10, activas: 8, liberadas: 2 });
		store.onLiberada();
		expect(store.estadisticas()).toEqual({ total: 10, activas: 7, liberadas: 3 });
	});

	it('hasActiveFilters refleja searchTerm/motivo/estado', () => {
		// Default tiene filterEstado='activa' → ya hay filtro activo
		expect(store.hasActiveFilters()).toBe(true);
		store.setFilterEstadoQuarantine(null);
		expect(store.hasActiveFilters()).toBe(false);
		store.setSearchTerm('foo');
		expect(store.hasActiveFilters()).toBe(true);
	});

	it('openDrawer/closeDrawer maneja visible + item', () => {
		const entry = mockEntry({ id: 99 });
		store.openDrawer(entry);
		expect(store.drawerVisible()).toBe(true);
		expect(store.drawerItem()?.id).toBe(99);
		store.closeDrawer();
		expect(store.drawerVisible()).toBe(false);
		expect(store.drawerItem()).toBeNull();
	});
});

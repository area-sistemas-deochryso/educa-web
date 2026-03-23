// * Tests for SalonMensajeriaStore — validates messaging state with dedup.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SalonMensajeriaStore } from './mensajeria.store';

// #endregion

// #region Test fixtures
const mockConversaciones = [
	{ id: 1, titulo: 'Chat General', ultimoMensaje: 'Hola' },
	{ id: 2, titulo: 'Foro', ultimoMensaje: 'Bienvenidos' },
	{ id: 3, titulo: 'Dudas', ultimoMensaje: 'Pregunta' },
] as never[];

const mockDetalle = {
	id: 1,
	titulo: 'Chat General',
	mensajes: [
		{ id: 100, contenido: 'Hola', esMio: true },
		{ id: 101, contenido: 'Hola!', esMio: false },
	],
} as never;
// #endregion

// #region Tests
describe('SalonMensajeriaStore', () => {
	let store: SalonMensajeriaStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [SalonMensajeriaStore] });
		store = TestBed.inject(SalonMensajeriaStore);
		store.reset();
	});

	// #region Initial state
	describe('initial state', () => {
		it('should be empty', () => {
			expect(store.conversaciones()).toEqual([]);
			expect(store.conversacionDetalle()).toBeNull();
			expect(store.sending()).toBe(false);
			expect(store.vistaDetalle()).toBe(false);
		});

		it('should have empty mensajes', () => {
			expect(store.mensajes()).toEqual([]);
		});
	});
	// #endregion

	// #region Computed — conversacionesSinForo
	describe('conversacionesSinForo', () => {
		it('should exclude foro conversation', () => {
			store.setConversaciones(mockConversaciones);
			store.setForoConversacionId(2);

			expect(store.conversacionesSinForo()).toHaveLength(2);
			expect(store.conversacionesSinForo().every((c: never) => (c as { id: number }).id !== 2)).toBe(true);
		});

		it('should return all when no foro id', () => {
			store.setConversaciones(mockConversaciones);
			expect(store.conversacionesSinForo()).toHaveLength(3);
		});
	});
	// #endregion

	// #region Computed — mensajes
	describe('mensajes', () => {
		it('should derive from detalle', () => {
			store.setConversacionDetalle(mockDetalle);
			expect(store.mensajes()).toHaveLength(2);
		});

		it('should be empty when no detalle', () => {
			expect(store.mensajes()).toEqual([]);
		});
	});
	// #endregion

	// #region addMensaje — dedup logic
	describe('addMensaje', () => {
		beforeEach(() => {
			store.setConversacionDetalle(mockDetalle);
		});

		it('should add new message', () => {
			store.addMensaje({ id: 200, contenido: 'Nuevo', esMio: true } as never);
			expect(store.mensajes()).toHaveLength(3);
		});

		it('should not duplicate existing message', () => {
			store.addMensaje({ id: 100, contenido: 'Hola', esMio: true } as never);
			expect(store.mensajes()).toHaveLength(2);
		});

		it('should correct esMio when SignalR arrives before optimistic', () => {
			// Message 101 was received via SignalR (esMio=false), now optimistic update arrives (esMio=true)
			store.addMensaje({ id: 101, contenido: 'Hola!', esMio: true } as never);

			const msg = store.mensajes().find((m: never) => (m as { id: number }).id === 101) as { esMio: boolean };
			expect(msg.esMio).toBe(true);
		});

		it('should not change esMio if already true', () => {
			store.addMensaje({ id: 100, contenido: 'Hola', esMio: false } as never);
			const msg = store.mensajes().find((m: never) => (m as { id: number }).id === 100) as { esMio: boolean };
			expect(msg.esMio).toBe(true); // Original was true, stays true
		});

		it('should do nothing without detalle', () => {
			store.setConversacionDetalle(null);
			store.addMensaje({ id: 500, contenido: 'Test' } as never);
			expect(store.mensajes()).toEqual([]);
		});
	});
	// #endregion

	// #region replaceTempMensaje
	describe('replaceTempMensaje', () => {
		it('should replace temp ID with server ID', () => {
			store.setConversacionDetalle(mockDetalle);
			store.replaceTempMensaje(100, 9999);

			const ids = store.mensajes().map((m: never) => (m as { id: number }).id);
			expect(ids).toContain(9999);
			expect(ids).not.toContain(100);
		});
	});
	// #endregion

	// #region removeMensaje
	describe('removeMensaje', () => {
		it('should remove message by id', () => {
			store.setConversacionDetalle(mockDetalle);
			store.removeMensaje(100);

			expect(store.mensajes()).toHaveLength(1);
		});

		it('should do nothing without detalle', () => {
			store.removeMensaje(100);
			expect(store.mensajes()).toEqual([]);
		});
	});
	// #endregion

	// #region Sub-ViewModels
	describe('foroVm', () => {
		it('should compose foro state', () => {
			store.setConversacionDetalle(mockDetalle);
			store.setForoConversacionId(2);

			const vm = store.foroVm();
			expect(vm.mensajes).toHaveLength(2);
			expect(vm.foroConversacionId).toBe(2);
		});
	});

	describe('mensajeriaVm', () => {
		it('should compose messaging state', () => {
			store.setConversaciones(mockConversaciones);
			store.setForoConversacionId(2);

			const vm = store.mensajeriaVm();
			expect(vm.conversaciones).toHaveLength(2);
			expect(vm.vistaDetalle).toBe(false);
		});
	});
	// #endregion

	// #region Reset
	describe('reset', () => {
		it('should reset all state', () => {
			store.setConversaciones(mockConversaciones);
			store.setConversacionDetalle(mockDetalle);
			store.setSending(true);

			store.reset();

			expect(store.conversaciones()).toEqual([]);
			expect(store.conversacionDetalle()).toBeNull();
			expect(store.sending()).toBe(false);
		});
	});
	// #endregion
});
// #endregion

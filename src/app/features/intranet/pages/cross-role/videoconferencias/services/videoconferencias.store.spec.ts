// * Tests for VideoconferenciasStore — validates video conference state.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { VideoconferenciasStore, VideoconferenciaItem } from './videoconferencias.store';

// #endregion

// #region Test fixtures
const mockItems: VideoconferenciaItem[] = [
	{ horarioId: 1, cursoId: 10, cursoNombre: 'Matemática', salonDescripcion: '1A', diaSemana: 1, diaSemanaDescripcion: 'Lunes', horaInicio: '08:00', horaFin: '09:30', profesorNombreCompleto: 'Prof A', cantidadEstudiantes: 30, habilitada: true },
	{ horarioId: 2, cursoId: 20, cursoNombre: 'Comunicación', salonDescripcion: '1A', diaSemana: 2, diaSemanaDescripcion: 'Martes', horaInicio: '10:00', horaFin: '11:30', profesorNombreCompleto: null, cantidadEstudiantes: 28, habilitada: false },
];
// #endregion

// #region Tests
describe('VideoconferenciasStore', () => {
	let store: VideoconferenciasStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [VideoconferenciasStore] });
		store = TestBed.inject(VideoconferenciasStore);
	});

	describe('initial state', () => {
		it('should be empty', () => {
			expect(store.items()).toEqual([]);
			expect(store.loading()).toBe(false);
			expect(store.error()).toBeNull();
			expect(store.activeSala()).toBeNull();
			expect(store.inSala()).toBe(false);
		});

		it('should show isEmpty when not loading', () => {
			expect(store.vm().isEmpty).toBe(true);
		});

		it('should not show isEmpty while loading', () => {
			store.setLoading(true);
			expect(store.vm().isEmpty).toBe(false);
		});
	});

	describe('items', () => {
		it('should set items', () => {
			store.setItems(mockItems);
			expect(store.items()).toHaveLength(2);
			expect(store.vm().isEmpty).toBe(false);
		});
	});

	describe('sala management', () => {
		it('should enter sala', () => {
			store.enterSala(mockItems[0]);
			expect(store.activeSala()).toEqual(mockItems[0]);
			expect(store.inSala()).toBe(true);
		});

		it('should leave sala', () => {
			store.enterSala(mockItems[0]);
			store.leaveSala();
			expect(store.activeSala()).toBeNull();
			expect(store.inSala()).toBe(false);
		});

		it('should enter sala con excepción and carry the pre-fetched token', () => {
			const token = { jwt: 'abc', appId: 'app1' };
			store.enterSalaConExcepcion(mockItems[0], token);
			expect(store.activeSala()).toEqual(mockItems[0]);
			expect(store.exceptionToken()).toEqual(token);
		});

		it('should clear the exception token on leaveSala', () => {
			store.enterSalaConExcepcion(mockItems[0], { jwt: 'abc', appId: 'app1' });
			store.leaveSala();
			expect(store.exceptionToken()).toBeNull();
		});

		it('should clear a stale exception token on plain enterSala', () => {
			store.enterSalaConExcepcion(mockItems[0], { jwt: 'abc', appId: 'app1' });
			store.enterSala(mockItems[1]);
			expect(store.exceptionToken()).toBeNull();
		});
	});

	describe('updateHabilitacion', () => {
		it('should patch habilitada for the matching item only', () => {
			store.setItems(mockItems);
			store.updateHabilitacion(1, false);
			expect(store.items()[0].habilitada).toBe(false);
			expect(store.items()[1].habilitada).toBe(false);
		});
	});

	describe('vm', () => {
		it('should compose state', () => {
			store.setItems(mockItems);
			store.enterSala(mockItems[0]);

			const vm = store.vm();
			expect(vm.items).toHaveLength(2);
			expect(vm.inSala).toBe(true);
			expect(vm.activeSala?.cursoNombre).toBe('Matemática');
		});
	});
});
// #endregion

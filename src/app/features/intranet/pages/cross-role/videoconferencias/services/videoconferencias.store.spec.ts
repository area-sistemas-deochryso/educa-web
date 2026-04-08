// * Tests for VideoconferenciasStore — validates video conference state.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { VideoconferenciasStore, VideoconferenciaItem } from './videoconferencias.store';

// #endregion

// #region Test fixtures
const mockItems: VideoconferenciaItem[] = [
	{ horarioId: 1, cursoId: 10, cursoNombre: 'Matemática', salonDescripcion: '1A', diaSemanaDescripcion: 'Lunes', horaInicio: '08:00', horaFin: '09:30', profesorNombreCompleto: 'Prof A', cantidadEstudiantes: 30 },
	{ horarioId: 2, cursoId: 20, cursoNombre: 'Comunicación', salonDescripcion: '1A', diaSemanaDescripcion: 'Martes', horaInicio: '10:00', horaFin: '11:30', profesorNombreCompleto: null, cantidadEstudiantes: 28 },
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

// * Tests for EstudianteHorariosStore — validates simple schedule state.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { EstudianteHorariosStore } from './estudiante-horarios.store';

// #endregion

// #region Tests
describe('EstudianteHorariosStore', () => {
	let store: EstudianteHorariosStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [EstudianteHorariosStore] });
		store = TestBed.inject(EstudianteHorariosStore);
	});

	describe('initial state', () => {
		it('should be empty', () => {
			expect(store.horarios()).toEqual([]);
			expect(store.loading()).toBe(false);
			expect(store.error()).toBeNull();
			expect(store.isEmpty()).toBe(true);
		});
	});

	describe('commands', () => {
		it('should set horarios and update isEmpty', () => {
			store.setHorarios([{ id: 1 }] as never[]);
			expect(store.horarios()).toHaveLength(1);
			expect(store.isEmpty()).toBe(false);
		});

		it('should set loading', () => {
			store.setLoading(true);
			expect(store.loading()).toBe(true);
		});

		it('should set error', () => {
			store.setError('Network error');
			expect(store.error()).toBe('Network error');
		});
	});

	describe('vm', () => {
		it('should compose state', () => {
			store.setHorarios([{ id: 1 }, { id: 2 }] as never[]);
			const vm = store.vm();

			expect(vm.horarios).toHaveLength(2);
			expect(vm.isEmpty).toBe(false);
			expect(vm.loading).toBe(false);
		});
	});
});
// #endregion

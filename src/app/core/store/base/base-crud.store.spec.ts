// * Tests for BaseCrudStore — validates generic CRUD store behavior.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { BaseCrudStore } from './base-crud.store';

// #endregion

// #region Test fixtures
interface TestItem {
	id: number;
	nombre: string;
	estado: boolean;
}

interface TestFormData {
	nombre: string;
	estado: boolean;
}

interface TestStats {
	total: number;
	activos: number;
	inactivos: number;
}

@Injectable()
class TestStore extends BaseCrudStore<TestItem, TestFormData, TestStats> {
	constructor() {
		super(
			{ nombre: '', estado: true },
			{ total: 0, activos: 0, inactivos: 0 },
		);
	}

	protected override getDefaultFormData(): TestFormData {
		return { nombre: '', estado: true };
	}
}
// #endregion

// #region Implementation
describe('BaseCrudStore', () => {
	let store: TestStore;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [TestStore],
		});
		store = TestBed.inject(TestStore);
	});

	// #region Initial state
	describe('initial state', () => {
		it('should have empty items', () => {
			expect(store.items()).toEqual([]);
			expect(store.isEmpty()).toBe(true);
			expect(store.itemCount()).toBe(0);
		});

		it('should have default loading/error/dialog state', () => {
			expect(store.loading()).toBe(false);
			expect(store.error()).toBeNull();
			expect(store.dialogVisible()).toBe(false);
			expect(store.confirmDialogVisible()).toBe(false);
			expect(store.isEditing()).toBe(false);
			expect(store.selectedItem()).toBeNull();
		});

		it('should have default form data', () => {
			expect(store.formData()).toEqual({ nombre: '', estado: true });
		});

		it('should have default pagination', () => {
			expect(store.page()).toBe(1);
			expect(store.pageSize()).toBe(10);
			expect(store.totalRecords()).toBe(0);
		});

		it('should have default stats', () => {
			expect(store.estadisticas()).toEqual({ total: 0, activos: 0, inactivos: 0 });
		});

		it('should have default filter state', () => {
			expect(store.searchTerm()).toBe('');
			expect(store.filterEstado()).toBeNull();
		});
	});
	// #endregion

	// #region Item mutations
	describe('item mutations', () => {
		const items: TestItem[] = [
			{ id: 1, nombre: 'Item 1', estado: true },
			{ id: 2, nombre: 'Item 2', estado: false },
			{ id: 3, nombre: 'Item 3', estado: true },
		];

		it('should set items', () => {
			store.setItems(items);
			expect(store.items()).toEqual(items);
			expect(store.isEmpty()).toBe(false);
			expect(store.itemCount()).toBe(3);
		});

		it('should add item at the beginning', () => {
			store.setItems(items);
			const newItem: TestItem = { id: 4, nombre: 'Item 4', estado: true };
			store.addItem(newItem);
			expect(store.items()[0]).toEqual(newItem);
			expect(store.itemCount()).toBe(4);
		});

		it('should update item by id', () => {
			store.setItems(items);
			store.updateItem(2, { nombre: 'Updated' });
			expect(store.items().find((i) => i.id === 2)?.nombre).toBe('Updated');
			// Others unchanged
			expect(store.items().find((i) => i.id === 1)?.nombre).toBe('Item 1');
		});

		it('should remove item by id', () => {
			store.setItems(items);
			store.removeItem(2);
			expect(store.itemCount()).toBe(2);
			expect(store.items().find((i) => i.id === 2)).toBeUndefined();
		});

		it('should handle update for non-existent id gracefully', () => {
			store.setItems(items);
			store.updateItem(999, { nombre: 'Ghost' });
			expect(store.itemCount()).toBe(3);
		});

		it('should handle remove for non-existent id gracefully', () => {
			store.setItems(items);
			store.removeItem(999);
			expect(store.itemCount()).toBe(3);
		});
	});
	// #endregion

	// #region Loading / Error
	describe('loading and error', () => {
		it('should toggle loading', () => {
			store.setLoading(true);
			expect(store.loading()).toBe(true);
			store.setLoading(false);
			expect(store.loading()).toBe(false);
		});

		it('should set and clear error', () => {
			store.setError('Something failed');
			expect(store.error()).toBe('Something failed');
			store.clearError();
			expect(store.error()).toBeNull();
		});
	});
	// #endregion

	// #region Dialog management
	describe('dialog management', () => {
		it('should open and close dialog', () => {
			store.openDialog();
			expect(store.dialogVisible()).toBe(true);
			store.closeDialog();
			expect(store.dialogVisible()).toBe(false);
		});

		it('should reset state on closeDialog', () => {
			store.setSelectedItem({ id: 1, nombre: 'Test', estado: true });
			store.setIsEditing(true);
			store.setFormData({ nombre: 'Dirty', estado: false });
			store.openDialog();

			store.closeDialog();

			expect(store.dialogVisible()).toBe(false);
			expect(store.selectedItem()).toBeNull();
			expect(store.isEditing()).toBe(false);
			expect(store.formData()).toEqual({ nombre: '', estado: true });
		});

		it('should open and close confirm dialog', () => {
			store.openConfirmDialog();
			expect(store.confirmDialogVisible()).toBe(true);
			store.closeConfirmDialog();
			expect(store.confirmDialogVisible()).toBe(false);
		});
	});
	// #endregion

	// #region Form data
	describe('form data', () => {
		it('should set form data', () => {
			store.setFormData({ nombre: 'Test', estado: false });
			expect(store.formData()).toEqual({ nombre: 'Test', estado: false });
		});

		it('should update a single form field', () => {
			store.setFormData({ nombre: 'Initial', estado: true });
			store.updateFormField('nombre', 'Updated');
			expect(store.formData().nombre).toBe('Updated');
			expect(store.formData().estado).toBe(true);
		});

		it('should reset form data to defaults', () => {
			store.setFormData({ nombre: 'Dirty', estado: false });
			store.resetFormData();
			expect(store.formData()).toEqual({ nombre: '', estado: true });
		});
	});
	// #endregion

	// #region Pagination
	describe('pagination', () => {
		it('should set pagination data', () => {
			store.setPaginationData(3, 20, 100);
			expect(store.page()).toBe(3);
			expect(store.pageSize()).toBe(20);
			expect(store.totalRecords()).toBe(100);
		});

		it('should set page independently', () => {
			store.setPage(5);
			expect(store.page()).toBe(5);
		});
	});
	// #endregion

	// #region Stats
	describe('estadisticas', () => {
		it('should set estadisticas', () => {
			store.setEstadisticas({ total: 10, activos: 7, inactivos: 3 });
			expect(store.estadisticas()).toEqual({ total: 10, activos: 7, inactivos: 3 });
		});

		it('should increment a stat field', () => {
			store.setEstadisticas({ total: 10, activos: 7, inactivos: 3 });
			store.incrementarEstadistica('total', 1);
			expect(store.estadisticas()!.total).toBe(11);
		});

		it('should decrement a stat field', () => {
			store.setEstadisticas({ total: 10, activos: 7, inactivos: 3 });
			store.incrementarEstadistica('activos', -1);
			expect(store.estadisticas()!.activos).toBe(6);
		});

		it('should not go below zero', () => {
			store.setEstadisticas({ total: 0, activos: 0, inactivos: 0 });
			store.incrementarEstadistica('total', -5);
			expect(store.estadisticas()!.total).toBe(0);
		});

		it('should handle null stats gracefully', () => {
			const storeWithNullStats = TestBed.inject(TestStore);
			// Force null stats
			storeWithNullStats.setEstadisticas(null as unknown as TestStats);
			storeWithNullStats.incrementarEstadistica('total', 1);
			expect(storeWithNullStats.estadisticas()).toBeNull();
		});
	});
	// #endregion

	// #region Filters
	describe('filters', () => {
		it('should set search term', () => {
			store.setSearchTerm('test');
			expect(store.searchTerm()).toBe('test');
		});

		it('should set filter estado', () => {
			store.setFilterEstado(true);
			expect(store.filterEstado()).toBe(true);
		});

		it('should clear all filters and reset page', () => {
			store.setSearchTerm('query');
			store.setFilterEstado(false);
			store.setPage(5);

			store.clearFiltros();

			expect(store.searchTerm()).toBe('');
			expect(store.filterEstado()).toBeNull();
			expect(store.page()).toBe(1);
		});
	});
	// #endregion
});
// #endregion

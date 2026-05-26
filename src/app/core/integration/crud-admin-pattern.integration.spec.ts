import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection, Injectable } from '@angular/core';
import { describe, it, expect, beforeEach } from 'vitest';

import { BaseCrudStore } from '@core/store';

interface TestItem {
	id: number;
	nombre: string;
	estado: boolean;
}

interface TestForm {
	nombre: string;
}

interface TestStats {
	total: number;
	activos: number;
	inactivos: number;
}

@Injectable()
class TestCrudStore extends BaseCrudStore<TestItem, TestForm, TestStats> {
	constructor() {
		super({ nombre: '' }, null);
	}

	protected override getDefaultFormData(): TestForm {
		return { nombre: '' };
	}
}

const mockItems: TestItem[] = [
	{ id: 1, nombre: 'Item A', estado: true },
	{ id: 2, nombre: 'Item B', estado: false },
	{ id: 3, nombre: 'Item C', estado: true },
];

const mockStats: TestStats = { total: 3, activos: 2, inactivos: 1 };

describe('CRUD Admin Pattern Integration (BaseCrudStore)', () => {
	let store: TestCrudStore;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [
				provideZonelessChangeDetection(),
				provideRouter([]),
				TestCrudStore,
			],
		});

		store = TestBed.inject(TestCrudStore);
	});

	it('should initialize with empty state', () => {
		expect(store.items()).toEqual([]);
		expect(store.loading()).toBe(false);
		expect(store.error()).toBeNull();
		expect(store.dialogVisible()).toBe(false);
	});

	it('should set and read items', () => {
		store.setItems(mockItems);

		expect(store.items()).toEqual(mockItems);
		expect(store.itemCount()).toBe(3);
		expect(store.isEmpty()).toBe(false);
	});

	it('should add item prepended to the list', () => {
		store.setItems(mockItems);
		const newItem: TestItem = { id: 4, nombre: 'Item D', estado: true };

		store.addItem(newItem);

		expect(store.items().length).toBe(4);
		expect(store.items()[0].id).toBe(4);
	});

	it('should update existing item by id with partial data', () => {
		store.setItems(mockItems);

		store.updateItem(1, { nombre: 'Item A Updated' });

		const found = store.items().find((i) => i.id === 1);
		expect(found?.nombre).toBe('Item A Updated');
		expect(found?.estado).toBe(true);
	});

	it('should remove item by id', () => {
		store.setItems(mockItems);

		store.removeItem(2);

		expect(store.items().length).toBe(2);
		expect(store.items().find((i) => i.id === 2)).toBeUndefined();
	});

	it('should manage loading and error state', () => {
		store.setLoading(true);
		expect(store.loading()).toBe(true);

		store.setError('Something went wrong');
		expect(store.error()).toBe('Something went wrong');

		store.clearError();
		expect(store.error()).toBeNull();
	});

	it('should manage estadisticas and incremental updates', () => {
		store.setEstadisticas(mockStats);
		expect(store.estadisticas()).toEqual(mockStats);

		store.incrementarEstadistica('activos', -1);
		expect(store.estadisticas()?.activos).toBe(1);

		store.incrementarEstadistica('inactivos', 1);
		expect(store.estadisticas()?.inactivos).toBe(2);
	});

	it('should not allow negative estadisticas', () => {
		store.setEstadisticas({ total: 1, activos: 0, inactivos: 1 });

		store.incrementarEstadistica('activos', -5);
		expect(store.estadisticas()?.activos).toBe(0);
	});

	it('should manage dialog open/close cycle with form reset', () => {
		store.setFormData({ nombre: 'Edit value' });
		store.openDialog();

		expect(store.dialogVisible()).toBe(true);
		expect(store.formData().nombre).toBe('Edit value');

		store.closeDialog();

		expect(store.dialogVisible()).toBe(false);
		expect(store.formData().nombre).toBe('');
	});

	it('should manage pagination data', () => {
		store.setPaginationData(2, 10, 50);

		expect(store.page()).toBe(2);
		expect(store.pageSize()).toBe(10);
		expect(store.totalRecords()).toBe(50);
	});

	it('should manage search term and filter estado', () => {
		store.setSearchTerm('test');
		expect(store.searchTerm()).toBe('test');

		store.setFilterEstado(true);
		expect(store.filterEstado()).toBe(true);
	});

	it('should handle full CRUD cycle: load → add → update → delete', () => {
		store.setItems(mockItems);
		store.setEstadisticas(mockStats);
		expect(store.itemCount()).toBe(3);

		store.addItem({ id: 4, nombre: 'New', estado: true });
		expect(store.itemCount()).toBe(4);

		store.updateItem(4, { nombre: 'Updated' });
		expect(store.items().find((i) => i.id === 4)?.nombre).toBe('Updated');

		store.removeItem(4);
		expect(store.itemCount()).toBe(3);
	});

	it('should manage confirm dialog independently', () => {
		store.openConfirmDialog();
		expect(store.confirmDialogVisible()).toBe(true);

		store.closeConfirmDialog();
		expect(store.confirmDialogVisible()).toBe(false);
	});

	it('should track editing state and selected item', () => {
		const item = mockItems[0];

		store.setSelectedItem(item);
		store.setIsEditing(true);

		expect(store.selectedItem()).toEqual(item);
		expect(store.isEditing()).toBe(true);

		store.closeDialog();

		expect(store.selectedItem()).toBeNull();
		expect(store.isEditing()).toBe(false);
	});
});

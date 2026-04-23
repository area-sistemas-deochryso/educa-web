// Smoke tests del store — filtros client-side y stats del universo.
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuditoriaCorreosStore } from './auditoria-correos.store';
import { AuditoriaCorreoAsistenciaDto } from '../models';

const mockItems: AuditoriaCorreoAsistenciaDto[] = [
	{
		tipoOrigen: 'Estudiante',
		entidadId: 1,
		dni: '***1234',
		nombreCompleto: 'Perez Lucia',
		correoActual: 'lu***ia@gmail.com',
		tipoFallo: 'FAILED_INVALID_ADDRESS',
		razon: 'contiene caracteres no permitidos',
	},
	{
		tipoOrigen: 'Profesor',
		entidadId: 2,
		dni: '***5678',
		nombreCompleto: 'Gomez Carlos',
		correoActual: 'ca***os@laazulitasac.com',
		tipoFallo: 'FAILED_INVALID_ADDRESS',
		razon: 'contiene caracteres no permitidos',
	},
	{
		tipoOrigen: 'Estudiante',
		entidadId: 3,
		dni: '***9012',
		nombreCompleto: 'Rodriguez Ana',
		correoActual: '',
		tipoFallo: 'FAILED_NO_EMAIL',
		razon: 'sin correo registrado',
	},
];

describe('AuditoriaCorreosStore', () => {
	let store: AuditoriaCorreosStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [AuditoriaCorreosStore] });
		store = TestBed.inject(AuditoriaCorreosStore);
	});

	it('calcula stats del universo completo a partir de items', () => {
		store.setItems(mockItems);
		expect(store.stats()).toEqual({
			total: 3,
			estudiantes: 2,
			apoderados: 0,
			profesores: 1,
		});
	});

	it('filteredItems refleja el filtro por tipo sin alterar stats', () => {
		store.setItems(mockItems);
		store.setFilterTipo('Estudiante');
		expect(store.filteredItems()).toHaveLength(2);
		// Stats NO cambian — son del universo completo
		expect(store.stats().total).toBe(3);
	});

	it('search filtra por nombre (case-insensitive)', () => {
		store.setItems(mockItems);
		store.setSearchTerm('perez');
		expect(store.filteredItems()).toHaveLength(1);
		expect(store.filteredItems()[0].nombreCompleto).toBe('Perez Lucia');
	});

	it('search también matchea por DNI enmascarado', () => {
		store.setItems(mockItems);
		store.setSearchTerm('***5678');
		expect(store.filteredItems()).toHaveLength(1);
		expect(store.filteredItems()[0].tipoOrigen).toBe('Profesor');
	});

	it('clearFilters resetea tipo y búsqueda', () => {
		store.setItems(mockItems);
		store.setFilterTipo('Estudiante');
		store.setSearchTerm('perez');
		store.clearFilters();
		expect(store.filteredItems()).toHaveLength(3);
		expect(store.hasActiveFilters()).toBe(false);
	});

	it('vm expone universeTotal distinto del filtered length', () => {
		store.setItems(mockItems);
		store.setFilterTipo('Profesor');
		const vm = store.vm();
		expect(vm.items).toHaveLength(1);
		expect(vm.universeTotal).toBe(3);
	});

	it('lista vacía produce stats en 0 y filteredItems vacío', () => {
		store.setItems([]);
		expect(store.stats()).toEqual({
			total: 0,
			estudiantes: 0,
			apoderados: 0,
			profesores: 0,
		});
		expect(store.filteredItems()).toHaveLength(0);
	});
});

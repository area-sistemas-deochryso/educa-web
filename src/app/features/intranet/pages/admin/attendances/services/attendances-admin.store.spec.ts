// * Tests for AttendancesAdminStore — valida estado del filtro tipo persona y form.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AttendancesAdminStore } from './attendances-admin.store';
import { AsistenciaAdminLista } from '../models';
// #endregion

// #region Fixtures
const mockEstudianteItem: AsistenciaAdminLista = {
	asistenciaId: 1,
	estudianteId: 101,
	dni: '12345678',
	nombreCompleto: 'Juan Pérez',
	grado: '1ro',
	seccion: 'A',
	sede: 'Sede Central',
	sedeId: 1,
	fecha: '2026-04-20',
	horaEntrada: '2026-04-20T07:30:00',
	horaSalida: null,
	estado: 'Incompleta',
	observacion: null,
	origenManual: false,
	editadoManualmente: false,
	estadoCodigo: 'A',
	rowVersion: 'v1',
	tipoPersona: 'E',
	contextoPersona: '1ro Secundaria A',
};

const mockProfesorItem: AsistenciaAdminLista = {
	asistenciaId: 2,
	estudianteId: 202,
	dni: '87654321',
	nombreCompleto: 'María Docente',
	grado: '',
	seccion: '',
	sede: 'Sede Central',
	sedeId: 1,
	fecha: '2026-04-20',
	horaEntrada: '2026-04-20T07:15:00',
	horaSalida: '2026-04-20T16:00:00',
	estado: 'Completa',
	observacion: null,
	origenManual: false,
	editadoManualmente: false,
	estadoCodigo: 'A',
	rowVersion: 'v1',
	tipoPersona: 'P',
	contextoPersona: 'Matemáticas — Secundaria',
};
// #endregion

describe('AttendancesAdminStore — tipoPersona filter', () => {
	let store: AttendancesAdminStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [AttendancesAdminStore] });
		store = TestBed.inject(AttendancesAdminStore);
	});

	describe('tipoPersonaFilter signal', () => {
		it('defaults to "E" (retrocompatibilidad visual)', () => {
			expect(store.tipoPersonaFilter()).toBe('E');
		});

		it('setTipoPersonaFilter actualiza el signal', () => {
			store.setTipoPersonaFilter('P');
			expect(store.tipoPersonaFilter()).toBe('P');

			store.setTipoPersonaFilter('todos');
			expect(store.tipoPersonaFilter()).toBe('todos');
		});

		it('uiVm expone el filtro actual', () => {
			store.setTipoPersonaFilter('P');
			expect(store.uiVm().tipoPersonaFilter).toBe('P');
		});
	});

	describe('formData.tipoPersona', () => {
		it('openNewDialog hereda tipo "E" cuando filtro es "E" o "todos"', () => {
			store.setTipoPersonaFilter('E');
			store.openNewDialog();
			expect(store.formData().tipoPersona).toBe('E');

			store.setTipoPersonaFilter('todos');
			store.openNewDialog();
			expect(store.formData().tipoPersona).toBe('E');
		});

		it('openNewDialog hereda tipo "P" cuando filtro es "P"', () => {
			store.setTipoPersonaFilter('P');
			store.openNewDialog();
			expect(store.formData().tipoPersona).toBe('P');
		});

		it('openEditDialog copia el tipo del item', () => {
			store.openEditDialog(mockProfesorItem);
			expect(store.formData().tipoPersona).toBe('P');
			expect(store.formData().estudianteId).toBe(202);

			store.openEditDialog(mockEstudianteItem);
			expect(store.formData().tipoPersona).toBe('E');
		});

		it('openSalidaDialog copia el tipo del item', () => {
			store.openSalidaDialog(mockProfesorItem);
			expect(store.formData().tipoPersona).toBe('P');
			expect(store.formData().asistenciaId).toBe(2);
		});
	});

	describe('personas alias', () => {
		it('setPersonas y setEstudiantes mantienen la misma colección', () => {
			store.setPersonas([
				{
					estudianteId: 1,
					dni: '11111111',
					nombreCompleto: 'Test',
					grado: '1ro',
					seccion: 'A',
					sedeId: 1,
					sede: 'Sede',
					tipoPersona: 'E',
					contextoPersona: '1ro A',
				},
			]);
			expect(store.personas().length).toBe(1);
			expect(store.estudiantes().length).toBe(1);
		});
	});
});

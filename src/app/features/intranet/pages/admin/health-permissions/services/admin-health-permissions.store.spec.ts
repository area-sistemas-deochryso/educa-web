import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

/* eslint-disable layer-enforcement/imports-error -- Razón: test factories para DTOs cross-role */
import type {
	HealthExitPermissionDto,
	HealthJustificationDto,
	StudentForHealthDto,
	SymptomDto,
	DateValidationResult,
} from '@features/intranet/pages/profesor/models';
/* eslint-enable layer-enforcement/imports-error */
import type { SalonForHealthDto } from '../models/admin-health-permissions.models';

import { AdminHealthPermissionsStore } from './admin-health-permissions.store';

function makeSalon(overrides: Partial<SalonForHealthDto> = {}): SalonForHealthDto {
	return { id: 1, descripcion: '1ro A', cantidadEstudiantes: 30, ...overrides };
}

function makePermiso(overrides: Partial<HealthExitPermissionDto> = {}): HealthExitPermissionDto {
	return {
		id: 1,
		estudianteId: 10,
		estudianteNombre: 'María',
		fecha: '2026-05-26',
		horaSalida: '10:30',
		sintomas: ['FIEBRE'],
		sintomasDisplay: 'Fiebre',
		sintomaDetalle: null,
		observacion: null,
		profesorNombre: 'Prof. García',
		estado: true,
		...overrides,
	};
}

function makeJustificacion(overrides: Partial<HealthJustificationDto> = {}): HealthJustificationDto {
	return {
		id: 1,
		estudianteId: 10,
		estudianteNombre: 'María',
		documentoUrl: '/docs/cert.pdf',
		documentoNombre: 'cert.pdf',
		observacion: null,
		dias: [{ fecha: '2026-05-25', estadoOriginal: 'FALTA' }],
		profesorNombre: 'Prof. García',
		fechaRegistro: '2026-05-26T08:00:00',
		estado: true,
		...overrides,
	};
}

function makeEstudiante(overrides: Partial<StudentForHealthDto> = {}): StudentForHealthDto {
	return { id: 10, dni: '12345678', nombreCompleto: 'María López', tieneEntradaHoy: true, ...overrides };
}

describe('AdminHealthPermissionsStore', () => {
	let store: AdminHealthPermissionsStore;

	beforeEach(() => {
		TestBed.configureTestingModule({ providers: [AdminHealthPermissionsStore] });
		store = TestBed.inject(AdminHealthPermissionsStore);
	});

	it('setSalones actualiza la lista de salones', () => {
		const salones = [makeSalon({ id: 1 }), makeSalon({ id: 2, descripcion: '2do B' })];
		store.setSalones(salones);
		expect(store.salones()).toEqual(salones);
	});

	it('setSelectedSalonId actualiza la selección', () => {
		store.setSelectedSalonId(5);
		expect(store.selectedSalonId()).toBe(5);
	});

	it('setPermisosSalida / addPermisoSalida / removePermisoSalida', () => {
		store.setPermisosSalida([makePermiso({ id: 1 })]);
		expect(store.permisosSalida()).toHaveLength(1);

		store.addPermisoSalida(makePermiso({ id: 2 }));
		expect(store.permisosSalida()).toHaveLength(2);
		expect(store.permisosSalida()[0].id).toBe(2);

		store.removePermisoSalida(1);
		expect(store.permisosSalida().map((p) => p.id)).toEqual([2]);
	});

	it('setJustificaciones / addJustificacion / removeJustificacion', () => {
		store.setJustificaciones([makeJustificacion({ id: 1 })]);
		expect(store.justificaciones()).toHaveLength(1);

		store.addJustificacion(makeJustificacion({ id: 2 }));
		expect(store.justificaciones()).toHaveLength(2);
		expect(store.justificaciones()[0].id).toBe(2);

		store.removeJustificacion(1);
		expect(store.justificaciones().map((j) => j.id)).toEqual([2]);
	});

	it('setEstudiantes y estudiantesConEntrada computed', () => {
		store.setEstudiantes([
			makeEstudiante({ id: 1, tieneEntradaHoy: true }),
			makeEstudiante({ id: 2, tieneEntradaHoy: false }),
			makeEstudiante({ id: 3, tieneEntradaHoy: true }),
		]);
		expect(store.estudiantes()).toHaveLength(3);
		expect(store.estudiantesConEntrada().map((e) => e.id)).toEqual([1, 3]);
	});

	it('setSintomas actualiza síntomas', () => {
		const sintomas: SymptomDto[] = [
			{ codigo: 'FIEBRE', nombre: 'Fiebre' },
			{ codigo: 'DOLOR_CABEZA', nombre: 'Dolor de cabeza' },
		];
		store.setSintomas(sintomas);
		expect(store.sintomas()).toEqual(sintomas);
	});

	it('setFechasValidacion / clearFechasValidacion', () => {
		const fechas: DateValidationResult[] = [
			{ fecha: '2026-05-25', valida: true, razon: null },
			{ fecha: '2026-05-26', valida: false, razon: 'Ya tiene permiso' },
		];
		store.setFechasValidacion(fechas);
		expect(store.fechasValidacion()).toEqual(fechas);
		store.clearFechasValidacion();
		expect(store.fechasValidacion()).toEqual([]);
	});

	it('loading flags: salonesLoading, loading, saving', () => {
		store.setSalonesLoading(true);
		expect(store.salonesLoading()).toBe(true);
		store.setLoading(true);
		expect(store.loading()).toBe(true);
		store.setSaving(true);
		expect(store.saving()).toBe(true);
	});

	it('openExitDialog resetea saving y abre', () => {
		store.setSaving(true);
		store.openExitDialog();
		expect(store.exitDialogVisible()).toBe(true);
		expect(store.saving()).toBe(false);
	});

	it('closeExitDialog cierra', () => {
		store.openExitDialog();
		store.closeExitDialog();
		expect(store.exitDialogVisible()).toBe(false);
	});

	it('openJustificationDialog resetea saving y abre', () => {
		store.setSaving(true);
		store.openJustificationDialog();
		expect(store.justificationDialogVisible()).toBe(true);
		expect(store.saving()).toBe(false);
	});

	it('closeJustificationDialog cierra y limpia fechas', () => {
		store.setFechasValidacion([{ fecha: '2026-05-25', valida: true, razon: null }]);
		store.openJustificationDialog();
		store.closeJustificationDialog();
		expect(store.justificationDialogVisible()).toBe(false);
		expect(store.fechasValidacion()).toEqual([]);
	});

	it('clearSalonData limpia permisos, justificaciones, estudiantes y fechas', () => {
		store.setPermisosSalida([makePermiso()]);
		store.setJustificaciones([makeJustificacion()]);
		store.setEstudiantes([makeEstudiante()]);
		store.setFechasValidacion([{ fecha: '2026-05-25', valida: true, razon: null }]);
		store.clearSalonData();
		expect(store.permisosSalida()).toEqual([]);
		expect(store.justificaciones()).toEqual([]);
		expect(store.estudiantes()).toEqual([]);
		expect(store.fechasValidacion()).toEqual([]);
	});

	it('salonOptions computed genera labels con cantidad', () => {
		store.setSalones([makeSalon({ id: 1, descripcion: '1ro A', cantidadEstudiantes: 30 })]);
		expect(store.salonOptions()).toEqual([{ label: '1ro A (30 est.)', value: 1 }]);
	});

	it('vm contiene todo el estado consolidado', () => {
		store.setSalones([makeSalon()]);
		store.setSelectedSalonId(1);
		store.setLoading(true);
		const vm = store.vm();
		expect(vm.salones).toHaveLength(1);
		expect(vm.selectedSalonId).toBe(1);
		expect(vm.loading).toBe(true);
	});
});

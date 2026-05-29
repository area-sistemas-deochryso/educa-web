import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { AttendancesAdminStore } from '../../services';
import { SyncRangeDialogComponent, SyncRangePayload } from './sync-range-dialog.component';

function createMockStore() {
	return {
		personas: signal([
			{
				estudianteId: 1,
				dni: '12345678',
				nombreCompleto: 'Juan Pérez',
				grado: '5to',
				seccion: 'A',
				sedeId: 1,
				sede: 'Principal',
				tipoPersona: 'E' as const,
				contextoPersona: '5to A',
			},
			{
				estudianteId: 2,
				dni: '87654321',
				nombreCompleto: 'María López',
				grado: '5to',
				seccion: 'B',
				sedeId: 1,
				sede: 'Principal',
				tipoPersona: 'E' as const,
				contextoPersona: '5to B',
			},
		]),
		syncing: signal(false),
		fecha: signal('2026-05-29'),
		sedeId: signal(null),
		tipoPersonaFilter: signal('E' as const),
		searchTerm: signal(''),
		formData: signal({
			tipoOperacion: 'entrada' as const,
			estudianteId: null,
			sedeId: null,
			horaEntrada: null,
			horaSalida: null,
			observacion: '',
			asistenciaId: null,
			tipoPersona: 'E' as const,
		}),
	};
}

describe('SyncRangeDialogComponent', () => {
	let fixture: ComponentFixture<SyncRangeDialogComponent>;
	let component: SyncRangeDialogComponent;

	beforeEach(() => {
		TestBed.configureTestingModule({
			imports: [SyncRangeDialogComponent],
			providers: [{ provide: AttendancesAdminStore, useValue: createMockStore() }],
		});
		fixture = TestBed.createComponent(SyncRangeDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('creates the component', () => {
		expect(component).toBeTruthy();
	});

	describe('validation', () => {
		it('invalid when no dates selected', () => {
			expect(component.isValid()).toBe(false);
		});

		it('valid when both dates set and range OK', () => {
			component.fechaInicio.set(new Date('2026-01-01'));
			component.fechaFin.set(new Date('2026-01-15'));
			expect(component.isValid()).toBe(true);
		});

		it('invalid when fechaFin < fechaInicio', () => {
			component.fechaInicio.set(new Date('2026-01-15'));
			component.fechaFin.set(new Date('2026-01-01'));
			expect(component.rangeError()).toContain('posterior');
			expect(component.isValid()).toBe(false);
		});

		it('invalid when range exceeds 366 days', () => {
			component.fechaInicio.set(new Date('2025-01-01'));
			component.fechaFin.set(new Date('2026-03-01'));
			expect(component.rangeError()).toContain('366');
			expect(component.isValid()).toBe(false);
		});

		it('exactly 366 days is valid', () => {
			component.fechaInicio.set(new Date('2026-01-01'));
			component.fechaFin.set(new Date('2026-12-31'));
			expect(component.rangeDays()).toBe(365);
			expect(component.isValid()).toBe(true);
		});

		it('invalid when todosUsuarios off and no person selected', () => {
			component.fechaInicio.set(new Date('2026-01-01'));
			component.fechaFin.set(new Date('2026-01-15'));
			component.todosUsuarios.set(false);
			component.selectedPersonIds.set([]);
			expect(component.isValid()).toBe(false);
		});

		it('valid when todosUsuarios off and persons selected', () => {
			component.fechaInicio.set(new Date('2026-01-01'));
			component.fechaFin.set(new Date('2026-01-15'));
			component.todosUsuarios.set(false);
			component.selectedPersonIds.set([1]);
			expect(component.isValid()).toBe(true);
		});
	});

	describe('rangeDays', () => {
		it('calculates inclusive day count', () => {
			component.fechaInicio.set(new Date('2026-01-01'));
			component.fechaFin.set(new Date('2026-01-01'));
			expect(component.rangeDays()).toBe(1);
		});

		it('calculates multi-day range', () => {
			component.fechaInicio.set(new Date('2026-01-01'));
			component.fechaFin.set(new Date('2026-01-10'));
			expect(component.rangeDays()).toBe(10);
		});
	});

	describe('confirm emission', () => {
		it('emits payload with dnis undefined when todosUsuarios on', () => {
			component.fechaInicio.set(new Date('2026-03-01'));
			component.fechaFin.set(new Date('2026-03-05'));
			component.todosUsuarios.set(true);

			let emitted: SyncRangePayload | null = null;
			component.confirm.subscribe((p) => (emitted = p));
			component.onConfirm();

			expect(emitted).not.toBeNull();
			expect(emitted!.fechaInicio).toBe('2026-03-01');
			expect(emitted!.fechaFin).toBe('2026-03-05');
			expect(emitted!.dnis).toBeUndefined();
		});

		it('emits payload with dnis when todosUsuarios off and persons selected', () => {
			component.fechaInicio.set(new Date('2026-03-01'));
			component.fechaFin.set(new Date('2026-03-05'));
			component.todosUsuarios.set(false);
			component.selectedPersonIds.set([1, 2]);

			let emitted: SyncRangePayload | null = null;
			component.confirm.subscribe((p) => (emitted = p));
			component.onConfirm();

			expect(emitted!.dnis).toEqual(['12345678', '87654321']);
		});

		it('closes dialog after confirm', () => {
			component.fechaInicio.set(new Date('2026-03-01'));
			component.fechaFin.set(new Date('2026-03-05'));
			component.visible.set(true);
			component.onConfirm();
			expect(component.visible()).toBe(false);
		});
	});
});

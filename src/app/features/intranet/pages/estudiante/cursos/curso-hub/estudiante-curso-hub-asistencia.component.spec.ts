// #region Imports
import { Component, input, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CursoHubContextService } from '@intranet-shared/components';
import { EstudianteCursosFacade } from '../../services/estudiante-cursos.facade';
import { EstudianteCursoHubAsistenciaComponent } from './estudiante-curso-hub-asistencia.component';
// #endregion

@Component({ selector: 'app-attendance-calendar', standalone: true, template: '' })
class CalendarStubComponent {
	readonly days = input<readonly unknown[]>([]);
}

const resumen = (horarioId: number) => ({
	horarioId,
	totalPresente: 8,
	totalTarde: 1,
	totalFalto: 1,
	totalClases: 10,
	detalle: [],
});

const baseVm = {
	miAsistencia: null as unknown,
	miAsistenciaLoading: false,
};

describe('EstudianteCursoHubAsistenciaComponent', () => {
	const vm = signal({ ...baseVm });
	const slot = signal<{ id: number } | null>({ id: 5 });
	const facade = {
		vm,
		loadMiAsistenciaForHub: vi.fn(),
		refreshMiAsistenciaForHub: vi.fn(),
		resetForHub: vi.fn(),
	};

	let realTemplate = false;

	function create() {
		TestBed.overrideComponent(
			EstudianteCursoHubAsistenciaComponent,
			realTemplate
				? { set: { imports: [CalendarStubComponent], schemas: [NO_ERRORS_SCHEMA] } }
				: { set: { imports: [], schemas: [NO_ERRORS_SCHEMA], template: '<div></div>' } },
		);
		const fixture = TestBed.createComponent(EstudianteCursoHubAsistenciaComponent);
		fixture.detectChanges();
		return fixture;
	}

	const api = (fixture: ReturnType<typeof create>) =>
		fixture.componentInstance as unknown as {
			resumen(): unknown;
			porcentaje(): number | null;
			onRefresh(): void;
		};

	beforeEach(() => {
		vi.clearAllMocks();
		vm.set({ ...baseVm });
		slot.set({ id: 5 });
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				{ provide: EstudianteCursosFacade, useValue: facade },
				{ provide: CursoHubContextService, useValue: { slot } },
			],
		});
		realTemplate = false;
	});

	it('requests the attendance of the resolved slot, even when the slot has no contenido', () => {
		create();

		expect(facade.loadMiAsistenciaForHub).toHaveBeenCalledExactlyOnceWith(5);
	});

	it('does not request anything until the shell resolved a slot', () => {
		slot.set(null);

		create();

		expect(facade.loadMiAsistenciaForHub).not.toHaveBeenCalled();
	});

	it('requests the attendance of the next slot when the shell switches slot', () => {
		const fixture = create();
		facade.loadMiAsistenciaForHub.mockClear();

		slot.set({ id: 6 });
		fixture.detectChanges();

		expect(facade.loadMiAsistenciaForHub).toHaveBeenCalledExactlyOnceWith(6);
	});

	it('exposes the summary of the current slot and its percentage', () => {
		vm.set({ ...baseVm, miAsistencia: resumen(5) });

		const fixture = create();

		expect(api(fixture).resumen()).not.toBeNull();
		expect(api(fixture).porcentaje()).toBe(90);
	});

	it('INV-AC11: has no percentage (not a false 0 %) when the slot has no registered classes', () => {
		vm.set({ ...baseVm, miAsistencia: { ...resumen(5), totalPresente: 0, totalTarde: 0, totalFalto: 0, totalClases: 0 } });

		const fixture = create();

		expect(api(fixture).porcentaje()).toBeNull();
	});

	it('INV-AC11: a single late counts as attendance (0 present, 1 late, 0 absent → 100 %)', () => {
		vm.set({ ...baseVm, miAsistencia: { ...resumen(5), totalPresente: 0, totalTarde: 1, totalFalto: 0, totalClases: 1 } });

		const fixture = create();

		expect(api(fixture).porcentaje()).toBe(100);
	});

	it('never exposes the summary of another slot left in the store', () => {
		vm.set({ ...baseVm, miAsistencia: resumen(4) });

		const fixture = create();

		expect(api(fixture).resumen()).toBeNull();
	});

	it('refreshes the current slot through the facade and never resets the store', () => {
		const fixture = create();

		api(fixture).onRefresh();
		fixture.destroy();

		expect(facade.refreshMiAsistenciaForHub).toHaveBeenCalledExactlyOnceWith(5);
		expect(facade.resetForHub).not.toHaveBeenCalled();
	});

	describe('calendar', () => {
		const calendarDays = (fixture: ReturnType<typeof create>) =>
			(fixture.debugElement.query((d) => d.name === 'app-attendance-calendar')?.componentInstance as CalendarStubComponent | undefined)?.days();

		beforeEach(() => {
			realTemplate = true;
		});

		it('mounts the calendar with the same detail records as the list', () => {
			const detalle = [
				{ asistenciaCursoId: 1, fecha: '2026-10-12T00:00:00', estado: 'F', justificacion: null, esRecuperacion: true },
			];
			vm.set({ ...baseVm, miAsistencia: { ...resumen(5), detalle } });

			const fixture = create();

			expect(calendarDays(fixture)).toEqual(detalle);
		});

		it('does not mount the calendar for another slot left in the store', () => {
			vm.set({ ...baseVm, miAsistencia: resumen(4) });

			const fixture = create();

			expect(calendarDays(fixture)).toBeUndefined();
		});
	});
});

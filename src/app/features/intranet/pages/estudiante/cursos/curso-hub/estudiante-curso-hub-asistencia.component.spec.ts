// #region Imports
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CursoHubContextService } from '@intranet-shared/components';
import { EstudianteCursosFacade } from '../../services/estudiante-cursos.facade';
import { EstudianteCursoHubAsistenciaComponent } from './estudiante-curso-hub-asistencia.component';
// #endregion

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

	function create() {
		const fixture = TestBed.createComponent(EstudianteCursoHubAsistenciaComponent);
		fixture.detectChanges();
		return fixture;
	}

	const api = (fixture: ReturnType<typeof create>) =>
		fixture.componentInstance as unknown as {
			resumen(): unknown;
			porcentaje(): number;
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
		TestBed.overrideComponent(EstudianteCursoHubAsistenciaComponent, {
			set: { imports: [], schemas: [NO_ERRORS_SCHEMA], template: '<div></div>' },
		});
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
});

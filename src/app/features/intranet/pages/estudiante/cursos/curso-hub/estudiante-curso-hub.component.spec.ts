// #region Imports
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService, WalClockService } from '@core/services';

import type { HorarioProfesorDto } from '../../models';
import { EstudianteCursosFacade } from '../../services/estudiante-cursos.facade';
import { EstudianteCursoHubComponent } from './estudiante-curso-hub.component';
// #endregion

// #region Fixtures
@Component({ standalone: true, template: '' })
class CursosListStubComponent {}

function slot(id: number, diaSemana: number, dia: string, horaInicio: string, horaFin: string, cursoId = 24, salonId = 34) {
	return {
		id,
		diaSemana,
		diaSemanaDescripcion: dia,
		horaInicio,
		horaFin,
		cursoId,
		cursoNombre: `Curso ${cursoId}`,
		salonId,
		salonDescripcion: `Salón ${salonId}`,
	} as HorarioProfesorDto;
}

const MON_SLOT = slot(1, 1, 'Lunes', '08:00', '09:30');
const WED_SLOT = slot(2, 3, 'Miércoles', '10:00', '11:30');
const OTHER_PAIR = slot(9, 2, 'Martes', '08:00', '09:00', 14, 25);
const MONDAY_830 = new Date(2026, 9, 5, 8, 30).getTime();
// #endregion

describe('EstudianteCursoHubComponent', () => {
	const vm = signal<{ horarios: HorarioProfesorDto[]; loading: boolean; error: string | null }>({
		horarios: [],
		loading: false,
		error: null,
	});
	const facade = { vm, loadHorarios: vi.fn(), getContenido: vi.fn() };
	const errorHandler = { showInfo: vi.fn(), showWarning: vi.fn() };
	let router: Router;

	beforeEach(() => {
		vm.set({ horarios: [], loading: false, error: null });
		facade.loadHorarios.mockImplementation(() => vm.update((v) => ({ ...v, loading: true })));
		facade.getContenido.mockReturnValue(of(null));

		TestBed.configureTestingModule({
			providers: [
				provideRouter([
					{ path: 'intranet/estudiante/cursos', component: CursosListStubComponent },
					{ path: 'intranet/estudiante/cursos/:cursoId/:salonId', component: EstudianteCursoHubComponent },
				]),
				{ provide: EstudianteCursosFacade, useValue: facade },
				{ provide: ErrorHandlerService, useValue: errorHandler },
				{ provide: WalClockService, useValue: { adjustedNow: () => MONDAY_830 } },
			],
		});
		router = TestBed.inject(Router);
	});

	afterEach(() => vi.clearAllMocks());

	async function openHub(url: string) {
		const harness = await RouterTestingHarness.create();
		await harness.navigateByUrl(url, EstudianteCursoHubComponent);
		return harness;
	}

	async function finishLoad(harness: RouterTestingHarness, horarios: HorarioProfesorDto[]) {
		vm.set({ horarios, loading: false, error: null });
		harness.detectChanges();
		await harness.fixture.whenStable();
		harness.detectChanges();
	}

	it('keeps a valid deep link after the schedules load', async () => {
		const harness = await openHub('/intranet/estudiante/cursos/24/34?horarioId=2');
		expect(facade.loadHorarios).toHaveBeenCalledOnce();
		expect(router.url).toBe('/intranet/estudiante/cursos/24/34?horarioId=2');

		await finishLoad(harness, [MON_SLOT, WED_SLOT]);

		expect(router.url).toBe('/intranet/estudiante/cursos/24/34?horarioId=2');
		expect(harness.routeNativeElement?.querySelector('app-curso-hub-header')?.textContent).toContain('Curso 24');
		expect(errorHandler.showInfo).not.toHaveBeenCalled();
	});

	it('redirects to the student Cursos list when the pair is not theirs', async () => {
		const harness = await openHub('/intranet/estudiante/cursos/24/34');

		await finishLoad(harness, [OTHER_PAIR]);

		expect(router.url).toBe('/intranet/estudiante/cursos');
		expect(errorHandler.showInfo).toHaveBeenCalledOnce();
	});

	it('probes content through the facade read, not the dialog flow', async () => {
		facade.getContenido.mockImplementation((id: number) => of(id === WED_SLOT.id ? { id: 11 } : null));
		const harness = await openHub('/intranet/estudiante/cursos/24/34');

		await finishLoad(harness, [MON_SLOT, WED_SLOT]);

		const selected = harness.routeNativeElement?.querySelector('.edu-select-button__option--selected');
		expect(selected?.textContent?.trim()).toBe('Miércoles 10:00 - 11:30');
	});
});

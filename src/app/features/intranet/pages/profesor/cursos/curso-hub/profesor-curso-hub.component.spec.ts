// #region Imports
import { Component, DebugElement, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EduConfirmationService } from '@edu-ui';
import { ErrorHandlerService, WalClockService } from '@core/services';

import type { HorarioProfesorDto } from '../../models';
import { ProfesorFacade } from '../../services/profesor.facade';
import { AttendanceCourseFacade } from '../services/attendance-course.facade';
import { CursoContenidoDataFacade } from '../services/curso-contenido-data.facade';
import { CursoHubCalificacionesLoader } from './curso-hub-calificaciones.loader';
import { ProfesorCursoHubComponent } from './profesor-curso-hub.component';
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

// 2026-10-05 08:30 is a Monday, MON_SLOT in progress.
const MONDAY_830 = new Date(2026, 9, 5, 8, 30).getTime();
// #endregion

describe('ProfesorCursoHubComponent', () => {
	const vm = signal<{ horarios: HorarioProfesorDto[]; loading: boolean; error: string | null }>({
		horarios: [],
		loading: false,
		error: null,
	});
	const facade = {
		vm,
		loadData: vi.fn(),
		getContenido: vi.fn(),
	};
	const errorHandler = { showInfo: vi.fn(), showWarning: vi.fn() };
	const dataFacade = { loadContenidoForHub: vi.fn(), resetForHub: vi.fn() };
	const calLoader = { reset: vi.fn(), ensure: vi.fn(), refresh: vi.fn() };
	const asistenciaVm = signal<{ registroDirty: boolean; registroData: { horarioId: number } | null }>({
		registroDirty: false,
		registroData: null,
	});
	const asistenciaFacade = { vm: asistenciaVm, resetAsistencia: vi.fn() };

	let router: Router;

	beforeEach(() => {
		vm.set({ horarios: [], loading: false, error: null });
		asistenciaVm.set({ registroDirty: false, registroData: null });
		facade.loadData.mockImplementation(() => vm.update((v) => ({ ...v, loading: true })));
		facade.getContenido.mockReturnValue(of(null));

		TestBed.configureTestingModule({
			providers: [
				provideRouter([
					{ path: 'intranet/profesor/cursos', component: CursosListStubComponent },
					{ path: 'intranet/profesor/cursos/:cursoId/:salonId', component: ProfesorCursoHubComponent },
				]),
				{ provide: ProfesorFacade, useValue: facade },
				{ provide: ErrorHandlerService, useValue: errorHandler },
				{ provide: CursoContenidoDataFacade, useValue: dataFacade },
				{ provide: CursoHubCalificacionesLoader, useValue: calLoader },
				{ provide: AttendanceCourseFacade, useValue: asistenciaFacade },
				{ provide: WalClockService, useValue: { adjustedNow: () => MONDAY_830 } },
			],
		});
		router = TestBed.inject(Router);
	});

	afterEach(() => vi.clearAllMocks());

	async function openHub(url: string) {
		const harness = await RouterTestingHarness.create();
		await harness.navigateByUrl(url, ProfesorCursoHubComponent);
		return harness;
	}

	async function finishLoad(harness: RouterTestingHarness, horarios: HorarioProfesorDto[], error: string | null = null) {
		vm.set({ horarios, loading: false, error });
		harness.detectChanges();
		await harness.fixture.whenStable();
		harness.detectChanges();
	}

	const selectedLabel = (harness: RouterTestingHarness) =>
		harness.routeNativeElement?.querySelector('.edu-select-button__option--selected')?.textContent?.trim();

	it('waits for the schedules before validating: a deep link reload never expels the user', async () => {
		const harness = await openHub('/intranet/profesor/cursos/24/34?horarioId=1');

		expect(facade.loadData).toHaveBeenCalledOnce();
		expect(router.url).toBe('/intranet/profesor/cursos/24/34?horarioId=1');
		expect(harness.routeNativeElement?.querySelector('edu-spinner')).not.toBeNull();

		await finishLoad(harness, [MON_SLOT, WED_SLOT]);

		expect(router.url).toBe('/intranet/profesor/cursos/24/34?horarioId=1');
		expect(errorHandler.showInfo).not.toHaveBeenCalled();
		expect(harness.routeNativeElement?.querySelector('app-curso-hub-header')).not.toBeNull();
	});

	it('does not redirect when the load never starts (no loading observed)', async () => {
		facade.loadData.mockImplementation(() => undefined);
		const harness = await openHub('/intranet/profesor/cursos/24/34');
		harness.detectChanges();
		await harness.fixture.whenStable();

		expect(router.url).toBe('/intranet/profesor/cursos/24/34');
		expect(errorHandler.showInfo).not.toHaveBeenCalled();
	});

	it('redirects to the Cursos list with an informative toast when the pair is not the user\'s', async () => {
		const harness = await openHub('/intranet/profesor/cursos/24/34');

		await finishLoad(harness, [OTHER_PAIR]);

		expect(router.url).toBe('/intranet/profesor/cursos');
		expect(errorHandler.showInfo).toHaveBeenCalledWith(
			'Curso no disponible',
			'No se encontró este curso para tu usuario.',
		);
	});

	it('redirects on a malformed pair', async () => {
		const harness = await openHub('/intranet/profesor/cursos/abc/34');

		await finishLoad(harness, [MON_SLOT]);

		expect(router.url).toBe('/intranet/profesor/cursos');
	});

	it('shows an error state instead of redirecting when the load failed', async () => {
		const harness = await openHub('/intranet/profesor/cursos/24/34');

		await finishLoad(harness, [], 'boom');

		expect(router.url).toBe('/intranet/profesor/cursos/24/34');
		expect(errorHandler.showInfo).not.toHaveBeenCalled();
		expect(harness.routeNativeElement?.querySelector('app-empty-state')).not.toBeNull();
	});

	it('puts Curso and Salón in the header', async () => {
		const harness = await openHub('/intranet/profesor/cursos/24/34');

		await finishLoad(harness, [MON_SLOT]);

		const header = harness.routeNativeElement?.querySelector('app-curso-hub-header')?.textContent ?? '';
		expect(header).toContain('Curso 24');
		expect(header).toContain('Salón 34');
	});

	it('hides the selector when the pair has a single slot', async () => {
		const harness = await openHub('/intranet/profesor/cursos/24/34');

		await finishLoad(harness, [MON_SLOT, OTHER_PAIR]);

		expect(harness.routeNativeElement?.querySelector('edu-select-button')).toBeNull();
	});

	it('shows the selector when the pair has several slots', async () => {
		const harness = await openHub('/intranet/profesor/cursos/24/34');

		await finishLoad(harness, [MON_SLOT, WED_SLOT]);

		expect(harness.routeNativeElement?.querySelector('edu-select-button')).not.toBeNull();
	});

	it('only offers the slots of the user for that pair', async () => {
		const harness = await openHub('/intranet/profesor/cursos/24/34');

		await finishLoad(harness, [MON_SLOT, WED_SLOT, OTHER_PAIR]);

		const options = harness.routeNativeElement?.querySelectorAll('.edu-select-button__option');
		expect(options?.length).toBe(2);
	});

	it('preselects the slot in progress when there is no query', async () => {
		const harness = await openHub('/intranet/profesor/cursos/24/34');

		await finishLoad(harness, [MON_SLOT, WED_SLOT]);

		expect(selectedLabel(harness)).toBe('Lunes 08:00 - 09:30');
	});

	it('honours a valid query slot', async () => {
		const harness = await openHub('/intranet/profesor/cursos/24/34?horarioId=2');

		await finishLoad(harness, [MON_SLOT, WED_SLOT]);

		expect(selectedLabel(harness)).toBe('Miércoles 10:00 - 11:30');
		expect(facade.getContenido).not.toHaveBeenCalled();
	});

	it('prefers the only slot with content over the one in progress', async () => {
		facade.getContenido.mockImplementation((id: number) => of(id === WED_SLOT.id ? { id: 11 } : null));
		const harness = await openHub('/intranet/profesor/cursos/24/34');

		await finishLoad(harness, [MON_SLOT, WED_SLOT]);

		expect(selectedLabel(harness)).toBe('Miércoles 10:00 - 11:30');
	});

	it('keeps the schedule-based slot when the content probe fails', async () => {
		facade.getContenido.mockReturnValue(throwError(() => new Error('network')));
		const harness = await openHub('/intranet/profesor/cursos/24/34');

		await finishLoad(harness, [MON_SLOT, WED_SLOT]);

		expect(selectedLabel(harness)).toBe('Lunes 08:00 - 09:30');
	});

	it('ignores a slot from another pair, warns, and drops it from the URL', async () => {
		const harness = await openHub('/intranet/profesor/cursos/24/34?horarioId=9');

		await finishLoad(harness, [MON_SLOT, WED_SLOT, OTHER_PAIR]);

		expect(errorHandler.showWarning).toHaveBeenCalledOnce();
		expect(errorHandler.showWarning.mock.calls[0][1]).not.toMatch(/\bid\b/i);
		expect(router.url).toBe('/intranet/profesor/cursos/24/34');
		expect(selectedLabel(harness)).toBe('Lunes 08:00 - 09:30');
	});

	it('updates the query with URL replacement when the slot changes', async () => {
		const harness = await openHub('/intranet/profesor/cursos/24/34');
		await finishLoad(harness, [MON_SLOT, WED_SLOT]);
		const navigate = vi.spyOn(router, 'navigate');

		const options = harness.routeNativeElement?.querySelectorAll<HTMLButtonElement>('.edu-select-button__option');
		options?.[1].click();
		await harness.fixture.whenStable();
		harness.detectChanges();

		expect(navigate).toHaveBeenCalledWith(
			[],
			expect.objectContaining({ queryParams: { horarioId: WED_SLOT.id }, replaceUrl: true }),
		);
		expect(router.url).toBe('/intranet/profesor/cursos/24/34?horarioId=2');
		expect(selectedLabel(harness)).toBe('Miércoles 10:00 - 11:30');
	});

	describe('dueño de la carga del contenido', () => {
		it('loads the resolved slot once the schedules are ready, not before', async () => {
			const harness = await openHub('/intranet/profesor/cursos/24/34?horarioId=2');
			expect(dataFacade.loadContenidoForHub).not.toHaveBeenCalled();

			await finishLoad(harness, [MON_SLOT, WED_SLOT]);

			expect(dataFacade.loadContenidoForHub).toHaveBeenCalledOnce();
			expect(dataFacade.loadContenidoForHub).toHaveBeenCalledWith(2, { salonId: 34 });
			expect(calLoader.reset).toHaveBeenCalled();
		});

		it('reloads and resets calificaciones when the slot changes, but not when only the slot object is refreshed', async () => {
			const harness = await openHub('/intranet/profesor/cursos/24/34?horarioId=1');
			await finishLoad(harness, [MON_SLOT, WED_SLOT]);
			dataFacade.loadContenidoForHub.mockClear();
			calLoader.reset.mockClear();

			vm.update((v) => ({ ...v, horarios: [{ ...MON_SLOT }, WED_SLOT] }));
			harness.detectChanges();
			expect(dataFacade.loadContenidoForHub).not.toHaveBeenCalled();

			await router.navigate([], { queryParams: { horarioId: 2 }, queryParamsHandling: 'merge' });
			harness.detectChanges();

			expect(dataFacade.loadContenidoForHub).toHaveBeenCalledWith(2, { salonId: 34 });
			expect(calLoader.reset).toHaveBeenCalledOnce();
		});

		it('clears both stores only when leaving the hub', async () => {
			const harness = await openHub('/intranet/profesor/cursos/24/34');
			await finishLoad(harness, [MON_SLOT]);
			dataFacade.resetForHub.mockClear();

			harness.fixture.destroy();

			expect(dataFacade.resetForHub).toHaveBeenCalledOnce();
			expect(calLoader.reset).toHaveBeenCalled();
		});

		it('clears the attendance store only when leaving the hub, not when the slot changes', async () => {
			const harness = await openHub('/intranet/profesor/cursos/24/34?horarioId=1');
			await finishLoad(harness, [MON_SLOT, WED_SLOT]);
			await router.navigate([], { queryParams: { horarioId: 2 }, queryParamsHandling: 'merge' });
			harness.detectChanges();
			expect(asistenciaFacade.resetAsistencia).not.toHaveBeenCalled();

			harness.fixture.destroy();

			expect(asistenciaFacade.resetAsistencia).toHaveBeenCalledOnce();
		});
	});

	describe('cambios de asistencia sin guardar', () => {
		const clickSecondSlot = async (harness: RouterTestingHarness) => {
			const options = harness.routeNativeElement?.querySelectorAll<HTMLButtonElement>('.edu-select-button__option');
			options?.[1].click();
			await harness.fixture.whenStable();
			harness.detectChanges();
		};
		const confirmation = (harness: RouterTestingHarness) =>
			(harness.routeDebugElement as DebugElement).injector.get(EduConfirmationService);

		it('asks before leaving the slot and keeps the selector on the current one', async () => {
			const harness = await openHub('/intranet/profesor/cursos/24/34?horarioId=1');
			await finishLoad(harness, [MON_SLOT, WED_SLOT]);
			asistenciaVm.set({ registroDirty: true, registroData: { horarioId: 1 } });

			await clickSecondSlot(harness);

			expect(router.url).toBe('/intranet/profesor/cursos/24/34?horarioId=1');
			expect(confirmation(harness).confirmation()?.header).toBe('Cambios sin guardar');
			expect(selectedLabel(harness)).toBe('Lunes 08:00 - 09:30');
		});

		it('changes the slot once the user accepts', async () => {
			const harness = await openHub('/intranet/profesor/cursos/24/34?horarioId=1');
			await finishLoad(harness, [MON_SLOT, WED_SLOT]);
			asistenciaVm.set({ registroDirty: true, registroData: { horarioId: 1 } });
			await clickSecondSlot(harness);

			confirmation(harness).confirmation()?.accept?.();
			await harness.fixture.whenStable();
			harness.detectChanges();

			expect(router.url).toBe('/intranet/profesor/cursos/24/34?horarioId=2');
			expect(selectedLabel(harness)).toBe('Miércoles 10:00 - 11:30');
		});

		it('does not change anything when the user cancels', async () => {
			const harness = await openHub('/intranet/profesor/cursos/24/34?horarioId=1');
			await finishLoad(harness, [MON_SLOT, WED_SLOT]);
			asistenciaVm.set({ registroDirty: true, registroData: { horarioId: 1 } });
			await clickSecondSlot(harness);

			confirmation(harness).close();
			harness.detectChanges();

			expect(router.url).toBe('/intranet/profesor/cursos/24/34?horarioId=1');
			expect(selectedLabel(harness)).toBe('Lunes 08:00 - 09:30');
		});

		it('changes the slot without asking when nothing is edited', async () => {
			const harness = await openHub('/intranet/profesor/cursos/24/34?horarioId=1');
			await finishLoad(harness, [MON_SLOT, WED_SLOT]);

			await clickSecondSlot(harness);

			expect(confirmation(harness).confirmation()).toBeNull();
			expect(router.url).toBe('/intranet/profesor/cursos/24/34?horarioId=2');
		});

		it('ignores edits that belong to another slot', async () => {
			const harness = await openHub('/intranet/profesor/cursos/24/34?horarioId=1');
			await finishLoad(harness, [MON_SLOT, WED_SLOT]);
			asistenciaVm.set({ registroDirty: true, registroData: { horarioId: 2 } });

			await clickSecondSlot(harness);

			expect(confirmation(harness).confirmation()).toBeNull();
			expect(router.url).toBe('/intranet/profesor/cursos/24/34?horarioId=2');
		});
	});

	it('shows the tabs implemented for the profesor role', async () => {
		const harness = await openHub('/intranet/profesor/cursos/24/34');
		await finishLoad(harness, [MON_SLOT]);

		const labels = Array.from(harness.routeNativeElement?.querySelectorAll('a.hub-tab') ?? []).map((a) =>
			a.textContent?.trim(),
		);
		expect(labels).toEqual(['Contenido', 'Calificaciones', 'Asistencia', 'Información']);
	});
});

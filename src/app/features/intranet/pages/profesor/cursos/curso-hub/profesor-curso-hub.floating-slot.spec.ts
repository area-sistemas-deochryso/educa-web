// #region Imports
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pendingChangesGuard } from '@core/guards';
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

function slot(id: number, horaInicio: string, horaFin: string) {
	return {
		id,
		diaSemana: 1,
		diaSemanaDescripcion: 'Lunes',
		horaInicio,
		horaFin,
		cursoId: 24,
		cursoNombre: 'Curso 24',
		salonId: 34,
		salonDescripcion: 'Salón 34',
	} as HorarioProfesorDto;
}

// Dos horas consecutivas del mismo par: el hub elige la que está en curso.
const FIRST_HOUR = slot(1, '08:00', '09:30');
const SECOND_HOUR = slot(3, '09:30', '11:00');
const FIRST_LABEL = 'Lunes 08:00 - 09:30';
const SECOND_LABEL = 'Lunes 09:30 - 11:00';

// 2026-10-05 es lunes.
const MONDAY_0929 = new Date(2026, 9, 5, 9, 29, 0, 300);
const MONDAY_0931 = new Date(2026, 9, 5, 9, 31, 0, 600);
// #endregion

/**
 * Franja flotante: un hub abierto sin `?horarioId=` resuelve la franja por hora/contenido, y esa
 * resolución puede cambiar sin ninguna navegación. Estos tests usan el `WalClockService` real
 * (el spec del shell lo mockea con una función plana y por eso no ve la reactividad del reloj).
 */
describe('ProfesorCursoHubComponent — floating slot with unsaved attendance', () => {
	const vm = signal<{ horarios: HorarioProfesorDto[]; loading: boolean; error: string | null }>({
		horarios: [],
		loading: false,
		error: null,
	});
	const facade = { vm, loadData: vi.fn(), getContenido: vi.fn() };
	const asistenciaVm = signal<{ registroDirty: boolean; registroData: { horarioId: number } | null }>({
		registroDirty: false,
		registroData: null,
	});
	const asistenciaFacade = {
		vm: asistenciaVm,
		resetAsistencia: vi.fn(),
		registrar: vi.fn(),
		canSaveOutsidePanel: vi.fn(),
	};

	let clock: WalClockService;

	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(MONDAY_0929);

		vm.set({ horarios: [], loading: false, error: null });
		asistenciaVm.set({ registroDirty: false, registroData: null });
		facade.loadData.mockImplementation(() => vm.update((v) => ({ ...v, loading: true })));
		facade.getContenido.mockReturnValue(of(null));

		TestBed.configureTestingModule({
			providers: [
				provideRouter([
					{ path: 'intranet/profesor/cursos', component: CursosListStubComponent },
					{
						path: 'intranet/profesor/cursos/:cursoId/:salonId',
						component: ProfesorCursoHubComponent,
						canDeactivate: [pendingChangesGuard],
					},
				]),
				{ provide: ProfesorFacade, useValue: facade },
				{ provide: ErrorHandlerService, useValue: { showInfo: vi.fn(), showWarning: vi.fn() } },
				{ provide: CursoContenidoDataFacade, useValue: { loadContenidoForHub: vi.fn(), resetForHub: vi.fn() } },
				{ provide: CursoHubCalificacionesLoader, useValue: { reset: vi.fn(), ensure: vi.fn(), refresh: vi.fn() } },
				{ provide: AttendanceCourseFacade, useValue: asistenciaFacade },
			],
		});
		clock = TestBed.inject(WalClockService);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	async function openHub(horarios: HorarioProfesorDto[], url = '/intranet/profesor/cursos/24/34') {
		const harness = await RouterTestingHarness.create();
		await harness.navigateByUrl(url, ProfesorCursoHubComponent);
		vm.set({ horarios, loading: false, error: null });
		await settle(harness);
		return harness;
	}

	async function settle(harness: RouterTestingHarness) {
		harness.detectChanges();
		await harness.fixture.whenStable();
		harness.detectChanges();
	}

	const selectedLabel = (harness: RouterTestingHarness) =>
		harness.routeNativeElement?.querySelector('.edu-select-button__option--selected')?.textContent?.trim();

	/** Lo que hace `clockSyncInterceptor` con cada respuesta HTTP: el `Date` del servidor tiene resolución de 1 s. */
	function serverResponseArrives(now: Date) {
		clock.recordServerTime(new Date(Math.floor(now.getTime() / 1000) * 1000).toUTCString());
	}

	function crossIntoSecondHour() {
		vi.setSystemTime(MONDAY_0931);
		serverResponseArrives(MONDAY_0931);
	}

	describe('clock', () => {
		it('control: without edits, the preselected slot follows the clock into the next hour', async () => {
			serverResponseArrives(MONDAY_0929);
			const harness = await openHub([FIRST_HOUR, SECOND_HOUR]);
			expect(selectedLabel(harness)).toBe(FIRST_LABEL);

			crossIntoSecondHour();
			await settle(harness);

			expect(selectedLabel(harness)).toBe(SECOND_LABEL);
		});

		it('keeps the slot of the unsaved attendance when the clock crosses into the next hour', async () => {
			serverResponseArrives(MONDAY_0929);
			const harness = await openHub([FIRST_HOUR, SECOND_HOUR]);
			asistenciaVm.set({ registroDirty: true, registroData: { horarioId: FIRST_HOUR.id } });
			await settle(harness);

			crossIntoSecondHour();
			await settle(harness);

			expect(selectedLabel(harness)).toBe(FIRST_LABEL);
		});

		it('keeps an explicit ?horarioId= even after the clock crosses the hour (pinned slots never float)', async () => {
			serverResponseArrives(MONDAY_0929);
			const harness = await openHub([FIRST_HOUR, SECOND_HOUR], '/intranet/profesor/cursos/24/34?horarioId=1');
			asistenciaVm.set({ registroDirty: true, registroData: { horarioId: FIRST_HOUR.id } });

			crossIntoSecondHour();
			await settle(harness);

			expect(selectedLabel(harness)).toBe(FIRST_LABEL);
		});
	});

	describe('pinning the slot in the URL', () => {
		it('leaves the URL alone while there are no unsaved edits', async () => {
			serverResponseArrives(MONDAY_0929);
			await openHub([FIRST_HOUR, SECOND_HOUR]);

			expect(TestBed.inject(Router).url).toBe('/intranet/profesor/cursos/24/34');
		});

		it('writes the resolved slot into the URL (replaceUrl) as soon as there are unsaved edits', async () => {
			serverResponseArrives(MONDAY_0929);
			const harness = await openHub([FIRST_HOUR, SECOND_HOUR]);
			const router = TestBed.inject(Router);
			const navigate = vi.spyOn(router, 'navigate');

			asistenciaVm.set({ registroDirty: true, registroData: { horarioId: FIRST_HOUR.id } });
			await settle(harness);

			expect(router.url).toBe('/intranet/profesor/cursos/24/34?horarioId=1');
			expect(navigate).toHaveBeenCalledOnce();
			expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ replaceUrl: true }));
		});

		it('does not rewrite a URL that already carries the slot', async () => {
			const harness = await openHub([FIRST_HOUR, SECOND_HOUR], '/intranet/profesor/cursos/24/34?horarioId=3');
			const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');

			asistenciaVm.set({ registroDirty: true, registroData: { horarioId: SECOND_HOUR.id } });
			await settle(harness);

			expect(navigate).not.toHaveBeenCalled();
		});
	});

	describe('content probe', () => {
		it('keeps the slot of the unsaved attendance when a late content probe points to another slot', async () => {
			const probes = new Map<number, Subject<unknown>>();
			facade.getContenido.mockImplementation((id: number) => {
				const subject = new Subject<unknown>();
				probes.set(id, subject);
				return subject;
			});
			const harness = await openHub([FIRST_HOUR, SECOND_HOUR]);
			expect(selectedLabel(harness)).toBe(FIRST_LABEL);
			asistenciaVm.set({ registroDirty: true, registroData: { horarioId: FIRST_HOUR.id } });
			await settle(harness);

			// Solo la segunda hora tiene contenido; el sondeo termina después de que el profesor ya editó.
			probes.get(FIRST_HOUR.id)?.next(null);
			probes.get(FIRST_HOUR.id)?.complete();
			probes.get(SECOND_HOUR.id)?.next({ id: 11 });
			probes.get(SECOND_HOUR.id)?.complete();
			await settle(harness);

			expect(selectedLabel(harness)).toBe(FIRST_LABEL);
		});
	});
});

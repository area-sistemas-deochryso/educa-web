// * Tests for EstudianteHorariosFacade — validates student schedule loading.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { EstudianteHorariosFacade } from './estudiante-horarios.facade';
import { EstudianteHorariosStore } from './estudiante-horarios.store';
import { EstudianteApiService } from '../../services/estudiante-api.service';
import { SmartNotificationService } from '@core/services/notifications/smart-notification.service';

// #endregion

// #region Mocks
const mockHorarios = [
	{ id: 1, cursoNombre: 'Mat', salonDescripcion: '1A', diaSemana: 1 },
	{ id: 2, cursoNombre: 'Com', salonDescripcion: '1A', diaSemana: 2 },
] as never[];

function createMockApi() {
	return { getMisHorarios: vi.fn().mockReturnValue(of(mockHorarios)) };
}
// #endregion

// #region Tests
describe('EstudianteHorariosFacade', () => {
	let facade: EstudianteHorariosFacade;
	let store: EstudianteHorariosStore;
	let api: ReturnType<typeof createMockApi>;
	let smartNotif: { saveHorarioSnapshot: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		api = createMockApi();
		smartNotif = { saveHorarioSnapshot: vi.fn() };

		TestBed.configureTestingModule({
			providers: [
				EstudianteHorariosFacade,
				EstudianteHorariosStore,
				{ provide: EstudianteApiService, useValue: api },
				{ provide: SmartNotificationService, useValue: smartNotif },
			],
		});

		facade = TestBed.inject(EstudianteHorariosFacade);
		store = TestBed.inject(EstudianteHorariosStore);
	});

	describe('loadData', () => {
		it('should load horarios into store', () => {
			facade.loadData();

			expect(store.horarios()).toEqual(mockHorarios);
			expect(store.loading()).toBe(false);
			expect(store.isEmpty()).toBe(false);
		});

		it('should save smart notification snapshot', () => {
			facade.loadData();
			expect(smartNotif.saveHorarioSnapshot).toHaveBeenCalledWith(mockHorarios);
		});

		it('should handle error', () => {
			api.getMisHorarios.mockReturnValue(throwError(() => new Error('fail')));
			facade.loadData();

			expect(store.error()).toBe('No se pudieron cargar los horarios');
			expect(store.loading()).toBe(false);
		});
	});

	describe('vm', () => {
		it('should expose store vm', () => {
			expect(facade.vm).toBe(store.vm);
		});
	});
});
// #endregion

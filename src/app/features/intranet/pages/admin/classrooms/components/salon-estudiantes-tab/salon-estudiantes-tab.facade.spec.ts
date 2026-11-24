import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService } from '@core/services';

import { SalonEstudiantesApiService } from '../../services/salon-estudiantes-api.service';
import { ClassroomStudentsFacade } from './salon-estudiantes-tab.facade';

function crear(api: Record<string, unknown>) {
	const errorHandler = { showSuccess: vi.fn(), showError: vi.fn(), showWarning: vi.fn() };
	TestBed.configureTestingModule({
		providers: [
			ClassroomStudentsFacade,
			{ provide: SalonEstudiantesApiService, useValue: api },
			{ provide: ErrorHandlerService, useValue: errorHandler },
		],
	});
	return { facade: TestBed.inject(ClassroomStudentsFacade), errorHandler };
}

describe('ClassroomStudentsFacade.agregar (P123 F8, puerta B)', () => {
	it('tras la confirmación del BE recarga el salón y avisa con onAgregado', () => {
		const agregar = vi.fn(() => of(undefined));
		const listarPorSalon = vi.fn(() => of([]));
		const onAgregado = vi.fn();
		const { facade, errorHandler } = crear({ agregar, listarPorSalon });

		facade.agregar(7, 15, onAgregado);

		expect(agregar).toHaveBeenCalledWith(7, 15);
		expect(listarPorSalon).toHaveBeenCalledWith(7);
		expect(errorHandler.showSuccess).toHaveBeenCalledTimes(1);
		expect(onAgregado).toHaveBeenCalledTimes(1);
		expect(facade.vm().actionLoading).toBe(false);
	});

	it('sin onAgregado agrega igual (el parámetro es opcional)', () => {
		const { facade } = crear({ agregar: () => of(undefined), listarPorSalon: () => of([]) });

		expect(() => facade.agregar(7, 15)).not.toThrow();
		expect(facade.vm().actionLoading).toBe(false);
	});

	it('si el BE rechaza, muestra el error y NO ofrece la matrícula', () => {
		const onAgregado = vi.fn();
		const { facade, errorHandler } = crear({
			agregar: () => throwError(() => ({ status: 409 })),
			listarPorSalon: vi.fn(),
		});

		facade.agregar(7, 15, onAgregado);

		expect(errorHandler.showError).toHaveBeenCalledTimes(1);
		expect(onAgregado).not.toHaveBeenCalled();
		expect(facade.vm().actionLoading).toBe(false);
	});
});

// #region Imports
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserPermissionsService } from '@core/services/permissions';
import { CursoHubContextService } from '@intranet-shared/components';
import { ProfesorFacade } from '../../services/profesor.facade';
import { ProfesorCursoHubSalonComponent } from './profesor-curso-hub-salon.component';
// #endregion

const horario = (id: number, over: Record<string, unknown> = {}) => ({
	id,
	cursoId: 24,
	cursoNombre: 'Matemática',
	salonId: 34,
	salonDescripcion: '5to A',
	cantidadEstudiantes: 28,
	...over,
});

describe('ProfesorCursoHubSalonComponent', () => {
	const vm = signal({ horarios: [horario(1), horario(2)] as unknown[], salones: [{ salonId: 34, esTutor: true }] });
	const slot = signal<{ id: number; cursoId: number; salonId: number } | null>({ id: 1, cursoId: 24, salonId: 34 });
	const hasCapability = vi.fn();

	interface Api {
		summary(): { salonId: number; cantidadEstudiantes: number; cursos: { cursoId: number }[] } | null;
		esTutor(): boolean;
		salonesTarget(): { commands: unknown[]; queryParams: Record<string, number> } | null;
	}

	function create() {
		const fixture = TestBed.createComponent(ProfesorCursoHubSalonComponent);
		fixture.detectChanges();
		return fixture.componentInstance as unknown as Api;
	}

	beforeEach(() => {
		vm.set({ horarios: [horario(1), horario(2)], salones: [{ salonId: 34, esTutor: true }] });
		slot.set({ id: 1, cursoId: 24, salonId: 34 });
		hasCapability.mockReset().mockReturnValue(true);
		TestBed.configureTestingModule({
			providers: [
				{ provide: ProfesorFacade, useValue: { vm } },
				{ provide: CursoHubContextService, useValue: { slot } },
				{ provide: UserPermissionsService, useValue: { hasCapability } },
			],
		});
		TestBed.overrideComponent(ProfesorCursoHubSalonComponent, {
			set: { imports: [], schemas: [NO_ERRORS_SCHEMA], template: '<div></div>' },
		});
	});

	it('summarizes the salón of the resolved slot from the schedules the shell already loaded', () => {
		const api = create();

		expect(api.summary()).toMatchObject({ salonId: 34, cantidadEstudiantes: 28, cursos: [{ cursoId: 24 }] });
	});

	it('does not re-emit the summary when the slot changes inside the same pair', () => {
		const api = create();
		const before = api.summary();

		slot.set({ id: 2, cursoId: 24, salonId: 34 });

		expect(api.summary()).toBe(before);
	});

	it('knows whether the profesor is tutor of the salón', () => {
		const api = create();
		expect(api.esTutor()).toBe(true);

		vm.update((v) => ({ ...v, salones: [{ salonId: 34, esTutor: false }] }));
		expect(api.esTutor()).toBe(false);
	});

	it('links to Mis Salones with the slot when the profesor has the Salones capability', () => {
		const api = create();
		const target = api.salonesTarget();

		expect(hasCapability).toHaveBeenCalledWith('SALONES_PROFESOR_PAGE_VIEW');
		expect(target).toEqual({
			commands: ['/intranet', 'profesor', 'salones'],
			queryParams: { horarioId: 1 },
		});
	});

	it('hides the link without the Salones capability', () => {
		hasCapability.mockReturnValue(false);

		expect(create().salonesTarget()).toBeNull();
	});

	it('has no summary until the slot is resolved', () => {
		slot.set(null);

		expect(create().summary()).toBeNull();
	});
});

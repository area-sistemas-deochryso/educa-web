// #region Imports
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserPermissionsService } from '@core/services/permissions';
import { CursoHubContextService } from '@intranet-shared/components';
import { EstudianteCursosFacade } from '../../services/estudiante-cursos.facade';
import { EstudianteCursoHubSalonComponent } from './estudiante-curso-hub-salon.component';
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

describe('EstudianteCursoHubSalonComponent', () => {
	const vm = signal({
		horarios: [horario(1), horario(2), horario(3, { cursoId: 30, cursoNombre: 'Historia' })] as unknown[],
	});
	const slot = signal<{ id: number; cursoId: number; salonId: number } | null>({ id: 1, cursoId: 24, salonId: 34 });
	const hasCapability = vi.fn();

	interface Api {
		summary(): { salonId: number; cantidadEstudiantes: number; cursos: { cursoId: number }[] } | null;
		salonesTarget(): { commands: unknown[]; queryParams: Record<string, number> } | null;
	}

	function create() {
		const fixture = TestBed.createComponent(EstudianteCursoHubSalonComponent);
		fixture.detectChanges();
		return fixture.componentInstance as unknown as Api;
	}

	beforeEach(() => {
		slot.set({ id: 1, cursoId: 24, salonId: 34 });
		hasCapability.mockReset().mockReturnValue(true);
		TestBed.configureTestingModule({
			providers: [
				{ provide: EstudianteCursosFacade, useValue: { vm } },
				{ provide: CursoHubContextService, useValue: { slot } },
				{ provide: UserPermissionsService, useValue: { hasCapability } },
			],
		});
		TestBed.overrideComponent(EstudianteCursoHubSalonComponent, {
			set: { imports: [], schemas: [NO_ERRORS_SCHEMA], template: '<div></div>' },
		});
	});

	it('summarizes the salón with every course of the estudiante in it', () => {
		const api = create();

		expect(api.summary()).toMatchObject({
			salonId: 34,
			cantidadEstudiantes: 28,
			cursos: [{ cursoId: 30 }, { cursoId: 24 }],
		});
	});

	it('does not re-emit the summary when the slot changes inside the same pair', () => {
		const api = create();
		const before = api.summary();

		slot.set({ id: 2, cursoId: 24, salonId: 34 });

		expect(api.summary()).toBe(before);
	});

	it('links to Mis Salones with the slot when the estudiante has the Salones capability', () => {
		const api = create();
		const target = api.salonesTarget();

		expect(hasCapability).toHaveBeenCalledWith('SALONES_ESTUDIANTE_PAGE_VIEW');
		expect(target).toEqual({
			commands: ['/intranet', 'estudiante', 'salones'],
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

// #region Imports
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { testProviders } from '@test';
import { UserProfileService } from '@core/services/user';
import { ProfesorApiService } from '@features/intranet/pages/profesor/services';
import { ProfesorHorarioHomeService } from '../../services/profesor-horario-home.service';
import { EstudianteApiService } from '@features/intranet/pages/estudiante/services';
import type { HorarioProfesorDto } from '@features/intranet/pages/profesor/models';
import { HorarioHoyWidgetComponent } from './horario-hoy-widget.component';

// #endregion
// #region Helpers
// Lunes 2026-09-28 → dia 1.
const NOW = new Date(2026, 8, 28, 10, 0, 0);

function horario(partial: Partial<HorarioProfesorDto> & Pick<HorarioProfesorDto, 'id' | 'cursoId' | 'salonId'>): HorarioProfesorDto {
	return {
		diaSemana: 1,
		diaSemanaDescripcion: 'Lunes',
		horaInicio: '08:00',
		horaFin: '09:00',
		estado: true,
		salonDescripcion: 'Salón',
		cursoNombre: 'Curso',
		profesorId: 1,
		profesorNombreCompleto: null,
		...partial,
	} as HorarioProfesorDto;
}

function setup(profesor: boolean, horarios: HorarioProfesorDto[]) {
	TestBed.configureTestingModule({
		imports: [HorarioHoyWidgetComponent],
		providers: [
			...testProviders,
			provideRouter([]),
			ProfesorHorarioHomeService,
			{ provide: UserProfileService, useValue: { isProfesor: () => profesor, entityId: () => 7 } },
			{ provide: ProfesorApiService, useValue: { getHorarios: () => of(horarios) } },
			{ provide: EstudianteApiService, useValue: { getMisHorarios: () => of(horarios) } },
		],
	});
	const fixture = TestBed.createComponent(HorarioHoyWidgetComponent);
	fixture.detectChanges();
	return fixture.nativeElement as HTMLElement;
}
// #endregion

describe('HorarioHoyWidgetComponent', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('profesor: cada bloque enlaza al hub de su curso/salón', () => {
		const el = setup(true, [
			horario({ id: 1, cursoId: 10, salonId: 100, horaInicio: '08:00' }),
			horario({ id: 2, cursoId: 20, salonId: 200, horaInicio: '10:00', horaFin: '11:00' }),
		]);

		const hrefs = Array.from(el.querySelectorAll<HTMLAnchorElement>('a.horario-link')).map((a) => a.getAttribute('href'));
		expect(hrefs).toEqual(['/intranet/profesor/cursos/10/100?horarioId=1', '/intranet/profesor/cursos/20/200?horarioId=2']);
	});

	it('profesor: un bloque sin salón no es navegable', () => {
		const el = setup(true, [horario({ id: 1, cursoId: 10, salonId: 0 })]);

		expect(el.querySelector('.horario-item')).not.toBeNull();
		expect(el.querySelector('a.horario-link')).toBeNull();
	});

	describe('vacío del profesor', () => {
		const emptyText = (el: HTMLElement) => el.querySelector('.widget-empty')?.textContent?.trim();

		it('fin de semana → mensaje de fin de semana, no "sin horario"', () => {
			vi.setSystemTime(new Date(2026, 9, 17, 10, 0, 0)); // sábado
			const el = setup(true, [horario({ id: 1, cursoId: 10, salonId: 100, diaSemana: 1 })]);

			expect(emptyText(el)).toContain('fin de semana');
			expect(emptyText(el)).not.toContain('horario asignado');
		});

		it('sin horario asignado → mensaje distinto al de sin clases hoy, sin próxima clase', () => {
			const el = setup(true, []);

			expect(emptyText(el)).toContain('horario asignado');
			expect(emptyText(el)).not.toContain('No tienes clases hoy');
			expect(el.querySelector('.horario-proxima')).toBeNull();
		});

		it('sin clases hoy pero con otros días → próxima clase correcta con link al hub', () => {
			// Lunes 28: hay clase solo el jueves 10:00.
			const el = setup(true, [
				horario({ id: 7, cursoId: 10, salonId: 100, diaSemana: 4, horaInicio: '10:00', horaFin: '11:00', cursoNombre: 'Física' }),
			]);

			expect(emptyText(el)).toContain('No tienes clases hoy');
			expect(el.querySelector('.horario-proxima')?.textContent).toContain('jueves, 10:00 - 11:00');
			expect(el.querySelector('a.horario-proxima-link')?.getAttribute('href')).toBe('/intranet/profesor/cursos/10/100?horarioId=7');
		});

		it('cruza de semana: viernes sin clases hoy → próxima clase es el lunes', () => {
			vi.setSystemTime(new Date(2026, 9, 16, 10, 0, 0)); // viernes
			const el = setup(true, [horario({ id: 1, cursoId: 10, salonId: 100, diaSemana: 1, horaInicio: '08:00', horaFin: '09:00' })]);

			expect(el.querySelector('.horario-proxima')?.textContent).toContain('lunes, 08:00 - 09:00');
		});

		it('la clase del día siguiente se llama "mañana"', () => {
			const el = setup(true, [horario({ id: 1, cursoId: 10, salonId: 100, diaSemana: 2, horaInicio: '08:00', horaFin: '09:00' })]);

			expect(el.querySelector('.horario-proxima')?.textContent).toContain('mañana, 08:00 - 09:00');
		});

		it('próxima clase sin salón no es navegable', () => {
			const el = setup(true, [horario({ id: 1, cursoId: 10, salonId: 0, diaSemana: 3 })]);

			expect(el.querySelector('.horario-proxima')).not.toBeNull();
			expect(el.querySelector('a.horario-proxima-link')).toBeNull();
		});
	});

	it('estudiante: el vacío conserva "Sin clases hoy" y sin próxima clase', () => {
		const el = setup(false, [horario({ id: 1, cursoId: 10, salonId: 100, diaSemana: 4 })]);

		expect(el.querySelector('.widget-empty')?.textContent?.trim()).toBe('Sin clases hoy');
		expect(el.querySelector('.horario-proxima')).toBeNull();
	});

	it('estudiante: los bloques no llevan link al hub del profesor', () => {
		const el = setup(false, [horario({ id: 1, cursoId: 10, salonId: 100 })]);

		expect(el.querySelector('.horario-item')).not.toBeNull();
		expect(el.querySelector('a.horario-link')).toBeNull();
	});
});

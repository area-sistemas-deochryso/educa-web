// #region Imports
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { testProviders } from '@test';
import { UserProfileService } from '@core/services/user';
import { ProfesorApiService } from '@features/intranet/pages/profesor/services';
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

	it('estudiante: los bloques no llevan link al hub del profesor', () => {
		const el = setup(false, [horario({ id: 1, cursoId: 10, salonId: 100 })]);

		expect(el.querySelector('.horario-item')).not.toBeNull();
		expect(el.querySelector('a.horario-link')).toBeNull();
	});
});

// #region Imports
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { testProviders } from '@test';
import { UserProfileService } from '@core/services/user';
import type { TareaPendienteDto } from '@data/models';
import { ProfesorCursosApiService } from '@features/intranet/pages/profesor/services';
import { TareasPendientesService } from '@intranet-shared/services';
import { PlazosWidgetComponent } from './plazos-widget.component';

// #endregion
// #region Helpers
const NOW = new Date(2026, 8, 29, 10, 0, 0);

function isoDaysFromNow(days: number): string {
	return new Date(2026, 8, 29 + days, 18, 0, 0).toISOString();
}

function tarea(partial: Partial<TareaPendienteDto> & Pick<TareaPendienteDto, 'tareaId' | 'titulo'>): TareaPendienteDto {
	return { cursoNombre: 'Curso', horarioId: 1, esNueva: false, ...partial };
}

function setup(opts: { profesor: boolean; tareas?: TareaPendienteDto[]; loaded?: boolean; profesor$?: unknown }) {
	const refresh = vi.fn();
	TestBed.configureTestingModule({
		imports: [PlazosWidgetComponent],
		providers: [
			...testProviders,
			provideRouter([]),
			{ provide: UserProfileService, useValue: { isProfesor: () => opts.profesor } },
			{
				provide: TareasPendientesService,
				useValue: { tareas: signal(opts.tareas ?? []), loaded: signal(opts.loaded ?? true), refresh },
			},
			{ provide: ProfesorCursosApiService, useValue: { getCalificacionesPendientes: () => opts.profesor$ ?? of([]) } },
		],
	});
	const fixture = TestBed.createComponent(PlazosWidgetComponent);
	fixture.detectChanges();
	return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement, refresh };
}

const item = (d: number | null, sinNota: number | null = null) => ({
	key: 'k',
	titulo: 't',
	cursoId: null,
	cursoNombre: 'c',
	fecha: null,
	diasRestantes: d,
	sinNota,
	esNueva: false,
});
// #endregion

describe('PlazosWidgetComponent', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('estudiante: pide el refresh y muestra el orden del BE, máx. 5, con contador de restantes', () => {
		const tareas = [1, 2, 3, 4, 5, 6].map((id) => tarea({ tareaId: id, titulo: `T-${id}`, fechaLimite: isoDaysFromNow(id) }));
		const { el, component, refresh } = setup({ profesor: false, tareas });

		const titulos = Array.from(el.querySelectorAll('.plazo-titulo')).map((n) => n.textContent?.replace('Nueva', '').trim());
		expect(refresh).toHaveBeenCalledOnce();
		expect(titulos).toEqual(['T-1', 'T-2', 'T-3', 'T-4', 'T-5']);
		expect(component.hiddenCount()).toBe(1);
		expect(el.querySelector('.plazos-more')?.textContent).toContain('1 más');
		expect(component.title()).toBe('Tareas pendientes');
	});

	it('estudiante: una tarea sin fecha límite se lista como "Sin fecha límite"', () => {
		const { el } = setup({ profesor: false, tareas: [tarea({ tareaId: 1, titulo: 'Sin fecha', fechaLimite: null })] });
		expect(el.querySelector('.plazo-badge')?.textContent?.trim()).toBe('Sin fecha límite');
	});

	it('estudiante: marca "Nueva" solo en las tareas que el estudiante no abrió', () => {
		const tareas = [
			tarea({ tareaId: 1, titulo: 'Nueva', fechaLimite: isoDaysFromNow(2), esNueva: true }),
			tarea({ tareaId: 2, titulo: 'Vista', fechaLimite: isoDaysFromNow(3) }),
		];
		const { el } = setup({ profesor: false, tareas });

		const filas = Array.from(el.querySelectorAll('.plazo-row'));
		expect(filas[0].querySelector('.plazo-nueva')).not.toBeNull();
		expect(filas[1].querySelector('.plazo-nueva')).toBeNull();
	});

	it('estudiante: etiqueta y urgencia según días restantes', () => {
		const { component } = setup({ profesor: false });

		expect(component.label(item(-2))).toBe('Vencida');
		expect(component.label(item(0))).toBe('Vence hoy');
		expect(component.label(item(1))).toBe('Vence mañana');
		expect(component.label(item(5))).toBe('Vence en 5 días');
		expect(component.label(item(null))).toBe('Sin fecha límite');
		expect(component.urgencia(item(-2))).toBe('urgent');
		expect(component.urgencia(item(0))).toBe('urgent');
		expect(component.urgencia(item(3))).toBe('soon');
		expect(component.urgencia(item(4))).toBe('normal');
		expect(component.urgencia(item(null))).toBe('normal');
	});

	it('estudiante: muestra el skeleton mientras las tareas no cargaron', () => {
		const { el } = setup({ profesor: false, loaded: false });
		expect(el.querySelector('app-skeleton-loader')).not.toBeNull();
	});

	it('profesor: consume calificaciones pendientes y muestra los alumnos sin nota', () => {
		const pendientes = [
			{
				calificacionId: 9,
				titulo: 'Examen 1',
				cursoNombre: 'Física',
				horarioId: 5,
				numeroSemana: 3,
				fechaEvaluacion: isoDaysFromNow(2),
				totalEstudiantes: 20,
				sinNota: 4,
			},
		];
		const { el, component, refresh } = setup({ profesor: true, profesor$: of(pendientes) });

		expect(refresh).not.toHaveBeenCalled();
		expect(component.title()).toBe('Calificaciones pendientes');
		expect(el.querySelector('.plazo-badge')?.textContent?.trim()).toBe('4 sin nota');
	});

	it('profesor: cada ítem navega a Calificaciones de su curso/salón; sin salonId o cursoId no hay link', () => {
		const base = { titulo: 'E', cursoNombre: 'C', horarioId: 5, numeroSemana: 1, fechaEvaluacion: isoDaysFromNow(1), totalEstudiantes: 10, sinNota: 2 };
		const pendientes = [
			{ ...base, calificacionId: 1, cursoId: 10, salonId: 100 },
			{ ...base, calificacionId: 2, cursoId: 20, salonId: 200 },
			{ ...base, calificacionId: 3, cursoId: 30, salonId: null },
			{ ...base, calificacionId: 4, cursoId: null, salonId: 400 },
		];
		const { el } = setup({ profesor: true, profesor$: of(pendientes) });

		const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('a.plazo-link')).map((a) => a.getAttribute('href'));
		expect(links).toEqual([
			'/intranet/profesor/cursos/10/100/calificaciones?horarioId=5&evaluacionId=1',
			'/intranet/profesor/cursos/20/200/calificaciones?horarioId=5&evaluacionId=2',
		]);
		expect(el.querySelectorAll('.plazo-row').length).toBe(4);
	});

	it('estudiante: las tareas no llevan link de calificaciones', () => {
		const { el } = setup({ profesor: false, tareas: [tarea({ tareaId: 1, titulo: 'T', cursoId: 10 })] });
		expect(el.querySelector('a.plazo-link')).toBeNull();
	});

	it('profesor: singular cuando falta una sola nota', () => {
		const { component } = setup({ profesor: true });
		expect(component.label(item(2, 1))).toBe('1 sin nota');
	});

	it('estudiante: no renderiza nada si no hay pendientes', () => {
		const { el } = setup({ profesor: false, tareas: [] });
		expect(el.querySelector('.widget-card')).toBeNull();
	});

	it('profesor: sin pendientes muestra mensaje "al día" y acceso a cursos', () => {
		const { el } = setup({ profesor: true, profesor$: of([]) });

		expect(el.querySelector('.plazos-empty')?.textContent).toContain('Estás al día');
		expect(el.querySelector('a.widget-link')?.getAttribute('href')).toBe('/intranet/profesor/cursos');
		expect(el.querySelector('.plazos-list')).toBeNull();
	});

	it('profesor: si el endpoint falla, degrada a vacío sin romper Inicio', () => {
		const { el, component } = setup({ profesor: true, profesor$: throwError(() => ({ status: 500 })) });
		expect(component.loading()).toBe(false);
		expect(el.querySelector('.plazos-list')).toBeNull();
	});
});

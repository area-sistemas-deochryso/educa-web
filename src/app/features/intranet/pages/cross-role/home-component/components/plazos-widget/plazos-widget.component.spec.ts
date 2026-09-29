// #region Imports
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { testProviders } from '@test';
import { UserProfileService } from '@core/services/user';
import { EstudianteApiService } from '@features/intranet/pages/estudiante/services';
import { ProfesorCursosApiService } from '@features/intranet/pages/profesor/services';
import { PlazosWidgetComponent } from './plazos-widget.component';

// #endregion
// #region Helpers
const NOW = new Date(2026, 8, 29, 10, 0, 0);

function isoDaysFromNow(days: number): string {
	return new Date(2026, 8, 29 + days, 18, 0, 0).toISOString();
}

function setup(opts: { profesor: boolean; estudiante$?: unknown; profesor$?: unknown }) {
	TestBed.configureTestingModule({
		imports: [PlazosWidgetComponent],
		providers: [
			...testProviders,
			provideRouter([]),
			{ provide: UserProfileService, useValue: { isProfesor: () => opts.profesor } },
			{ provide: EstudianteApiService, useValue: { getMisTareasPorVencer: () => opts.estudiante$ ?? of([]) } },
			{ provide: ProfesorCursosApiService, useValue: { getEvaluacionesPorCongelarse: () => opts.profesor$ ?? of([]) } },
		],
	});
	const fixture = TestBed.createComponent(PlazosWidgetComponent);
	fixture.detectChanges();
	return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
}
// #endregion

describe('PlazosWidgetComponent', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('estudiante: lista tareas ordenadas por fecha, máx. 3, con contador de restantes', () => {
		const tareas = [
			{ tareaId: 1, titulo: 'T-lejos', cursoNombre: 'Mate', fechaLimite: isoDaysFromNow(6), horarioId: 1 },
			{ tareaId: 2, titulo: 'T-hoy', cursoNombre: 'Arte', fechaLimite: isoDaysFromNow(0), horarioId: 2 },
			{ tareaId: 3, titulo: 'T-manana', cursoNombre: 'Ciencia', fechaLimite: isoDaysFromNow(1), horarioId: 3 },
			{ tareaId: 4, titulo: 'T-cuatro', cursoNombre: 'Lengua', fechaLimite: isoDaysFromNow(4), horarioId: 4 },
		];
		const { el, component } = setup({ profesor: false, estudiante$: of(tareas) });

		const titulos = Array.from(el.querySelectorAll('.plazo-titulo')).map((n) => n.textContent?.trim());
		expect(titulos).toEqual(['T-hoy', 'T-manana', 'T-cuatro']);
		expect(component.hiddenCount()).toBe(1);
		expect(el.querySelector('.plazos-more')?.textContent).toContain('1 más');
		expect(component.title()).toBe('Tareas por vencer');
	});

	it('estudiante: etiqueta y urgencia según días restantes', () => {
		const { component } = setup({ profesor: false });
		const item = (d: number) => ({ key: 'k', titulo: 't', cursoNombre: 'c', fecha: '', diasRestantes: d });

		expect(component.label(item(0))).toBe('Vence hoy');
		expect(component.label(item(1))).toBe('Vence mañana');
		expect(component.label(item(5))).toBe('Vence en 5 días');
		expect(component.urgencia(item(0))).toBe('urgent');
		expect(component.urgencia(item(3))).toBe('soon');
		expect(component.urgencia(item(4))).toBe('normal');
	});

	it('profesor: consume evaluaciones por congelarse con vocabulario propio', () => {
		const evaluaciones = [
			{ evaluacionId: 9, titulo: 'Examen 1', cursoNombre: 'Física', fechaLimiteEdicion: isoDaysFromNow(2), horarioId: 5 },
		];
		const { el, component } = setup({ profesor: true, profesor$: of(evaluaciones) });

		expect(component.title()).toBe('Calificaciones por cerrar');
		expect(el.querySelector('.plazo-badge')?.textContent?.trim()).toBe('Se congela en 2 días');
	});

	it('no renderiza nada si no hay plazos cercanos', () => {
		const { el } = setup({ profesor: false, estudiante$: of([]) });
		expect(el.querySelector('.widget-card')).toBeNull();
	});

	it('si el endpoint falla, degrada a vacío sin romper Inicio', () => {
		const { el, component } = setup({ profesor: false, estudiante$: throwError(() => ({ status: 500 })) });
		expect(component.loading()).toBe(false);
		expect(el.querySelector('.widget-card')).toBeNull();
	});
});

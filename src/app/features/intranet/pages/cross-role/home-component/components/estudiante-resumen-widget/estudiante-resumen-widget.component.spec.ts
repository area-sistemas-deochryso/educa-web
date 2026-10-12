// * Tests for EstudianteResumenWidgetComponent — last grade shown with the course scale (INV-U06).
// #region Imports
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import type { ConfiguracionCalificacionListDto } from '@data/models';
import { EstudianteApiService } from '@features/intranet/pages/estudiante/services';
import type { EstudianteMisNotasDto } from '@features/intranet/pages/estudiante/models/estudiante.models';
import { EstudianteResumenWidgetComponent } from './estudiante-resumen-widget.component';
// #endregion

// #region Fixtures
const ESCALA_LITERAL: ConfiguracionCalificacionListDto = {
	id: 1,
	nivel: 'Primaria',
	tipoCalificacion: 'LITERAL',
	notaMinAprobatoria: 11,
	anio: 2026,
	estado: true,
	literales: [
		{ id: 1, letra: 'AD', descripcion: 'Logro destacado', notaMinima: 18, notaMaxima: 20, orden: 1, esAprobatoria: true },
		{ id: 2, letra: 'A', descripcion: 'Logro esperado', notaMinima: 14, notaMaxima: 17.99, orden: 2, esAprobatoria: true },
		{ id: 3, letra: 'B', descripcion: 'En proceso', notaMinima: 11, notaMaxima: 13.99, orden: 3, esAprobatoria: true },
		{ id: 4, letra: 'C', descripcion: 'En inicio', notaMinima: 0, notaMaxima: 10.99, orden: 4, esAprobatoria: false },
	],
};

function buildCurso(escala: ConfiguracionCalificacionListDto | null): EstudianteMisNotasDto {
	return {
		cursoId: 1,
		cursoContenidoId: 1,
		cursoNombre: 'Arte',
		salonDescripcion: '5to A',
		evaluaciones: [
			{ id: 1, titulo: 'Dibujo', fechaEvaluacion: '2026-10-01', nota: 15.5, peso: 0.2, numeroSemana: 1 },
		],
		periodos: [],
		promedios: { porSemana: [], porPeriodo: [], general: 3.1, promedioParcial: 15.5, coberturaEvaluada: 20 },
		escalaCalificacion: escala,
	} as unknown as EstudianteMisNotasDto;
}

function render(curso: EstudianteMisNotasDto): HTMLElement {
	TestBed.configureTestingModule({
		providers: [
			provideRouter([]),
			{
				provide: EstudianteApiService,
				useValue: { getMisHorarios: () => of([]), getMisNotas: () => of([curso]) },
			},
		],
	});
	const fixture = TestBed.createComponent(EstudianteResumenWidgetComponent);
	fixture.detectChanges();
	return fixture.nativeElement as HTMLElement;
}
// #endregion

describe('EstudianteResumenWidgetComponent (INV-U06)', () => {
	it('shows the last grade as a letter when the course has a LITERAL scale', () => {
		const badge = render(buildCurso(ESCALA_LITERAL)).querySelector('.nota-badge');

		expect(badge?.textContent?.trim()).toBe('A');
	});

	it('shows the number when the course has no scale', () => {
		const badge = render(buildCurso(null)).querySelector('.nota-badge');

		expect(badge?.textContent).toContain('15.5');
	});
});

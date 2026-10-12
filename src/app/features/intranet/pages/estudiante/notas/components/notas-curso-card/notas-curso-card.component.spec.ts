// * Tests for NotasCursoCardComponent — partial average presentation (INV-C12).
// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import type { ConfiguracionCalificacionListDto } from '@data/models';
import { EstudianteMisNotasDto } from '@features/intranet/pages/estudiante/models';
import { NotasCursoCardComponent } from './notas-curso-card.component';
// #endregion

// #region Fixtures
function buildCurso(parcial: number | null, cobertura: number, general: number | null): EstudianteMisNotasDto {
	return {
		cursoId: 1,
		cursoContenidoId: 1,
		cursoNombre: 'Arte',
		salonDescripcion: '1A',
		evaluaciones: [],
		periodos: [],
		promedios: { porSemana: [], porPeriodo: [], general, promedioParcial: parcial, coberturaEvaluada: cobertura },
	} as EstudianteMisNotasDto;
}

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

function render(curso: EstudianteMisNotasDto): HTMLElement {
	const fixture: ComponentFixture<NotasCursoCardComponent> = TestBed.createComponent(NotasCursoCardComponent);
	fixture.componentRef.setInput('curso', curso);
	fixture.detectChanges();
	return fixture.nativeElement as HTMLElement;
}
// #endregion

describe('NotasCursoCardComponent (INV-C12)', () => {
	it('shows the partial average with its coverage label, never the raw accumulated sum', () => {
		const el = render(buildCurso(15.5, 20, 3.1));
		const hero = el.querySelector('.hero-number');

		expect(hero?.textContent).toContain('15.5');
		expect(hero?.textContent).not.toContain('3.1');
		expect(el.querySelector('.hero-parcial-rotulo')?.textContent).toContain('Parcial · 20 % evaluado');
	});

	it('does not neutralize the traffic light when coverage is low', () => {
		const el = render(buildCurso(15.5, 20, 3.1));

		expect(el.querySelector('.hero-number')?.classList.contains('severity-secondary')).toBe(false);
	});

	it('says "Sin calificar" with coverage 0 %, never a number', () => {
		const el = render(buildCurso(null, 0, null));

		expect(el.querySelector('.hero-number')?.textContent).toContain('Sin calificar');
		expect(el.querySelector('.hero-parcial-rotulo')).toBeNull();
	});

	it('drops the label at 100 % coverage (partial equals official)', () => {
		const el = render(buildCurso(14, 100, 14));

		expect(el.querySelector('.hero-number')?.textContent).toContain('14');
		expect(el.querySelector('.hero-parcial-rotulo')).toBeNull();
	});

	it('shows the letter of the course scale (INV-U06) instead of the number when the BE sends it', () => {
		const curso = { ...buildCurso(15.5, 20, 3.1), escalaCalificacion: ESCALA_LITERAL };
		const el = render(curso);
		const hero = el.querySelector('.hero-number');

		expect(hero?.textContent).toContain('A');
		expect(hero?.textContent).not.toContain('15.5');
		expect(el.querySelector('.hero-parcial-rotulo')?.textContent).toContain('Parcial · 20 % evaluado');
	});

	it('falls back to the number when the course has no scale (escalaCalificacion null)', () => {
		const el = render({ ...buildCurso(15.5, 20, 3.1), escalaCalificacion: null });

		expect(el.querySelector('.hero-number')?.textContent).toContain('15.5');
	});
});

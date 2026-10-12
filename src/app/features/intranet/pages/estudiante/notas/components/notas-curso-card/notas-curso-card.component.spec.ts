// * Tests for NotasCursoCardComponent — partial average presentation (INV-C12).
// #region Imports
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

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
});

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

	it('says "Sin calificar aún" with coverage 0 %, never a number', () => {
		const el = render(buildCurso(null, 0, null));

		expect(el.querySelector('.hero-number')?.textContent).toContain('Sin calificar aún');
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

	// #region Parcial por periodo (INV-C12 § Parcial por periodo)
	function buildCursoConPeriodo(
		porPeriodo: { promedio: number | null; promedioParcial?: number | null; coberturaEvaluada?: number },
		conEvaluaciones = true,
	): EstudianteMisNotasDto {
		const base = buildCurso(15.5, 20, 3.1);
		return {
			...base,
			periodos: [{ id: 1, nombre: 'Bimestre I', orden: 1, semanaInicio: 1, semanaFin: 8 }],
			evaluaciones: conEvaluaciones
				? [{ id: 10, titulo: 'Quiz', tipo: 'Quiz', peso: 0.2, numeroSemana: 2, nota: 15.5 }]
				: [],
			promedios: { ...base.promedios, porPeriodo: [{ periodoNombre: 'Bimestre I', ...porPeriodo }] },
		} as unknown as EstudianteMisNotasDto;
	}

	const chip = (el: HTMLElement) => el.querySelector('.periodos-row .periodo-chip:not(.periodo-general)');

	it('shows the period partial with its coverage label, not the raw accumulated sum', () => {
		const el = render(buildCursoConPeriodo({ promedio: 3.1, promedioParcial: 15.5, coberturaEvaluada: 20 }));

		expect(chip(el)?.textContent).toContain('15.5');
		expect(chip(el)?.textContent).not.toContain('3.1');
		expect(chip(el)?.querySelector('.periodo-parcial-rotulo')?.textContent).toContain('Parcial · 20 % evaluado');
	});

	it('drops the period label at 100 % period coverage', () => {
		const el = render(buildCursoConPeriodo({ promedio: 14, promedioParcial: 14, coberturaEvaluada: 100 }));

		expect(chip(el)?.textContent).toContain('14');
		expect(chip(el)?.querySelector('.periodo-parcial-rotulo')).toBeNull();
	});

	it('says "Sin calificar" for a period with evaluations but 0 % coverage, never a number', () => {
		const el = render(buildCursoConPeriodo({ promedio: 0, promedioParcial: null, coberturaEvaluada: 0 }));

		expect(chip(el)?.textContent).toContain('Sin calificar');
		expect(chip(el)?.textContent).not.toMatch(/\d/);
	});

	it('says "Sin calificar aún" (no "-", no figure) for a period without evaluations (INV-C12)', () => {
		const el = render(buildCursoConPeriodo({ promedio: null, promedioParcial: null, coberturaEvaluada: 0 }, false));

		expect(chip(el)?.classList.contains('empty')).toBe(true);
		expect(chip(el)?.textContent).toContain('Sin calificar aún');
		expect(chip(el)?.textContent).not.toContain('-');
	});

	it('says "Sin calificar aún" for a legacy period without figure instead of "-"', () => {
		const el = render(buildCursoConPeriodo({ promedio: null }));

		expect(chip(el)?.textContent).toContain('Sin calificar aún');
	});

	it('formats the period partial with the course scale (INV-U06)', () => {
		const curso = {
			...buildCursoConPeriodo({ promedio: 3.1, promedioParcial: 15.5, coberturaEvaluada: 20 }),
			escalaCalificacion: ESCALA_LITERAL,
		};
		const el = render(curso);

		expect(chip(el)?.textContent).toContain('A');
		expect(chip(el)?.textContent).not.toContain('15.5');
	});

	it('does not break when the period arrives without the new fields (previous BE)', () => {
		const el = render(buildCursoConPeriodo({ promedio: 12 }));

		expect(chip(el)?.textContent).toContain('12');
		expect(chip(el)?.querySelector('.periodo-parcial-rotulo')).toBeNull();
	});
	// #endregion

	// #region Evaluaciones sin nota y vencidas (INV-C12 § Vacíos y vencimiento del plazo)
	function buildCursoConEvaluaciones(evaluaciones: object[], escala?: ConfiguracionCalificacionListDto): EstudianteMisNotasDto {
		return {
			...buildCursoConPeriodo({ promedio: 0, promedioParcial: 0, coberturaEvaluada: 20 }),
			evaluaciones,
			escalaCalificacion: escala ?? null,
		} as unknown as EstudianteMisNotasDto;
	}

	const base = { tipo: 'Quiz', peso: 0.2, numeroSemana: 2, fechaEvaluacion: '2026-03-01' };
	const notaTags = (el: HTMLElement) => Array.from(el.querySelectorAll('.eval-row .nota-tag')).map((t) => t.textContent?.trim());

	it('INV-C12: an ungraded evaluation before the deadline says "Sin calificar aún", no figure', () => {
		const el = render(buildCursoConEvaluaciones([{ ...base, id: 1, titulo: 'Q1', nota: null, vencida: false }]));

		expect(notaTags(el)).toEqual(['Sin calificar aún']);
	});

	it('INV-C12: an overdue ungraded evaluation shows 0 with the course scale', () => {
		const el = render(buildCursoConEvaluaciones([{ ...base, id: 1, titulo: 'Q1', nota: null, vencida: true }]));

		expect(notaTags(el)).toEqual(['0.0']);
	});

	it('INV-C12 + INV-U06: an overdue evaluation shows the letter of a literal scale', () => {
		const el = render(buildCursoConEvaluaciones([{ ...base, id: 1, titulo: 'Q1', nota: null, vencida: true }], ESCALA_LITERAL));

		expect(notaTags(el)).toEqual(['C']);
	});

	it('shows the real grade when the evaluation has one', () => {
		const el = render(buildCursoConEvaluaciones([{ ...base, id: 1, titulo: 'Q1', nota: 15, vencida: false }]));

		expect(notaTags(el)).toEqual(['15.0']);
	});

	it('does not break when the evaluation arrives without `vencida` (previous BE): treated as not overdue', () => {
		const el = render(buildCursoConEvaluaciones([{ ...base, id: 1, titulo: 'Q1', nota: null }]));

		expect(notaTags(el)).toEqual(['Sin calificar aún']);
	});

	it('INV-C12: an overdue-only course shows its 0.0 partial, not "Sin calificar"', () => {
		const el = render(buildCurso(0, 20, 0));

		expect(el.querySelector('.hero-number')?.textContent).toContain('0');
		expect(el.querySelector('.hero-number')?.textContent).not.toContain('Sin calificar');
		expect(el.querySelector('.hero-parcial-rotulo')?.textContent).toContain('Parcial · 20 % evaluado');
	});
	// #endregion
});

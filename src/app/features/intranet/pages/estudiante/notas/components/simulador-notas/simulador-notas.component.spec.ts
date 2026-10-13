// * Tests for SimuladorNotasComponent — evaluaciones sin nota no deben pintar «NaN» ni «undefined».
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { EstudianteMisNotasDto } from '@features/intranet/pages/estudiante/models';
import { NotaSimulada } from '../../services/estudiante-notas.models';
import { SimuladorNotasComponent } from './simulador-notas.component';

// El BE puede omitir `nota` en una evaluación sin calificar: llega `undefined`, no `null`.
const curso = {
	cursoId: 1,
	cursoContenidoId: 1,
	cursoNombre: 'Arte',
	salonDescripcion: '1A',
	evaluaciones: [
		{ id: 1, titulo: 'Examen 1', tipo: 'Examen', peso: 0.5, nota: 14 },
		{ id: 2, titulo: 'Tarea 1', tipo: 'Tarea', peso: 0.5 },
	],
	periodos: [],
	promedios: { porSemana: [], porPeriodo: [], general: null, promedioParcial: null, coberturaEvaluada: 0 },
} as unknown as EstudianteMisNotasDto;

function render(simulaciones: NotaSimulada[], promedio: number | null): void {
	const fixture = TestBed.createComponent(SimuladorNotasComponent);
	fixture.componentRef.setInput('visible', true);
	fixture.componentRef.setInput('curso', curso);
	fixture.componentRef.setInput('simulaciones', simulaciones);
	fixture.componentRef.setInput('promedioSimulado', promedio);
	fixture.componentRef.setInput('coberturaSimulada', 50);
	fixture.detectChanges();
}

// El drawer se monta en <body> (appendTo="body").
function renderedText(): string {
	return document.body.textContent ?? '';
}

describe('SimuladorNotasComponent', () => {
	it('renders no «NaN» nor «undefined» when evaluations have no grade', () => {
		render(
			[
				{ calificacionId: 1, notaOriginal: 14, notaSimulada: 14, peso: 0.5 },
				{ calificacionId: 2, notaOriginal: null, notaSimulada: null, peso: 0.5 },
			],
			14,
		);

		expect(renderedText()).not.toContain('NaN');
		expect(renderedText()).not.toContain('undefined');
		expect(renderedText()).toContain('Sin calificar aún');
	});

	it('guards a missing weight and a NaN simulated average', () => {
		render(
			[{ calificacionId: 2, notaOriginal: null, notaSimulada: null, peso: undefined as unknown as number }],
			Number.NaN,
		);

		expect(renderedText()).not.toContain('NaN');
		expect(renderedText()).not.toContain('undefined');
	});
});

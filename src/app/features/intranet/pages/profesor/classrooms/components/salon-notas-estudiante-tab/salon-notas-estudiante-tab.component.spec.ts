// * Tests de P114-F6 (B5): con un solo estudiante, Notas por Estudiante lo selecciona sin pedir un click.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { SalonNotasEstudianteTabComponent } from './salon-notas-estudiante-tab.component';
// #endregion

const estudiante = (estudianteId: number) => ({ estudianteId, dni: `0000000${estudianteId}`, nombreCompleto: `Alumno ${estudianteId}` });

describe('SalonNotasEstudianteTabComponent — autoselección (B5)', () => {
	function create(estudiantes: ReturnType<typeof estudiante>[]) {
		TestBed.configureTestingModule({ imports: [SalonNotasEstudianteTabComponent] });
		const fixture = TestBed.createComponent(SalonNotasEstudianteTabComponent);
		fixture.componentRef.setInput('estudiantes', estudiantes);
		fixture.detectChanges();
		return fixture.componentInstance;
	}

	it('selects the only student', () => {
		expect(create([estudiante(7)]).selectedEstudianteId()).toBe(7);
	});

	it('does not select anyone when there are several students', () => {
		expect(create([estudiante(1), estudiante(2)]).selectedEstudianteId()).toBeNull();
	});

	it('does not select anyone when there are none', () => {
		expect(create([]).selectedEstudianteId()).toBeNull();
	});
});

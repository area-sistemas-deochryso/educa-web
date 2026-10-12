// * Tests de H03 (P110-F10): el peso se pide y se muestra como porcentaje entero; la API sigue recibiendo la fracción 0–1.
// #region Imports
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorHandlerService } from '@core/services';
import type { CalificacionDto, CrearCalificacionDto } from '@features/intranet/pages/profesor/models';
import { EvaluacionFormDialogComponent } from './evaluacion-form-dialog.component';
// #endregion

const FECHA = '2026-03-10T00:00:00';

function evaluacion(peso: number): CalificacionDto {
	return {
		id: 1,
		cursoContenidoId: 5,
		tareaId: null,
		semanaId: 3,
		numeroSemana: 1,
		titulo: 'Examen',
		peso,
		fechaEvaluacion: FECHA,
		tipo: 'Examen',
		esGrupal: false,
		estado: true,
	};
}

describe('EvaluacionFormDialogComponent — peso en porcentaje', () => {
	let showWarning: ReturnType<typeof vi.fn>;

	function create(editing: CalificacionDto | null) {
		const fixture = TestBed.createComponent(EvaluacionFormDialogComponent);
		fixture.componentRef.setInput('contenidoId', 5);
		fixture.componentRef.setInput('editing', editing);
		fixture.detectChanges();
		const emitted: CrearCalificacionDto[] = [];
		fixture.componentInstance.save.subscribe((dto) => emitted.push(dto));
		return { component: fixture.componentInstance, emitted };
	}

	beforeEach(() => {
		showWarning = vi.fn();
		TestBed.configureTestingModule({
			imports: [EvaluacionFormDialogComponent],
			providers: [{ provide: ErrorHandlerService, useValue: { showWarning } }],
		});
	});

	it('starts a new evaluation at 20 %, not at 0.2', () => {
		const { component } = create(null);

		expect(component.formData().peso).toBe(20);
	});

	it('loads an existing weight in percent, never 20 for 0.2 or the reverse', () => {
		expect(create(evaluacion(0.2)).component.formData().peso).toBe(20);
		expect(create(evaluacion(0.35)).component.formData().peso).toBe(35);
		expect(create(evaluacion(1)).component.formData().peso).toBe(100);
	});

	it('sends the contract fraction when saving an edited evaluation', () => {
		const { component, emitted } = create(evaluacion(0.35));

		component.onSave();

		expect(emitted).toHaveLength(1);
		expect(emitted[0].peso).toBe(0.35);
	});

	it('sends the contract fraction for a value typed by the teacher', () => {
		const { component, emitted } = create(evaluacion(0.2));
		component.updateField('peso', 15);

		component.onSave();

		expect(emitted[0].peso).toBe(0.15);
	});

	it('rejects a percentage outside 1-100', () => {
		const { component } = create(evaluacion(0.2));

		component.updateField('peso', 0);
		expect(component.isFormValid()).toBe(false);
		component.updateField('peso', 101);
		expect(component.isFormValid()).toBe(false);
		component.updateField('peso', 100);
		expect(component.isFormValid()).toBe(true);
	});

	it('warns in percent when the typed weight is clamped', () => {
		const { component } = create(null);

		component.onPesoInput({ value: 150 } as never);
		component.onPesoBlur();

		expect(showWarning).toHaveBeenCalledWith('Peso ajustado', 'El peso máximo es 100 %, se ajustó automáticamente.');
	});
});
